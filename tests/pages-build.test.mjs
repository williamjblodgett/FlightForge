import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const output = path.resolve("pages-dist");

test("GitHub Pages build contains the branded offline app shell", async () => {
  const html = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(html, /FlightForge/u);
  assert.match(html, /manifest\.webmanifest/u);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/u);
  await access(path.join(output, "sw.js"));
  await access(path.join(output, "og.png"));
  await access(path.join(output, "icon.svg"));
  const manifest = JSON.parse(await readFile(path.join(output, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "./#home");
  assert.equal(manifest.icons[0]?.src, "./icon.svg");
});

test("GitHub Pages build emits JavaScript and CSS assets", async () => {
  const files = await readdir(path.join(output, "assets"));
  assert.ok(files.some((file) => file.endsWith(".js")), "expected a JavaScript bundle");
  assert.ok(files.some((file) => file.endsWith(".css")), "expected a CSS bundle");
});

test("service worker precaches the hashed app shell", async () => {
  const worker = await readFile(path.join(output, "sw.js"), "utf8");
  assert.match(worker, /cacheAppShell/u);
  assert.match(worker, /matchAll/u);
});
