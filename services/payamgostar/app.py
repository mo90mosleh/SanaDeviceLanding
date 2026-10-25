import hmac
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from .mapping import InvalidLead
from .soap import DeliveryError
from .store import Conflict
from .channels import DeliveryChannels


def required(name):
    value = os.environ.get(name, "")
    if not value:
        raise ValueError("Missing server environment variable: " + name)
    return value


def forward_webhook(url):
    import requests

    if (
        urlsplit(url).scheme != "https"
        or urlsplit(url).username
        or urlsplit(url).password
    ):
        raise ValueError("The existing webhook must use a credential-free HTTPS URL")

    def send(payload):
        try:
            response = requests.post(
                url, json=payload, timeout=(5, 20), allow_redirects=False
            )
            if not 200 <= response.status_code < 300:
                raise DeliveryError("webhook_non_success")
        except requests.ConnectTimeout:
            raise DeliveryError("webhook_connect_timeout", "retry") from None
        except requests.RequestException:
            raise DeliveryError("webhook_result_unknown") from None

    return send


def make_handler(store, allowed_origin, token="", channel_status=None):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Never log bodies, credentials, query strings or contact information.

        def respond(self, status, payload):
            data = json.dumps(payload).encode()
            self.send_response(status)
            if self.headers.get("Origin") == allowed_origin:
                self.send_header("Access-Control-Allow-Origin", allowed_origin)
                self.send_header("Vary", "Origin")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            self.respond(
                200 if self.path == "/healthz" else 404,
                (
                    {"status": "ready", **({"channels": channel_status()} if channel_status else {})}
                    if self.path == "/healthz"
                    else {"error": "not_found"}
                ),
            )

        def do_OPTIONS(self):
            if (
                self.path != "/api/leads"
                or self.headers.get("Origin") != allowed_origin
            ):
                return self.respond(403, {"error": "forbidden"})
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_POST(self):
            if self.path != "/api/leads":
                return self.respond(404, {"error": "not_found"})
            browser = self.headers.get("Origin") == allowed_origin
            authorized = bool(token) and hmac.compare_digest(
                self.headers.get("Authorization", ""), "Bearer " + token
            )
            if not (browser or authorized):
                return self.respond(403, {"error": "forbidden"})
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.respond(415, {"error": "json_required"})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 65536:
                    return self.respond(413, {"error": "invalid_body_size"})
                payload = json.loads(self.rfile.read(size))
                store.enqueue(payload)
                # Durable local acceptance, not a claim of downstream CRM completion.
                return self.respond(
                    200,
                    {"status": "submitted", "submissionId": payload["submissionId"]},
                )
            except Conflict:
                return self.respond(409, {"error": "idempotency_conflict"})
            except (InvalidLead, ValueError, UnicodeError):
                return self.respond(422, {"error": "invalid_lead"})
            except Exception:
                return self.respond(503, {"error": "durable_acceptance_failed"})

    return Handler


def serve(store, crm_factory):
    origin = required("SANA_ALLOWED_ORIGIN")
    parsed = urlsplit(origin)
    if parsed.scheme != "https" or parsed.path not in ("", "/") or origin.endswith("/"):
        raise ValueError(
            "SANA_ALLOWED_ORIGIN must be an HTTPS origin without a trailing slash"
        )
    channels = DeliveryChannels(
        store, crm_factory, lambda: forward_webhook(required("SANA_WEBHOOK_URL"))
    )
    http = ThreadingHTTPServer(
        (os.environ.get("SANA_BIND", "127.0.0.1"), int(os.environ.get("PORT", "8081"))),
        make_handler(store, origin, os.environ.get("SANA_INGEST_TOKEN", ""), channels.snapshot),
    )
    http.timeout = 15
    channels.start()
    try:
        http.serve_forever()
    finally:
        http.server_close()
        channels.close()
