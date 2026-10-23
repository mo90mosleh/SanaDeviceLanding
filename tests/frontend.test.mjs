import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
async function moduleFrom(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
}
const { validateLead, acceptsMobileEdit, submitConsultation, consultationEndpoint } =
  await moduleFrom("../src/lib/consultation.ts");
const { captureAttribution } = await moduleFrom("../src/lib/attribution.ts");
const { products } = await moduleFrom("../src/components/landing/products.ts");
const valid = {
  name: "کاربر آزمایشی",
  mobile: "09123456789",
  organization: "مرکز آزمایشی",
};
test("Mobile validation accepts only eleven ASCII digits starting with 09", () => {
  assert.deepEqual(validateLead(valid), {});
  for (const mobile of ["۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩", "+989123456789", "00989123456789", "0912 345 6789", "0912-3456789", "09abcdefghi"]) {
    assert.ok(validateLead({ ...valid, mobile }).mobile);
  }
});
test("Mobile edits permit only the 09 prefix and eleven ASCII digits", () => {
  for (const value of ["", "0", "09", "0912", "09123456789"]) assert.equal(acceptsMobileEdit(value), true);
  for (const value of ["1", "9", "00", "02", "099999999999", "۰۹", "٠٩", "+98", "09 ", "09-", "09a"]) assert.equal(acceptsMobileEdit(value), false);
});
test("Invalid mobile and missing fields produce field errors", () => {
  for (const mobile of ["02112345678", "091234", "091234567890", "+971912345678", "abc"])
    assert.ok(validateLead({ ...valid, mobile }).mobile);
  assert.equal(Object.keys(validateLead({ name: "", mobile: "", organization: "" })).length, 3);
});
test("Names and laboratory names enforce a 100-character maximum", () => {
  for (const key of ["name", "organization"]) {
    assert.deepEqual(validateLead({ ...valid, [key]: "ا".repeat(100) }), {});
    assert.ok(validateLead({ ...valid, [key]: "ا".repeat(101) })[key]);
  }
});
test("Submission posts JSON to the configured webhook and requires HTTP acknowledgement", async () => {
  const originalFetch = globalThis.fetch;
  const payload = {
    ...valid,
    mobile: "09123456789",
    productModel: "FS-114",
    manufacturer: "Wondfo",
    productCategory: "POCT",
    landingPage: "/poct/fs-114",
    utm: {
      utm_source: "integration-test",
      utm_medium: "qa",
      utm_campaign: "sana-webhook-check",
      utm_content: "popup-verification",
      utm_term: "fs-114",
    },
  };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ status: "submitted" });
  };
  try {
    assert.deepEqual(await submitConsultation(payload), { status: "submitted" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, consultationEndpoint);
    assert.equal(calls[0].options.mode, "cors");
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.method, "POST");
    const body = JSON.parse(calls[0].options.body);
    assert.deepEqual(body, {
      ...payload,
      honeypot: "",
      fullName: payload.name,
      labName: payload.organization,
      product: "FS-114",
      company: "Wondfo",
      pageUrl: "/poct/fs-114",
      campaign: "sana-webhook-check",
      source: "integration-test",
      medium: "qa",
      content: "popup-verification",
      term: "fs-114",
      time: body.time,
    });
    assert.ok(Number.isFinite(Date.parse(body.time)));
    assert.ok(calls[0].options.signal instanceof AbortSignal);
    await submitConsultation({ ...payload, honeypot: "https://bot.invalid" });
    assert.equal(JSON.parse(calls.at(-1).options.body).honeypot, "https://bot.invalid", "n8n receives the unmodified trap value for filtering");
    for (const response of [
      new Response("failed", { status: 502 }),
      new Response(null, { status: 400 }),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(submitConsultation(payload));
    }
    globalThis.fetch = async () => new Response("Workflow was started", { status: 200 });
    assert.deepEqual(await submitConsultation(payload), { status: "submitted" });
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    await assert.rejects(submitConsultation(payload));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("UTM persists through page navigation, resets for a new campaign, ignores other input", () => {
  let value = null;
  const storage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
  const a = captureAttribution(
    "?utm_source=exhibition&utm_medium=qr&utm_campaign=sana&utm_content=stand&utm_term=poct&mobile=private",
    storage,
  );
  assert.equal(Object.keys(a).length, 5);
  assert.deepEqual(captureAttribution("", storage), a);
  assert.deepEqual(captureAttribution("?utm_source=new", storage), { utm_source: "new" });
  assert.ok(!value.includes("private"));
});
test("Malformed or unavailable browser storage does not break UTM capture", () => {
  assert.deepEqual(
    captureAttribution("?utm_medium=qr", {
      getItem: () => "{bad",
      setItem: () => {
        throw Error("blocked");
      },
    }),
    { utm_medium: "qr" },
  );
  assert.deepEqual(captureAttribution("", { getItem: () => "null", setItem: () => {} }), {});
});
test("Five products have unique routes and real images and model-specific catalogs", () => {
  assert.equal(products.length, 5);
  assert.equal(products.filter((p) => p.category === "CBC").length, 3);
  assert.equal(products.filter((p) => p.category === "POCT").length, 2);
  assert.equal(new Set(products.map((p) => p.route)).size, 5);
  for (const p of products) {
    for (const path of [p.image, p.catalog])
      assert.ok(existsSync(new URL("../public" + path, import.meta.url)), path);
    assert.ok(p.specs.length >= 8);
    assert.ok(p.faqs.length >= 3);
    assert.equal(p.workflow.length, 4);
  }
  assert.doesNotMatch(JSON.stringify(products), /FS[- ]?301|واگذاری|رایگان|هدیه دستگاه/i);
});
