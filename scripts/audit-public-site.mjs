// Read-only browser smoke audit: no sign-in, form submissions or device permissions.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3100");
const output = resolve(process.argv[3] ?? ".tmp/public-site-audit");
await mkdir(output, { recursive: true });
const routes = ["/", "/courses", "/courses?state=NH", "/courses?state=VT", "/courses?state=MA", "/courses?state=CT", "/courses?state=RI", "/courses?q=NoMatchingCourse987", "/events", "/play", "/more", "/fieldwork", "/bag", "/coach", "/community", "/messages", "/profile", "/favorites", "/rounds", "/groups", "/updates", "/practice", "/recover", "/leagues", "/passport", "/plan", "/downloads", "/sign-in", "/sign-up", "/forgot-password", "/support/course-correction", "/places/new-england", "/legal/privacy", "/legal/terms", "/legal/community-guidelines", "/roadmap", "/not-a-real-flightforge-page"];
routes.push("/courses?state=ME", "/rounds/new", "/events/manage", "/events/new", "/events/coordinator/apply", "/admin/claims", "/admin/imports", "/admin/coordinators", "/admin/highlights", "/admin/reports", "/courses/crane-hill/claim", "/messages/00000000-0000-4000-8000-000000000000");
for (const slug of ["bretton-woods-disc-golf", "the-pines-at-wheelock", "awasiwi-woods", "hard-ack-dgc", "buffumville-lake", "tully-lake", "crane-hill", "orenaug-park-disc-golf", "north-quarter-park"]) routes.push("/courses/" + slug);
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    const page = await context.newPage();
    for (const path of routes) {
      const errors = [], failedAssets = [];
      const onError = error => errors.push(error.message);
      const onResponse = response => { if (response.status() >= 400 && /\.(?:js|css|webp|png|jpg|woff2)(?:\?|$)/.test(response.url())) failedAssets.push({ url: response.url(), status: response.status() }); };
      page.on("pageerror", onError); page.on("response", onResponse);
      const started = Date.now();
      try {
        const response = await page.goto(new URL(path, base).href, { waitUntil: "networkidle", timeout: 45000 });
        const layout = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          heading: document.querySelector("main h1")?.textContent,
          activeMobileLinks: [...document.querySelectorAll('.mobile-nav [aria-current="page"]')].map(el => el.textContent),
          clippedControls: [...document.querySelectorAll("button, a.button, summary")].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === "hidden").map(el => el.textContent?.trim().slice(0, 100)),
        }));
        const item = { path, viewport, status: response?.status(), finalPath: new URL(page.url()).pathname, milliseconds: Date.now() - started, ...layout, errors, failedAssets };
        results.push(item);
        if (["/", "/courses", "/more", "/fieldwork", "/sign-in", "/events"].includes(path)) await page.screenshot({ path: resolve(output, `${viewport.width}-${path.replaceAll("/", "") || "home"}.png`), fullPage: true });
        console.log(JSON.stringify(item));
      } catch (error) { results.push({ path, viewport, error: String(error) }); console.log(JSON.stringify(results.at(-1))); }
      finally { page.off("pageerror", onError); page.off("response", onResponse); }
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2));
const failures = results.filter(r => r.error || r.errors?.length || r.failedAssets?.length || r.scrollWidth > r.width || (r.status >= 400 && r.path !== "/not-a-real-flightforge-page"));
console.log(JSON.stringify({ checked: results.length, failures, output }));
process.exitCode = failures.length ? 1 : 0;
