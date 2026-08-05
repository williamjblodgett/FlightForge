import { describe, expect, it } from "vitest";
import { caddieFeedbackSchema, caddieRequestSchema, playerDiscInputSchema } from "./validation";

const physicalDisc = {
  catalogMoldId: "00000000-0000-4000-8000-000000000001",
  manufacturerName: "",
  moldName: "",
  manualSpeed: null,
  manualGlide: null,
  manualTurn: null,
  manualFade: null,
  plastic: "Star",
  weightGrams: 173,
  color: "Orange",
  nickname: "Reliable",
  condition: "SEASONED" as const,
  wearRating: 4,
  domeProfile: "NEUTRAL" as const,
  runName: "",
  status: "IN_BAG" as const,
  notes: "Representative course disc",
};

describe("digital bag validation", () => {
  it("accepts a catalog-backed physical disc without duplicating flight numbers", () => {
    const result = playerDiscInputSchema.parse(physicalDisc);
    expect(result.catalogMoldId).toBe(physicalDisc.catalogMoldId);
    expect(result.runName).toBeNull();
  });

  it("requires all printed flight numbers for an unlisted custom disc", () => {
    const result = playerDiscInputSchema.safeParse({ ...physicalDisc, catalogMoldId: null, manufacturerName: "Small Batch", moldName: "Prototype" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === "manualSpeed")).toBe(true);
  });

  it("bounds caddie inputs and representative feedback", () => {
    const request = caddieRequestSchema.safeParse({
      distanceFeet: 310,
      windMph: 12,
      windDirection: "HEADWIND",
      fairwayShape: "LEFT",
      throwingHand: "RIGHT",
      throwType: "BACKHAND",
      controlledDistanceFeet: 360,
      riskPreference: "BALANCED",
      elevationChangeFeet: 8,
      groundCondition: "WET",
      hazardLevel: "MODERATE",
    });
    expect(request.success).toBe(true);
    expect(caddieRequestSchema.safeParse({ ...request.data, windMph: 120 }).success).toBe(false);
    expect(caddieFeedbackSchema.safeParse({
      playerDiscId: physicalDisc.catalogMoldId,
      throwType: "BACKHAND",
      intendedShape: "LEFT",
      result: "SUCCESS",
      flightAdjustment: "AS_EXPECTED",
      missDirection: "NONE",
      distanceFeet: 306,
      windMph: 12,
      windDirection: "HEADWIND",
      representative: true,
      comment: "",
    }).success).toBe(true);
  });
});
