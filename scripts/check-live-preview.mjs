import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const origin = "https://sana-pr-preview.onrender.com";
const routes = ["/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100", "/poct/fs-114", "/poct/fs-205"];
const expected = ["#advantages", "#specs", "#applications", "#workflow"];
const report = [];
for (const route of routes) {
  const response = await fetch(origin + route, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, `${route}: live response`);
  const html = await response.text();
  const nav = html.match(/<nav\b[^>]*class="section-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, `${route}: live navigation is missing`);
  const targets = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const result = {
    route, targets,
    cacheControl: response.headers.get("cache-control"),
    age: response.headers.get("age"),
    edgeCache: response.headers.get("cf-cache-status"),
  };
  console.log("LIVE HTML", JSON.stringify(result));
  report.push(result);
  assert.deepEqual(targets, expected, `${route}: live menu must contain only four main sections`);
}

const { chromium } = await import(pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 960 }, reducedMotion: "reduce" });
  await page.goto(origin + "/cbc/bha5000", { waitUntil: "networkidle" });
  await page.evaluate(async () => { await document.fonts.ready; });
  const nav = page.locator(".section-nav");
  assert.deepEqual(await nav.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))), expected);
  const sizing = await nav.evaluate((node) => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
  assert.ok(sizing.scrollWidth <= sizing.width + 1, "Live mobile menu must not scroll horizontally");
  await mkdir("artifacts/ui-review", { recursive: true });
  await nav.screenshot({ path: "artifacts/ui-review/live-menu-375.png" });
  await writeFile("artifacts/ui-review/live-preview.json", JSON.stringify({ routes: report, browser: sizing }, null, 2));
  console.log("LIVE BROWSER PASS: hydrated mobile menu has four links and no horizontal scrolling");
} finally {
  await browser.close();
}
