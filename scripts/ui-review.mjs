import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { captureReviewPreview, prepareReviewPage } from "./capture-review-previews.mjs";

assert.ok(process.env.SANA_QA_DIR, "SANA_QA_DIR must point to isolated Playwright tooling");
const { chromium } = await import(
  pathToFileURL(path.join(process.env.SANA_QA_DIR, "node_modules/playwright/index.mjs")).href
);
const base = process.env.SANA_QA_URL || "http://127.0.0.1:4173";
const output = path.resolve("artifacts/ui-review");
const endpoint = process.env.VITE_CONSULTATION_API_URL;
assert.ok(endpoint && endpoint.includes("forms.example.test"), "Regular browser QA must use the isolated test endpoint");
await mkdir(output, { recursive: true });
const routes = [
  "/",
  "/cbc/bha3000",
  "/cbc/bha5000",
  "/cbc/bha5100",
  "/poct/fs-114",
  "/poct/fs-205",
];
const widths = [360, 390, 430, 768, 1024, 1440];
const report = [];

async function reviewConsultation(page, route, width) {
  const home = route === "/";
  const form = page.locator("#consultation form");
  assert.equal(
    await form.locator("input:not([type=hidden]), select, textarea").count(),
    home ? 4 : 3,
  );
  if (home) {
    assert.ok((await page.locator('main a[href="#consultation"]').count()) >= 3);
    assert.equal(await form.locator("select optgroup").count(), 2);
    assert.equal(await form.locator('select option:not([value=""])').count(), 5);
    await page.locator(".hero-consultation").click();
    assert.equal(await page.locator("#consultation").isVisible(), true);
  } else {
    assert.equal(await form.locator("select").count(), 0);
  }
  if ([390, 1440].includes(width) && ["/", "/cbc/bha5000"].includes(route)) {
    await captureReviewPreview(page, `consultation-${home ? "home" : "product"}-${width}`, {
      locator: page.locator("#consultation"),
    });
  }
  const calls = [];
  const unexpected = [];
  let acknowledgeRequest;
  const firstRequest = new Promise((resolve) => {
    acknowledgeRequest = resolve;
  });
  let reject = home && width === 390;
  let release;
  const pending = route === "/cbc/bha5000" && width === 390;
  const gate = pending
    ? new Promise((resolve) => {
        release = resolve;
      })
    : Promise.resolve();
  await page.route("**/*", async (intercept) => {
    const request = intercept.request();
    if (request.method() === "POST" && request.url() === endpoint) {
      calls.push(request.postDataJSON());
      acknowledgeRequest();
      await gate;
      await intercept.fulfill({
        status: reject ? 502 : 200,
        headers: { "Access-Control-Allow-Origin": new URL(base).origin },
        contentType: "text/plain",
        body: reject ? "failed" : "Workflow was started",
      });
    } else if (request.method() === "OPTIONS" && request.url() === endpoint) {
      await intercept.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(base).origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    } else if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      unexpected.push(request.url());
      await intercept.abort();
    } else {
      await intercept.continue();
    }
  });
  const submit = form.getByRole("button", { name: "ثبت درخواست مشاوره", exact: true });
  await submit.click();
  await page.waitForFunction(
    (count) => document.querySelectorAll("#consultation [aria-invalid=true]").length === count,
    home ? 4 : 3,
  );
  assert.equal(calls.length, 0, "Invalid forms must never send a request");
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  if (home) await form.getByLabel("دستگاه موردنظر").selectOption("fs-205");
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
  await submit.click();
  await firstRequest;
  if (pending) {
    await page.waitForFunction(
      () => document.querySelector("#consultation form").getAttribute("aria-busy") === "true",
    );
    assert.equal(await form.locator('button[type="submit"]').isDisabled(), true);
    assert.doesNotMatch(await form.getByRole("status").innerText(), /موفق/u);
    await form.evaluate((node) => node.requestSubmit());
    assert.equal(
      calls.length,
      1,
      "Repeated submit during a pending request must not duplicate a lead",
    );
    release();
  }
  if (reject) {
    await page.waitForFunction(() =>
      document.querySelector("#consultation [role=status]").textContent.includes("تأیید نشد"),
    );
    assert.equal(
      await form.locator("#lead-name").inputValue(),
      "کاربر آزمایشی",
      "A failed submission must retain input for retry",
    );
    reject = false;
    await submit.click();
  }
  await page.waitForFunction(() =>
    document.querySelector("#consultation [role=status]").textContent.includes("با موفقیت ثبت شد"),
  );
  const item = calls.at(-1);
  assert.equal(item.name, "کاربر آزمایشی");
  assert.equal(item.organization, "آزمایشگاه آزمایشی");
  assert.equal(item.mobile, "09123456789");
  const model = home ? "FS-205" : route.split("/").at(-1).toUpperCase();
  assert.equal(item.productModel, model);
  assert.equal(item.productCategory, home ? "POCT" : route.split("/")[1].toUpperCase());
  assert.equal(item.landingPage, route);
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("sana:attribution:v1") || "{}"),
  );
  assert.deepEqual(item.utm, saved);
  assert.equal(
    await form.locator("#lead-name").inputValue(),
    "",
    "Contact fields clear only after acknowledgement",
  );
  assert.equal(await form.locator('[aria-invalid="true"]').count(), 0);
  assert.deepEqual(unexpected, [], "The browser must only post to the configured webhook");
  if (home) assert.equal(await form.locator("select").inputValue(), "");
  assert.equal(calls.length, home && width === 390 ? 2 : 1);
}

