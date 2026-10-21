import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { prepareReviewPage } from "./capture-review-previews.mjs";

assert.ok(process.env.SANA_QA_DIR, "SANA_QA_DIR must point to isolated Playwright tooling");
const origin = "https://sana-pr-preview.onrender.com";
const routes = ["/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100", "/poct/fs-114", "/poct/fs-205"];
const expected = ["#advantages", "#specs", "#applications", "#workflow"];
const output = path.resolve("artifacts/ui-review");
const report = { origin, routes: [], browser: [] };
await mkdir(output, { recursive: true });

for (const route of routes) {
  const response = await fetch(origin + route, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, `${route}: live response`);
  const html = await response.text();
  const nav = html.match(/<nav\b[^>]*class="section-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, `${route}: live navigation is missing`);
  const targets = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(targets, expected, `${route}: live menu must contain four main sections`);
  report.routes.push({ route, status: response.status, targets });
  console.log(`LIVE HTML PASS ${route}: four section links`);
}

const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    // This smoke review never submits a form or sends mutation requests.
    await context.route("**/*", async (request) => {
      if (["GET", "HEAD", "OPTIONS"].includes(request.request().method())) {
        await request.continue();
      } else {
        await request.abort();
      }
    });
    for (const route of ["/", "/cbc/bha5000", "/poct/fs-205"]) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const response = await page.goto(origin + route, { waitUntil: "networkidle" });
      assert.equal(response?.status(), 200, `${route}@${width}: live browser response`);
      await prepareReviewPage(page);
      const layout = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        direction: document.documentElement.dir,
        brand: getComputedStyle(document.documentElement).getPropertyValue("--brand").trim(),
        fontLoaded: document.fonts.check("15px Vazirmatn") && [...document.fonts].some(
          (font) => font.family.includes("Vazirmatn") && font.status === "loaded",
        ),
        images: [...document.querySelectorAll(".product-image")].filter(
          (image) => image.getClientRects().length > 0,
        ).map((image) => ({
          source: image.localName === "svg"
            ? image.querySelector("image")?.getAttribute("href")
            : image.getAttribute("src"),
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        })),
      }));
      assert.ok(layout.scrollWidth <= layout.width + 1, `${route}@${width}: live overflow`);
      assert.equal(layout.direction, "rtl", `${route}: Persian RTL direction changed`);
      assert.equal(layout.brand, "#02753b", `${route}: current green redesign is not live`);
      assert.equal(layout.fontLoaded, true, `${route}: Persian web font did not load`);
      assert.ok(layout.images.length > 0, `${route}: no visible product photograph`);
      for (const image of layout.images) {
        assert.match(image.source, /^\/product-assets\//u, `${route}: unexpected product image source`);
        assert.ok(image.width > 0 && image.height > 0, `${route}: product image has no area`);
      }
      if (route === "/") {
        assert.equal(await page.getByRole("tab").count(), 2, "Live family selector is missing");
        for (const family of ["poct", "cbc"]) {
          await page.locator(`#family-tab-${family}`).click();
          const panel = page.locator(`#${family}[role=tabpanel]`);
          await panel.waitFor({ state: "visible" });
          await prepareReviewPage(page);
          assert.deepEqual(
            await panel.locator(".card-link").evaluateAll(
              (links) => links.map((link) => link.getAttribute("href")),
            ),
            family === "cbc" ? routes.slice(0, 3) : routes.slice(3),
            `Live ${family.toUpperCase()} family must retain every device`,
          );
          const other = family === "cbc" ? "poct" : "cbc";
          assert.equal(await page.locator(`#${other}[role=tabpanel]`).isVisible(), false);
          assert.ok(await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          ), `Home@${width}: family switching causes overflow`);
          await page.screenshot({
            path: path.join(output, `live-home-${family}-${width}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }
      } else {
        const nav = page.locator(".section-nav");
        assert.deepEqual(await nav.locator("a").evaluateAll(
          (links) => links.map((link) => link.getAttribute("href")),
        ), expected);
        assert.ok(await nav.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ), `${route}@${width}: live section menu scrolls horizontally`);
        await page.screenshot({
          path: path.join(output, `live-${route.slice(1).replaceAll("/", "-")}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
      assert.deepEqual(errors, [], `${route}@${width}: live browser errors`);
      report.browser.push({ route, width, status: "passed", ...layout });
      console.log(`LIVE BROWSER PASS ${route}@${width}: brand, RTL, font, images and navigation`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, "live-preview.json"), JSON.stringify(report, null, 2));
}
