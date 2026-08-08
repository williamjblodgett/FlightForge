import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    // CI builds immediately before this suite. Vite preview serves the same
    // Cloudflare-compatible production artifact used by the integration suite.
    command: "npx vite preview --host 127.0.0.1 --port 3000 --strictPort",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { EMAIL_DELIVERY_MODE: "test", NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.test", NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.test", LEGAL_TERMS_VERSION: "e2e-v1", LEGAL_PRIVACY_VERSION: "e2e-v1" },
  },
});