async function reviewFamilySelector(page, html, width) {
  const expected = {
    cbc: ["/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100"],
    poct: ["/poct/fs-114", "/poct/fs-205"],
  };
  for (const route of Object.values(expected).flat()) {
    assert.ok(
      html.includes(`href="${route}"`),
      `${route}: route must remain present in server-rendered home HTML`,
    );
  }
  assert.equal(
    await page.getByRole("tablist").count(),
    1,
    "Device families need one labelled tab selector",
  );
  const selectorLabel = await page
    .getByRole("tablist")
    .evaluate(
      (node) =>
        node.getAttribute("aria-label") ||
        document.getElementById(node.getAttribute("aria-labelledby"))?.textContent.trim(),
    );
  assert.ok(selectorLabel, "The family selector needs an accessible name");
  assert.equal(await page.getByRole("tab").count(), 2);
  const tab = (family) => page.locator(`#family-tab-${family}`);
  const panel = (family) => page.locator(`#${family}[role=tabpanel]`);
  async function selected(family) {
    await page.waitForFunction(
      (family) =>
        document.querySelector(`#family-tab-${family}`)?.getAttribute("aria-selected") === "true" &&
        !document.querySelector(`#${family}`)?.hidden,
      family,
    );
    const other = family === "cbc" ? "poct" : "cbc";
    assert.equal(await tab(family).getAttribute("aria-controls"), family);
    assert.equal(await panel(family).getAttribute("aria-labelledby"), `family-tab-${family}`);
    assert.equal(await tab(family).getAttribute("tabindex"), "0");
    assert.equal(await tab(other).getAttribute("tabindex"), "-1");
    assert.equal(await tab(other).getAttribute("aria-selected"), "false");
    assert.equal(await panel(family).isVisible(), true);
    assert.equal(await panel(other).isVisible(), false);
    const routes = await panel(family)
      .locator(".product-card a[href]")
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("href")))].sort());
    assert.deepEqual(
      routes,
      [...expected[family]].sort(),
      `${family}: device routes changed while switching families`,
    );
    assert.equal(
      await panel(family).locator(".product-card:visible").count(),
      expected[family].length,
    );
    await prepareReviewPage(page);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
      `Home@${width}: family switching creates horizontal overflow`,
    );
    assert.deepEqual(
      await panel(family)
        .locator("img")
        .evaluateAll((images) =>
          images.filter((image) => !image.naturalWidth).map((image) => image.src),
        ),
      [],
    );
  }
  await selected("cbc");
  for (const family of ["cbc", "poct"]) {
    const control = await tab(family).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { height: rect.height, clipped: node.scrollWidth > node.clientWidth + 1 };
    });
    assert.ok(control.height >= 44, `Home@${width}: family selector is difficult to tap`);
    assert.equal(control.clipped, false, `Home@${width}: family label is clipped`);
  }
  await tab("poct").click();
  await selected("poct");
  await tab("cbc").click();
  await selected("cbc");

  // Both arrow keys must cycle the two choices; Home/End expose their stable endpoints.
  await tab("cbc").focus();
  await page.keyboard.press("ArrowLeft");
  await selected("poct");
  await page.keyboard.press("ArrowRight");
  await selected("cbc");
  await page.keyboard.press("End");
  await selected("poct");
  const focus = await tab("poct").evaluate((node) => ({
    active: document.activeElement === node,
    outline: parseFloat(getComputedStyle(node).outlineWidth),
    style: getComputedStyle(node).outlineStyle,
  }));
  assert.equal(focus.active, true, "Keyboard focus must follow the selected family");
  assert.ok(
    focus.outline > 0 && focus.style !== "none",
    "Keyboard family choice needs a visible focus indicator",
  );
  await page.keyboard.press("Home");
  await selected("cbc");
  await tab("cbc").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await panel("cbc").evaluate(
      (node) => node === document.activeElement || node.contains(document.activeElement),
    ),
    true,
    "Tab must enter the active product family rather than hidden content",
  );

  for (const family of ["poct", "cbc"]) {
    await page.goto(new URL(`/#${family}`, base).href, { waitUntil: "networkidle" });
    await selected(family);
  }
  await page.goto(new URL("/?utm_source=ui-review&utm_medium=browser", base).href, {
    waitUntil: "networkidle",
  });
  await selected("cbc");
  await tab("poct").click();
  await selected("poct");
  await panel("poct").locator(".card-link").first().click();
  await page.waitForURL("**/poct/fs-114");
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("sana:attribution:v1"))),
    {
      utm_source: "ui-review",
      utm_medium: "browser",
    },
    "Campaign attribution must survive family choice and device navigation",
  );
  await page.goto(base, { waitUntil: "networkidle" });
  await selected("cbc");
}

