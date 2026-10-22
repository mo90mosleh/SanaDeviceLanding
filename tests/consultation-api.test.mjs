import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test, before, after } from "node:test";

const origin = process.env.SANA_TEST_URL || "http://127.0.0.1:4173";
const records = [];
let mode = "success";
const webhook = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  records.push(JSON.parse(Buffer.concat(chunks).toString()));
  if (mode === "timeout") return;
  response.writeHead(mode === "failure" ? 500 : 200, { "Content-Type": "text/plain" });
  response.end(mode === "failure" ? "failed" : "Workflow was started");
});
before(async () => new Promise((resolve) => webhook.listen(4180, "127.0.0.1", resolve)));
after(async () => {
  webhook.closeAllConnections();
  await new Promise((resolve) => webhook.close(resolve));
});
const payload = {
  name: "  کاربر آزمایشی  ",
  organization: "آزمایشگاه آزمایشی",
  mobile: "۰۹۱۲۳۴۵۶۷۸۹",
  productModel: "BHA5000",
  manufacturer: "untrusted",
  productCategory: "untrusted",
  landingPage: "/",
  utm: { utm_source: "qa", utm_campaign: "lead-check", ignored: "do not forward" },
  extra: "do not forward",
};
const post = (data) => fetch(origin + "/api/consultation", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
});

test("Webhook configuration stays out of browser JavaScript", async () => {
  const root = ".output/public";
  const files = (await readdir(root, { recursive: true })).filter((file) => file.endsWith(".js"));
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.doesNotMatch(await readFile(path.join(root, file), "utf8"), /SANA_LEAD_WEBHOOK_URL/u, file);
  }
});

test("Homepage and device leads reach the webhook with canonical product and normalized contact details", async () => {
  for (const landingPage of ["/", "/cbc/bha5000"]) {
    const response = await post({ ...payload, landingPage });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "submitted" });
    assert.match(response.headers.get("cache-control"), /no-store/u);
    assert.deepEqual(records.at(-1), {
      name: "کاربر آزمایشی", organization: payload.organization, mobile: "09123456789",
      productModel: "BHA5000", manufacturer: "Getein", productCategory: "CBC", landingPage,
      utm: { utm_source: "qa", utm_campaign: "lead-check" },
    });
  }
});
test("Invalid fields, unknown products and spoofed source pages never reach the webhook", async () => {
  const count = records.length;
  for (const changes of [{ name: "" }, { mobile: "abc" }, { productModel: "unknown" }, { landingPage: "/poct/fs-205" }]) {
    assert.equal((await post({ ...payload, ...changes })).status, 422);
  }
  const malformed = await fetch(origin + "/api/consultation", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  const oversized = await fetch(origin + "/api/consultation", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(8193) });
  assert.equal(oversized.status, 413);
  assert.equal((await fetch(origin + "/api/consultation", { method: "POST", body: "{}" })).status, 415);
  assert.equal(records.length, count);
});
test("Webhook failures never produce a success acknowledgement or retry a lead", async () => {
  mode = "failure";
  const count = records.length;
  const response = await post(payload);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).status, undefined);
  assert.equal(records.length, count + 1);
  mode = "success";
});
test("A stalled webhook times out without reporting a successful submission", async () => {
  mode = "timeout";
  const started = Date.now();
  const response = await post(payload);
  assert.equal(response.status, 502);
  assert.ok(Date.now() - started >= 9000);
  assert.ok(Date.now() - started < 14_000);
  mode = "success";
});
