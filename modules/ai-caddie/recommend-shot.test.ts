import { describe, expect, it } from "vitest";
import { recommendShot } from "./recommend-shot";

const discs = [
  { id: "1", manufacturer: "Latitude 64", mold: "River", speed: 7, glide: 7, turn: -1, fade: 1, stability: "UNDERSTABLE" as const, inBag: true },
  { id: "2", manufacturer: "Innova", mold: "Teebird", speed: 7, glide: 5, turn: 0, fade: 2, stability: "STABLE" as const, inBag: true },
  { id: "3", manufacturer: "Discraft", mold: "Raptor", speed: 9, glide: 4, turn: 0, fade: 3, stability: "OVERSTABLE" as const, inBag: true },
];

describe("AI caddie recommendation schema", () => {
  it("prefers an owned wind-safe disc and explains its evidence limits", () => {
    const result = recommendShot({
      distanceFeet: 315,
      windMph: 14,
      windDirection: "HEADWIND",
      fairwayShape: "LEFT",
      throwingHand: "RIGHT",
      controlledDistanceFeet: 360,
      riskPreference: "BALANCED",
      discs,
    });

    expect(result.primaryDisc).toContain("Raptor");
    expect(result.primaryDiscId).toBe("3");
    expect(result.reasoning.some((reason) => reason.includes("14 mph headwind"))).toBe(true);
    expect(result.reasoning.some((reason) => reason.includes("catalog-based"))).toBe(true);
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.confidenceBasis).toContain("limited independent evidence");
    expect(result.modelVersion).toBe("flightforge-rules-2.0");
  });

  it("discloses missing distance information", () => {
    const result = recommendShot({
      distanceFeet: 240,
      windMph: 2,
      windDirection: "CALM",
      fairwayShape: "STRAIGHT",
      throwingHand: "LEFT",
      controlledDistanceFeet: null,
      riskPreference: "CONSERVATIVE",
      discs,
    });
    expect(result.missingInformation).toContain("controlled throwing distance");
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("raises confidence only when a physical disc has sourced and personal evidence", () => {
    const result = recommendShot({
      distanceFeet: 315,
      windMph: 6,
      windDirection: "LEFT_TO_RIGHT",
      fairwayShape: "STRAIGHT",
      throwingHand: "RIGHT",
      throwType: "BACKHAND",
      controlledDistanceFeet: 370,
      riskPreference: "BALANCED",
      elevationChangeFeet: 0,
      groundCondition: "NORMAL",
      hazardLevel: "LOW",
      discs: [{
        ...discs[1],
        weightGrams: 173,
        condition: "SEASONED",
        wearRating: 4,
        observedDistanceFeet: 320,
        observedTurn: -0.25,
        observedFade: 1.75,
        sampleCount: 12,
        reliability: 0.88,
        profileConfidence: 0.8,
        ratingSource: "Innova official product catalog",
      }],
    });

    expect(result.confidenceLabel).toBe("HIGH");
    expect(result.confidence).toBeGreaterThanOrEqual(0.78);
    expect(result.confidenceBasis).toContain("12 recorded throws");
    expect(result.missingInformation).toEqual([]);
  });
});
