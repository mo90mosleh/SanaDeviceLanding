"""Zeep owns namespace, SOAPAction, element ordering and XML serialization.

No production SOAP envelope/DTO is assumed. A manifest approved against the
actual installation is mandatory, including a fingerprint of all WSDL/XSD bytes.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
from .mapping import FIELD_ALIASES, UTM_FIELDS


ALL_FIELDS = set(FIELD_ALIASES) | set(UTM_FIELDS.values())


class DeliveryError(Exception):
    def __init__(self, code, kind="uncertain"):
        super().__init__(code)
        self.code, self.kind = code, kind


def path_value(data, path):
    for key in path:
        data = data[key]
    return data


def origin(url):
    part = urlsplit(url)
    if part.scheme not in ("http", "https") or not part.hostname or part.username or part.password:
        raise ValueError("A credential-free HTTP(S) URL is required in server environment")
    return part.scheme, part.hostname, part.port


def render(template, context, custom):
    if isinstance(template, list):
        return [render(value, context, custom) for value in template]
    if isinstance(template, dict):
        if set(template) == {"$value"}:
            return context[template["$value"]]
        if set(template) == {"$fields"} and template["$fields"] is True:
            return [{custom["key_property"]: key, custom["value_property"]: value}
                    for key, value in sorted(context["fields"].items())]
        return {key: render(value, context, custom) for key, value in template.items()}
    return template


class FormClient:
    def __init__(self, wsdl_url, endpoint, username, password, manifest_file,
                 allow_http=False, timeout=25):
        import requests
        from zeep import Client, Settings
        from zeep.transports import Transport
        if origin(wsdl_url) != origin(endpoint):
            raise ValueError("WSDL and SOAP endpoint must share the configured origin")
        if urlsplit(endpoint).path.lower() != "/services/api/iform.svc":
            raise ValueError("Only the configured IForm service is permitted")
        if urlsplit(endpoint).scheme != "https" and not allow_http:
            raise ValueError("HTTP CRM requires explicit PAYAMGOSTAR_ALLOW_HTTP=true")
        documents = {}

        class LockedTransport(Transport):
            def load(self, url):
                if origin(url) != origin(wsdl_url):
                    raise ValueError("Cross-origin WSDL/XSD import rejected")
                data = super().load(url)
                documents[url] = data
                return data

        session = requests.Session()
        # Do not redirect credentials or SOAP bodies to an unverified endpoint.
        original_request = session.request
        def request(method, url, **kwargs):
            kwargs["allow_redirects"] = False
            return original_request(method, url, **kwargs)
        session.request = request
        self.client = Client(wsdl_url, transport=LockedTransport(
            session=session, timeout=timeout, operation_timeout=timeout),
            settings=Settings(strict=True, forbid_dtd=True, forbid_entities=True, forbid_external=True))
        self.fingerprint = hashlib.sha256(b"\n".join(sorted(
            hashlib.sha256(value).hexdigest().encode() for value in documents.values()))).hexdigest()
        self.manifest = json.loads(Path(manifest_file).read_text()) if manifest_file else None
        self.context = {"username": username, "password": password,
                        "crmObjectTypeCode": "CBCSalesOpp", "emptyIdentity": None,
                        "emptyParent": None}
        self.endpoint = endpoint
        if self.manifest:
            self.verify_contract()

    def inspect(self):
        return {"wsdl_fingerprint": self.fingerprint, "bindings": {
            name: {name: {"input": op.input.signature(), "output": op.output.signature()}
                   for name, op in binding._operations.items()}
            for name, binding in self.client.wsdl.bindings.items()}}

    def verify_contract(self):
        m = self.manifest
        if m.get("verified") is not True or m.get("wsdl_fingerprint") != self.fingerprint:
            raise ValueError("Actual WSDL fingerprint and verified contract are required")
        binding = self.client.wsdl.bindings[m["binding"]]
        if "SaveForm" not in binding._operations:
            raise ValueError("Actual binding has no SaveForm")
        read = m["reconcile_operation"]
        if read not in binding._operations or "Form" not in read or not read.startswith(("Get", "Find", "Search", "List")):
            raise ValueError("Verified read-only Form reconciliation operation required")
        if any(word in read for word in ("Identity", "Opportunity", "Save", "Delete", "Create")):
            raise ValueError("Non-Form reconciliation is prohibited")
        for key in ("save_arguments", "read_arguments", "custom_fields", "save_result",
                    "read_result", "record_paths"):
            if key not in m:
                raise ValueError("Incomplete verified contract")
        self.service = self.client.create_service(m["binding"], self.endpoint)
        # Preflight only serializes; it does not send anything to CRM.
        context = {**self.context, "subject": "DeviceOpp100100",
                   "fields": {key: "" for key in ALL_FIELDS}}
        self._save_arguments(context)
        self.client.create_message(self.service, read,
                                   **render(m["read_arguments"], context, m["custom_fields"]))

    def _save_arguments(self, context):
        from lxml import etree
        m = self.manifest
        arguments = render(m["save_arguments"], context, m["custom_fields"])
        xml = self.client.create_message(self.service, "SaveForm", **arguments)
        def texts(name):
            return xml.xpath("//*[local-name()=$name]/text()", name=name)
        if texts("Subject") != [context["subject"]] or texts("CrmObjectTypeCode") != ["CBCSalesOpp"]:
            raise ValueError("SaveForm must carry the fixed Form type and stable subject")
        for name in ("IdentityId", "ParentCrmObjectId"):
            if any(value.strip() for value in texts(name)):
                raise ValueError("Identity and parent must be empty")
        # Every UserKey/value pair must exist once in the schema-generated XML.
        custom = m["custom_fields"]
        nodes = xml.xpath("//*[local-name()=$name]", name=custom["key_property"])
        pairs = {}
        for node in nodes:
            values = node.getparent().xpath("./*[local-name()=$name]", name=custom["value_property"])
            if node.text in pairs or len(values) != 1:
                raise ValueError("Duplicate/malformed custom fields")
            pairs[node.text] = values[0].text or ""
        if pairs != context["fields"]:
            raise ValueError("Serialized custom fields do not match the mapped lead")
        # All XML escaping and namespaces above are supplied by Zeep/lxml.
        etree.tostring(xml)
        return arguments

    def _invoke(self, operation, arguments):
        import requests
        from zeep.exceptions import Fault, TransportError
        from zeep.helpers import serialize_object
        try:
            return serialize_object(getattr(self.service, operation)(**arguments))
        except requests.ConnectTimeout:
            raise DeliveryError("connect_timeout", "retry") from None
        except Fault as error:
            sender = (error.code or "").split(":")[-1] in ("Client", "Sender")
            # Never persist/log raw Fault XML, credentials, or a CRM message that may echo input.
            raise DeliveryError("soap_sender_fault" if sender else "soap_fault",
                                "permanent" if sender else "uncertain") from None
        except TransportError as error:
            raise DeliveryError("soap_http_error", "permanent" if error.status_code in (401,403) else "uncertain") from None
        except Exception:
            raise DeliveryError("soap_transport_or_parse_error", "uncertain") from None

    def _result(self, response, config):
        try:
            success = path_value(response, config["success"])
            message = path_value(response, config["message"])
            if not isinstance(success, bool) or not isinstance(message, (str, type(None))):
                raise ValueError()
            if not success:
                raise DeliveryError("crm_rejected", "permanent")
            return response
        except DeliveryError:
            raise
        except (KeyError, TypeError, ValueError, IndexError):
            raise DeliveryError("malformed_crm_result") from None

    def save(self, item):
        context = {**self.context, "subject": item["subject"], "fields": item["fields"]}
        response = self._result(self._invoke("SaveForm", self._save_arguments(context)), self.manifest["save_result"])
        try:
            crm_id = path_value(response, self.manifest["save_result"]["crm_id"])
            if not isinstance(crm_id, str) or not crm_id.strip():
                raise ValueError()
            return crm_id
        except (KeyError, TypeError, ValueError):
            raise DeliveryError("success_without_crm_id") from None

    def reconcile(self, item):
        m = self.manifest
        context = {**self.context, "subject": item["subject"], "fields": item["fields"]}
        response = self._result(self._invoke(m["reconcile_operation"],
            render(m["read_arguments"], context, m["custom_fields"])), m["read_result"])
        try:
            records = path_value(response, m["read_result"]["records"]) or []
            if not isinstance(records, list):
                raise ValueError()
            candidates = []
            p = m["record_paths"]
            for record in records:
                if path_value(record,p["subject"]) != item["subject"]:
                    continue
                if path_value(record,p["type_code"]) != "CBCSalesOpp":
                    raise ValueError()
                if path_value(record,p["identity"]) or path_value(record,p["parent"]):
                    raise ValueError()
                pairs = path_value(record,p["fields"])
                values = {path_value(pair,p["field_key"]): path_value(pair,p["field_value"]) or "" for pair in pairs}
                if len(values) != len(pairs) or any(values.get(k) != v for k,v in item["fields"].items()):
                    raise ValueError()
                crm_id = path_value(record,p["crm_id"])
                if not isinstance(crm_id,str) or not crm_id.strip():
                    raise ValueError()
                candidates.append(crm_id)
            if len(candidates) > 1:
                raise ValueError()
            return candidates[0] if candidates else None
        except (KeyError, TypeError, ValueError, IndexError):
            raise DeliveryError("reconciliation_collision_or_schema_error", "permanent") from None
