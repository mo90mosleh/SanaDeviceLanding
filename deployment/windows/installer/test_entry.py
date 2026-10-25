import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path


spec=importlib.util.spec_from_file_location("service_entry",Path(__file__).with_name("service_entry.py"))
entry=importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


class InstallerEntryTests(unittest.TestCase):
    def test_utf8_private_config_and_rejecting_unknown_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"config.json"
            original=os.environ.get("PAYAMGOSTAR_USERNAME")
            try:
                path.write_text(json.dumps({"PAYAMGOSTAR_USERNAME":"کاربر آزمایشی"},ensure_ascii=False),encoding="utf-8")
                entry.load_environment(path)
                self.assertEqual(os.environ["PAYAMGOSTAR_USERNAME"],"کاربر آزمایشی")
                path.write_text(json.dumps({"PATH":"bad"}),encoding="utf-8")
                with self.assertRaises(ValueError):entry.load_environment(path)
            finally:
                if original is None:os.environ.pop("PAYAMGOSTAR_USERNAME",None)
                else:os.environ["PAYAMGOSTAR_USERNAME"]=original

    def test_reinstall_reopens_store_without_resetting_subject(self):
        from services.payamgostar.store import Store
        with tempfile.TemporaryDirectory() as temp:
            settings={"SANA_DB_PATH":str(Path(temp)/"outbox.sqlite")}
            entry.ensure_store(settings)
            payload={"submissionId":"installer-unit-0001","fullName":"کاربر آزمایشی","labName":"آزمایشگاه آزمایشی","mobile":"09123456789"}
            self.assertEqual(Store(settings["SANA_DB_PATH"]).enqueue(payload),"DeviceOpp100100")
            entry.ensure_store(settings)
            payload["submissionId"]="installer-unit-0002"
            self.assertEqual(Store(settings["SANA_DB_PATH"]).enqueue(payload),"DeviceOpp100101")

    def test_missing_initialized_disk_never_creates_a_new_counter(self):
        with tempfile.TemporaryDirectory() as temp:
            settings={"SANA_DB_PATH":str(Path(temp)/"outbox.sqlite")}
            (Path(temp)/"storage.initialized.json").write_text('{}')
            with self.assertRaises(RuntimeError):entry.ensure_store(settings)
            self.assertFalse(Path(settings["SANA_DB_PATH"]).exists())


if __name__=="__main__":unittest.main()