const browser = await chromium.launch({ headless: true });

async function reviewSlideshow() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 960 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "توقف نمایش خودکار" }).waitFor();
    await page.mouse.move(0, 0);
    assert.equal(await page.locator(".showcase-slide").count(), 5);
    await page.evaluate(() => {
      const carousel = document.querySelector(".hero-showcase");
      window.__slideReviewTimes = [];
      const observer = new MutationObserver(() => {
        window.__slideReviewTimes.push({
          index: Number(carousel.dataset.slideIndex),
          at: performance.now(),
        });
      });
      observer.observe(carousel, { attributes: true, attributeFilter: ["data-slide-index"] });
    });
    await page.waitForFunction(() => window.__slideReviewTimes.length >= 2, null, {
      timeout: 6500,
    });
    const times = await page.evaluate(() => window.__slideReviewTimes.slice(0, 2));
    assert.equal((times[1].index - times[0].index + 5) % 5, 1);
    const interval = times[1].at - times[0].at;
    assert.ok(
      interval >= 1700 && interval <= 2800,
      `Slideshow interval differs from two seconds: ${interval}`,
    );
    await page.getByRole("button", { name: "توقف نمایش خودکار" }).click();
    const pausedIndex = await page.locator(".hero-showcase").getAttribute("data-slide-index");
    await page.waitForTimeout(2200);
    assert.equal(
      await page.locator(".hero-showcase").getAttribute("data-slide-index"),
      pausedIndex,
    );
    const routes = ["/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100", "/poct/fs-114", "/poct/fs-205"];
    for (let index = 0; index < routes.length; index++) {
      await page.locator(".slideshow-dots button").nth(index).click();
      await page.waitForFunction(
        (index) => document.querySelector(".hero-showcase").dataset.slideIndex === String(index),
        index,
      );
      assert.equal(await page.locator(".showcase-details").getAttribute("href"), routes[index]);
      await page.locator(".showcase-slide.is-active .product-image").evaluate(async (node) => {
        const image = new Image();
        image.src =
          node.localName === "svg" ? node.querySelector("image").getAttribute("href") : node.src;
        await image.decode();
      });
    }
    console.log(
      "SLIDESHOW PASS: five authentic devices, two-second rotation, pause and manual navigation",
    );
  } finally {
    await context.close();
  }
}

