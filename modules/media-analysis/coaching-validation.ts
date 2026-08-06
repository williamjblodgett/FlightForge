import { z } from "zod";

export const coachingContextSchema = z.object({
  throwType: z.enum(["BACKHAND", "FOREHAND", "PUTTING", "STANDSTILL"]),
  cameraAngle: z.enum(["SIDE", "REAR", "FRONT"]),
  intendedShot: z.string().trim().min(2).max(200),
  discUsed: z.string().trim().max(100).optional().default(""),
  approximateDistanceFeet: z.coerce.number().int().min(0).max(1500).optional(),
  result: z.enum(["EARLY", "LATE", "LOW", "HIGH", "CLEAN", "OTHER"]),
  analysisQuestion: z.string().trim().min(5).max(500),
  durationSeconds: z.coerce.number().min(0.1).max(90),
  userIsMinor: z.boolean(),
  guardianConsent: z.boolean(),
  consentToAnalyze: z.literal(true),
  retainDays: z.coerce.number().int().refine((value) => [1, 7, 30].includes(value)),
  idempotencyKey: z.string().uuid(),
  poseSummary: z.string().max(20_000).optional().default(""),
});

export type CoachingContext = z.infer<typeof coachingContextSchema>;
