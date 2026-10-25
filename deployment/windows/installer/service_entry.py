"""Frozen Windows service entry. Configuration is read locally, never from argv secrets."""
import argparse
import json
import os
import sys
from pathlib import Path


def load_environment(filename):
    allowed = {
        "PAYAMGOSTAR_WSDL_URL", "PAYAMGOSTAR_ENDPOINT", "PAYAMGOSTAR_USERNAME",
        "PAYAMGOSTAR_PASSWORD", "PAYAMGOSTAR_CONTRACT_FILE", "PAYAMGOSTAR_ALLOW_HTTP",
        "PAYAMGOSTAR_SEARCH_QUERY_TEMPLATE", "PAYAMGOSTAR_SEARCH_TYPE_KEY",
        "PAYAMGOSTAR_SEARCH_QUERY_VERIFIED", "SANA_DB_PATH", "SANA_WEBHOOK_URL",
        "SANA_ALLOWED_ORIGIN", "SANA_INGEST_TOKEN", "SANA_BIND", "PORT",
    }
    settings = json.loads(Path(filename).read_text(encoding="utf-8-sig"))
    if not isinstance(settings, dict) or any(k not in allowed or not isinstance(v,str) for k,v in settings.items()):
        raise ValueError("Invalid private configuration")
    os.environ.update(settings)
    return settings


def ensure_store(settings):
    from services.payamgostar.store import Store
    path = Path(settings["SANA_DB_PATH"])
    stamp = path.parent / "storage.initialized.json"
    if path.exists():
        Store(str(path))
    else:
        if stamp.exists() or Path(str(path)+".instance").exists():
            raise RuntimeError("Storage is missing; refusing to reset its counter")
        Store.initialize(str(path))
    if not stamp.exists():
        descriptor = os.open(stamp,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(descriptor,"w",encoding="utf-8") as stream:
            json.dump({"storageInitialized":True},stream)
            stream.flush()
            os.fsync(stream.fileno())
    print("STORE_READY")


def self_test():
    import tempfile
    import threading
    from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
    from services.payamgostar.store import Store
    from services.payamgostar.soap import FormClient
    from services.payamgostar.profile import validate_owner_manifest,DOCUMENTED_SEARCH_TEMPLATE,DOCUMENTED_SEARCH_TYPE_KEY
    root=Path(sys._MEIPASS) if hasattr(sys,"_MEIPASS") else Path(__file__).resolve().parents[3]
    schemas=root/"services/payamgostar/contracts/owner-2.8.8.2"
    posts=[]
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            name=self.path.rsplit("/",1)[-1]
            if name not in {"form.wsdl", "xsd0.xsd","xsd1.xsd","xsd2.xsd","xsd3.xsd","xsd4.xsd"}:
                self.send_response(404);self.end_headers();return
            self.send_response(200);self.end_headers();self.wfile.write((schemas/name).read_bytes())
        def do_POST(self):
            posts.append(True);self.send_response(405);self.end_headers()
    with tempfile.TemporaryDirectory() as temp:
        settings={"SANA_DB_PATH":str(Path(temp)/"outbox.sqlite")}
        ensure_store(settings)
        store=Store(settings["SANA_DB_PATH"])
        payload={"submissionId":"packaging-test-0001","fullName":"کاربر آزمایشی",
                 "mobile":"09123456789","labName":"آزمایشگاه آزمایشی","time":"2026-01-01T00:00:00Z"}
        assert store.enqueue(payload)=="DeviceOpp100100"
        ensure_store(settings)
        assert Store(settings["SANA_DB_PATH"]).enqueue(payload)=="DeviceOpp100100"
        server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            base="http://127.0.0.1:"+str(server.server_port)
            client=FormClient(base+"/form.wsdl",base+"/Services/API/IForm.svc","dummy-user","dummy-password",None,allow_http=True)
            validate_owner_manifest(client,DOCUMENTED_SEARCH_TEMPLATE,True,DOCUMENTED_SEARCH_TYPE_KEY)
            assert not posts
        finally:
            server.shutdown();server.server_close();thread.join()
    print("FROZEN_SELF_TEST_PASS: SQLite restart, Unicode, WSDL/XSD imports, XML preflight; zero SOAP writes")


def main():
    parser=argparse.ArgumentParser(add_help=False)
    parser.add_argument("--env-file")
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--ensure-store",action="store_true")
    options,remaining=parser.parse_known_args()
    if options.self_test:
        self_test();return
    if not options.env_file:
        raise ValueError("Private configuration file required")
    settings=load_environment(options.env_file)
    if options.ensure_store:
        ensure_store(settings);return
    from services.payamgostar.__main__ import main as service_main
    sys.argv=[sys.argv[0],*remaining]
    service_main()


if __name__=="__main__":
    try:
        main()
    except Exception as error:
        print("SERVICE_FAILED:"+type(error).__name__)
        raise SystemExit(1) from None
