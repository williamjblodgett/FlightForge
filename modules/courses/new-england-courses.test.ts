import { describe, expect, it } from "vitest";
import rawImport from "@/data/import/new-england-courses.authoritative.json";
import { authoritativeRegionalCourseBatchSchema } from "./validation";
import { authoritativeNewEnglandCourses } from "./new-england-courses";

describe("New England authoritative course evidence", () => {
  it("accepts only primary-source launch records from every expansion state", () => {
    const result = authoritativeRegionalCourseBatchSchema.safeParse(rawImport);
    expect(result.success).toBe(true);
    expect(new Set(authoritativeNewEnglandCourses.map((course) => course.state))).toEqual(
      new Set(["MA", "NH", "VT", "CT", "RI"]),
    );
    expect(authoritativeNewEnglandCourses.every((course) => course.sources[0]?.authoritative)).toBe(true);
  });

  it("keeps multi-course facilities grouped without duplicate slugs", () => {
    expect(new Set(authoritativeNewEnglandCourses.map((course) => course.slug)).size).toBe(authoritativeNewEnglandCourses.length);
    const hollows = authoritativeNewEnglandCourses.filter((course) => course.facilityId === "facility-hollows-complex");
    const smuggs = authoritativeNewEnglandCourses.filter((course) => course.facilityId === "facility-smugglers-notch-disc-golf");
    expect(hollows).toHaveLength(2);
    expect(smuggs).toHaveLength(3);
  });

  it("never converts a normal schedule into a live condition", () => {
    expect(authoritativeNewEnglandCourses.every((course) => course.currentCondition === null)).toBe(true);
    expect(authoritativeNewEnglandCourses.every((course) => course.nextReviewDueAt != null)).toBe(true);
  });
});
