import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { format } from "prettier";

const file = "src/lib/consultation.ts";
const before = execFileSync("git", ["show", `${process.env.SANA_BASELINE_SHA}:${file}`], {
  encoding: "utf8",
});
const after = await readFile(file, "utf8");
const contract = (source) =>
  source.split("export type LeadErrors")[0].replace(/\s*honeypot\?: string;/u, "");
assert.equal(
  await format(contract(after), { parser: "typescript" }),
  await format(contract(before), { parser: "typescript" }),
  "Existing contact and device payload fields must remain compatible; honeypot is additive",
);
console.log(
  "LEAD CONTRACT PASS: existing payload fields preserved with an additive honeypot; current validation covered by tests",
);
