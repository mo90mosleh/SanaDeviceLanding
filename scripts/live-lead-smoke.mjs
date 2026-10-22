import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const origin = "https://sana-pr-preview.onrender.com";
const output = "artifacts/live-lead";
await mkdir(output, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 960 }, reducedMotion: "reduce" });
let requests = 0;
page.on("request", (request) => {
  if (request.method() === "POST" && new URL(request.url()).pathname === "/api/consultation") requests++;
});
try {
  await page.goto(origin + "/?utm_source=integration-test&utm_medium=qa&utm_campaign=sana-webhook-check", { waitUntil: "networkidle" });
  const form = page.locator("#consultation form");
  await form.getByLabel("دستگاه موردنظر").selectOption("fs-205");
  for (const [field, value] of [
    ["name", "تست فنی سانا — نادیده بگیرید"],
    ["organization", "تست اتصال وب‌هوک — مشتری واقعی نیست"],
    ["mobile", "09000000000"],
  ]) {
    await form.locator(`#lead-${field}`).fill(value);
    await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  }
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/consultation" && response.request().method() === "POST");
  await form.getByRole("button", { name: "ثبت درخواست مشاوره", exact: true }).click();
  const response = await responsePromise;
  const body = await response.json();
  const result = { status: response.status(), acknowledged: body.status === "submitted", requests };
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log("LIVE LEAD RESULT " + JSON.stringify(result));
  assert.equal(response.status(), 200, "The live server did not receive a successful acknowledgement from the configured webhook");
  assert.equal(body.status, "submitted");
  await page.waitForFunction(() => document.querySelector("#consultation [role=status]").textContent.includes("با موفقیت ثبت شد"));
  assert.equal(requests, 1, "The smoke check must send exactly one synthetic lead");
  await form.screenshot({ path: path.join(output, "acknowledged-home-form-390.png") });
  console.log("LIVE LEAD PASS: one synthetic homepage lead accepted by the configured webhook");
} finally {
  await browser.close();
}
