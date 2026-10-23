import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pagesUrl } from "./github-pages-config.mjs";

const origin = pagesUrl.replace(/\/$/u, "");
const endpoint = "https://n8n.alecasgari.com/webhook/83591aad-47e3-475b-99a9-2f3d6d408e00";
const output = "artifacts/live-lead";
await mkdir(output, { recursive: true });
const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 960 },
  reducedMotion: "reduce",
});
let requests = 0;
page.on("request", (request) => {
  if (request.method() === "POST" && request.url() === endpoint) requests++;
});
try {
  await page.goto(
    origin +
      "/?utm_source=integration-test&utm_medium=qa&utm_campaign=sana-webhook-check&utm_content=popup-verification&utm_term=fs-205",
    { waitUntil: "networkidle" },
  );
  // Never submit a synthetic record until the newly published dialog is present.
  for (let attempt = 0; !(await page.locator("dialog.success-dialog").count()); attempt++) {
    if (attempt >= 18)
      throw new Error("The updated frontend has not been published yet; no lead was sent");
    await page.waitForTimeout(5000);
    await page.reload({ waitUntil: "networkidle" });
  }
  await page.locator('.mobile-cta a[href="#consultation"]').click();
  const form = page.locator("#consultation form");
  await form.locator('input[type="radio"][value="fs-205"]').check();
  for (const [field, value] of [
    ["name", "تست فنی سانا — ستون‌ها و پاپ‌آپ 2210B"],
    ["organization", "تست فنی — آزمایشگاه واقعی نیست"],
    ["mobile", "09000000000"],
  ]) {
    await form.locator(`#lead-${field}`).fill(value);
    await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  }
  const responsePromise = page.waitForResponse(
    (response) => response.url() === endpoint && response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "ثبت درخواست مشاوره", exact: true }).click();
  const response = await responsePromise;
  const result = {
    status: response.status(),
    acknowledged: response.ok(),
    requests,
    response: response.ok() ? "acknowledged" : (await response.text()).slice(0, 1000),
  };
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log("LIVE LEAD RESULT " + JSON.stringify(result));
  assert.equal(response.ok(), true);
  const success = page.getByRole("dialog", { name: "اطلاعات با موفقیت ثبت شد." });
  await success.waitFor({ state: "visible" });
  for (const input of await form.locator("input:not([type=radio])").all())
    assert.equal(await input.inputValue(), "");
  assert.equal(await form.locator("input[type=radio]:checked").count(), 0);
  assert.equal(requests, 1, "The smoke check must send exactly one synthetic lead");
  await page.screenshot({ path: path.join(output, "acknowledged-popup-390.png") });
  await success.getByRole("button", { name: "متوجه شدم" }).click();
  await success.waitFor({ state: "hidden" });
  await page.locator('.mobile-cta a[href="#consultation"]').click();
  await form.screenshot({ path: path.join(output, "cleared-home-form-390.png") });
  console.log("LIVE LEAD PASS: one synthetic homepage lead accepted by the configured webhook");
} finally {
  await browser.close();
}
