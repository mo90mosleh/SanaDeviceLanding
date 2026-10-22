import { spawnSync } from "node:child_process";
const files = ["src/components/landing/Consultation.tsx", "src/lib/consultation.ts", "src/styles.css", "tests/frontend.test.mjs", "scripts/ui-review.mjs", "scripts/review-github-pages.mjs", "scripts/live-lead-smoke.mjs", "docs/FRONTEND-INTEGRATION.md"];
for (const file of files) {
  const result = spawnSync("pnpm", ["exec", "prettier", file], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Prettier failed for ${file}: ${result.stderr}`);
  console.log(`SANA_FORMAT_FILE ${file} ${Buffer.from(result.stdout).toString("base64")}`);
}
