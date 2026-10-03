import { createHash } from "node:crypto";

export const INCIDENT_MARKER = "<!-- flightforge-production-health:v1 -->";
const TITLE = "Production incident: FlightForge service degraded";
const CHECKS = ["database", "schema", "privateStorage"];

// Only fixed diagnostic codes are persisted. Never publish response bodies,
// provider URLs, credentials, user data, or exception messages to GitHub.
export async function probeProduction(siteUrl, fetcher = fetch) {
  const url = new URL(siteUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("SITES_PRODUCTION_URL must be an HTTPS origin without credentials.");
  }
  const failures = [];
  let release = "unknown";
  await Promise.all([
    (async () => {
      try {
        const response = await fetcher(url.href, { redirect: "error", signal: AbortSignal.timeout(20000) });
        if (!response.ok) failures.push(`homepage_http_${response.status}`);
        else if (!response.headers.get("content-type")?.includes("text/html")) failures.push("homepage_invalid_content");
        await response.body?.cancel();
      } catch { failures.push("homepage_unreachable"); }
    })(),
    (async () => {
      try {
        const response = await fetcher(new URL("/api/health", url).href, { redirect: "error", signal: AbortSignal.timeout(20000), headers: { Accept: "application/json" } });
        if (!response.ok) failures.push(`health_http_${response.status}`);
        const body = await response.json();
        if (body?.service !== "flightforge-web" || !["ok", "degraded"].includes(body?.status)) {
          failures.push("health_invalid_response");
          return;
        }
        if (/^[a-f0-9]{7,40}$/u.test(body.releaseId ?? "")) release = body.releaseId;
        if (body.status !== "ok") failures.push("service_degraded");
        for (const check of CHECKS) if (body.checks?.[check] !== true) failures.push(`${check}_unavailable`);
        if (body.supabaseConfigured !== true || body.authentication?.status !== "AVAILABLE") failures.push("authentication_unavailable");
      } catch { failures.push("health_unreachable_or_invalid"); }
    })(),
  ]);
  failures.sort();
  return { healthy: failures.length === 0, failures, release, origin: url.origin };
}

export function fingerprint(report) {
  // Timestamps and releases must not turn one continuing outage into new alerts.
  return createHash("sha256").update(JSON.stringify(report.failures)).digest("hex");
}

export async function reconcileIncident({ github, repo, report, runUrl, checkedAt, confirmRecovery = undefined }) {
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...repo, state: "all", creator: "github-actions[bot]", per_page: 100,
  });
  const incidents = issues.filter(issue => !issue.pull_request && issue.user?.login === "github-actions[bot]" && issue.body?.includes(INCIDENT_MARKER));
  const open = incidents.filter(issue => issue.state === "open");
  // Existing incidents need a second healthy observation before resolution.
  if (report.healthy && open.length && confirmRecovery) report = await confirmRecovery();
  if (report.healthy) {
    for (const issue of open) {
      await github.rest.issues.createComment({ ...repo, issue_number: issue.number,
        body: `Production recovered at ${checkedAt}. Homepage, database, schema, private storage and authentication checks pass. [Check run](${runUrl}).` });
      await github.rest.issues.update({ ...repo, issue_number: issue.number, state: "closed", state_reason: "completed" });
    }
    return { action: open.length ? "resolved" : "healthy", issueNumber: open[0]?.number };
  }
  const marker = `<!-- flightforge-health-fingerprint:${fingerprint(report)} -->`;
  const current = open[0];
  if (current?.body?.includes(marker)) return { action: "unchanged", issueNumber: current.number };
  const body = [INCIDENT_MARKER, marker, "## Production is degraded", "",
    `Site: ${report.origin}`, `Observed: ${checkedAt}`, `Release: ${report.release}`, "",
    ...report.failures.map(failure => `- ${failure}`), "",
    `Details: [monitor run](${runUrl})`, "",
    "This is an availability incident, not evidence that a deployment failed. The monitor continues checking every scheduled run. Repeated identical failures do not create additional issues or comments. Changed failures update this incident; confirmed recovery closes it automatically.", "",
    "If authentication is unavailable, inspect the existing Supabase project and restore service or correct its approved runtime configuration. Do not disable authentication or change the health endpoint to hide the outage.",
  ].join("\n");
  if (current) {
    await github.rest.issues.update({ ...repo, issue_number: current.number, title: TITLE, body });
    await github.rest.issues.createComment({ ...repo, issue_number: current.number,
      body: `Incident changed at ${checkedAt}: ${report.failures.join(", ")}. [Check run](${runUrl}).` });
    return { action: "updated", issueNumber: current.number };
  }
  const { data } = await github.rest.issues.create({ ...repo, title: TITLE, body });
  return { action: "opened", issueNumber: data.number };
}

export async function runMonitor({ github, context, core, siteUrl, probe = probeProduction }) {
  if (!siteUrl) throw new Error("SITES_PRODUCTION_URL is required; monitoring is not configured.");
  let report = await probe(siteUrl);
  // Confirm failures once to avoid reporting transient network errors as incidents.
  if (!report.healthy) report = await probe(siteUrl);
  const runUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
  const result = await reconcileIncident({ github, repo: context.repo, report, runUrl, checkedAt: new Date().toISOString(), confirmRecovery: async () => {
    report = await probe(siteUrl);
    return report;
  } });
  const incidentUrl = result.issueNumber ? `https://github.com/${context.repo.owner}/${context.repo.repo}/issues/${result.issueNumber}` : null;
  if (!report.healthy) core.warning(`PRODUCTION DEGRADED: ${report.failures.join(", ")}. Incident: ${incidentUrl}`);
  await core.summary.addHeading(report.healthy ? "Production healthy" : "Production degraded — incident remains open")
    .addRaw(`Monitor execution succeeded; this does not mean production is healthy. Availability: **${report.healthy ? "HEALTHY" : "DEGRADED"}**.\n\n`)
    .addRaw(`Incident action: ${result.action}.${incidentUrl ? ` [Incident](${incidentUrl})` : ""}\n\n`)
    .addRaw(report.failures.map(code => `- ${code}`).join("\n"))
    .write();
  return result;
}
