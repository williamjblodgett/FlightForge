import { describe, expect, it } from "vitest";
import { coachingContextSchema } from "./coaching-validation";

const valid = { throwType: "BACKHAND", cameraAngle: "SIDE", intendedShot: "Flat center gap", discUsed: "Leopard", approximateDistanceFeet: 260, result: "CLEAN", analysisQuestion: "How can I repeat this line?", durationSeconds: 12, userIsMinor: false, guardianConsent: false, consentToAnalyze: true, retainDays: 7, idempotencyKey: "11111111-1111-4111-8111-111111111111" };

describe("coaching submission validation", () => {
  it("accepts bounded consented context", () => expect(coachingContextSchema.safeParse(valid).success).toBe(true));
  it("rejects unconsented, long, or indefinite retention", () => {
    expect(coachingContextSchema.safeParse({ ...valid, consentToAnalyze: false }).success).toBe(false);
    expect(coachingContextSchema.safeParse({ ...valid, durationSeconds: 91 }).success).toBe(false);
    expect(coachingContextSchema.safeParse({ ...valid, retainDays: 365 }).success).toBe(false);
  });
});
