import { describe, expect, it } from "vitest";
import rawImport from "@/data/import/new-england-courses.authoritative.json";
import northExpansion from "@/data/import/new-england-expansion-north.reviewed.json";
import southExpansion from "@/data/import/new-england-expansion-south.reviewed.json";
import september from "@/data/import/new-england-september.reviewed.json";
import { authoritativeRegionalCourseBatchSchema } from "./validation";
import { authoritativeNewEnglandCourses } from "./new-england-courses";
import { statewideCourses } from "./statewide-courses";

describe("New England authoritative course evidence", () => {
  it("accepts only primary-source launch records from every expansion state", () => {
    for (const batch of [rawImport, northExpansion, southExpansion, september]) {
      expect(authoritativeRegionalCourseBatchSchema.safeParse(batch).success).toBe(true);
    }
    expect(new Set(authoritativeNewEnglandCourses.map((course) => course.state))).toEqual(
      new Set(["MA", "NH", "VT", "CT", "RI"]),
    );
    expect(authoritativeNewEnglandCourses.every((course) => course.sources[0]?.authoritative)).toBe(true);
    const counts = Object.fromEntries(
      ["MA", "NH", "VT", "CT", "RI"].map((state) => [
        state,
        authoritativeNewEnglandCourses.filter((course) => course.state === state).length,
      ]),
    );
    expect(counts.MA).toBeGreaterThanOrEqual(11);
    expect(counts.NH).toBeGreaterThanOrEqual(12);
    expect(counts.VT).toBeGreaterThanOrEqual(11);
    expect(counts.CT).toBeGreaterThanOrEqual(13);
    expect(counts.RI).toBeGreaterThanOrEqual(5);
  });

  it("keeps multi-course facilities grouped without duplicate slugs", () => {
    expect(new Set(authoritativeNewEnglandCourses.map((course) => course.slug)).size).toBe(authoritativeNewEnglandCourses.length);
    const hollows = authoritativeNewEnglandCourses.filter((course) => course.facilityId === "facility-hollows-complex");
    const smuggs = authoritativeNewEnglandCourses.filter((course) => course.facilityId === "facility-smugglers-notch-disc-golf");
    expect(hollows).toHaveLength(2);
    expect(smuggs).toHaveLength(3);
  });

  it("keeps every imported public course addressable by a unique slug", () => {
    const publicCourses = [...statewideCourses, ...authoritativeNewEnglandCourses];
    expect(publicCourses).toHaveLength(120 + [rawImport,northExpansion,southExpansion,september].reduce((total,batch)=>total+batch.records.length,0));
    expect(new Set(publicCourses.map((course) => course.slug)).size).toBe(publicCourses.length);
  });

  it("retains new course restrictions, explicit price uncertainty and location provenance", () => {
    expect(september.records).toHaveLength(9);
    const awasiwi=authoritativeNewEnglandCourses.find(c=>c.slug==="awasiwi-woods")!;
    expect(awasiwi.holeCount).toBe(9);
    expect(awasiwi.access).toContain("During school hours");
    expect(awasiwi.sources[1].observation).toContain("parking");
    expect(awasiwi.priceType).toBe("MIXED");
    expect(authoritativeNewEnglandCourses.find(c=>c.slug==="crane-hill")?.priceType).toBe("FREE");
    expect(authoritativeNewEnglandCourses.find(c=>c.slug==="bretton-woods-disc-golf")?.operationalStatus).toBe("OPERATOR_CONFIRMED_SEASONAL");
    expect(september.records.every(r=>r.next_review_due_at>r.source_checked_at)).toBe(true);
  });

  it("never converts a normal schedule into a live condition", () => {
    expect(authoritativeNewEnglandCourses.every((course) => course.currentCondition === null)).toBe(true);
    expect(authoritativeNewEnglandCourses.every((course) => course.nextReviewDueAt != null)).toBe(true);
  });
});
