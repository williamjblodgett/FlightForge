import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { preview } from "vite";

let previewServer;
let baseUrl;

before(async () => {
  previewServer = await preview({
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });

  const address = previewServer.httpServer.address();
  assert.ok(address && typeof address === "object", "preview server must bind a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await previewServer?.close();
});

async function render(pathname) {
  return fetch(`${baseUrl}${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders FlightForge discovery without starter metadata", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /FlightForge/);
  assert.match(html, /Find your line/);
  assert.match(html, /Sabattus Disc Golf/);
  assert.match(html, /Maine is the first tee|Maine/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("server-renders a canonical course detail with its unclaimed notice", async () => {
  const response = await render("/courses/sabattus-disc-golf");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sabattus Disc Golf/);
  assert.match(html, /This listing has not yet been claimed or verified by the course operator/);
  assert.match(html, /application\/ld\+json/);
});

test("keeps administrator claims protected", async () => {
  const response = await render("/admin/claims");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Platform administrator access required/);
  assert.match(html, /noindex|index:false/i);
});
