import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { format } from "prettier";

const file = "src/lib/consultation.ts";
const before = execFileSync("git", ["show", `${process.env.SANA_BASELINE_SHA}:${file}`], {
  encoding: "utf8",
});
const after = await readFile(file, "utf8");
const contract = (source) => source.split("export type SubmissionResult")[0];
assert.equal(
  await format(contract(after), { parser: "typescript" }),
  await format(contract(before), { parser: "typescript" }),
  "The existing contact fields, payload and Iranian mobile validation must remain unchanged",
);
console.log("LEAD CONTRACT PASS: existing payload, validation and mobile normalization preserved");
