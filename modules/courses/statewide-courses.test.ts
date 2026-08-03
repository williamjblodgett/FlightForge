import { describe, expect, it } from "vitest";
import rawImport from "@/data/import/maine-courses.statewide.json";
import { statewideCourses } from "./statewide-courses";

describe("Maine statewide course evidence", () => {
  it("loads 120 uniquely addressable factual listings", () => {
    expect(statewideCourses).toHaveLength(120);
    expect(new Set(statewideCourses.map((course) => course.slug)).size).toBe(120);
    expect(statewideCourses.every((course) => !course.fictionalDemo)).toBe(true);
  });

  it("keeps coordinates within Maine-scale bounds and source links explicit", () => {
    expect(statewideCourses.every((course) => course.latitude >= 42.9 && course.latitude <= 47.6 && course.longitude >= -71.2 && course.longitude <= -66.7)).toBe(true);
    expect(statewideCourses.every((course) => course.sources.every((source) => /^https:\/\//u.test(source.url)))).toBe(true);
  });

  it("does not turn directory availability into an open-now claim", () => {
    expect(statewideCourses.some((course) => course.operationalStatus === "UNAVAILABLE_REPORTED")).toBe(true);
    expect(statewideCourses.every((course) => course.currentCondition === null)).toBe(true);
    expect((rawImport as { counts: { cross_checked_records: number } }).counts.cross_checked_records).toBeGreaterThanOrEqual(68);
  });
});
