import { describe, expect, it } from "vitest";
import { courses } from "./demo-courses";
import { fictionalDemoCourse, requireFictionalDemoCourse } from "./fictional-demo-course";

describe("fictional demo course isolation", () => {
  it("keeps fabricated inventory out of the public Maine catalog", () => {
    expect(courses.some((course) => course.fictionalDemo)).toBe(false);
    expect(courses.some((course) => course.id === fictionalDemoCourse.id)).toBe(false);
  });

  it("fails closed when a real listing is passed to a fictional workflow", () => {
    expect(requireFictionalDemoCourse(fictionalDemoCourse)).toBe(fictionalDemoCourse);
    expect(() => requireFictionalDemoCourse(courses[0]!)).toThrow("DEMO_COURSE_REQUIRED");
  });

  it("makes the two Devil's Grove courses distinct in search results", () => {
    const venueCourses = courses.filter((course) => course.name.startsWith("Devil’s Grove"));
    expect(venueCourses.map((course) => course.name).sort()).toEqual([
      "Devil’s Grove — Demon Course",
      "Devil’s Grove — Devil Course",
    ]);
  });
});
