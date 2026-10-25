import concurrent.futures
import copy
import json
import tempfile
import unittest
from pathlib import Path
from services.payamgostar.mapping import map_fields,InvalidLead
from services.payamgostar.store import Store,Conflict
from services.payamgostar.worker import Worker
from services.payamgostar.soap import DeliveryError


def lead(i=0):
    return {"submissionId":f"test-submission-{i:08d}","name":"مریم احمدی","fullName":"مریم احمدی",
            "mobile":"09123456789","organization":"آزمایشگاه مهر","labName":"آزمایشگاه مهر",
            "productModel":"FS-114","product":"FS-114","manufacturer":"Wondfo","company":"Wondfo",
            "time":"2026-10-25T03:12:34.123Z","honeypot":"",
            "utm":{"utm_campaign":"real-campaign","utm_source":"qr","utm_medium":"print",
                   "utm_content":"device-114","utm_term":"finecare"},
            "campaign":"real-campaign","source":"qr","medium":"print","content":"device-114","term":"finecare"}


def enqueue_process(args):
    filename,i=args
    return Store(filename).enqueue(lead(i))


class FakeCRM:
    def __init__(self,error=None,match=None):
        self.error,self.match=error,match
        self.saves=self.reads=0
    def save(self,item):
        self.saves+=1
        if self.error:raise self.error
        return "crm-created-id"
    def reconcile(self,item):
        self.reads+=1
        return self.match


class MappingTests(unittest.TestCase):
    def test_actual_payload_and_all_eleven_userkeys(self):
        fields=map_fields(lead())
        self.assertEqual(len(fields),11)
        self.assertEqual(fields["DeviceOppLeadName"],"مریم احمدی")
        self.assertEqual(fields["DeviceOppOrgName"],"آزمایشگاه مهر")
        self.assertEqual(fields["DeviceOppTimeOfDataEntry"],lead()["time"])
        self.assertEqual(fields["DeviceOppProduct"],"FS-114")
        self.assertEqual(fields["DeviceOppCompany"],"Wondfo")
        for name in ("Campaign","Source","Medium","Content","Term"):
            self.assertEqual(fields["DeviceOpp"+name],lead()[name.lower()])
    def test_requested_capitalization_and_missing_values_not_invented(self):
        fields=map_fields({"fullName":"مریم احمدی","Mobile":"09123456789","LabName":"مرکز مهر"})
        self.assertEqual(fields["DeviceOppTimeOfDataEntry"],"")
        self.assertEqual(fields["DeviceOppProduct"],"")
        self.assertEqual(fields["DeviceOppCampaign"],"")
        self.assertEqual(fields["DeviceOppCompany"],"")
    def test_conflicting_aliases_and_non_text_values_rejected(self):
        for update in ({"Mobile":"09999999999"},{"company":4},{"source":"changed"},{"utm":None}):
            with self.assertRaises(InvalidLead):map_fields({**lead(),**update})


class OutboxTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=str(Path(self.temp.name)/"outbox.sqlite")
        self.store=Store.initialize(self.path)
    def tearDown(self):self.temp.cleanup()
    def due(self):
        with self.store.transaction() as db:db.execute("UPDATE deliveries SET available_at=0")
    def test_missing_or_replaced_storage_refuses_counter_reset(self):
        with self.assertRaises(FileExistsError):Store.initialize(self.path)
        with self.assertRaises(RuntimeError):Store(str(Path(self.temp.name)/"missing.sqlite"))
        Path(self.path+".instance").write_text("different-volume")
        with self.assertRaises(RuntimeError):Store(self.path)
    def test_first_subject_restart_and_idempotent_submission(self):
        self.assertEqual(self.store.enqueue(lead()),"DeviceOpp100100")
        self.assertEqual(Store(self.path).enqueue(lead()),"DeviceOpp100100")
        self.assertEqual(Store(self.path).enqueue(lead(1)),"DeviceOpp100101")
        changed=lead();changed["time"]="2026-10-26T00:00:00Z"
        with self.assertRaises(Conflict):self.store.enqueue(changed)
        self.assertEqual(self.store.enqueue(lead(2)),"DeviceOpp100102")
    def test_parallel_processes_have_atomic_unique_contiguous_subjects(self):
        with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
            subjects=list(pool.map(enqueue_process,[(self.path,i) for i in range(32)]))
        self.assertEqual(sorted(int(s.removeprefix("DeviceOpp")) for s in subjects),list(range(100100,100132)))
    def test_parallel_duplicates_allocate_one_subject_and_two_deliveries(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            subjects=list(pool.map(lambda _:Store(self.path).enqueue(lead()),range(24)))
        self.assertEqual(set(subjects),{"DeviceOpp100100"})
        self.assertEqual(len(self.store.status(lead()["submissionId"])),2)
        self.assertEqual(self.store.enqueue(lead(1)),"DeviceOpp100101")
    def test_expired_send_is_uncertain_and_old_worker_cannot_overwrite(self):
        self.store.enqueue(lead())
        first=self.store.claim("crm",now=10,lease=2)
        second=self.store.claim("crm",now=13)
        self.assertTrue(second["reconcile"])
        self.assertFalse(self.store.finish(first,"submitted",crm_id="stale"))
        self.assertTrue(self.store.finish(second,"submitted",crm_id="matched"))
    def test_ambiguous_timeout_matches_existing_record_without_second_save(self):
        self.store.enqueue(lead())
        crm=FakeCRM(DeliveryError("read_timeout"),"previous-crm-id")
        worker=Worker(self.store,crm,lambda payload:None)
        worker.tick("crm");self.due();worker.tick("crm")
        self.assertEqual((crm.saves,crm.reads),(1,1))
        state=[r for r in self.store.status(lead()["submissionId"]) if r["channel"]=="crm"][0]
        self.assertEqual((state["state"],state["crm_id"]),("submitted","previous-crm-id"))
    def test_not_found_after_timeout_never_blindly_creates_a_second_form(self):
        self.store.enqueue(lead())
        crm=FakeCRM(DeliveryError("unknown"))
        worker=Worker(self.store,crm,lambda p:None,max_reconciliations=3)
        for _ in range(8):worker.tick("crm");self.due()
        self.assertEqual((crm.saves,crm.reads),(1,3))
        self.assertEqual(self.store.status(lead()["submissionId"])[0]["state"],"needs_review")
    def test_definitely_unsent_connect_timeout_has_bounded_retries(self):
        self.store.enqueue(lead())
        crm=FakeCRM(DeliveryError("connect_timeout","retry"))
        worker=Worker(self.store,crm,lambda p:None,max_attempts=3)
        for _ in range(7):worker.tick("crm");self.due()
        self.assertEqual(crm.saves,3)
        self.assertEqual(crm.reads,0)
    def test_crm_rejection_preserves_lead_and_original_webhook_payload(self):
        original=lead();self.store.enqueue(original)
        forwarded=[]
        worker=Worker(self.store,FakeCRM(DeliveryError("crm_rejected","permanent")),forwarded.append)
        worker.tick("crm");worker.tick("webhook")
        self.assertEqual(forwarded,[original])
        states={r["channel"]:r["state"] for r in self.store.status(original["submissionId"])}
        self.assertEqual(states,{"crm":"failed","webhook":"submitted"})
    def test_honeypot_is_stored_and_forwarded_but_never_saved_to_crm(self):
        payload=lead();payload["honeypot"]="bot-trap"
        self.store.enqueue(payload)
        forwarded=[];crm=FakeCRM()
        worker=Worker(self.store,crm,forwarded.append)
        worker.tick("crm");worker.tick("webhook")
        self.assertEqual(crm.saves,0)
        self.assertEqual(forwarded[0]["honeypot"],"bot-trap")


if __name__=="__main__":unittest.main()
