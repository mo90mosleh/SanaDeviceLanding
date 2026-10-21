import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("artifacts/ui-review");
const before = JSON.parse(await readFile(path.join(output, "before-lint.json"), "utf8"));
const after = JSON.parse(await readFile(path.join(output, "after-lint.json"), "utf8"));

function findings(report, root) {
  return report.flatMap((file) => file.messages.map((message) => ({
    file: path.relative(root, file.filePath),
    rule: message.ruleId,
    severity: message.severity,
    message: message.message,
  })));
}

const baseline = findings(before, process.env.SANA_BEFORE_DIR);
const current = findings(after, process.cwd());
const signature = (finding) => JSON.stringify(finding);
const remaining = new Map();
for (const finding of baseline) {
  const key = signature(finding);
  remaining.set(key, (remaining.get(key) || 0) + 1);
}
const introduced = current.filter((finding) => {
  const key = signature(finding);
  const count = remaining.get(key) || 0;
  if (!count) return true;
  remaining.set(key, count - 1);
  return false;
});
const counts = (items) => ({
  errors: items.filter((item) => item.severity === 2).length,
  warnings: items.filter((item) => item.severity === 1).length,
});
const comparison = { before: counts(baseline), after: counts(current), introduced };
await writeFile(path.join(output, "lint-comparison.json"), JSON.stringify(comparison, null, 2));
console.log("SANA_LINT_COMPARISON " + JSON.stringify(comparison));
assert.deepEqual(introduced, [], "The redesign introduced ESLint findings; see lint-comparison.json");
if (comparison.after.errors) {
  console.log("::warning::Full lint still reports pre-existing formatting errors. Baseline comparison confirms no new findings; see lint-comparison.json.");
}
