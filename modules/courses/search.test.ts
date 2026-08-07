import { describe, expect, it } from "vitest";
import { courses } from "./demo-courses";
import { filterCourses, normalizeSearchText, rankCoursesForDiscovery } from "./search";

describe("course search", () => {
  it("matches course, city, access, and cost fields without case sensitivity", () => {
    const byCity = filterCourses(courses, { query: "LEWISTON", difficulty: "ALL", priceType: "ALL", minimumHoles: null });
    expect(byCity.map((course) => course.slug)).toContain("devils-grove-disc-golf-devil");
    const byAccess = filterCourses(courses, { query: "everyone", difficulty: "ALL", priceType: "ALL", minimumHoles: null });
    expect(byAccess.length).toBeGreaterThan(0);
  });

  it("combines difficulty, price, and minimum-hole filters", () => {
    const result = filterCourses(courses, { query: "", difficulty: "UNRATED", priceType: "PAID", minimumHoles: 18 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((course) => course.difficulty === "UNRATED" && course.holeCount >= 18)).toBe(true);
  });

  it("normalizes curly punctuation and accents", () => {
    expect(normalizeSearchText("  Acker’s   Ácres ")).toBe("acker’s acres");
  });

  it("places stronger current source evidence ahead of single-directory listings", () => {
    const ranked = rankCoursesForDiscovery(courses);
    const sabattusIndex = ranked.findIndex((course) => course.slug === "sabattus-disc-golf-eagle");
    const singleDirectoryIndex = ranked.findIndex((course) => course.slug === "101-arw");

    expect(ranked[0]?.verificationLevel).toBe("OPERATOR_SOURCE_REVIEWED");
    expect(sabattusIndex).toBeGreaterThanOrEqual(0);
    expect(singleDirectoryIndex).toBeGreaterThan(sabattusIndex);
  });

  it("filters regional records by state and evidence class", () => {
    const massachusetts = filterCourses(courses, { query: "", difficulty: "ALL", priceType: "ALL", minimumHoles: null, state: "MA", evidence: "AUTHORITATIVE" });
    expect(massachusetts.length).toBeGreaterThan(0);
    expect(massachusetts.every((course) => course.state === "MA" && course.verificationLevel === "OPERATOR_SOURCE_REVIEWED")).toBe(true);
  });
});
