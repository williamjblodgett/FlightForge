import { describe, expect, it } from "vitest";
import { courses, formatCoursePrice, getCourseBySlug } from "./demo-courses";

describe("formatCoursePrice", () => {
  it("uses a concise category instead of displaying a source note as a price", () => {
    const sabattus = getCourseBySlug("sabattus-disc-golf-eagle");

    expect(sabattus).toBeDefined();
    if (!sabattus) throw new Error("Sabattus seed course is required for this test");
    expect(formatCoursePrice(sabattus)).toBe("Pay to play");
  });

  it("distinguishes free and reported-unavailable listings", () => {
    const freeCourse = courses.find((course) => course.priceType === "FREE" && course.operationalStatus !== "UNAVAILABLE_REPORTED");
    const unavailableCourse = courses.find((course) => course.operationalStatus === "UNAVAILABLE_REPORTED");

    expect(freeCourse).toBeDefined();
    expect(unavailableCourse).toBeDefined();
    if (!freeCourse || !unavailableCourse) throw new Error("Expected free and unavailable statewide seed courses");
    expect(formatCoursePrice(freeCourse)).toBe("Free");
    expect(formatCoursePrice(unavailableCourse)).toBe("Reported unavailable");
  });
});
