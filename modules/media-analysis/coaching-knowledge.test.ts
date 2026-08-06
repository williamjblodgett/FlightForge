import { describe, expect, it } from "vitest";
import { coachingObservation, coachingSources, throwGuides } from "./coaching-knowledge";

describe("evidence-aware coaching knowledge", () => {
  it("returns one priority and explicit limitations", () => {
    const result = coachingObservation("BACKHAND", "EARLY");
    expect(result.priority).toBeTruthy();
    expect(result.secondary).toHaveLength(2);
    expect(result.limitation).toContain("cannot reliably measure");
  });
  it("covers every supported throw type and attributes sources", () => {
    expect(Object.keys(throwGuides)).toEqual(["BACKHAND", "FOREHAND", "PUTTING", "STANDSTILL"]);
    expect(coachingSources.some((source) => source.kind === "Peer-reviewed research")).toBe(true);
    expect(coachingSources.some((source) => source.kind === "Official rules")).toBe(true);
  });
});
