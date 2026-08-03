import { describe, expect, it } from "vitest";
import { onboardingSchema, passwordChangeSchema, signupSchema } from "./account-validation";

describe("account validation", () => {
  it("normalizes a valid free signup and requires terms acceptance", () => {
    const valid = signupSchema.safeParse({ displayName: "J Phillips", email: "JPhillips@Example.com", password: "FlightForge2026!", acceptTerms: true });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.email).toBe("jphillips@example.com");
    expect(signupSchema.safeParse({ displayName: "J Phillips", email: "j@example.com", password: "FlightForge2026!", acceptTerms: false }).success).toBe(false);
  });

  it("accepts privacy-first onboarding choices", () => {
    const result = onboardingSchema.safeParse({
      displayName: "JPhillips", homeCity: "Portland", homeRegionCode: "me", postalCode: "04101",
      experienceLevel: "RECREATIONAL", throwingHand: "RIGHT", controlledDistanceFeet: 275,
      playStyle: "CASUAL", socialMatchmaking: false, aiRecommendations: true,
      tournamentNotifications: false, profileVisibility: "PRIVATE", showHomeCity: false,
      showRoundHistory: false, showBag: false, allowMessages: "CONNECTIONS",
      allowGameInvites: true, analyticsOptIn: false, aiTrainingOptIn: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.homeRegionCode).toBe("ME");
  });

  it("requires a different confirmed replacement password", () => {
    expect(passwordChangeSchema.safeParse({
      currentPassword: "password1234",
      newPassword: "PrivateTrail2026!",
      confirmation: "PrivateTrail2026!",
    }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({
      currentPassword: "password1234",
      newPassword: "PrivateTrail2026!",
      confirmation: "DifferentTrail2026!",
    }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({
      currentPassword: "password1234",
      newPassword: "password1234",
      confirmation: "password1234",
    }).success).toBe(false);
  });
});
