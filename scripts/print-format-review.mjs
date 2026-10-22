import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = ["src/components/landing/BrandLogo.tsx", "src/components/landing/Consultation.tsx", "src/components/landing/HomePage.tsx", "src/components/landing/ProductDetail.tsx", "src/components/landing/ProductImage.tsx", "src/components/landing/ProductSlideshow.tsx", "src/components/landing/SiteChrome.tsx", "src/lib/consultation.ts", "src/lib/site-path.ts", "src/router.tsx", "src/routes/__root.tsx", "src/styles.css", "vite.config.ts", "public/site.webmanifest", "scripts/ui-review.mjs", "scripts/check-lead-contract.mjs", "tests/frontend.test.mjs", "scripts/live-lead-smoke.mjs", "scripts/export-github-pages.mjs", "scripts/review-github-pages.mjs", "scripts/check-webhook-cors.mjs", ".github/workflows/landing-ui.yml", ".github/workflows/lead-webhook-smoke.yml", ".github/workflows/github-pages.yml", "docs/FRONTEND-INTEGRATION.md", "docs/SANA-UI-REVIEW.md"];
for (const file of files) {
  const result = spawnSync("pnpm", ["exec", "prettier", file], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Prettier failed for ${file}: ${result.stderr}`);
  console.log(`SANA_FORMAT_FILE ${file} ${Buffer.from(result.stdout).toString("base64")}`);
}
console.log("SANA_GENERATED_ROUTE " + readFileSync("src/routeTree.gen.ts").toString("base64"));
