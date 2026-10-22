import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const origin = "https://mo90mosleh.github.io/ortanes-leb-gift";
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
  if (request.method() === "POST" && request.url() === endpoint)
    requests++;
});
try {
  await page.goto(
    origin + "/?utm_source=integration-test&utm_medium=qa&utm_campaign=sana-webhook-check",
    { waitUntil: "networkidle" },
  );
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
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === endpoint &&
      response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "ثبت درخواست مشاوره", exact: true }).click();
  const response = await responsePromise;
  const result = { status: response.status(), acknowledged: response.ok(), requests };
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2));
  console.log("LIVE LEAD RESULT " + JSON.stringify(result));
  assert.equal(response.ok(), true);
  await page.waitForFunction(() =>
    document.querySelector("#consultation [role=status]").textContent.includes("با موفقیت ثبت شد"),
  );
  for (const input of await form.locator("input").all()) assert.equal(await input.inputValue(), "");
  assert.equal(await form.locator("select").inputValue(), "");
  assert.equal(requests, 1, "The smoke check must send exactly one synthetic lead");
  await form.screenshot({ path: path.join(output, "acknowledged-home-form-390.png") });
  console.log("LIVE LEAD PASS: one synthetic homepage lead accepted by the configured webhook");
} finally {
  await browser.close();
}