try {
  await reviewSlideshow();
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("502")) errors.push(message.text());
      });
      const name = route === "/" ? "home" : route.replaceAll("/", "-").slice(1);
      const result = { route, width, status: "failed" };
      report.push(result);
      try {
        const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
        assert.equal(response?.status(), 200, `${route}: HTTP response`);
        await prepareReviewPage(page);
        assert.doesNotMatch(
          await page.locator("body").innerText(),
          /نمایشگاه|ثبت آنلاین هنوز متصل نیست/u,
        );
        if (route === "/") await reviewFamilySelector(page, await response.text(), width);
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          broken: [...document.images]
            .filter(
              (image) =>
                image.getClientRects().length > 0 &&
                getComputedStyle(image).visibility !== "hidden" &&
                !image.naturalWidth,
            )
            .map((image) => image.src),
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
              return {
                width: rect.width,
                height: rect.height,
                hidden: getComputedStyle(node).display === "none",
              };
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
          assert.equal(await page.locator(".applications-grid .application-icon").count(), 0);
          assert.equal(await page.locator(".change-product").getAttribute("href"), "/");
          assert.equal(await page.locator(".change-product").innerText(), "تغییر محصول");
          const navigation = page.locator(".section-nav");
          const links = navigation.locator("a");
          assert.equal(
            await links.count(),
            4,
            `${route}: four main section links must fit without scrolling`,
          );
          assert.equal(
            await navigation.locator('a[href="#catalog"], a[href="#faq"]').count(),
            0,
            `${route}: catalog and FAQ links should not crowd the section menu`,
          );
          const navLayout = await navigation.evaluate((node) => ({
            width: node.clientWidth,
            scrollWidth: node.scrollWidth,
            buttons: [...node.querySelectorAll("a")].map((link) => {
              const rect = link.getBoundingClientRect();
              const style = getComputedStyle(link);
              const target = document.querySelector(link.getAttribute("href"));
              const range = document.createRange();
              range.selectNodeContents(link);
              const text = range.getBoundingClientRect();
              return {
                top: rect.top,
                height: rect.height,
                borderWidth: parseFloat(style.borderTopWidth),
                borderStyle: style.borderTopStyle,
                borderColor: style.borderTopColor,
                targetExists: !!target,
                clipped:
                  link.scrollWidth > link.clientWidth + 1 ||
                  text.left < rect.left - 1 ||
                  text.right > rect.right + 1 ||
                  text.top < rect.top - 1 ||
                  text.bottom > rect.bottom + 1,
              };
            }),
          }));
          assert.ok(
            navLayout.scrollWidth <= navLayout.width + 1,
            `${route}@${width}: section menu still requires horizontal scrolling`,
          );
          for (const button of navLayout.buttons) {
            assert.ok(
              Math.abs(button.top - navLayout.buttons[0].top) <= 1,
              `${route}@${width}: section links wrap to another row`,
            );
            assert.ok(button.height >= 44, `${route}@${width}: section link is difficult to tap`);
            assert.ok(
              button.borderWidth >= 1 && button.borderStyle !== "none",
              `${route}: section link lacks a visible boundary`,
            );
            assert.doesNotMatch(
              button.borderColor,
              /(?:transparent|rgba\([^)]*,\s*0\))/u,
              `${route}: section link boundary is transparent`,
            );
            assert.equal(
              button.targetExists,
              true,
              `${route}: section link points to a missing destination`,
            );
            assert.equal(
              button.clipped,
              false,
              `${route}@${width}: section button text is clipped`,
            );
          }

          // The last main section must be reachable through the compact, non-scrolling menu.
          const lastLink = links.last();
          assert.equal(await lastLink.getAttribute("href"), "#workflow");
          await lastLink.scrollIntoViewIfNeeded();
          const lastVisible = await lastLink.evaluate((link) => {
            const rect = link.getBoundingClientRect();
            const nav = link.closest("nav").getBoundingClientRect();
            return rect.left >= nav.left - 1 && rect.right <= nav.right + 1;
          });
          assert.equal(
            lastVisible,
            true,
            `${route}@${width}: final section link cannot be revealed`,
          );
          await lastLink.click();
          await page.waitForFunction(() => {
            const heading = document.querySelector("#workflow h2").getBoundingClientRect();
            return (
              location.hash === "#workflow" &&
              heading.top >= 0 &&
              heading.bottom < window.innerHeight
            );
          });
          assert.ok(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
            ),
            `${route}@${width}: scrolling section navigation overflows the document`,
          );
          assert.equal(
            await page.locator("#catalog h2").isVisible(),
            true,
            `${route}: catalog section was removed with its menu link`,
          );
          assert.ok(
            (await page.locator("#catalog a[download][href]").count()) > 0,
            `${route}: catalog download is no longer available`,
          );
          assert.equal(
            await page.locator("#faq h2").isVisible(),
            true,
            `${route}: FAQ section was removed with its menu link`,
          );
          const firstQuestion = page.locator("#faq details").first();
          await firstQuestion.locator("summary").click();
          assert.equal(
            await firstQuestion.getAttribute("open"),
            "",
            `${route}: FAQ can no longer be expanded`,
          );
          assert.equal(
            await firstQuestion.locator("p").isVisible(),
            true,
            `${route}: FAQ answer is inaccessible`,
          );
          await firstQuestion.locator("summary").click();

          const highlights = await page.locator(".key-features li").evaluateAll((nodes) =>
            nodes.map((node) => {
              const badge = node.querySelector(".key-feature-icon");
              const text = node.querySelector(".key-feature-text");
              const cardRect = node.getBoundingClientRect();
              const badgeRect = badge?.getBoundingClientRect();
              const range = document.createRange();
              if (text) range.selectNodeContents(text);
              const textRect = text ? range.getBoundingClientRect() : null;
              const contains = (rect) =>
                !!rect &&
                rect.width > 0 &&
                rect.height > 0 &&
                rect.left >= cardRect.left - 1 &&
                rect.right <= cardRect.right + 1 &&
                rect.top >= cardRect.top - 1 &&
                rect.bottom <= cardRect.bottom + 1;
              const overlaps =
                !!badgeRect &&
                !!textRect &&
                badgeRect.left < textRect.right - 1 &&
                badgeRect.right > textRect.left + 1 &&
                badgeRect.top < textRect.bottom - 1 &&
                badgeRect.bottom > textRect.top + 1;
              return {
                text: text?.textContent.trim(),
                visible: !!text && getComputedStyle(text).visibility === "visible",
                badgeText: badge?.textContent.trim(),
                decorative: badge?.getAttribute("aria-hidden"),
                icons: badge?.querySelectorAll("svg").length,
                contained: contains(badgeRect) && contains(textRect),
                overlaps,
                clipped:
                  !!text &&
                  ((text.clientWidth > 0 && text.scrollWidth > text.clientWidth + 1) ||
                    (text.clientHeight > 0 && text.scrollHeight > text.clientHeight + 1)),
                interactive: node.querySelectorAll("a, button, [role=button]").length,
              };
            }),
          );
          assert.equal(
            highlights.length,
            3,
            `${route}: three independent product highlights must be present`,
          );
          for (const highlight of highlights) {
            assert.ok(
              highlight.text && highlight.visible,
              `${route}@${width}: product highlight text is missing or hidden`,
            );
            assert.equal(highlight.icons, 1, `${route}: product highlight needs one symbol`);
            assert.equal(
              highlight.decorative,
              "true",
              `${route}: highlight symbol must remain decorative`,
            );
            assert.doesNotMatch(
              highlight.badgeText,
              /[0-9۰-۹٠-٩]/u,
              `${route}: highlights should use symbols rather than numbered steps`,
            );
            assert.equal(
              highlight.contained,
              true,
              `${route}@${width}: highlight content escapes its card`,
            );
            assert.equal(
              highlight.overlaps,
              false,
              `${route}@${width}: highlight symbol overlaps its text`,
            );
            assert.equal(highlight.clipped, false, `${route}@${width}: highlight text is clipped`);
            assert.equal(
              highlight.interactive,
              0,
              `${route}: product highlights should not imply a separate action`,
            );
          }

          const numbers = await page.locator(".advantage-number").evaluateAll((nodes) =>
            nodes.map((node) => ({
              text: node.textContent.trim(),
              size: parseFloat(getComputedStyle(node).fontSize),
              font: getComputedStyle(node).fontFamily,
            })),
          );
          assert.ok(numbers.length >= 3, `${route}: advantage markers are missing`);
          for (const number of numbers) {
            assert.ok(
              number.size >= 16,
              `${route}@${width}: Persian number ${number.text} is too small`,
            );
            assert.match(
              number.font,
              /Vazirmatn/u,
              `${route}: Persian numerals must use the page typeface`,
            );
            assert.doesNotMatch(
              number.font,
              /^\s*Arial(?:,|$)/iu,
              `${route}: numeral font differs from the page`,
            );
          }
          await navigation.evaluate((node) => {
            node.scrollLeft = 0;
          });
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
                overflowing: [heading, value].some(
                  (cell) => cell.scrollWidth > cell.clientWidth + 1,
                ),
              };
            });
            return {
              cells,
              width: node.getBoundingClientRect().width,
              wrap: node.parentElement.clientWidth,
            };
          });
          assert.ok(table.cells.length >= 8, `${route}: technical specifications are incomplete`);
          assert.ok(table.width <= table.wrap + 1, `${route}: table overflows its container`);
          for (const cell of table.cells) {
            assert.equal(
              cell.headingAlign,
              "right",
              `${route}: row headings must share RTL alignment`,
            );
            assert.equal(
              cell.valueAlign,
              "right",
              `${route}: mixed-language values must share RTL alignment`,
            );
            assert.ok(
              Math.abs(cell.headingRight - table.cells[0].headingRight) <= 1,
              `${route}: label column drifts`,
            );
            assert.ok(
              Math.abs(cell.valueRight - table.cells[0].valueRight) <= 1,
              `${route}: value column drifts`,
            );
            assert.equal(
              cell.overflowing,
              false,
              `${route}: specification text overflows its cell`,
            );
          }
        }

        await page.screenshot({
          path: path.join(output, `${name}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
        if (["/cbc/bha5000", "/poct/fs-205"].includes(route) && [390, 1440].includes(width)) {
          await captureReviewPreview(page, `after-${name}-${width}-top`);
        }
        if (route === "/cbc/bha5000" && width === 390) {
          await captureReviewPreview(page, "after-bha5000-390-specs", {
            locator: page.locator("#specs"),
          });
          await captureReviewPreview(page, "after-bha5000-390-faq", {
            locator: page.locator("#faq"),
          });
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        if (route === "/cbc/bha3000") {
          await page.locator("#specs").screenshot({
            path: path.join(output, `specifications-${width}.png`),
            animations: "disabled",
          });
        }

        await reviewConsultation(page, route, width);

        assert.deepEqual(errors, [], `${route}@${width}: browser runtime errors`);
        result.status = "passed";
        console.log(
          `PASS ${route} at ${width}px: layout, images, CTA icons${route === "/" ? "" : ", section navigation, symbolic highlights, advantage numerals, table and acknowledged consultation"}`,
        );
      } catch (error) {
        result.error = error.message;
        await page
          .screenshot({ path: path.join(output, `failure-${name}-${width}.png`), fullPage: true })
          .catch(() => {});
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
