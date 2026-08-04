import { describe, expect, it } from "vitest";
import { recommendShot } from "./recommend-shot";

const discs = [
  { id: "1", manufacturer: "Latitude 64", mold: "River", speed: 7, glide: 7, turn: -1, fade: 1, stability: "UNDERSTABLE" as const, inBag: true },
  { id: "2", manufacturer: "Innova", mold: "Teebird", speed: 7, glide: 5, turn: 0, fade: 2, stability: "STABLE" as const, inBag: true },
  { id: "3", manufacturer: "Discraft", mold: "Raptor", speed: 9, glide: 4, turn: 0, fade: 3, stability: "OVERSTABLE" as const, inBag: true },
];

describe("AI caddie recommendation schema", () => {
  it("prefers an owned wind-safe disc and explains uncertainty", () => {
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
    expect(result.reasoning).toHaveLength(3);
    expect(result.reasoning).toContain("14 mph headwind conditions favor an overstable flight.");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.missingInformation).toEqual([]);
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
    expect(result.missingInformation).toContain("Controlled throwing distance");
    expect(result.confidence).toBeLessThan(0.8);
  });
});
