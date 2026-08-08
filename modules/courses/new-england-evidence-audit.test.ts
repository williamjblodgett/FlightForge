import { describe, expect, it } from "vitest";
import audit from "@/data/import/new-england-course-evidence-audit.json";

describe("New England course evidence audit", () => {
  it("assigns every candidate a six-state evidence outcome", () => {
    expect(audit.records).toHaveLength(468);
    expect(audit.counts.by_state).toEqual({ ME: 120, MA: 116, NH: 70, VT: 86, CT: 68, RI: 8 });
    expect(new Set(audit.records.map((record) => record.candidate_id)).size).toBe(audit.records.length);
  });

  it("does not publish expansion candidates on directory evidence alone", () => {
    const unsupportedPublished = audit.records.filter(
      (record) => record.state !== "ME"
        && record.evidence_status !== "PRIMARY_SOURCE_REVIEWED"
        && record.publication_status !== "WITHHELD_PENDING_PRIMARY_SOURCE",
    );

    expect(unsupportedPublished).toEqual([]);
    expect(audit.counts.withheld_pending_primary_source).toBe(333);
  });

  it("keeps availability language conservative", () => {
    expect(audit.availability_policy.toLowerCase()).toContain("not an open-now guarantee");
    expect(audit.records.every((record) => record.review_outcome.length > 0)).toBe(true);
  });
});
