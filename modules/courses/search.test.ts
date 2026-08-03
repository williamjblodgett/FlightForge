import { describe, expect, it } from "vitest";
import { courses } from "./demo-courses";
import { filterCourses, normalizeSearchText } from "./search";

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
});
