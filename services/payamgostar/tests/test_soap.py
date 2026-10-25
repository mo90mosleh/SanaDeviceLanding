"""Local HTTP fixture only. No test points at the real CRM."""

import importlib.util
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from xml.sax.saxutils import escape
from services.payamgostar.soap import FormClient, DeliveryError
from services.payamgostar.mapping import map_fields
from services.payamgostar.tests.test_outbox import lead


AVAILABLE = bool(importlib.util.find_spec("zeep"))
NS = "urn:sana:synthetic-form-fixture"


def contract(fingerprint):
    return {
        "verified": True,
        "wsdl_fingerprint": fingerprint,
        "binding": "{urn:sana:synthetic-form-fixture}FixtureBinding",
        "reconcile_operation": "GetForms",
        "custom_fields": {"key_property": "UserKey", "value_property": "Value"},
        "save_arguments": {
            "username": {"$value": "username"},
            "password": {"$value": "password"},
            "form": {
                "Subject": {"$value": "subject"},
                "CrmObjectTypeCode": {"$value": "crmObjectTypeCode"},
                "IdentityId": {"$value": "emptyIdentity"},
                "ParentCrmObjectId": {"$value": "emptyParent"},
                "ExtendedProperties": {"Pair": {"$fields": True}},
            },
        },
        "read_arguments": {
            "username": {"$value": "username"},
            "password": {"$value": "password"},
            "subject": {"$value": "subject"},
            "typeCode": {"$value": "crmObjectTypeCode"},
        },
        "save_result": {
            "success": ["Success"],
            "message": ["Message"],
            "crm_id": ["CrmId"],
        },
        "read_result": {
            "success": ["Success"],
            "message": ["Message"],
            "records": ["Forms", "Form"],
        },
        "record_paths": {
            "subject": ["Subject"],
            "type_code": ["CrmObjectTypeCode"],
            "identity": ["IdentityId"],
            "parent": ["ParentCrmObjectId"],
            "crm_id": ["CrmId"],
            "fields": ["ExtendedProperties", "Pair"],
            "field_key": ["UserKey"],
            "field_value": ["Value"],
        },
    }


