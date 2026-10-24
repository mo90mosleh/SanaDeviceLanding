import test from "node:test";
import assert from "node:assert/strict";
import { resolvePagesConfig } from "../scripts/github-pages-config.mjs";

test("custom domains publish at the root even when the repository has a name", () => {
  assert.deepEqual(
    resolvePagesConfig({
      repository: "mo90mosleh/SanaDeviceLanding",
      siteUrl: "https://cbc.ortanes.com",
    }),
    {
      pagesBase: "/",
      pagesUrl: "https://cbc.ortanes.com/",
    },
  );
});
test("configure-pages empty base_path means root, not the old repository path", () => {
  assert.deepEqual(resolvePagesConfig({ siteUrl: "https://cbc.ortanes.com/", basePath: "" }), {
    pagesBase: "/",
    pagesUrl: "https://cbc.ortanes.com/",
  });
});
test("project-site publication retains its repository subpath without a custom domain", () => {
  assert.deepEqual(resolvePagesConfig({ repository: "mo90mosleh/SanaDeviceLanding" }), {
    pagesBase: "/SanaDeviceLanding/",
    pagesUrl: "https://mo90mosleh.github.io/SanaDeviceLanding/",
  });
});
test("configure-pages paths with or without a final slash produce the same project URL", () => {
  for (const basePath of ["/SanaDeviceLanding", "/SanaDeviceLanding/"]) {
    assert.deepEqual(
      resolvePagesConfig({ siteUrl: "https://mo90mosleh.github.io/SanaDeviceLanding", basePath }),
      {
        pagesBase: "/SanaDeviceLanding/",
        pagesUrl: "https://mo90mosleh.github.io/SanaDeviceLanding/",
      },
    );
  }
});
test("explicit preview bases are preserved", () => {
  assert.deepEqual(
    resolvePagesConfig({ siteUrl: "https://cbc.ortanes.com/", basePath: "/preview/" }),
    {
      pagesBase: "/preview/",
      pagesUrl: "https://cbc.ortanes.com/preview/",
    },
  );
});
test("fallback publication follows repository renames", () => {
  assert.equal(
    resolvePagesConfig({ repository: "Owner/Renamed" }).pagesUrl,
    "https://owner.github.io/Renamed/",
  );
});
