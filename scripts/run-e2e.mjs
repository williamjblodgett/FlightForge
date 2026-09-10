import { isolatedTestWorkspace } from "./isolated-test-workspace.mjs";
import { resolve } from "node:path";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { request as httpsRequest } from "node:https";
import { fileURLToPath } from "node:url";

const port = 31_000 + (process.pid % 1_000);
const baseUrl = `https://127.0.0.1:${port}`;
const {cwd,env:environment}=isolatedTestWorkspace({E2E_BASE_URL:baseUrl,FLIGHTFORGE_TEST_HTTPS:"1"});
const openssl=process.platform==="win32"?"C:/Program Files/Git/usr/bin/openssl.exe":"openssl";
execFileSync(openssl,["req","-x509","-newkey","rsa:2048","-nodes","-keyout",resolve(cwd,"test-local.key"),"-out",resolve(cwd,"test-local.crt"),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=DNS:localhost,IP:127.0.0.1"],{env:environment,stdio:"ignore",windowsHide:true});
const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) throw new Error("Run this browser harness through npm so npm_execpath is available.");

runSync(process.execPath, [npmExecPath, "run", "build"]);
runSync(process.execPath,["scripts/migrate-test-state.mjs"]);
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const server = spawn(process.execPath, [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd,
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
    cwd,
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
      const healthy=await new Promise((resolve,reject)=>{
        const request=httpsRequest(url,{rejectUnauthorized:false},response=>{response.resume();resolve(response.statusCode===200);});
        request.setTimeout(2000,()=>request.destroy(new Error("Health timeout")));request.on("error",reject);request.end();
      });
      if (healthy) return;
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
    cwd,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  const resultPath = resolve(cwd,"test-results/.last-run.json");
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
