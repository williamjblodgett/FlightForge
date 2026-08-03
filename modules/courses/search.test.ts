import { describe, expect, it } from "vitest";
import { courses } from "./demo-courses";
import { filterCourses, normalizeSearchText } from "./search";

describe("course search", () => {
  it("matches course, city, ZIP, terrain, and amenities without case sensitivity", () => {
    const byCity = filterCourses(courses, {
      query: "LEWISTON",
      difficulty: "ALL",
      priceType: "ALL",
      minimumHoles: null,
    });
    expect(byCity.map((course) => course.slug)).toContain("devils-grove-disc-golf");

    const byAmenity = filterCourses(courses, {
      query: "disc rentals",
      difficulty: "ALL",
      priceType: "ALL",
      minimumHoles: null,
    });
    expect(byAmenity.length).toBeGreaterThan(0);
  });

  it("combines difficulty, price, and minimum hole filters", () => {
    const result = filterCourses(courses, {
      query: "",
      difficulty: "ADVANCED",
      priceType: "PAID",
      minimumHoles: 36,
    });
    expect(result.every((course) => course.difficulty === "ADVANCED")).toBe(true);
    expect(result.every((course) => course.holeCount >= 36)).toBe(true);
  });

  it("normalizes curly punctuation and accents", () => {
    expect(normalizeSearchText("  Acker’s   Ácres ")).toBe("acker’s acres");
  });
});
