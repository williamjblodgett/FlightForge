import { z } from "zod";

const identifier = z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9:_-]+$/u);

export const holeHighlightContextSchema = z.object({
  courseId: identifier,
  eventId: identifier,
  holeNumber: z.coerce.number().int().min(1).max(36),
  caption: z.string().trim().max(280).default(""),
  durationSeconds: z.coerce.number().positive().max(60),
  rightsConfirmed: z.literal(true),
  participantConsentConfirmed: z.literal(true),
  containsMinor: z.boolean().default(false),
  guardianConsentConfirmed: z.boolean().default(false),
  idempotencyKey: z.uuid(),
}).superRefine((value, context) => {
  if (value.containsMinor && !value.guardianConsentConfirmed) {
    context.addIssue({
      code: "custom",
      path: ["guardianConsentConfirmed"],
      message: "Guardian consent is required when identifiable minors appear in a video.",
    });
  }
});

export const highlightReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(10).max(1000),
});

export type HoleHighlightContext = z.infer<typeof holeHighlightContextSchema>;
