import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("artifacts/ui-review");
let emittedCharacters = 0;

export async function prepareReviewPage(page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  const pause = page.getByRole("button", { name: "توقف نمایش خودکار" });
  if (await pause.count()) await pause.click();
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo(0, 0);
    const visible = (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    await Promise.all([...document.images].filter(visible).map((image) => image.decode()));
    await Promise.all([...document.querySelectorAll("svg.product-image")].filter(visible).map(async (node) => {
      const image = new Image();
      image.src = node.querySelector("image").getAttribute("href");
      await image.decode();
    }));
  });
}

// Small public-page previews travel through authenticated job logs when artifact downloads
// are unavailable. Full-resolution screenshots remain in the normal workflow artifact.
export async function captureReviewPreview(page, name, { locator, fullPage = false } = {}) {
  assert.match(name, /^[a-z0-9-]+$/u);
  await mkdir(output, { recursive: true });
  const screenshot = locator
    ? await locator.screenshot({ animations: "disabled" })
    : await page.screenshot({ fullPage, animations: "disabled" });
  await writeFile(path.join(output, `${name}.png`), screenshot);
  const jpeg = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 640 / image.width, 1400 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.68;
    let encoded = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    while (encoded.length > 60000 && quality > 0.25) {
      quality -= 0.08;
      encoded = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    }
    return encoded;
  }, `data:image/png;base64,${screenshot.toString("base64")}`);
  assert.ok(jpeg.length <= 70000, `${name}: review preview is unexpectedly large`);
  emittedCharacters += jpeg.length;
  assert.ok(emittedCharacters <= 650000, "Review previews exceeded the bounded log budget");
  const bytes = Buffer.from(jpeg, "base64");
  await writeFile(path.join(output, `${name}.preview.jpg`), bytes);
  const chunks = jpeg.match(/.{1,8000}/gu);
  console.log("SANA_PREVIEW_BEGIN " + JSON.stringify({
    name, mime: "image/jpeg", bytes: bytes.length, chunks: chunks.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  }));
  chunks.forEach((chunk, index) => console.log(`SANA_PREVIEW_CHUNK ${name} ${index} ${chunk}`));
  console.log(`SANA_PREVIEW_END ${name}`);
}
