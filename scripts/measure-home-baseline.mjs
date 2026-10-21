import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { captureReviewPreview, prepareReviewPage } from "./capture-review-previews.mjs";

const phase = process.env.SANA_METRICS_PHASE || "before";
assert.ok(["before", "after"].includes(phase));
const origin = phase === "before" ? process.env.SANA_BASELINE_URL : process.env.SANA_QA_URL;
assert.ok(origin, "The measurement server URL must be configured");
const output = path.resolve("artifacts/ui-review");
await mkdir(output, { recursive: true });
const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const width of [360, 390, 430, 768, 1024, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    const response = await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await prepareReviewPage(page);
    const families = phase === "after" ? ["CBC", "POCT"] : ["all"];
    for (const family of families) {
      if (phase === "after") {
        await page.locator(`#family-tab-${family.toLowerCase()}`).click();
        await prepareReviewPage(page);
      }
      const metrics = await page.evaluate(
        ({ phase, family, width }) => {
          const visible = (node) =>
            node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
          const bounds = (node) => {
            if (!node || !visible(node)) return null;
            const rect = node.getBoundingClientRect();
            return {
              top: Math.round(rect.top + scrollY),
              height: Math.round(rect.height),
              bottom: Math.round(rect.bottom + scrollY),
            };
          };
          const cards = [...document.querySelectorAll(".product-card")].filter(visible);
          const height = document.documentElement.scrollHeight;
          return {
            phase,
            family,
            width,
            viewportHeight: innerHeight,
            pageHeight: height,
            viewportCount: Number((height / innerHeight).toFixed(2)),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            header: bounds(document.querySelector(".site-header")),
            hero: bounds(document.querySelector(".home-hero")),
            selector: bounds(document.querySelector(".family-tabs")),
            cbc: bounds(document.querySelector("#cbc")),
            poct: bounds(document.querySelector("#poct")),
            firstProduct: bounds(cards[0]),
            lastProduct: bounds(cards.at(-1)),
            cards: cards.map(bounds),
            footer: bounds(document.querySelector("footer")),
          };
        },
        { phase, family, width },
      );
      report.push(metrics);
      console.log("SANA_HOME_METRIC " + JSON.stringify(metrics));
      await page.screenshot({
        path: path.join(output, `${phase}-home-${family.toLowerCase()}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      if (phase === "before" && width === 390) {
        await captureReviewPreview(page, "before-home-390-top");
        await captureReviewPreview(page, "before-home-390-full", { fullPage: true });
      }
      if (phase === "after" && family === "CBC" && [390, 1440].includes(width)) {
        await captureReviewPreview(page, `after-home-${width}-top`);
        if (width === 390)
          await captureReviewPreview(page, "after-home-390-cbc", {
            locator: page.locator("#devices"),
          });
      }
    }
    await page.close();
  }
  await writeFile(path.join(output, `${phase}-home-metrics.json`), JSON.stringify(report, null, 2));
  if (phase === "after") {
    const before = JSON.parse(
      await readFile(path.join(output, "before-home-metrics.json"), "utf8"),
    );
    const comparison = report.map((after) => {
      const baseline = before.find((item) => item.width === after.width);
      return {
        width: after.width,
        family: after.family,
        beforeHeight: baseline.pageHeight,
        afterHeight: after.pageHeight,
        heightReductionPercent: Number(
          (((baseline.pageHeight - after.pageHeight) / baseline.pageHeight) * 100).toFixed(1),
        ),
        beforeFirstProductTop: baseline.firstProduct?.top,
        afterFirstProductTop: after.firstProduct?.top,
        note: "Before shows all five devices together; after retains all five through the family selector.",
      };
    });
    await writeFile(path.join(output, "home-comparison.json"), JSON.stringify(comparison, null, 2));
    console.log("SANA_HOME_COMPARISON " + JSON.stringify(comparison));
  }
} finally {
  await browser.close();
}