@unittest.skipUnless(
    AVAILABLE, "Install the pinned server requirements for real WSDL/XML tests"
)
class SoapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.calls = []
        self.mode = "success"
        self.item = {"subject": "DeviceOpp100100", "fields": map_fields(lead())}
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                content = Path(__file__).with_name("synthetic.wsdl").read_bytes()
                self.send_response(200)
                self.end_headers()
                self.wfile.write(content)

            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                outer.calls.append((self.headers.get("SOAPAction"), body))
                read = "fixture:read" in self.headers.get("SOAPAction", "")
                if outer.mode == "fault":
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(
                        b'<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Server</faultcode><faultstring>dummy-secret must not leak</faultstring></s:Fault></s:Body></s:Envelope>'
                    )
                    return
                self.send_response(200)
                self.end_headers()
                if outer.mode == "malformed":
                    self.wfile.write(b"not XML")
                    return
                if read:
                    forms = ""
                    if outer.mode != "empty":
                        values = dict(outer.item["fields"])
                        if outer.mode == "collision":
                            values["DeviceOppProduct"] = "different"
                        pairs = "".join(
                            "<Pair><UserKey>"
                            + key
                            + "</UserKey><Value>"
                            + escape(value)
                            + "</Value></Pair>"
                            for key, value in values.items()
                        )
                        forms = (
                            '<Form><Subject>DeviceOpp100100</Subject><CrmObjectTypeCode>CBCSalesOpp</CrmObjectTypeCode><IdentityId xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:nil="true"/><ParentCrmObjectId xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:nil="true"/><ExtendedProperties>'
                            + pairs
                            + "</ExtendedProperties><CrmId>fixture-crm-id</CrmId></Form>"
                        )
                        if outer.mode == "duplicates":
                            forms += forms
                    result = (
                        "<Success>true</Success><Message>read</Message><Forms>"
                        + forms
                        + "</Forms>"
                    )
                    operation = "GetForms"
                else:
                    result = (
                        "<Success>"
                        + ("false" if outer.mode == "reject" else "true")
                        + "</Success><Message>dummy-secret</Message><CrmId>"
                        + ("" if outer.mode == "no-id" else "fixture-crm-id")
                        + "</CrmId>"
                    )
                    operation = "SaveForm"
                xml = (
                    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><'
                    + operation
                    + 'Response xmlns="'
                    + NS
                    + '"><'
                    + operation
                    + "Result>"
                    + result
                    + "</"
                    + operation
                    + "Result></"
                    + operation
                    + "Response></s:Body></s:Envelope>"
                )
                self.wfile.write(xml.encode())

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.endpoint = (
            f"http://127.0.0.1:{self.server.server_port}/services/api/iform.svc"
        )
        inspector = FormClient(
            self.endpoint + "?wsdl",
            self.endpoint,
            "dummy-user",
            "dummy-secret",
            None,
            allow_http=True,
        )
        self.manifest = contract(inspector.fingerprint)
        self.file = Path(self.temp.name) / "contract.json"
        self.file.write_text(json.dumps(self.manifest))
        self.client = self.client_from_file()

    def client_from_file(self):
        return FormClient(
            self.endpoint + "?wsdl",
            self.endpoint,
            "dummy-user",
            "dummy-secret",
            self.file,
            allow_http=True,
        )

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def test_preflight_does_not_post_and_wsdl_controls_action_namespace_and_escaping(
        self,
    ):
        self.assertEqual(self.calls, [])
        self.item["fields"]["DeviceOppLeadName"] = "مریم & <احمدی>"
        self.assertEqual(self.client.save(self.item), "fixture-crm-id")
        action, xml = self.calls[0]
        self.assertEqual(action, '"urn:fixture:save:v99"')
        self.assertIn(NS.encode(), xml)
        self.assertIn(b"&amp; &lt;", xml)
        self.assertNotIn(b"Opportunity", xml)
        self.assertNotIn(b"SearchIdentity", xml)

    def test_rejection_fault_malformed_and_missing_crmid_do_not_leak_credentials(self):
        for mode, kind in (
            ("reject", "permanent"),
            ("fault", "uncertain"),
            ("malformed", "uncertain"),
            ("no-id", "uncertain"),
        ):
            self.mode = mode
            with self.assertRaises(DeliveryError) as caught:
                self.client.save(self.item)
            self.assertEqual(caught.exception.kind, kind)
            self.assertNotIn("dummy-secret", str(caught.exception))

    def test_reconciliation_matches_subject_type_and_all_original_fields(self):
        self.assertEqual(self.client.reconcile(self.item), "fixture-crm-id")
        self.assertEqual(self.calls[0][0], '"urn:fixture:read:v99"')
        for mode in ("collision", "duplicates"):
            self.mode = mode
            with self.assertRaises(DeliveryError):
                self.client.reconcile(self.item)
        self.mode = "empty"
        self.assertIsNone(self.client.reconcile(self.item))
        self.assertTrue(all("fixture:read" in call[0] for call in self.calls))

    def test_unverified_or_changed_contract_and_nonempty_identity_are_blocked_before_post(
        self,
    ):
        for change in (
            {"verified": False},
            {"wsdl_fingerprint": "wrong"},
            {"reconcile_operation": "SaveIdentity"},
        ):
            self.file.write_text(json.dumps({**self.manifest, **change}))
            with self.assertRaises(ValueError):
                self.client_from_file()
        self.manifest["save_arguments"]["form"]["IdentityId"] = "forbidden-identity"
        self.file.write_text(json.dumps(self.manifest))
        with self.assertRaises(ValueError):
            self.client_from_file()
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
