import tempfile
import threading
import time
import unittest
from pathlib import Path
from services.payamgostar.channels import DeliveryChannels
from services.payamgostar.store import Store
from services.payamgostar.soap import DeliveryError
from services.payamgostar.tests.test_outbox import FakeCRM, lead


class IndependentChannelsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store.initialize(str(Path(self.temp.name) / "outbox.sqlite"))
        self.payload = lead()
        self.store.enqueue(self.payload)

    def tearDown(self):
        self.temp.cleanup()

    def states(self):
        return {row["channel"]: row["state"] for row in self.store.status(self.payload["submissionId"])}

    def wait_for(self, condition):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            if condition():
                return
            time.sleep(0.01)
        self.fail("Independent channel did not progress")

    def runner(self, crm_factory, webhook_factory):
        return DeliveryChannels(self.store, crm_factory, webhook_factory,
                                idle_delay=0.01, retry_delay=0.01, max_factory_attempts=2)

    def test_slow_wsdl_initialization_does_not_block_existing_webhook(self):
        release = threading.Event()
        initializing = threading.Event()
        forwarded = []

        def crm_factory():
            initializing.set()
            release.wait(5)
            return FakeCRM()

        channels = self.runner(crm_factory, lambda: forwarded.append)
        channels.start()
        try:
            self.assertTrue(initializing.wait(1))
            self.wait_for(lambda: self.states()["webhook"] == "submitted")
            self.assertEqual(self.states()["crm"], "queued")
            self.assertEqual(forwarded, [self.payload])
        finally:
            release.set()
            channels.close()

    def test_slow_n8n_workflow_does_not_delay_crm_delivery(self):
        release = threading.Event()
        entered = threading.Event()

        def webhook(payload):
            entered.set()
            release.wait(5)

        channels = self.runner(FakeCRM, lambda: webhook)
        channels.start()
        try:
            self.assertTrue(entered.wait(1))
            self.wait_for(lambda: self.states()["crm"] == "submitted")
            self.assertEqual(self.states()["webhook"], "sending")
            crm = next(r for r in self.store.status(self.payload["submissionId"]) if r["channel"] == "crm")
            self.assertEqual(crm["crm_id"], "crm-created-id")
        finally:
            release.set()
            channels.close()

    def test_missing_crm_configuration_cannot_disable_n8n(self):
        attempts = []
        forwarded = []

        def broken_crm():
            attempts.append(1)
            raise ValueError("unavailable CRM contract")

        channels = self.runner(broken_crm, lambda: forwarded.append)
        channels.start()
        try:
            self.wait_for(lambda: channels.snapshot()["crm"] == "blocked")
            self.wait_for(lambda: self.states()["webhook"] == "submitted")
            self.assertEqual(len(attempts), 2)
            self.assertEqual(forwarded, [self.payload])
            self.assertEqual(self.states()["crm"], "queued")
        finally:
            channels.close()

    def test_bad_webhook_configuration_cannot_disable_crm(self):
        def broken_webhook():
            raise ValueError("unavailable n8n destination")

        channels = self.runner(FakeCRM, broken_webhook)
        channels.start()
        try:
            self.wait_for(lambda: channels.snapshot()["webhook"] == "blocked")
            self.wait_for(lambda: self.states()["crm"] == "submitted")
            self.assertEqual(self.states()["webhook"], "queued")
        finally:
            channels.close()

    def test_n8n_ambiguous_failure_keeps_its_own_status_and_does_not_block_crm(self):
        calls = []

        def webhook(payload):
            calls.append(payload)
            raise DeliveryError("webhook_result_unknown")

        channels = self.runner(FakeCRM, lambda: webhook)
        channels.start()
        try:
            self.wait_for(lambda: self.states()["crm"] == "submitted" and self.states()["webhook"] == "uncertain")
            self.assertEqual(calls, [self.payload])
        finally:
            channels.close()


if __name__ == "__main__":
    unittest.main()
