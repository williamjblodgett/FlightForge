import { defineConfig, devices } from "@playwright/test";

const localChromium=process.env.FLIGHTFORGE_TEST_ISOLATED==="1"?{launchOptions:{args:["--ignore-certificate-errors"]}}:{};
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout:60000,
  workers:3,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, ignoreHTTPSErrors:process.env.FLIGHTFORGE_TEST_ISOLATED==="1", trace: "retain-on-failure", serviceWorkers:"block" },
  projects: [
    {name:"mobile-webkit",use:{...devices["iPhone 13"],browserName:"webkit"}},
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"],...localChromium } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"],...localChromium, browserName: "chromium" } },
  ],
});
