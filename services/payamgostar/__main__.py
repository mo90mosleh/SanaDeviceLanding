import argparse
import json
import logging
import os
from .app import required, serve
from .soap import FormClient
from .store import Store


def main():
    os.umask(0o077)
    logging.getLogger("zeep").setLevel(logging.CRITICAL)
    logging.getLogger("urllib3").setLevel(logging.CRITICAL)
    parser = argparse.ArgumentParser(description="SANA server-only Form outbox")
    parser.add_argument(
        "command",
        choices=("init-db", "inspect-wsdl", "check-contract", "serve", "status"),
    )
    parser.add_argument("--submission-id")
    args = parser.parse_args()
    if args.command == "init-db":
        Store.initialize(required("SANA_DB_PATH"))
        print("Durable store initialized; counter starts at DeviceOpp100100")
        return
    if args.command == "status":
        if not args.submission_id:
            parser.error("--submission-id is required")
        print(json.dumps(Store(required("SANA_DB_PATH")).status(args.submission_id)))
        return
    store = Store(required("SANA_DB_PATH")) if args.command == "serve" else None
    client = FormClient(
        required("PAYAMGOSTAR_WSDL_URL"),
        required("PAYAMGOSTAR_ENDPOINT"),
        (
            os.environ.get("PAYAMGOSTAR_USERNAME", "")
            if args.command == "inspect-wsdl"
            else required("PAYAMGOSTAR_USERNAME")
        ),
        (
            os.environ.get("PAYAMGOSTAR_PASSWORD", "")
            if args.command == "inspect-wsdl"
            else required("PAYAMGOSTAR_PASSWORD")
        ),
        (
            None
            if args.command == "inspect-wsdl"
            else required("PAYAMGOSTAR_CONTRACT_FILE")
        ),
        allow_http=os.environ.get("PAYAMGOSTAR_ALLOW_HTTP") == "true",
    )
    if args.command == "inspect-wsdl":
        print(json.dumps(client.inspect(), ensure_ascii=False, indent=2))
    elif args.command == "check-contract":
        print(
            "WSDL fingerprint, operations and schema serialization verified; no SOAP operation called"
        )
    else:
        serve(store, client)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # No raw exceptions: requests/Zeep errors can include addresses and credentials.
        print("PayamGostar service did not start: " + type(error).__name__)
        raise SystemExit(1) from None
