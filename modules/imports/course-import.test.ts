import { describe, expect, it } from "vitest";
import type { CourseImportRecord } from "./course-import";
import { detectDuplicateCandidates, normalizeCourseIdentity } from "./course-import";

const base: CourseImportRecord = {
  external_id: "one",
  name: "Acker’s Acres",
  city: "Bowdoinham",
  state: "ME",
  country_code: "US",
  postal_code: "04008",
  latitude: 44.0176,
  longitude: -69.8992,
  source_name: "Test source",
  source_url: "https://example.com/one",
  source_type: "COURSE_OWNER",
  claim_status: "UNCLAIMED",
  data_verification_status: "REVIEWED_SOURCE_ONLY",
  last_reviewed_at: "2026-08-03T12:00:00.000Z",
  is_fictional_demo: false,
};

describe("course import duplicate detection", () => {
  it("normalizes punctuation and diacritics for matching", () => {
    expect(normalizeCourseIdentity(" Acker’s  Ácres ")).toBe("acker s acres");
  });

  it("flags same normalized name and city", () => {
    const duplicate: CourseImportRecord = {
      ...base,
      external_id: "two",
      name: "Ackers Acres",
      source_url: "https://example.com/two",
    };
    const matches = detectDuplicateCandidates([base, duplicate]);
    expect(matches).toHaveLength(0);

    const exact: CourseImportRecord = { ...duplicate, name: "Acker’s Acres" };
    expect(detectDuplicateCandidates([base, exact])[0]?.reason).toBe(
      "SAME_NORMALIZED_NAME_AND_CITY",
    );
  });

  it("flags repeated source identifiers", () => {
    const duplicate = { ...base, source_url: "https://example.com/two" };
    expect(detectDuplicateCandidates([base, duplicate])[0]?.reason).toBe("SAME_SOURCE_ID");
  });
});
