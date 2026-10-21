import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

assert.ok(process.env.SANA_QA_DIR, "SANA_QA_DIR must point to isolated Playwright tooling");
const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const base = process.env.SANA_QA_URL || "http://127.0.0.1:4173";
const output = path.resolve("artifacts/ui-review");
await mkdir(output, { recursive: true });
const routes = ["/", "/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100", "/poct/fs-114", "/poct/fs-205"];
const widths = [320, 375, 768, 1440];
const report = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const name = route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
      const result = { route, width, status: "failed" };
      report.push(result);
      try {
        const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
        assert.equal(response?.status(), 200, `${route}: HTTP response`);
        await page.evaluate(async () => { await document.fonts.ready; });
        const pause = page.getByRole("button", { name: "توقف نمایش خودکار" });
        if (await pause.count()) await pause.click();

        // Load lazy product photographs before judging image integrity or taking screenshots.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
            window.scrollTo(0, y);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForFunction(() => [...document.images].every((image) => image.complete));
        // Inline SVG viewports crop photo margins without changing the original device image.
        // Decode their source images too; document.images covers only HTML image elements.
        await page.evaluate(async () => {
          await Promise.all([...document.querySelectorAll("svg.product-image image")].map(async (node) => {
            const image = new Image();
            image.src = node.getAttribute("href");
            await image.decode();
          }));
        });
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          broken: [...document.images].filter((image) => !image.naturalWidth).map((image) => image.src),
        }));
        assert.ok(layout.scrollWidth <= layout.width + 1, `${route}@${width}: document overflows`);
        assert.deepEqual(layout.broken, [], `${route}@${width}: broken photographs or branding`);

        const actions = await page.evaluate(() => {
          const nodes = document.querySelectorAll(
            ".button, .card-link, .text-link, .phone-link, .header-contact, .mobile-cta a, .showcase-bottom a",
          );
          return [...nodes].map((node) => ({
            text: node.textContent,
            icons: [...node.querySelectorAll("svg.cta-icon")].map((icon) => {
              const rect = icon.getBoundingClientRect();
              return { width: rect.width, height: rect.height, hidden: getComputedStyle(node).display === "none" };
            }),
          }));
        });
        for (const action of actions) {
          assert.doesNotMatch(action.text, /[↗↖↘↙]/u, `${route}: inconsistent diagonal CTA glyph`);
          for (const icon of action.icons) {
            if (icon.width === 0 && icon.height === 0) continue;
            assert.ok(icon.width >= 19 && icon.height >= 19, `${route}: CTA icon is too small`);
            assert.ok(icon.width <= 22 && icon.height <= 22, `${route}: CTA icon is oversized`);
          }
        }

        if (route !== "/") {
          const navigation = page.locator(".section-nav");
          const links = navigation.locator("a");
          assert.equal(await links.count(), 6, `${route}: all device sections must be reachable`);
          const navLayout = await navigation.evaluate((node) => ({
            width: node.clientWidth,
            scrollWidth: node.scrollWidth,
            buttons: [...node.querySelectorAll("a")].map((link) => {
              const rect = link.getBoundingClientRect();
              const style = getComputedStyle(link);
              const target = document.querySelector(link.getAttribute("href"));
              return {
                top: rect.top,
                height: rect.height,
                borderWidth: parseFloat(style.borderTopWidth),
                borderStyle: style.borderTopStyle,
                borderColor: style.borderTopColor,
                targetExists: !!target,
              };
            }),
          }));
          for (const button of navLayout.buttons) {
            assert.ok(Math.abs(button.top - navLayout.buttons[0].top) <= 1, `${route}@${width}: section links wrap to another row`);
            assert.ok(button.height >= 44, `${route}@${width}: section link is difficult to tap`);
            assert.ok(button.borderWidth >= 1 && button.borderStyle !== "none", `${route}: section link lacks a visible boundary`);
            assert.doesNotMatch(button.borderColor, /(?:transparent|rgba\([^)]*,\s*0\))/u, `${route}: section link boundary is transparent`);
            assert.equal(button.targetExists, true, `${route}: section link points to a missing destination`);
          }

          // Reach the last section through the same clipped horizontal menu used on phones.
          const lastLink = links.last();
          assert.equal(await lastLink.getAttribute("href"), "#faq");
          await lastLink.scrollIntoViewIfNeeded();
          const lastVisible = await lastLink.evaluate((link) => {
            const rect = link.getBoundingClientRect();
            const nav = link.closest("nav").getBoundingClientRect();
            return rect.left >= nav.left - 1 && rect.right <= nav.right + 1;
          });
          assert.equal(lastVisible, true, `${route}@${width}: final section link cannot be revealed`);
          await lastLink.click();
          await page.waitForFunction(() => {
            const heading = document.querySelector("#faq h2").getBoundingClientRect();
            return location.hash === "#faq" && heading.top >= 0 && heading.bottom < window.innerHeight;
          });
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
            `${route}@${width}: scrolling section navigation overflows the document`,
          );

          const numbers = await page.locator(".key-features li > span, .advantage-number").evaluateAll((nodes) =>
            nodes.map((node) => ({
              text: node.textContent.trim(),
              size: parseFloat(getComputedStyle(node).fontSize),
              font: getComputedStyle(node).fontFamily,
            })),
          );
          assert.ok(numbers.length >= 6, `${route}: feature and advantage markers are missing`);
          for (const number of numbers) {
            assert.ok(number.size >= 16, `${route}@${width}: Persian number ${number.text} is too small`);
            assert.match(number.font, /Vazirmatn/u, `${route}: Persian numerals must use the page typeface`);
            assert.doesNotMatch(number.font, /^\s*Arial(?:,|$)/iu, `${route}: numeral font differs from the page`);
          }
          await navigation.evaluate((node) => { node.scrollLeft = 0; });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForFunction(() => window.scrollY <= 1);

          const table = await page.locator(".spec-table").evaluate((node) => {
            const cells = [...node.querySelectorAll("tbody tr")].map((row) => {
              const heading = row.querySelector("th");
              const value = row.querySelector("td");
              return {
                headingRight: heading.getBoundingClientRect().right,
                valueRight: value.getBoundingClientRect().right,
                headingAlign: getComputedStyle(heading).textAlign,
                valueAlign: getComputedStyle(value).textAlign,
                overflowing: [heading, value].some((cell) => cell.scrollWidth > cell.clientWidth + 1),
              };
            });
            return { cells, width: node.getBoundingClientRect().width, wrap: node.parentElement.clientWidth };
          });
          assert.ok(table.cells.length >= 8, `${route}: technical specifications are incomplete`);
          assert.ok(table.width <= table.wrap + 1, `${route}: table overflows its container`);
          for (const cell of table.cells) {
            assert.equal(cell.headingAlign, "right", `${route}: row headings must share RTL alignment`);
            assert.equal(cell.valueAlign, "right", `${route}: mixed-language values must share RTL alignment`);
            assert.ok(Math.abs(cell.headingRight - table.cells[0].headingRight) <= 1, `${route}: label column drifts`);
            assert.ok(Math.abs(cell.valueRight - table.cells[0].valueRight) <= 1, `${route}: value column drifts`);
            assert.equal(cell.overflowing, false, `${route}: specification text overflows its cell`);
          }
        }

        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true, animations: "disabled" });
        if (route === "/cbc/bha3000") {
          await page.locator("#specs").screenshot({ path: path.join(output, `specifications-${width}.png`), animations: "disabled" });
        }

        if (route !== "/") {
          const form = page.locator("#consultation form");
          assert.equal(await form.locator("input:not([type=hidden]), select, textarea").count(), 3);
          await form.getByRole("button", { name: "بررسی اطلاعات درخواست" }).click();
          await page.waitForFunction(() => document.querySelectorAll("#consultation [aria-invalid=true]").length === 3);
          const mutations = [];
          await page.route("**/*", async (request) => {
            if (["POST", "PUT", "PATCH", "DELETE"].includes(request.request().method())) {
              mutations.push(request.request().url());
              await request.abort();
            } else {
              await request.continue();
            }
          });
          await form.locator("#lead-name").fill("کاربر آزمایشی");
          await form.locator("#lead-organization").fill("آزمایشگاه آزمایشی");
          await form.locator("#lead-mobile").fill("۰۹۱۲۳۴۵۶۷۸۹");
          await form.getByRole("button", { name: "بررسی اطلاعات درخواست" }).click();
          await page.waitForFunction(() => document.querySelector("#consultation [role=status]")?.textContent.includes("درخواستی ارسال نشده"));
          assert.equal(await form.locator("[aria-invalid=true]").count(), 0);
          assert.deepEqual(mutations, [], `${route}: disconnected form attempted to transmit data`);
        }

        assert.deepEqual(errors, [], `${route}@${width}: browser runtime errors`);
        result.status = "passed";
        console.log(`PASS ${route} at ${width}px: layout, images, CTA icons${route === "/" ? "" : ", section navigation, Persian numerals, table and three-field consultation"}`);
      } catch (error) {
        result.error = error.message;
        await page.screenshot({ path: path.join(output, `failure-${name}-${width}.png`), fullPage: true }).catch(() => {});
        throw error;
      } finally {
        await writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2));
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
