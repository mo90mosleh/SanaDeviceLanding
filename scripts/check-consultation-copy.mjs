import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { format } from "prettier";

const file = "src/components/landing/Consultation.tsx";
const before = execFileSync("git", ["show", `${process.env.SANA_BASELINE_SHA}:${file}`], {
  encoding: "utf8",
});
const notice = `        <p className="small">
          ثبت آنلاین هنوز متصل نیست. در حال حاضر، برای دریافت مشاوره تماس بگیرید.
        </p>
`;
const oldMessage = "اطلاعات از نظر ساختار بررسی شد، اما ثبت آنلاین هنوز متصل نیست و درخواستی ارسال نشده است. برای مشاوره با ۰۲۶ ۳۳۱۰۷ تماس بگیرید.";
const newMessage = "اطلاعات از نظر ساختار بررسی شد و درخواستی ارسال نشده است. برای مشاوره با ۰۲۶ ۳۳۱۰۷ تماس بگیرید.";
assert.ok(before.includes(notice) && before.includes(oldMessage));
const expected = before.replace(notice, "").replace(oldMessage, newMessage);
const actual = await readFile(file, "utf8");
assert.equal(
  await format(actual, { parser: "typescript" }),
  await format(expected, { parser: "typescript" }),
  "Only the owner-requested consultation copy changes are allowed; fields and logic must remain unchanged",
);
console.log("CONSULTATION COPY PASS: requested notice removed; form structure and behavior preserved");
