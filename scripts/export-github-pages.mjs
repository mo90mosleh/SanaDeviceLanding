import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pagesBase } from "./github-pages-config.mjs";

const base = pagesBase;
assert.ok(base.startsWith("/") && base.endsWith("/"));
const output = path.resolve("artifacts/github-pages");
const origin = "http://127.0.0.1:4175";
const routes = [
  "/",
  "/cbc/bha3000",
  "/cbc/bha5000",
  "/cbc/bha5100",
  "/poct/fs-114",
  "/poct/fs-205",
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(".output/public", output, { recursive: true });
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: "4175" },
  stdio: ["ignore", "ignore", "inherit"],
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("SSR exporter exited before it was ready");
    try {
      ready = (await fetch(origin + base)).ok;
      if (ready) break;
    } catch {
      /* Wait for the existing server build to start. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "The server-rendered export did not start");
  for (const route of routes) {
    const suffix = route === "/" ? "" : route.slice(1) + "/";
    const response = await fetch(origin + base + suffix);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/gu) || []).length, 1, route);
    const directory = path.join(output, route.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), html);
    console.log(`EXPORTED ${base}${suffix}`);
  }
  const missing = await fetch(origin + base + "unknown-product/");
  assert.equal(missing.status, 404);
  await writeFile(path.join(output, "404.html"), await missing.text());
  await writeFile(path.join(output, ".nojekyll"), "");
  console.log("STATIC EXPORT PASS: six complete RTL pages, assets and a useful 404 page");
} finally {
  server.kill("SIGTERM");
}
