import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const output = path.resolve("pages-dist");

test("GitHub Pages build contains the branded installable app shell", async () => {
  const html = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(html, /FlightForge/u);
  assert.match(html, /manifest\.webmanifest/u);
  assert.match(html, /Content-Security-Policy/u);
  assert.match(html, /object-src 'none'/u);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/u);
  await access(path.join(output, "sw.js"));
  await access(path.join(output, "og.webp"));
  await access(path.join(output, "brand", "flightforge-maine-hero-v2.webp"));
  await access(path.join(output, "icon.svg"));
  const manifest = JSON.parse(await readFile(path.join(output, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "./#home");
  assert.equal(manifest.icons[0]?.src, "./icon.svg");
});

test("GitHub Pages build emits JavaScript and CSS assets", async () => {
  const files = await readdir(path.join(output, "assets"));
  assert.ok(files.some((file) => file.endsWith(".js")), "expected a JavaScript bundle");
  assert.ok(files.some((file) => file.endsWith(".css")), "expected a CSS bundle");
  const scripts = await Promise.all(
    files.filter((file) => file.endsWith(".js")).map((file) => readFile(path.join(output, "assets", file), "utf8")),
  );
  const bundle = scripts.join("\n");
  assert.match(bundle, /Sign out of demo/u);
  assert.match(bundle, /Illustrative field scene/u);
  assert.match(bundle, /Show 12 more/u);
  assert.match(bundle, /sabattus-disc-golf-eagle/u);
  assert.match(bundle, /demo-course-forge-ridge/u);
  assert.match(bundle, /Save profile and privacy/u);
  assert.match(bundle, /Mark lesson step complete/u);
  const scriptStats = await Promise.all(files.filter((file) => file.endsWith(".js")).map((file) => stat(path.join(output, "assets", file))));
  assert.ok(Math.max(...scriptStats.map((fileStat) => fileStat.size)) < 400_000, "expected route-level code splitting to keep every JavaScript chunk below 400 kB");
});

test("service worker caches only explicitly public assets", async () => {
  const worker = await readFile(path.join(output, "sw.js"), "utf8");
  assert.match(worker, /PUBLIC_ASSETS/u);
  assert.match(worker, /flightforge-maine-hero-v2\.webp/u);
  assert.match(worker, /event\.request\.mode === "navigate"/u);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/u);
  assert.match(worker, /event\.request\.headers\.has\("authorization"\)/u);
  assert.doesNotMatch(worker, /cacheAppShell|matchAll/u);
});
