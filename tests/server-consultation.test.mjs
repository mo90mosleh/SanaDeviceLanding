import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/consultation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { createConsultationSender } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);

test("Server mode preserves the first timestamp and submission ID across retries", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let fail = true;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (fail) throw new Error("ambiguous transport failure");
    return Response.json({ status: "submitted" });
  };
  const payload = {
    name: "کاربر آزمایشی",
    organization: "آزمایشگاه مهر",
    mobile: "09123456789",
    productModel: "FS-114",
    manufacturer: "Wondfo",
    productCategory: "POCT",
    landingPage: "/poct/fs-114",
    utm: { utm_source: "actual-qr", utm_campaign: "actual-campaign" },
  };
  try {
    const send = createConsultationSender(true, "https://gateway.example.test/api/leads");
    await assert.rejects(send(payload));
    fail = false;
    await send({ ...payload, utm: { utm_campaign: "actual-campaign", utm_source: "actual-qr" } });
    assert.equal(calls[0].body.submissionId, calls[1].body.submissionId);
    assert.equal(calls[0].body.time, calls[1].body.time);
    assert.equal(calls[1].body.product, "FS-114");
    assert.equal(calls[1].body.company, "Wondfo");
    assert.equal(calls[1].body.source, "actual-qr");
    assert.equal(calls[1].body.medium, "");
    assert.equal(calls[1].body.campaign, "actual-campaign");
    await send(payload);
    assert.notEqual(calls[2].body.submissionId, calls[0].body.submissionId);
    const direct = createConsultationSender(false, "https://webhook.example.test");
    await direct(payload);
    assert.equal(calls[3].body.submissionId, undefined);
  } finally {
    globalThis.fetch = original;
  }
});
