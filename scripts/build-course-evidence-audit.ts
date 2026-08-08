import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Candidate = {
  candidate_id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  discovery_source_name: string;
  discovery_source_url: string;
  discovery_checked_at: string;
};
type MaineRecord = {
  external_id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  source_name: string;
  source_url: string;
  source_checked_at: string;
  secondary_source_name: string | null;
  secondary_source_url: string | null;
  verification_level: "DIRECTORY_SINGLE_SOURCE" | "DIRECTORY_CROSS_CHECKED";
  operational_status: string;
};
type OverrideRecord = { slugs: string[]; operational_status: string; source_name: string; source_url: string; observation: string };
type RegionalRecord = {
  external_id: string; slug: string; name: string; city: string; state: string;
  operational_status: string; source_name: string; source_url: string; source_type: string;
  source_checked_at: string; next_review_due_at: string; evidence_fields: string[];
};
type Health = { url: string; checked_at: string; reachable: boolean; http_status: number | null; final_url: string | null; outcome: string };

const root = resolve(process.cwd());
const candidates = await readJson<{ generated_at: string; records: Candidate[] }>(resolve(root, process.argv[2] ?? "work/new-england-directory-candidates.json"));
const maine = await readJson<{ records: MaineRecord[] }>(resolve(root, "data/import/maine-courses.statewide.json"));
const overrides = await readJson<{ reviewed_at: string; records: OverrideRecord[] }>(resolve(root, "data/import/maine-course-authoritative-overrides.json"));
const regional = await readJson<{ records: RegionalRecord[] }>(resolve(root, "data/import/new-england-courses.authoritative.json"));
const health = await readJson<{ counts: { urls: number; reachable: number; unavailable: number }; records: Health[] }>(resolve(root, process.argv[3] ?? "work/course-source-health.json"));
const outputPath = resolve(root, process.argv[4] ?? "data/import/new-england-course-evidence-audit.json");

const healthByUrl = new Map(health.records.map((record) => [record.url, record]));
const maineByExternalId = new Map(maine.records.map((record) => [record.external_id, record]));
const overrideBySlug = new Map(overrides.records.flatMap((record) => record.slugs.map((slug) => [slug, record] as const)));
const regionalByIdentity = new Map(regional.records.flatMap((record) => identityKeys(record).map((key) => [key, record] as const)));
const seenRegional = new Set<string>();

const audited = candidates.records.map((candidate) => {
  const discoveryHealth = healthByUrl.get(candidate.discovery_source_url) ?? null;
  if (candidate.state === "ME") {
    const maineRecord = maineByExternalId.get(candidate.candidate_id)
      ?? maine.records.find((record) => identityKeys(record).some((key) => identityKeys(candidate).includes(key)));
    const operator = maineRecord ? overrideBySlug.get(maineRecord.slug) : undefined;
    return {
      ...base(candidate, discoveryHealth),
      canonical_slug: maineRecord?.slug ?? candidate.slug,
      evidence_status: operator ? "PRIMARY_SOURCE_REVIEWED" : maineRecord?.verification_level ?? "DIRECTORY_SINGLE_SOURCE",
      publication_status: maineRecord ? "PUBLISHED_LEGACY_MAINE" : "WITHHELD_DUPLICATE_OR_UNMATCHED",
      operational_status: operator?.operational_status ?? maineRecord?.operational_status ?? "STATUS_UNVERIFIED",
      primary_source: operator ? source(operator.source_name, operator.source_url, overrides.reviewed_at, null, healthByUrl.get(operator.source_url)) : null,
      review_outcome: operator
        ? "Current operator or facility evidence is attached; same-day access is not guaranteed."
        : "Uniform directory evidence review completed; operator or public-agency confirmation is still required.",
    };
  }

  const primary = identityKeys(candidate).map((key) => regionalByIdentity.get(key)).find(Boolean);
  if (primary) seenRegional.add(primary.slug);
  return {
    ...base(candidate, discoveryHealth),
    canonical_slug: primary?.slug ?? candidate.slug,
    evidence_status: primary ? "PRIMARY_SOURCE_REVIEWED" : "PRIMARY_SOURCE_REQUIRED",
    publication_status: primary ? "PUBLISHED_PRIMARY_SOURCE" : "WITHHELD_PENDING_PRIMARY_SOURCE",
    operational_status: primary?.operational_status ?? "STATUS_UNVERIFIED",
    primary_source: primary ? source(primary.source_name, primary.source_url, primary.source_checked_at, primary.next_review_due_at, healthByUrl.get(primary.source_url), primary.evidence_fields) : null,
    review_outcome: primary
      ? "Current owner, facility, or public-agency evidence is attached; same-day access is not guaranteed."
      : "Candidate reviewed and withheld because no approved primary source is attached.",
  };
});

