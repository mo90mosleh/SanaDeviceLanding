import argparse
import json
import logging
import os
from pathlib import Path
from .app import required, serve
from .soap import FormClient
from .store import Store
from .profile import validate_owner_manifest


def configured_crm(inspect_only=False):
    return FormClient(
        required("PAYAMGOSTAR_WSDL_URL"),
        required("PAYAMGOSTAR_ENDPOINT"),
        os.environ.get("PAYAMGOSTAR_USERNAME", "") if inspect_only else required("PAYAMGOSTAR_USERNAME"),
        os.environ.get("PAYAMGOSTAR_PASSWORD", "") if inspect_only else required("PAYAMGOSTAR_PASSWORD"),
        None if inspect_only else required("PAYAMGOSTAR_CONTRACT_FILE"),
        allow_http=os.environ.get("PAYAMGOSTAR_ALLOW_HTTP") == "true",
    )


def main():
    os.umask(0o077)
    logging.getLogger("zeep").setLevel(logging.CRITICAL)
    logging.getLogger("urllib3").setLevel(logging.CRITICAL)
    parser = argparse.ArgumentParser(description="SANA server-only Form outbox")
    parser.add_argument(
        "command",
        choices=("init-db", "inspect-wsdl", "prepare-contract", "check-contract", "serve", "status"),
    )
    parser.add_argument("--submission-id")
    parser.add_argument("--output")
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
    if args.command == "serve":
        # Bind ingestion without waiting for WSDL, credentials, or the n8n endpoint.
        serve(Store(required("SANA_DB_PATH")), configured_crm)
        return
    if args.command == "prepare-contract":
        template = required("PAYAMGOSTAR_SEARCH_QUERY_TEMPLATE")
        if os.environ.get("PAYAMGOSTAR_SEARCH_QUERY_VERIFIED") != "true":
            raise ValueError("A verified SearchForm query is required")
        client = configured_crm(inspect_only=True)
        manifest = validate_owner_manifest(client, template, True)
        filename = Path(args.output or required("PAYAMGOSTAR_CONTRACT_FILE"))
        if not filename.is_absolute():
            raise ValueError("Contract file must use an absolute private path")
        descriptor = os.open(filename, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(manifest, stream, ensure_ascii=False, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        print("Owner Form contract pinned to loaded WSDL; local serialization passed; no SOAP operation called")
        return
    client = configured_crm(inspect_only=args.command == "inspect-wsdl")
    if args.command == "inspect-wsdl":
        print(json.dumps(client.inspect(), ensure_ascii=False, indent=2))
    elif args.command == "check-contract":
        print(
            "WSDL fingerprint, operations and schema serialization verified; no SOAP operation called"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # No raw exceptions: requests/Zeep errors can include addresses and credentials.
        print("PayamGostar service did not start: " + type(error).__name__)
        raise SystemExit(1) from None
