import { describe, expect, it } from "vitest";
import { buildCaddieSystemInstructions, caddieKnowledgeSources, fallbackCaddieAnswer } from "./knowledge";

describe("caddie field guide", () => {
  it("grounds advice in rules, flight, biomechanics, and safety sources", () => {
    expect(caddieKnowledgeSources.some((source) => source.authority === "RULES")).toBe(true);
    expect(caddieKnowledgeSources.some((source) => source.scope.includes("biomechanical"))).toBe(true);
    const instructions = buildCaddieSystemInstructions("Innova Teebird 7/5/0/2");
    expect(instructions).toContain("Never invent a disc");
    expect(instructions).toContain("Innova Teebird");
    expect(instructions).toContain("Do not diagnose");
  });

  it("provides a useful non-AI fallback and enforces the medical boundary", () => {
    expect(fallbackCaddieAnswer("What changes in a headwind?", "Teebird").answer).toContain("relative airspeed");
    expect(fallbackCaddieAnswer("My elbow hurts when I throw", "Teebird").answer).toContain("cannot diagnose");
  });
});
