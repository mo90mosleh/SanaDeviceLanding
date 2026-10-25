import json
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer
from pathlib import Path
from services.payamgostar.app import make_handler
from services.payamgostar.store import Store
from services.payamgostar.tests.test_outbox import lead


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / "db.sqlite")
        self.store = Store.initialize(self.path)
        self.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), make_handler(self.store, "https://site.example.test")
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}/api/leads"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def post(self, payload, origin="https://site.example.test"):
        req = urllib.request.Request(
            self.url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Origin": origin},
        )
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as response:
            return response.code, json.load(response)

    def test_acknowledgement_requires_durable_write_and_duplicates_keep_subject(self):
        self.assertEqual(self.post(lead())[0], 200)
        self.assertEqual(self.post(lead())[0], 200)
        self.assertEqual(Store(self.path).enqueue(lead()), "DeviceOpp100100")
        changed = lead()
        changed["time"] = "new-time"
        self.assertEqual(self.post(changed)[0], 409)

    def test_invalid_input_cors_and_missing_submission_id_are_rejected(self):
        self.assertEqual(self.post(lead(), "https://other.example.test")[0], 403)
        payload = lead()
        del payload["submissionId"]
        self.assertEqual(self.post(payload)[0], 422)
        payload = lead()
        payload["mobile"] = "۰۹۱۲۳۴۵۶۷۸۹"
        self.assertEqual(self.post(payload)[0], 422)

    def test_database_failure_does_not_acknowledge_and_no_status_exposes_leads(self):
        self.store.enqueue = lambda payload: (_ for _ in ()).throw(
            RuntimeError("private details")
        )
        status, body = self.post(lead())
        self.assertEqual(status, 503)
        self.assertNotIn("private", str(body))
        with self.assertRaises(urllib.error.HTTPError):
            urllib.request.urlopen(self.url + "/status")


if __name__ == "__main__":
    unittest.main()
