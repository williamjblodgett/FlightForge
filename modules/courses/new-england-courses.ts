import authoritativeImport from "@/data/import/new-england-courses.authoritative.json";
import type {
  Course,
  CourseEvidenceField,
  CourseLocationPrecision,
  CourseOperationalStatus,
  CoursePriceType,
  CourseSource,
} from "./types";

type AuthoritativeRecord = {
  external_id: string;
  slug: string;
  name: string;
  facility_id: string;
  record_type: Course["recordType"];
  city: string;
  state: string;
  country_code: string;
  postal_code: string | null;
  address_line_1: string | null;
  latitude: number;
  longitude: number;
  location_precision: CourseLocationPrecision;
  hole_count: number;
  operational_status: CourseOperationalStatus;
  availability_type: string;
  access: string;
  cost_note: string;
  source_name: string;
  source_url: string;
  source_type: Extract<CourseSource["type"], "COURSE_OWNER" | "PUBLIC_AGENCY">;
  source_observation: string;
  source_checked_at: string;
  next_review_due_at: string;
  evidence_fields: CourseEvidenceField[];
};

const records = (authoritativeImport as unknown as { records: AuthoritativeRecord[] }).records;
const heroTones = ["pine", "lake", "sunrise", "granite", "meadow"] as const;

export const authoritativeNewEnglandCourses: Course[] = records.map((record) => ({
  id: `course-${record.slug}`,
  facilityId: record.facility_id,
  recordType: record.record_type,
  slug: record.slug,
  name: record.name,
  shortDescription: `${record.name} is a disc golf course in ${record.city}, ${record.state}. Check current access, hours, and fees before visiting.`,
  city: record.city,
  state: record.state,
  countryCode: record.country_code,
  postalCode: record.postal_code,
  addressLine1: record.address_line_1,
  latitude: record.latitude,
  longitude: record.longitude,
  locationPrecision: record.location_precision,
  holeCount: record.hole_count,
  layoutCount: 1,
  difficulty: "UNRATED",
  terrain: [],
  amenities: [],
  priceType: priceType(record.cost_note),
  priceFromCents: null,
  claimStatus: "UNCLAIMED",
  dataVerificationStatus: "OPERATOR_SOURCE_REVIEWED",
  lastReviewedAt: record.source_checked_at,
  nextReviewDueAt: record.next_review_due_at,
  evidenceStatus: evidenceStatus(record.next_review_due_at),
  sourceName: record.source_name,
  sourceUrl: record.source_url,
  sourceType: record.source_type,
  sources: [{
    name: record.source_name,
    url: record.source_url,
    type: record.source_type,
    observation: record.source_observation,
    checkedAt: record.source_checked_at,
    validUntil: record.next_review_due_at,
    supports: record.evidence_fields,
    authoritative: true,
  }],
  operationalStatus: record.operational_status,
  availabilityType: record.availability_type,
  verificationLevel: "OPERATOR_SOURCE_REVIEWED",
  access: record.access,
  costNote: record.cost_note,
  verifiedBadge: false,
  fictionalDemo: false,
  currentCondition: null,
  conditionSource: null,
  nextAvailableAt: null,
  heroTone: heroTones[stableIndex(record.slug, heroTones.length)],
}));

function evidenceStatus(dueAt: string): "CURRENT" | "REVIEW_DUE" | "STALE" { const days = (new Date(dueAt).getTime() - Date.now()) / 86_400_000; return days < 0 ? "STALE" : days <= 30 ? "REVIEW_DUE" : "CURRENT"; }

function priceType(costNote: string): CoursePriceType {
  if (/\bfree\b/iu.test(costNote)) return "FREE";
  if (/\bpay\b|admission|fee/iu.test(costNote)) return "PAID";
  return "MIXED";
}

function stableIndex(value: string, length: number): number {
  let total = 0;
  for (const character of value) total = (total + character.charCodeAt(0)) % length;
  return total;
}
