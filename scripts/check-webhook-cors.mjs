import assert from "node:assert/strict";
import { pagesUrl } from "./github-pages-config.mjs";

const endpoint = "https://n8n.alecasgari.com/webhook/83591aad-47e3-475b-99a9-2f3d6d408e00";
const origin = new URL(pagesUrl).origin;
const response = await fetch(endpoint, {
  method: "OPTIONS",
  headers: {
    Origin: origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
  signal: AbortSignal.timeout(20_000),
});
const allowedOrigin = response.headers.get("access-control-allow-origin");
const allowedMethods = response.headers.get("access-control-allow-methods") || "";
const allowedHeaders = response.headers.get("access-control-allow-headers") || "";
console.log(
  "WEBHOOK CORS " +
    JSON.stringify({
      origin,
      status: response.status,
      allowedOrigin,
      allowedMethods,
      allowedHeaders,
    }),
);
assert.ok(response.ok, "The n8n webhook must accept the browser preflight");
assert.ok(["*", origin].includes(allowedOrigin), "n8n must allow the published site origin");
assert.match(allowedMethods, /POST/iu);
assert.ok(allowedHeaders === "*" || /content-type/iu.test(allowedHeaders));
console.log("WEBHOOK CORS PASS: direct JSON submission is permitted for the published site origin");
