import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.SANA_TEST_URL || "http://127.0.0.1:5173";
const paths = ["/", "/cbc/bha3000", "/cbc/bha5000", "/cbc/bha5100", "/poct/fs-114", "/poct/fs-205"];
for (const path of paths)
  test(`direct HTTP load ${path}`, async () => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<html[^>]+lang="fa"[^>]+dir="rtl"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.doesNotMatch(html, /FS[- ]?301|واگذاری رایگان|طرح رایگان|هدیه دستگاه|اورتانیس/i);
    assert.match(html, /SANA/);
    if (path === "/") assert.equal((html.match(/class="product-card"/g) || []).length, 5);
    else {
      assert.match(html, /id="consultation"/);
      assert.match(html, /id="specs"/);
      assert.match(html, /id="workflow"/);
      assert.match(html, /id="faq"/);
    }
    for (const m of html.matchAll(/(?:src|href)="(\/product-assets\/[^"?]+)"/g)) {
      const asset = await fetch(base + m[1]);
      assert.equal(asset.status, 200, m[1]);
      if (m[1].endsWith(".pdf")) {
        assert.match(asset.headers.get("content-type") || "", /pdf/);
        assert.equal((await asset.text()).slice(0, 5), "%PDF-");
      }
    }
  });
test("unknown path has helpful fallback", async () => {
  const response = await fetch(base + "/unknown-product");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /این صفحه پیدا نشد/);
});
test("favicon, manifest and font load locally", async () => {
  for (const path of [
    "/favicon.ico",
    "/favicon.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/fonts/Vazirmatn-Regular.woff2",
    "/site.webmanifest",
  ])
    assert.equal((await fetch(base + path)).status, 200, path);
});