for (const primary of regional.records) {
  if (seenRegional.has(primary.slug)) continue;
  audited.push({
    candidate_id: primary.external_id,
    canonical_slug: primary.slug,
    name: primary.name,
    city: primary.city,
    state: primary.state,
    discovery_source: { name: primary.source_name, url: primary.source_url, checked_at: primary.source_checked_at },
    discovery_source_health: healthByUrl.get(primary.source_url) ?? null,
    evidence_status: "PRIMARY_SOURCE_REVIEWED",
    publication_status: "PUBLISHED_PRIMARY_SOURCE",
    operational_status: primary.operational_status,
    primary_source: source(primary.source_name, primary.source_url, primary.source_checked_at, primary.next_review_due_at, healthByUrl.get(primary.source_url), primary.evidence_fields),
    review_outcome: "Primary-source record retained even though it was not matched to the refreshed directory candidate set.",
  });
}

audited.sort((left, right) => left.state.localeCompare(right.state) || left.name.localeCompare(right.name));
const stateCounts = Object.fromEntries(["ME", "MA", "NH", "VT", "CT", "RI"].map((state) => [state, audited.filter((record) => record.state === state).length]));
const generatedAt = new Date().toISOString();
await writeFile(outputPath, `${JSON.stringify({
  format_version: "1.0",
  generated_at: generatedAt,
  audit_scope: "Every candidate discovered in the refreshed six-state directory snapshot plus every primary-source-published regional record.",
  publication_policy: "Outside Maine, candidates remain withheld until a current owner, facility, municipal, park, school, or university source confirms identity and location. Maine legacy listings retain their disclosed evidence level while uniform review continues.",
  availability_policy: "Evidence of a published course is not an open-now guarantee. Weather, maintenance, private events, daylight, seasonal closures, and access restrictions can change after review.",
  counts: {
    total: audited.length,
    by_state: stateCounts,
    primary_source_reviewed: audited.filter((record) => record.evidence_status === "PRIMARY_SOURCE_REVIEWED").length,
    directory_cross_checked: audited.filter((record) => record.evidence_status === "DIRECTORY_CROSS_CHECKED").length,
    directory_single_source: audited.filter((record) => record.evidence_status === "DIRECTORY_SINGLE_SOURCE").length,
    withheld_pending_primary_source: audited.filter((record) => record.publication_status === "WITHHELD_PENDING_PRIMARY_SOURCE").length,
    source_urls_needing_recheck: audited.filter((record) => record.discovery_source_health && !record.discovery_source_health.reachable).length,
    cited_source_urls: health.counts.urls,
    reachable_source_urls: health.counts.reachable,
    cited_source_urls_needing_recheck: health.counts.unavailable,
  },
  records: audited,
}, null, 2)}\n`, "utf8");
console.log(`Wrote ${audited.length} uniformly classified candidate records to ${outputPath}`);

function base(candidate: Candidate, sourceHealth: Health | null) {
  return {
    candidate_id: candidate.candidate_id,
    name: candidate.name,
    city: candidate.city,
    state: candidate.state,
    discovery_source: { name: candidate.discovery_source_name, url: candidate.discovery_source_url, checked_at: candidate.discovery_checked_at },
    discovery_source_health: sourceHealth,
  };
}

function source(name: string, url: string, checkedAt: string, nextReviewDueAt: string | null, sourceHealth?: Health, evidenceFields?: string[]) {
  return { name, url, checked_at: checkedAt, next_review_due_at: nextReviewDueAt, evidence_fields: evidenceFields ?? ["IDENTITY", "LOCATION"], health: sourceHealth ?? null };
}

function identityKeys(record: { slug?: string; name: string; city: string; state?: string }): string[] {
  const state = record.state ?? "ME";
  return [...new Set([
    record.slug ? `${state}|${record.slug}` : "",
    `${state}|${normalize(record.name)}|${normalize(record.city)}`,
    `${state}|${normalize(record.name)}`,
  ].filter(Boolean))];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/\b(the|course|disc|golf|dgc)\b/gu, " ").replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/u, "")) as T;
}
