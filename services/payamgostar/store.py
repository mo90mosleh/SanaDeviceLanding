import json
import os
import re
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from .mapping import canonical, fingerprint, map_fields, InvalidLead


class Conflict(ValueError):
    pass


class Store:
    """One durable local volume, multiple processes; never use an ephemeral/NFS mount."""

    def __init__(self, filename):
        self.path = Path(filename)
        marker = Path(str(self.path) + ".instance")
        if (
            not self.path.is_absolute()
            or not self.path.is_file()
            or not marker.is_file()
        ):
            raise RuntimeError(
                "Initialize a durable absolute database path explicitly before startup"
            )
        self.instance = marker.read_text().strip()
        with self.db() as db:
            row = db.execute("SELECT instance FROM metadata").fetchone()
            if not row or row[0] != self.instance:
                raise RuntimeError(
                    "Database/volume identity mismatch; refusing to reset the counter"
                )
            if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise RuntimeError("Database integrity check failed")

    @staticmethod
    def initialize(filename):
        path = Path(filename)
        if not path.is_absolute() or not path.parent.is_dir():
            raise ValueError("Existing durable directory and absolute path required")
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(descriptor)
        instance = str(uuid.uuid4())
        with sqlite3.connect(path) as db:
            db.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=FULL;
                CREATE TABLE metadata(instance TEXT NOT NULL);
                CREATE TABLE counter(id INTEGER PRIMARY KEY CHECK(id=1), next_value INTEGER NOT NULL);
                INSERT INTO counter VALUES(1,100100);
                CREATE TABLE leads(
                    submission_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL,
                    subject TEXT UNIQUE NOT NULL, payload TEXT NOT NULL, fields TEXT NOT NULL,
                    received_at REAL NOT NULL);
                CREATE TABLE deliveries(
                    submission_id TEXT NOT NULL REFERENCES leads(submission_id), channel TEXT NOT NULL,
                    state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                    reconciliations INTEGER NOT NULL DEFAULT 0, available_at REAL NOT NULL DEFAULT 0,
                    lease_until REAL, token TEXT, crm_id TEXT, last_error TEXT,
                    PRIMARY KEY(submission_id,channel));
            """
            )
            db.execute("INSERT INTO metadata VALUES(?)", (instance,))
        marker = Path(str(path) + ".instance")
        descriptor = os.open(marker, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            stream.write(instance)
            stream.flush()
            os.fsync(stream.fileno())
        return Store(filename)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=15, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA synchronous=FULL")
        db.execute("PRAGMA busy_timeout=15000")
        try:
            yield db
        finally:
            db.close()

    @contextmanager
    def transaction(self):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                yield db
                db.commit()
            except BaseException:
                db.rollback()
                raise

    def enqueue(self, payload):
        key = payload.get("submissionId") if isinstance(payload, dict) else None
        if not isinstance(key, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{16,100}", key):
            raise InvalidLead("Stable submissionId required")
        fields = map_fields(payload)
        digest = fingerprint(payload)
        with self.transaction() as db:
            old = db.execute(
                "SELECT * FROM leads WHERE submission_id=?", (key,)
            ).fetchone()
            if old:
                if old["fingerprint"] != digest:
                    raise Conflict(
                        "submissionId already belongs to a different payload"
                    )
                return old["subject"]
            number = db.execute("SELECT next_value FROM counter WHERE id=1").fetchone()[
                0
            ]
            subject = "DeviceOpp" + str(number)
            db.execute("UPDATE counter SET next_value=next_value+1 WHERE id=1")
            db.execute(
                "INSERT INTO leads VALUES(?,?,?,?,?,?)",
                (
                    key,
                    digest,
                    subject,
                    canonical(payload),
                    canonical(fields),
                    time.time(),
                ),
            )
            for channel in ("webhook", "crm"):
                state = (
                    "filtered"
                    if channel == "crm" and payload.get("honeypot")
                    else "queued"
                )
                db.execute(
                    "INSERT INTO deliveries(submission_id,channel,state) VALUES(?,?,?)",
                    (key, channel, state),
                )
            return subject

    def claim(self, channel, now=None, lease=180):
        now = time.time() if now is None else now
        with self.transaction() as db:
            # A dead worker may already have committed remotely. NEVER turn this into queued.
            db.execute(
                """UPDATE deliveries SET state='uncertain', token=NULL, lease_until=NULL
                          WHERE channel=? AND state IN ('sending','reconciling') AND lease_until<?""",
                (channel, now),
            )
            row = db.execute(
                """SELECT d.*,l.subject,l.payload,l.fields FROM deliveries d JOIN leads l
                              USING(submission_id) WHERE channel=? AND state IN ('queued','retry','uncertain')
                              AND available_at<=? ORDER BY l.received_at LIMIT 1""",
                (channel, now),
            ).fetchone()
            if not row:
                return None
            item = dict(row)
            token = str(uuid.uuid4())
            reconcile = item["state"] == "uncertain"
            db.execute(
                """UPDATE deliveries SET state=?,token=?,lease_until=?,
                          attempts=attempts+?,reconciliations=reconciliations+?
                          WHERE submission_id=? AND channel=?""",
                (
                    "reconciling" if reconcile else "sending",
                    token,
                    now + lease,
                    0 if reconcile else 1,
                    1 if reconcile else 0,
                    item["submission_id"],
                    channel,
                ),
            )
            item.update(
                token=token,
                reconcile=reconcile,
                attempts=item["attempts"] + (not reconcile),
                reconciliations=item["reconciliations"] + reconcile,
            )
            item["payload"] = json.loads(item["payload"])
            item["fields"] = json.loads(item["fields"])
            return item

    def finish(self, item, state, error=None, crm_id=None, delay=0):
        with self.transaction() as db:
            changed = db.execute(
                """UPDATE deliveries SET state=?,last_error=?,crm_id=COALESCE(?,crm_id),
                                    available_at=?,lease_until=NULL,token=NULL
                                    WHERE submission_id=? AND channel=? AND token=?""",
                (
                    state,
                    error,
                    crm_id,
                    time.time() + delay,
                    item["submission_id"],
                    item["channel"],
                    item["token"],
                ),
            ).rowcount
            return bool(changed)

    def status(self, key):
        with self.db() as db:
            return [
                dict(row)
                for row in db.execute(
                    "SELECT channel,state,attempts,reconciliations,crm_id,last_error FROM deliveries WHERE submission_id=?",
                    (key,),
                )
            ]
