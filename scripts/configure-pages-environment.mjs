import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { pagesBase, pagesUrl } from "./github-pages-config.mjs";

assert.ok(process.env.GITHUB_ENV, "GitHub environment output file is required");
appendFileSync(process.env.GITHUB_ENV, `SANA_BASE_PATH=${pagesBase}\nSANA_SITE_URL=${pagesUrl}\n`);
console.log("PAGES PUBLICATION CONFIG " + JSON.stringify({ pagesBase, pagesUrl }));
