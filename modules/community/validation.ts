import { z } from "zod";
import { channelContextValues, conversationTypeValues } from "./types";

const userId = z.string().trim().min(1).max(200);

export const communityAttestationSchema = z.object({
  isAdult: z.literal(true),
  guidelinesAccepted: z.literal(true),
});

export const createConversationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(conversationTypeValues[0]), participantUserId: userId }),
  z.object({
    type: z.literal(conversationTypeValues[1]),
    subject: z.string().trim().min(2).max(100),
    participantUserIds: z.array(userId).min(1).max(24).transform((ids) => Array.from(new Set(ids))),
  }),
  z.object({
    type: z.literal(conversationTypeValues[2]),
    subject: z.string().trim().min(2).max(100).optional(),
    contextType: z.enum(channelContextValues),
    contextId: z.string().trim().min(1).max(200),
  }),
]);

export const sendMessageSchema = z.object({
  body: z.string().transform(normalizeMessageBody).pipe(z.string().min(1).max(2000)),
  replyToMessageId: z.string().uuid().nullable().optional(),
}).strict();

export const editMessageSchema = z.object({
  body: z.string().transform(normalizeMessageBody).pipe(z.string().min(1).max(2000)),
}).strict();

export const conversationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("READ"), messageId: z.string().uuid().optional() }),
  z.object({ action: z.literal("MUTE") }),
  z.object({ action: z.literal("UNMUTE") }),
  z.object({ action: z.literal("LEAVE") }),
  z.object({ action: z.literal("JOIN") }),
]);

export const blockUserSchema = z.object({ blockedUserId: userId });

const reportCategorySchema = z.enum(["HARASSMENT", "THREAT", "HATE", "SEXUAL_CONTENT", "SPAM", "IMPERSONATION", "PRIVACY", "OTHER"]);

export const reportSchema = z.object({
  targetType: z.enum(["MESSAGE", "USER", "CONVERSATION"]),
  targetId: z.string().trim().min(1).max(200),
  conversationId: z.string().uuid().nullable().optional(),
  category: reportCategorySchema.optional(),
  reason: reportCategorySchema.optional(),
  details: z.string().trim().max(1000).nullable().optional(),
}).superRefine((value, context) => {
  if (!value.category && !value.reason) context.addIssue({ code: "custom", path: ["category"], message: "Choose a report category." });
}).transform((value) => ({
  targetType: value.targetType,
  targetId: value.targetId,
  conversationId: value.conversationId,
  category: value.category ?? value.reason!,
  details: value.details,
}));

export const moderationReviewSchema = z.object({
  action: z.enum(["DISMISS", "REMOVE_CONTENT", "WARN", "MUTE", "SUSPEND", "BAN"]),
  reason: z.string().trim().min(5).max(1000),
  durationHours: z.number().int().min(1).max(24 * 365).optional(),
}).superRefine((value, context) => {
  if ((value.action === "MUTE" || value.action === "SUSPEND") && !value.durationHours) {
    context.addIssue({ code: "custom", path: ["durationHours"], message: "A duration is required for temporary actions." });
  }
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ConversationAction = z.infer<typeof conversationActionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ModerationReviewInput = z.infer<typeof moderationReviewSchema>;

export function normalizeMessageBody(value: string): string {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
    .trim();
}
