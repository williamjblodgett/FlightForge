import { z } from "zod";
import { eventTypeValues, eventVisibilityValues } from "./types";

const optionalUrl = z.union([z.literal(""), z.string().url().max(500), z.null()]).transform((value) => value || null);
const optionalText = (maximum: number) => z.union([z.literal(""), z.string().trim().max(maximum), z.null()]).transform((value) => value || null);
const optionalDateTime = z.union([z.literal(""), z.string().datetime(), z.null()]).transform((value) => value || null);

export const eventEditorSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  eventType: z.enum(eventTypeValues),
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().min(20).max(240),
  description: z.string().trim().min(30).max(5000),
  courseId: optionalText(100),
  layoutId: optionalText(100),
  holeCount: z.number().int().min(1).max(36).default(18),
  timeZone: z.string().trim().min(3).max(80).refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
  }, "Choose a valid IANA time zone"),
  venueName: z.string().trim().min(2).max(160),
  addressLine1: optionalText(160),
  city: z.string().trim().min(2).max(80),
  regionCode: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  registrationOpensAt: optionalDateTime,
  registrationClosesAt: optionalDateTime,
  registrationUrl: optionalUrl,
  contactEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  capacity: z.number().int().min(1).max(5000).nullable(),
  entryFeeCents: z.number().int().min(0).max(1_000_000),
  currency: z.literal("USD"),
  format: z.string().trim().min(2).max(100),
  divisions: z.array(z.string().trim().min(1).max(40)).max(30),
  accessibilityNotes: optionalText(1000),
  visibility: z.enum(eventVisibilityValues),
  action: z.enum(["DRAFT", "PUBLISH"]),
  version: z.number().int().positive().optional(),
}).superRefine((input, context) => {
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (end <= start) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after the start time." });
  }
  if (input.registrationOpensAt && input.registrationClosesAt && Date.parse(input.registrationClosesAt) <= Date.parse(input.registrationOpensAt)) {
    context.addIssue({ code: "custom", path: ["registrationClosesAt"], message: "Registration must close after it opens." });
  }
  if (input.action === "PUBLISH" && start < Date.now() - 5 * 60_000) {
    context.addIssue({ code: "custom", path: ["startsAt"], message: "Published events must start in the future." });
  }
});

export const eventStatusActionSchema = z.object({
  action: z.enum(["PUBLISH", "UNPUBLISH", "CANCEL"]),
  reason: z.string().trim().min(5).max(1000),
  version: z.number().int().positive(),
});

export type EventEditorInput = z.infer<typeof eventEditorSchema>;
export type EventStatusAction = z.infer<typeof eventStatusActionSchema>;
