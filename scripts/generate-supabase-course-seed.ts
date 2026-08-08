import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { courses } from "../modules/courses/demo-courses";

const outputPath = resolve(process.argv[2] ?? "work/supabase-course-seed.sql");
const statements: string[] = [
  "begin;",
  `insert into public.roles (id, code, name, description) values
  ('70000000-0000-4000-8000-000000000001','PLAYER','Player','Player role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000002','COURSE_STAFF','Course staff','Course staff role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000003','COURSE_OWNER','Course owner or manager','Course owner role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000004','TOURNAMENT_DIRECTOR','Tournament director','Tournament director role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000005','LEAGUE_ADMIN','League administrator','League administrator role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000006','INSTRUCTOR','Instructor or coach','Instructor role for FlightForge authorization.'),
  ('70000000-0000-4000-8000-000000000007','PLATFORM_ADMIN','Platform administrator','Platform administrator role for FlightForge authorization.')
  on conflict do nothing;`,
];

for (const course of courses) {
  const courseId = deterministicUuid(`course:${course.slug}`);
  const locationId = deterministicUuid(`location:${course.slug}`);
  const sourceId = deterministicUuid(`source:${course.slug}:${course.sourceUrl}`);
  statements.push(`insert into public.courses
    (id, facility_id, record_type, slug, name, description, claim_status, data_verification_status, hole_count, difficulty, price_type, is_fictional_demo, next_review_due_at, published_at)
    values (${q(courseId)}, ${nullable(course.facilityId)}, ${q(course.recordType)}, ${q(course.slug)}, ${q(course.name)}, ${q(course.shortDescription)}, ${q(course.claimStatus)}, ${q(course.dataVerificationStatus)}, ${course.holeCount}, ${q(course.difficulty)}, ${q(course.priceType)}, false, ${date(course.nextReviewDueAt)}, ${date(course.lastReviewedAt)})
    on conflict (id) do update set name=excluded.name, description=excluded.description, data_verification_status=excluded.data_verification_status, hole_count=excluded.hole_count, next_review_due_at=excluded.next_review_due_at, published_at=excluded.published_at, updated_at=now();`);
  statements.push(`insert into public.course_locations
    (id, course_id, address_line_1, city, region_code, postal_code, country_code, latitude, longitude, coordinates, precision)
    values (${q(locationId)}, ${q(courseId)}, ${nullable(course.addressLine1)}, ${q(course.city)}, ${q(course.state)}, ${nullable(course.postalCode)}, ${q(course.countryCode)}, ${course.latitude.toFixed(6)}, ${course.longitude.toFixed(6)}, ST_SetSRID(ST_MakePoint(${course.longitude.toFixed(6)}, ${course.latitude.toFixed(6)}), 4326), ${q(course.locationPrecision)})
    on conflict (course_id) do update set address_line_1=excluded.address_line_1, city=excluded.city, region_code=excluded.region_code, postal_code=excluded.postal_code, latitude=excluded.latitude, longitude=excluded.longitude, coordinates=excluded.coordinates, precision=excluded.precision, updated_at=now();`);
  statements.push(`insert into public.course_sources
    (id, course_id, source_name, source_url, source_type, external_id, attribution, last_verified_at, valid_until, supported_fields)
    values (${q(sourceId)}, ${q(courseId)}, ${q(course.sourceName)}, ${q(course.sourceUrl)}, ${q(course.sourceType)}, ${q(course.slug)}, 'Factual seed fields only; no partnership implied', ${date(course.lastReviewedAt)}, ${date(course.nextReviewDueAt)}, ${json(course.sources[0]?.supports ?? null)})
    on conflict (source_type, external_id) do update set source_name=excluded.source_name, source_url=excluded.source_url, last_verified_at=excluded.last_verified_at, valid_until=excluded.valid_until, supported_fields=excluded.supported_fields;`);
  for (const field of course.sources[0]?.supports ?? []) {
    statements.push(`insert into public.course_evidence
      (id, course_id, source_id, field_code, checked_at, valid_until, review_status, created_at)
      values (${q(deterministicUuid(`evidence:${course.slug}:${field}`))}, ${q(courseId)}, ${q(sourceId)}, ${q(field)}, ${date(course.lastReviewedAt)}, ${date(course.nextReviewDueAt)}, 'APPROVED', ${date(course.lastReviewedAt)})
      on conflict (course_id, source_id, field_code) do update set checked_at=excluded.checked_at, valid_until=excluded.valid_until, review_status='APPROVED';`);
  }
}

statements.push(`insert into public.feature_flags (key, description, enabled) values
  ('course_discovery','Public course discovery and source attribution',true),
  ('course_claims','Course claim submission and administrator review',true),
  ('tee_time_booking','Availability, quote, and reservation workflow',false),
  ('offline_scoring','Local-first scorecards and sync',false),
  ('digital_bag','Persistent physical disc inventory and sourced catalog',true),
  ('ai_caddie','Structured, explainable owned-disc recommendations',true),
  ('event_publishing','Coordinator-owned event drafts and live publication',true),
  ('media_coaching','Consent-gated private media analysis',false),
  ('platform_fees','Future marketplace platform fees',false)
  on conflict (key) do update set description=excluded.description, enabled=excluded.enabled, updated_at=now();`);
statements.push("commit;");

await writeFile(outputPath, `${statements.join("\n\n")}\n`, "utf8");
console.log(`Generated an idempotent ${courses.length}-course Supabase seed at ${outputPath}`);

function q(value: string): string { return `'${value.replaceAll("'", "''")}'`; }
function nullable(value: string | null): string { return value == null ? "null" : q(value); }
function date(value: string | null): string { return value == null ? "null" : `${q(value)}::timestamptz`; }
function json(value: unknown): string { return value == null ? "null" : `${q(JSON.stringify(value))}::jsonb`; }
function deterministicUuid(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
