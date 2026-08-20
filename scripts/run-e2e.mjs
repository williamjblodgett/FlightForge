import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const port = 31_000 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const environment = {
  ...process.env,
  E2E_BASE_URL: baseUrl,
  EMAIL_DELIVERY_MODE: "test",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.test",
  NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.test",
  LEGAL_TERMS_VERSION: "e2e-v1",
  LEGAL_PRIVACY_VERSION: "e2e-v1",
};
const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) throw new Error("Run this browser harness through npm so npm_execpath is available.");

runSync(process.execPath, [npmExecPath, "run", "build"]);
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const server = spawn(process.execPath, [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: process.cwd(),
  env: environment,
  stdio: ["ignore", "inherit", "inherit"],
  windowsHide: true,
  detached: process.platform !== "win32",
});

let suiteStatus = 1;
try {
  await waitForHealth(`${baseUrl}/api/health`, server);
  const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
  suiteStatus = await runPlaywright(playwrightCli, process.argv.slice(2));
} finally {
  stopProcessTree(server.pid);
}
process.exit(suiteStatus);

function runSync(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The browser-test server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // The isolated preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The browser-test server did not become healthy at ${url}.`);
}

async function runPlaywright(playwrightCli, args) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [playwrightCli, "test", ...args], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  const resultPath = fileURLToPath(new URL("../test-results/.last-run.json", import.meta.url));
  const deadline = startedAt + 10 * 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return child.exitCode;
    if (existsSync(resultPath) && statSync(resultPath).mtimeMs >= startedAt - 1_000) {
      const result = JSON.parse(readFileSync(resultPath, "utf8"));
      if (result?.status === "passed" || result?.status === "failed") {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        if (child.exitCode === null) stopProcessTree(child.pid);
        return result.status === "passed" ? 0 : 1;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  stopProcessTree(child.pid);
  throw new Error("The browser suite did not report a result within ten minutes.");
}

function stopProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  try { process.kill(-pid, "SIGTERM"); } catch { /* The child already exited. */ }
}
