import { spawnSync } from "node:child_process";

const files = [
  "src/components/landing/HomePage.tsx",
  "src/components/landing/ProductDetail.tsx",
  "src/components/landing/SiteChrome.tsx",
  "src/components/landing/BrandLogo.tsx",
  "src/components/landing/Site.tsx",
  "src/styles.css",
  "src/routes/__root.tsx",
  "public/site.webmanifest",
  "scripts/ui-review.mjs",
  "scripts/measure-home-baseline.mjs",
  "scripts/capture-review-previews.mjs",
  ".github/workflows/landing-ui.yml",
];

for (const file of files) {
  const args = ["exec", "prettier", file];
  if (file.endsWith(".webmanifest")) args.push("--parser", "json");
  const result = spawnSync("pnpm", args, {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Prettier could not read ${file}: ${result.stderr || result.error}`);
  }
  console.log(`SANA_FORMAT_FILE ${file} ${Buffer.from(result.stdout).toString("base64")}`);
}
