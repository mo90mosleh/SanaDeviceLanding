"""Use the owner's actual schemas, with a local-only SOAP peer and dummy data."""
import importlib.util
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from services.payamgostar.profile import owner_form_manifest, validate_owner_manifest, ACTIONS
from services.payamgostar.soap import FormClient, DeliveryError
from services.payamgostar.mapping import map_fields
from services.payamgostar.tests.test_outbox import lead


SCHEMAS = Path(__file__).parents[1] / "contracts" / "owner-2.8.8.2"
DATA_NS = "http://schemas.datacontract.org/2004/07/Septa.PayamGostar.ServiceLayer.Contract.PGContracts.DataContracts"
TEMP_NS = "http://tempuri.org/"
SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"
CRM_ID = "11111111-2222-4333-8444-555555555555"


class ProfileConfigTests(unittest.TestCase):
    def test_search_query_grammar_is_never_invented_from_xsd_string_type(self):
        for template, verified in ((None, False), ("", True), ("anything", True), ("{subject}", False)):
            with self.assertRaises(ValueError):
                owner_form_manifest("test-fingerprint", template, verified)
        with self.assertRaises(ValueError):
            owner_form_manifest("test-fingerprint", "fixture:{subject}", True)


@unittest.skipUnless(importlib.util.find_spec("zeep"), "Install pinned server requirements")
class OwnerContractTests(unittest.TestCase):
    def setUp(self):
        from lxml import etree
        self.etree = etree
        self.temp = tempfile.TemporaryDirectory()
        self.calls = []
        self.mode = "success"
        self.item = {"subject": "DeviceOpp100100", "fields": map_fields(lead())}
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass

            def do_GET(self):
                name = Path(urlsplit(self.path).path).name
                file = SCHEMAS / name
                if name not in {"form.wsdl", "xsd0.xsd", "xsd1.xsd", "xsd2.xsd", "xsd3.xsd", "xsd4.xsd"}:
                    self.send_response(404); self.end_headers(); return
                self.send_response(200); self.end_headers(); self.wfile.write(file.read_bytes())

            def do_POST(self):
                action = self.headers.get("SOAPAction", "").strip('"')
                body = self.rfile.read(int(self.headers["Content-Length"]))
                outer.calls.append((action, body))
                if action not in ACTIONS.values():
                    self.send_response(500); self.end_headers(); return
                operation = "SaveForm" if action == ACTIONS["SaveForm"] else "SearchForm"
                xml = outer.response(operation)
                self.send_response(200); self.send_header("Content-Type", "text/xml; charset=utf-8")
                self.end_headers(); self.wfile.write(xml)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.wsdl = f"http://127.0.0.1:{self.server.server_port}/metadata/form.wsdl"
        self.endpoint = f"http://127.0.0.1:{self.server.server_port}/Services/API/IForm.svc"
        inspector = FormClient(self.wsdl, self.endpoint, "dummy-user", "dummy-secret", None, allow_http=True)
        # Explicitly synthetic query grammar for the local peer, never a production example.
        self.manifest = validate_owner_manifest(inspector, "fixture-subject:{subject}", True, "fixture-type-selector")
        self.file = Path(self.temp.name) / "manifest.json"
        self.file.write_text(json.dumps(self.manifest))
        self.client = FormClient(self.wsdl, self.endpoint, "dummy-user", "dummy-secret", self.file, allow_http=True)

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(); self.temp.cleanup()

    def element(self, parent, name, value=None, namespace=DATA_NS):
        node = self.etree.SubElement(parent, "{" + namespace + "}" + name)
        if value is None: node.set("{" + XSI_NS + "}nil", "true")
        else: node.text = value
        return node

    def response(self, operation):
        e = self.etree
        envelope = e.Element("{" + SOAP_NS + "}Envelope", nsmap={"s": SOAP_NS, "a": DATA_NS, "i": XSI_NS})
        body = e.SubElement(envelope, "{" + SOAP_NS + "}Body")
        response = e.SubElement(body, "{" + TEMP_NS + "}" + operation + "Response")
        result = e.SubElement(response, "{" + TEMP_NS + "}" + operation + "Result")
        self.element(result, "Message", "local dummy response")
        self.element(result, "Success", "false" if self.mode == "reject" else "true")
        if operation == "SaveForm":
            self.element(result, "CrmId", "00000000-0000-0000-0000-000000000000" if self.mode == "zero-id" else CRM_ID)
        else:
            single = self.element(result, "FormInfo")
            if self.mode == "empty": self.element(result, "FormInfoList")
            else:
                records = e.SubElement(result, "{" + DATA_NS + "}FormInfoList")
                record = e.SubElement(records, "{" + DATA_NS + "}FormInfo")
                self.element(record, "CrmId", CRM_ID)
                self.element(record, "CrmObjectTypeCode", "CBCSalesOpp")
                props = e.SubElement(record, "{" + DATA_NS + "}ExtendedProperties")
                for key, value in sorted(self.item["fields"].items()):
                    prop = e.SubElement(props, "{" + DATA_NS + "}BaseCrmObjectExtendedPropertyInfo")
                    self.element(prop, "Name")
                    self.element(prop, "UserKey", key)
                    self.element(prop, "Value", "wrong product" if self.mode == "collision" and key == "DeviceOppProduct" else value)
                self.element(record, "ParentCrmObjectId")
                self.element(record, "IdentityId")
                self.element(record, "Subject", self.item["subject"])
                if self.mode in ("single", "both"):
                    from copy import deepcopy
                    result.replace(single, deepcopy(record))
                    if self.mode == "single":
                        result.remove(records)
                        self.element(result, "FormInfoList")
        return e.tostring(envelope, xml_declaration=True, encoding="UTF-8")

    def test_actual_saveform_names_field_collection_order_and_action(self):
        self.assertEqual(self.calls, [])  # prepare/verify made no SOAP requests.
        self.assertEqual(self.client.save(self.item), CRM_ID)
        action, data = self.calls[-1]
        self.assertEqual(action, ACTIONS["SaveForm"])
        root = self.etree.fromstring(data)
        local = lambda node: self.etree.QName(node).localname
        operation = root.find("{" + SOAP_NS + "}Body")[0]
        self.assertEqual([local(node) for node in operation], ["userName", "password", "formInfo"])
        form = operation[2]
        self.assertEqual(local(form), "formInfo")
        self.assertEqual(root.xpath("//*[local-name()='Subject']/text()"), [self.item["subject"]])
        for name in ("IdentityId", "ParentCrmObjectId", "CrmId", "CreatDate", "ModifyDate", "CrmObjectTypeId"):
            self.assertEqual(root.xpath("//*[local-name()=$name]/text()", name=name), [])
        props = root.xpath("//*[local-name()='BaseCrmObjectExtendedPropertyInfo']")
        pairs = {p.find("{" + DATA_NS + "}UserKey").text: p.find("{" + DATA_NS + "}Value").text or "" for p in props}
        self.assertEqual(pairs, self.item["fields"])

    def test_actual_searchform_structure_and_exact_result_matching(self):
        self.assertEqual(self.client.reconcile(self.item), CRM_ID)
        action, data = self.calls[-1]
        self.assertEqual(action, ACTIONS["SearchForm"])
        root = self.etree.fromstring(data)
        self.assertEqual(root.xpath("//*[local-name()='query']/text()"), ["fixture-subject:DeviceOpp100100"])
        self.assertEqual(root.xpath("//*[local-name()='typeKey']/text()"), ["fixture-type-selector"])
        for mode in ("single", "both"):
            self.mode = mode
            self.assertEqual(self.client.reconcile(self.item), CRM_ID)
        self.mode = "collision"
        with self.assertRaises(DeliveryError): self.client.reconcile(self.item)
        self.mode = "empty"
        self.assertIsNone(self.client.reconcile(self.item))
        self.assertTrue(all(action == ACTIONS["SearchForm"] for action, _ in self.calls))

    def test_actual_response_rejection_and_zero_guid_are_not_success(self):
        for mode, kind in (("reject", "permanent"), ("zero-id", "uncertain")):
            self.mode = mode
            with self.assertRaises(DeliveryError) as caught: self.client.save(self.item)
            self.assertEqual(caught.exception.kind, kind)

    def test_changed_soapaction_is_rejected_before_any_post(self):
        self.client.manifest["expected_actions"] = {"SaveForm": "wrong-action"}
        with self.assertRaises(ValueError): self.client.verify_contract()
        self.assertEqual(self.calls, [])


if __name__ == "__main__": unittest.main()
