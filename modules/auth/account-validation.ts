import { z } from "zod";
import { validatePasswordStrength } from "./password";

export const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128).superRefine((value, context) => {
    const issue = validatePasswordStrength(value);
    if (issue) context.addIssue({ code: "custom", message: issue });
  }),
  acceptTerms: z.literal(true),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128).superRefine((value, context) => {
    const issue = validatePasswordStrength(value);
    if (issue) context.addIssue({ code: "custom", message: issue });
  }),
  confirmation: z.string().min(1).max(128),
}).superRefine((value, context) => {
  if (value.newPassword !== value.confirmation) {
    context.addIssue({ code: "custom", path: ["confirmation"], message: "Passwords do not match." });
  }
  if (value.newPassword === value.currentPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a different password." });
  }
});

const optionalDistance = z.union([z.number().int().min(50).max(1000), z.null()]);

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  homeCity: z.string().trim().max(80).nullable(),
  homeRegionCode: z.string().trim().toUpperCase().max(3).nullable(),
  postalCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/u).nullable(),
  experienceLevel: z.enum(["NEW", "BEGINNER", "RECREATIONAL", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]),
  throwingHand: z.enum(["RIGHT", "LEFT", "AMBIDEXTROUS", "PREFER_NOT_TO_SAY"]),
  controlledDistanceFeet: optionalDistance,
  playStyle: z.enum(["CASUAL", "COMPETITIVE", "BOTH"]),
  socialMatchmaking: z.boolean(),
  aiRecommendations: z.boolean(),
  tournamentNotifications: z.boolean(),
  profileVisibility: z.enum(["PRIVATE", "CONNECTIONS", "PUBLIC"]),
  showHomeCity: z.boolean(),
  showRoundHistory: z.boolean(),
  showBag: z.boolean(),
  allowMessages: z.enum(["NO_ONE", "CONNECTIONS", "EVERYONE"]),
  allowGameInvites: z.boolean(),
  analyticsOptIn: z.boolean(),
  aiTrainingOptIn: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
