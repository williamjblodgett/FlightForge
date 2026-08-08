import { spawnSync } from "node:child_process";

const runId = `${process.pid}-${Date.now()}`;
const coordinatorEmail = `coordinator-${runId}@example.test`;
const environment = {
  ...process.env,
  EVENT_COORDINATOR_EMAILS: coordinatorEmail,
  PLATFORM_ADMIN_EMAILS: coordinatorEmail,
  TEST_COORDINATOR_EMAIL: coordinatorEmail,
  EMAIL_DELIVERY_MODE: "test",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.test",
  NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.test",
  LEGAL_TERMS_VERSION: "test-v1",
  LEGAL_PRIVACY_VERSION: "test-v1",
};
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) throw new Error("Run this integration harness through npm so npm_execpath is available.");
run(process.execPath, [npmExecPath, "run", "build"]);
run(process.execPath, ["--test", "tests/rendered-html.test.mjs"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(), env: environment, stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
