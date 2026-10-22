import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { captureReviewPreview, prepareReviewPage } from "./capture-review-previews.mjs";

const root = path.resolve("artifacts/github-pages");
const base = process.env.SANA_BASE_PATH || "/ortanes-leb-gift/";
const origin = "http://127.0.0.1:4182";
const endpoint =
  process.env.VITE_CONSULTATION_API_URL ||
  "https://n8n.alecasgari.com/webhook/83591aad-47e3-475b-99a9-2f3d6d408e00";
const routes = [
  "/",
  "/cbc/bha3000",
  "/cbc/bha5000",
  "/cbc/bha5100",
  "/poct/fs-114",
  "/poct/fs-205",
];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, origin);
    if (!url.pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const filename = path.resolve(root, decodeURIComponent(url.pathname.slice(base.length)));
    if (filename !== root && !filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(filename);
    if (info.isDirectory() && !url.pathname.endsWith("/")) {
      response.writeHead(301, { Location: url.pathname + "/" + url.search }).end();
      return;
    }
    const file = info.isDirectory() ? path.join(filename, "index.html") : filename;
    response
      .writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" })
      .end(await readFile(file));
  } catch {
    response
      .writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
      .end(await readFile(path.join(root, "404.html")));
  }
});
await new Promise((resolve) => server.listen(4182, "127.0.0.1", resolve));
const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const browser = await chromium.launch();
const results = [];
await mkdir("artifacts/ui-review", { recursive: true });
try {
  for (const width of [390, 1440]) {
    for (const route of routes) {
      const page = await browser.newPage({
        viewport: { width, height: 960 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const url = origin + base + (route === "/" ? "" : route.slice(1) + "/");
      const response = await page.goto(url, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      await prepareReviewPage(page);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rtl: document.documentElement.dir,
        images: [...document.images]
          .filter(
            (image) =>
              getComputedStyle(image).visibility !== "hidden" &&
              image.getClientRects().length &&
              !image.naturalWidth,
          )
          .map((image) => image.src),
      }));
      assert.equal(layout.rtl, "rtl");
      assert.ok(layout.overflow <= 1);
      assert.deepEqual(layout.images, []);
      for (const target of await page
        .locator('a[href^="/"], img[src^="/"], link[href^="/"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("href") || node.getAttribute("src")),
        ))
        assert.ok(target.startsWith(base), `Unprefixed GitHub Pages URL: ${target}`);
      const form = page.locator("#consultation form");
      assert.equal(await form.locator("input, select").count(), route === "/" ? 4 : 3);
      if (route === "/") {
        assert.ok((await page.locator('main a[href="#consultation"]').count()) >= 3);
        assert.equal(await form.locator('select option:not([value=""])').count(), 5);
        await form.getByLabel("دستگاه موردنظر").selectOption("fs-205");
        await page.getByRole("tab", { name: /POCT/u }).click();
        assert.equal(await page.locator("#poct").isVisible(), true);
      } else {
        assert.equal(await page.locator(".change-product").getAttribute("href"), base);
        assert.equal(await page.locator(".applications-grid .application-icon").count(), 0);
      }
      let calls = 0;
      await page.route("**/*", async (intercept) => {
        const request = intercept.request();
        if (request.url() === endpoint && request.method() === "OPTIONS") {
          await intercept.fulfill({
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        } else if (request.url() === endpoint && request.method() === "POST") {
          calls++;
          const payload = request.postDataJSON();
          assert.equal(payload.landingPage, route);
          assert.equal(
            payload.productModel,
            route === "/" ? "FS-205" : route.split("/").at(-1).toUpperCase(),
          );
          await intercept.fulfill({
            status: 200,
            headers: { "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "submitted" }),
          });
        } else if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
          throw new Error("Static review tried to send an unexpected request");
        } else await intercept.continue();
      });
      for (const [field, value] of [
        ["name", "کاربر آزمایشی"],
        ["organization", "آزمایشگاه آزمایشی"],
        ["mobile", "۰۹۱۲۳۴۵۶۷۸۹"],
      ]) {
        await form.locator(`#lead-${field}`).fill(value);
        await page.evaluate(async () => {
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        });
      }
      await form.getByRole("button", { name: "ثبت درخواست مشاوره", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector("#consultation [role=status]")
          .textContent.includes("اطلاعات با موفقیت ثبت شد"),
      );
      assert.equal(calls, 1);
      for (const input of await form.locator("input").all())
        assert.equal(await input.inputValue(), "");
      if (route === "/") assert.equal(await form.locator("select").inputValue(), "");
      if (["/", "/cbc/bha5000", "/poct/fs-205"].includes(route)) {
        const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `artifacts/ui-review/pages-${name}-${width}.png`,
          fullPage: true,
        });
        if (route === "/") await captureReviewPreview(page, `pages-home-${width}-top`);
      }
      assert.deepEqual(errors, [], `${route}@${width}: static browser errors`);
      results.push({ route, width, status: "passed" });
      console.log(
        `PAGES PASS ${route}@${width}: static HTML, subpath assets, navigation and acknowledged form clearing`,
      );
      await page.close();
    }
  }
  const missing = await fetch(origin + base + "missing-device/");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /این صفحه پیدا نشد/u);
} finally {
  await writeFile(
    "artifacts/ui-review/github-pages-results.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
