import statewideImport from "@/data/import/maine-courses.statewide.json";
import authoritativeImport from "@/data/import/maine-course-authoritative-overrides.json";
import type {
  Course,
  CourseOperationalStatus,
  CoursePriceType,
  CourseSource,
} from "./types";

type StatewideRecord = {
  external_id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  country_code: string;
  postal_code: string | null;
  address_line_1: string | null;
  latitude: number;
  longitude: number;
  hole_count: number | null;
  operational_status: CourseOperationalStatus;
  availability_type: string | null;
  access: string | null;
  cost_note: string | null;
  source_name: string;
  source_url: string;
  source_observation: string | null;
  source_checked_at: string;
  secondary_source_name: string | null;
  secondary_source_url: string | null;
  verification_level: "DIRECTORY_SINGLE_SOURCE" | "DIRECTORY_CROSS_CHECKED";
};

type AuthoritativeOverride = {
  slugs: string[];
  operational_status: CourseOperationalStatus;
  source_name: string;
  source_url: string;
  observation: string;
};

const records = (statewideImport as unknown as { records: StatewideRecord[] }).records;
const overrideEntries = (authoritativeImport as { reviewed_at: string; records: AuthoritativeOverride[] });
const overrideBySlug = new Map(
  overrideEntries.records.flatMap((entry) => entry.slugs.map((slug) => [slug, entry] as const)),
);
const heroTones = ["pine", "lake", "sunrise", "granite", "meadow"] as const;

export const statewideCourses: Course[] = records.map((record) => {
  const authoritative = overrideBySlug.get(record.slug);
  const sources: CourseSource[] = [
    {
      name: record.source_name,
      url: record.source_url,
      type: "PUBLIC_DIRECTORY",
      observation: record.source_observation,
      checkedAt: record.source_checked_at,
      authoritative: false,
    },
  ];
  if (record.secondary_source_name && record.secondary_source_url) {
    sources.push({
      name: record.secondary_source_name,
      url: record.secondary_source_url,
      type: "PDGA_DIRECTORY",
      observation: "Independently matched by course name, city, and geographic proximity.",
      checkedAt: record.source_checked_at,
      authoritative: false,
    });
  }
  if (authoritative) {
    sources.unshift({
      name: authoritative.source_name,
      url: authoritative.source_url,
      type: "COURSE_OWNER",
      observation: authoritative.observation,
      checkedAt: overrideEntries.reviewed_at,
      authoritative: true,
    });
  }

  const primarySource = sources[0];
  const displayName = normalizedDisplayName(record.slug, record.name);
  const reviewedAt = authoritative ? overrideEntries.reviewed_at : record.source_checked_at;
  const nextReviewDueAt = addDays(reviewedAt, authoritative ? 120 : 90);
  return {
    id: `course-${record.slug}`,
    facilityId: null,
    recordType: "COURSE",
    slug: record.slug,
    name: displayName,
    shortDescription: authoritative
      ? `Current factual listing for ${displayName}, reviewed against an operator or facility-owner page.`
      : sharedVenueDescription(record.slug, record.city),
    city: record.city,
    state: record.state,
    countryCode: record.country_code,
    postalCode: record.postal_code,
    addressLine1: record.address_line_1,
    latitude: record.latitude,
    longitude: record.longitude,
    locationPrecision: "DIRECTORY_APPROXIMATE",
    holeCount: record.hole_count ?? 0,
    layoutCount: 1,
    difficulty: "UNRATED",
    terrain: [],
    amenities: [],
    priceType: priceType(record.cost_note),
    priceFromCents: null,
    claimStatus: "UNCLAIMED",
    dataVerificationStatus: authoritative
      ? "OPERATOR_SOURCE_REVIEWED"
      : record.verification_level === "DIRECTORY_CROSS_CHECKED"
        ? "DIRECTORY_CROSS_CHECKED"
        : "SOURCE_REVIEW_REQUIRED",
    lastReviewedAt: reviewedAt,
    nextReviewDueAt,
    evidenceStatus: evidenceStatus(nextReviewDueAt),
    sourceName: primarySource.name,
    sourceUrl: primarySource.url,
    sourceType: primarySource.type,
    sources: sources.map((source) => ({ ...source, validUntil: nextReviewDueAt })),
    operationalStatus: authoritative?.operational_status ?? record.operational_status,
    availabilityType: record.availability_type,
    verificationLevel: authoritative ? "OPERATOR_SOURCE_REVIEWED" : record.verification_level,
    access: record.access,
    costNote: record.cost_note,
    verifiedBadge: false,
    fictionalDemo: false,
    currentCondition: null,
    conditionSource: null,
    nextAvailableAt: null,
    heroTone: heroTones[stableIndex(record.slug, heroTones.length)],
  };
});

function addDays(value: string, days: number) { const date = new Date(value); date.setUTCDate(date.getUTCDate() + days); return date.toISOString(); }
function evidenceStatus(dueAt: string): "CURRENT" | "REVIEW_DUE" | "STALE" { const days = (new Date(dueAt).getTime() - Date.now()) / 86_400_000; return days < 0 ? "STALE" : days <= 30 ? "REVIEW_DUE" : "CURRENT"; }

function normalizedDisplayName(slug: string, fallback: string): string {
  if (slug === "devils-grove-disc-golf-devil") return "Devil’s Grove — Devil Course";
  if (slug === "devil-s-grove-disc-golf-demon") return "Devil’s Grove — Demon Course";
  return fallback;
}

function sharedVenueDescription(slug: string, city: string): string {
  if (slug === "devils-grove-disc-golf-devil") {
    return "One of two separately listed 18-hole courses at the Devil’s Grove property. This record represents the Devil course.";
  }
  if (slug === "devil-s-grove-disc-golf-demon") {
    return "One of two separately listed 18-hole courses at the Devil’s Grove property. This record represents the Demon course.";
  }
  return `Source-attributed ${city} listing. Course details remain concise until the operator claims and verifies them.`;
}

function priceType(costNote: string | null): CoursePriceType {
  if (!costNote) return "MIXED";
  if (/^free\b/iu.test(costNote)) return "FREE";
  if (/^pay\b/iu.test(costNote)) return "PAID";
  return "MIXED";
}

function stableIndex(value: string, length: number): number {
  let total = 0;
  for (const character of value) total = (total + character.charCodeAt(0)) % length;
  return total;
}
