import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(process.argv[2] ?? "data/import/new-england-course-evidence-audit.json");
const audit = JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/u, "")) as {
  counts: { total: number; by_state: Record<string, number>; cited_source_urls_needing_recheck: number };
  records: Array<{
    candidate_id: string; state: string; evidence_status: string; publication_status: string;
    discovery_source: { url: string } | null; primary_source: { url: string } | null;
  }>;
};

const errors: string[] = [];
const states = ["ME", "MA", "NH", "VT", "CT", "RI"];
if (audit.records.length !== audit.counts.total) errors.push("Top-level total does not match the record count.");
if (new Set(audit.records.map((record) => record.candidate_id)).size !== audit.records.length) errors.push("Candidate IDs must be unique.");
for (const state of states) {
  const count = audit.records.filter((record) => record.state === state).length;
  if (count !== audit.counts.by_state[state]) errors.push(`${state} count does not match the summary.`);
}
if (audit.counts.by_state.ME !== 120) errors.push("The uniform Maine audit must contain exactly 120 records.");
for (const record of audit.records) {
  if (!states.includes(record.state)) errors.push(`${record.candidate_id} has an unsupported state.`);
  if (!record.discovery_source?.url) errors.push(`${record.candidate_id} lacks discovery-source attribution.`);
  if (record.evidence_status === "PRIMARY_SOURCE_REVIEWED" && !record.primary_source?.url) errors.push(`${record.candidate_id} is primary-source reviewed without a primary source.`);
  if (record.state !== "ME" && record.evidence_status !== "PRIMARY_SOURCE_REVIEWED" && record.publication_status !== "WITHHELD_PENDING_PRIMARY_SOURCE") {
    errors.push(`${record.candidate_id} bypasses the expansion publication gate.`);
  }
}

console.log(JSON.stringify({
  valid: errors.length === 0,
  records: audit.records.length,
  states: audit.counts.by_state,
  primarySourceReviewed: audit.records.filter((record) => record.evidence_status === "PRIMARY_SOURCE_REVIEWED").length,
  withheld: audit.records.filter((record) => record.publication_status === "WITHHELD_PENDING_PRIMARY_SOURCE").length,
  citedSourceUrlsNeedingRecheck: audit.counts.cited_source_urls_needing_recheck,
  errors,
}, null, 2));
if (errors.length) process.exitCode = 1;
