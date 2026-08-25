import { describe, expect, it } from "vitest";
import type { Course } from "@/modules/courses/types";
import { nearestPracticeCandidates, toPracticeCandidate } from "./practice-candidates";
import type { PracticeCandidate } from "./types";

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-park",
    facilityId: null,
    recordType: "COURSE",
    slug: "park",
    name: "Town Park Disc Golf",
    shortDescription: "Public course",
    city: "Portland",
    state: "ME",
    countryCode: "US",
    postalCode: null,
    addressLine1: null,
    latitude: 43.66,
    longitude: -70.25,
    locationPrecision: "ENTRANCE_GEOCODED",
    holeCount: 18,
    layoutCount: 1,
    difficulty: "UNRATED",
    terrain: [],
    amenities: [],
    priceType: "FREE",
    priceFromCents: null,
    claimStatus: "UNCLAIMED",
    dataVerificationStatus: "OPERATOR_SOURCE_REVIEWED",
    lastReviewedAt: "2026-08-01",
    nextReviewDueAt: "2026-11-01",
    evidenceStatus: "CURRENT",
    sourceName: "Town Recreation",
    sourceUrl: "https://example.gov/park",
    sourceType: "PUBLIC_AGENCY",
    sources: [],
    operationalStatus: "OPERATOR_CONFIRMED_AVAILABLE",
    availabilityType: "DAYLIGHT",
    verificationLevel: "OPERATOR_SOURCE_REVIEWED",
    access: "Public municipal park",
    costNote: "Free",
    verifiedBadge: false,
    fictionalDemo: false,
    currentCondition: null,
    conditionSource: null,
    nextAvailableAt: null,
    heroTone: "pine",
    ...overrides,
  };
}

describe("fieldwork practice candidates", () => {
  it("identifies a public-agency course lead as public property", () => {
    const candidate = toPracticeCandidate(course());
    expect(candidate).toMatchObject({ isPublicProperty: true, locationNote: "Directions use the listed entrance location." });
  });

  it("does not call a directory-listed course public property", () => {
    const candidate = toPracticeCandidate(course({ sourceType: "PUBLIC_DIRECTORY" }));
    expect(candidate).toMatchObject({ isPublicProperty: false });
  });

  it("withholds unavailable, restricted, unverified, and very small properties", () => {
    expect(toPracticeCandidate(course({ operationalStatus: "UNAVAILABLE_REPORTED" }))).toBeNull();
    expect(toPracticeCandidate(course({ access: "Limited access" }))).toBeNull();
    expect(toPracticeCandidate(course({ operationalStatus: "STATUS_UNVERIFIED" }))).toBeNull();
    expect(toPracticeCandidate(course({ holeCount: 6 }))).toBeNull();
  });

  it("sorts by the user's distance and respects the result limit", () => {
    const candidates: PracticeCandidate[] = [
      { ...toPracticeCandidate(course())!, id: "far", name: "Far", latitude: 44, longitude: -70 },
      { ...toPracticeCandidate(course())!, id: "near", name: "Near", latitude: 43.661, longitude: -70.25 },
    ];
    const ranked = nearestPracticeCandidates(candidates, { latitude: 43.66, longitude: -70.25 }, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.id).toBe("near");
    expect(ranked[0]?.distanceMiles).toBeLessThan(1);
  });
});
