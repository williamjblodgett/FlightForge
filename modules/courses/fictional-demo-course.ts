import type { Course } from "./types";

/**
 * A deliberately fictional property used by interactive previews.
 *
 * Keep this fixture out of the public Maine catalog. Demo bookings, groups,
 * rounds, events, claims, and owner metrics must reference this exact record
 * so no real operator can accidentally inherit fabricated inventory.
 */
export const fictionalDemoCourse: Course = {
  id: "demo-course-forge-ridge",
  facilityId: "facility-fictional-demo",
  recordType: "COURSE",
  slug: "forge-ridge-fictional-demo",
  name: "Forge Ridge Disc Golf Club",
  shortDescription:
    "A fictional FlightForge testing property with two sample layouts. It is not a real course and cannot accept real reservations.",
  city: "Demo Township",
  state: "ME",
  countryCode: "US",
  postalCode: null,
  addressLine1: null,
  latitude: 44.31,
  longitude: -69.77,
  locationPrecision: "FACILITY_APPROXIMATE",
  holeCount: 18,
  layoutCount: 2,
  difficulty: "INTERMEDIATE",
  terrain: ["Wooded", "Mixed", "Hilly"],
  amenities: ["Practice basket", "Pro shop", "Restrooms"],
  priceType: "PAID",
  priceFromCents: 1200,
  claimStatus: "VERIFIED",
  dataVerificationStatus: "FICTIONAL_DEMO",
  lastReviewedAt: "2026-08-04T00:00:00.000Z",
  nextReviewDueAt: null,
  sourceName: "FlightForge fictional test fixture",
  sourceUrl: "https://example.invalid/flightforge/forge-ridge",
  sourceType: "COURSE_OWNER",
  sources: [
    {
      name: "FlightForge fictional test fixture",
      url: "https://example.invalid/flightforge/forge-ridge",
      type: "COURSE_OWNER",
      observation: "Fictional data used only for product testing.",
      checkedAt: "2026-08-04T00:00:00.000Z",
      authoritative: true,
    },
  ],
  operationalStatus: "OPERATOR_CONFIRMED_AVAILABLE",
  availabilityType: "Fictional year-round demo",
  verificationLevel: "OPERATOR_SOURCE_REVIEWED",
  access: "Interactive preview only",
  costNote: "Fictional pricing; no payment collected",
  verifiedBadge: true,
  fictionalDemo: true,
  currentCondition: "Open · Fictional dry fairways",
  conditionSource: "DEMO",
  nextAvailableAt: null,
  heroTone: "granite",
};

export function requireFictionalDemoCourse(course: Course): Course {
  if (!course.fictionalDemo || course.dataVerificationStatus !== "FICTIONAL_DEMO") {
    throw new Error("DEMO_COURSE_REQUIRED");
  }
  return course;
}
