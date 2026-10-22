import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = [
  "src/components/landing/Consultation.tsx",
  "src/components/landing/HomePage.tsx",
  "src/lib/consultation.ts",
  "src/routes/api.consultation.ts",
  "src/server/consultation.ts",
  "src/styles.css",
  "scripts/ui-review.mjs",
  "scripts/check-lead-contract.mjs",
  "tests/frontend.test.mjs",
  "tests/consultation-api.test.mjs",
  "scripts/live-lead-smoke.mjs",
  ".github/workflows/landing-ui.yml",
  ".github/workflows/lead-webhook-smoke.yml",
  "docs/FRONTEND-INTEGRATION.md",
  "docs/SANA-UI-REVIEW.md"
];
for (const file of files) {
  const result = spawnSync("pnpm", ["exec", "prettier", file], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Prettier failed for ${file}: ${result.stderr}`);
  console.log(`SANA_FORMAT_FILE ${file} ${Buffer.from(result.stdout).toString("base64")}`);
}
console.log("SANA_GENERATED_ROUTE " + readFileSync("src/routeTree.gen.ts").toString("base64"));
