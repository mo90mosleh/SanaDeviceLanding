import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pagesBase, pagesUrl } from "./github-pages-config.mjs";
import { captureReviewPreview } from "./capture-review-previews.mjs";

const site = new URL(pagesUrl);
const routes = ["", "cbc/bha3000/", "cbc/bha5000/", "cbc/bha5100/", "poct/fs-114/", "poct/fs-205/"];
const resources = new Set();
const report = [];
const stamp = (process.env.GITHUB_SHA || Date.now().toString()).slice(0, 12);
const liveFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(25000),
  });
const originUrl = (value, base) => {
  const url = new URL(value.replaceAll("&amp;", "&"), base);
  return url.origin === site.origin && ["https:", "http:"].includes(url.protocol) ? url : null;
};
for (const route of routes) {
  const url = new URL(route, site);
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("sana_audit", stamp);
  const response = await liveFetch(requestUrl);
  assert.equal(response.status, 200, url.href);
  assert.match(response.headers.get("content-type") || "", /text\/html/iu, url.href);
  const html = await response.text();
  assert.match(html, /dir="rtl"/u, url.href);
  for (const tag of html.matchAll(/<(?:script|link|img|image)\b[^>]*>/giu)) {
    for (const attribute of tag[0].matchAll(/(?:src|href)="([^"]+)"/giu)) {
      if (attribute[1].startsWith("data:")) continue;
      const asset = originUrl(attribute[1], url);
      if (!asset || asset.pathname === url.pathname || asset.pathname.endsWith("/")) continue;
      if (pagesBase === "/")
        assert.ok(
          !asset.pathname.startsWith("/SanaDeviceLanding/"),
          "Stale project prefix: " + asset.href,
        );
      resources.add(asset.href);
    }
  }
  for (const attribute of html.matchAll(/href="([^"]+\.pdf(?:\?[^"]*)?)"/giu)) {
    const asset = originUrl(attribute[1], url);
    if (asset) resources.add(asset.href);
  }
  report.push({ url: url.href, status: response.status });
  console.log("LIVE PAGE PASS " + url.href);
}
for (const href of [...resources]) {
  const url = new URL(href);
  if (url.pathname.endsWith(".css")) {
    const response = await liveFetch(url);
    assert.equal(response.status, 200, href);
    assert.match(response.headers.get("content-type") || "", /text\/css/iu, href);
    for (const match of (await response.text()).matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/giu)) {
      if (match[1].startsWith("data:")) continue;
      const resource = originUrl(match[1], url);
      if (resource) resources.add(resource.href);
    }
  } else if (url.pathname.endsWith(".webmanifest")) {
    const response = await liveFetch(url);
    assert.equal(response.status, 200, href);
    for (const icon of (await response.json()).icons || []) {
      const resource = originUrl(icon.src, url);
      if (resource) resources.add(resource.href);
    }
  }
}
const queue = [...resources];
const checked = [];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (;;) {
      const href = queue.shift();
      if (!href) return;
      const response = await liveFetch(href, { method: "HEAD" });
      assert.equal(response.status, 200, href);
      const type = response.headers.get("content-type") || "";
      const ext = path.extname(new URL(href).pathname);
      if (ext === ".js") assert.match(type, /javascript/iu, href);
      if (ext === ".css") assert.match(type, /text\/css/iu, href);
      if ([".png", ".webp", ".ico", ".svg"].includes(ext)) assert.match(type, /image\//iu, href);
      checked.push({ url: href, status: response.status, type });
      console.log("LIVE ASSET PASS " + JSON.stringify(checked.at(-1)));
    }
  }),
);
await mkdir("artifacts/live-crawl", { recursive: true });
await writeFile(
  "artifacts/live-crawl/results.json",
  JSON.stringify({ pages: report, assets: checked }, null, 2),
);
if (process.env.SANA_QA_DIR) {
  const { chromium } = await import(
    pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
  );
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      for (const route of ["", "cbc/bha5000/", "poct/fs-205/"]) {
        const page = await browser.newPage({
          viewport: { width, height: 960 },
          reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("requestfailed", (r) => errors.push(r.url() + ": " + r.failure()?.errorText));
        await page.route("**/*", async (intercept) => {
          const method = intercept.request().method();
          if (!["GET", "HEAD", "OPTIONS"].includes(method))
            throw new Error("Read-only crawl blocked " + method);
          await intercept.continue();
        });
        const url = new URL(route, site);
        url.searchParams.set("sana_audit", stamp);
        const response = await page.goto(url.href, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          font: getComputedStyle(document.body).fontFamily,
          broken: [...document.images]
            .filter((i) => i.getClientRects().length && !i.naturalWidth)
            .map((i) => i.src),
          styled: getComputedStyle(document.querySelector(".site-header")).display,
        }));
        assert.ok(layout.overflow <= 1, JSON.stringify(layout));
        assert.match(layout.font, /Vazirmatn/u);
        assert.notEqual(layout.styled, "block");
        assert.deepEqual(layout.broken, []);
        if (!route) {
          await page.getByRole("tab", { name: /POCT/u }).click();
          assert.equal(await page.locator("#poct").isVisible(), true);
        }
        if (width <= 640) {
          await page.locator('.mobile-cta a[href="#consultation"]').click();
          await page.getByRole("dialog", { name: "درخواست مشاوره خرید" }).waitFor();
          await page.getByRole("button", { name: "بستن فرم مشاوره" }).click();
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `artifacts/live-crawl/${route.replaceAll("/", "-") || "home"}-${width}.png`,
        });
        if (width === 390)
          await captureReviewPreview(page, `live-${route.replaceAll("/", "-") || "home"}-${width}`);
        assert.deepEqual(errors, [], url.href);
        console.log(
          "LIVE BROWSER PASS " +
            url.pathname +
            "@" +
            width +
            ": styles, images, RTL, hydration and consultation dialog",
        );
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
console.log(
  "LIVE CRAWL PASS " +
    JSON.stringify({ pages: report.length, resources: checked.length, origin: site.origin }),
);
