import { describe, expect, it } from "vitest";
import { moderateMessage } from "./moderation";
import { canonicalConnectionPair, canSendMessage, canStartConversation, validIdempotencyKey } from "./policy";
import { createConversationSchema, moderationReviewSchema, reportSchema, sendMessageSchema } from "./validation";

describe("community authorization policy", () => {
  it("canonicalizes a connection so reverse-direction duplicates cannot be created", () => {
    expect(canonicalConnectionPair("player-b", "player-a")).toBe("player-a:player-b");
    expect(canonicalConnectionPair("player-a", "player-b")).toBe("player-a:player-b");
  });

  it("enforces privacy, adult attestation, and two-way blocks before starting a conversation", () => {
    expect(canStartConversation({ targetPrivacy: "EVERYONE", connected: false, blockedEitherWay: false, targetAdultAttested: true })).toBe(true);
    expect(canStartConversation({ targetPrivacy: "CONNECTIONS", connected: false, blockedEitherWay: false, targetAdultAttested: true })).toBe(false);
    expect(canStartConversation({ targetPrivacy: "CONNECTIONS", connected: true, blockedEitherWay: false, targetAdultAttested: true })).toBe(true);
    expect(canStartConversation({ targetPrivacy: "EVERYONE", connected: true, blockedEitherWay: true, targetAdultAttested: true })).toBe(false);
    expect(canStartConversation({ targetPrivacy: "EVERYONE", connected: true, blockedEitherWay: false, targetAdultAttested: false })).toBe(false);
    expect(canStartConversation({ targetPrivacy: "EVERYONE", connected: true, blockedEitherWay: false, targetAdultAttested: true, sameUser: true })).toBe(false);
  });

  it("requires active membership and applies sanctions and blocks to sends", () => {
    const allowed = { member: true, left: false, adultAttested: true, suspended: false, muted: false, blockedParticipant: false };
    expect(canSendMessage(allowed)).toBe(true);
    for (const key of ["left", "suspended", "muted", "blockedParticipant"] as const) {
      expect(canSendMessage({ ...allowed, [key]: true })).toBe(false);
    }
    expect(canSendMessage({ ...allowed, member: false })).toBe(false);
    expect(canSendMessage({ ...allowed, adultAttested: false })).toBe(false);
  });
});

describe("community input and moderation", () => {
  it("accepts text messages up to 2,000 normalized characters and rejects media-shaped payloads", () => {
    expect(sendMessageSchema.parse({ body: "  Nice putt!\r\n" }).body).toBe("Nice putt!");
    expect(sendMessageSchema.safeParse({ body: "x".repeat(2000) }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: "", attachmentUrl: "https://example.com/video.mp4" }).success).toBe(false);
  });

  it("quarantines deterministic high-risk content without holding ordinary disc-golf talk", () => {
    expect(moderateMessage("Meet at the first tee at 4:30.")).toEqual({ status: "PUBLISHED", reason: null });
    expect(moderateMessage("I will shoot you after the round.")).toEqual({ status: "QUARANTINED", reason: "CREDIBLE_THREAT" });
    expect(moderateMessage("I have a plan to kill myself.")).toEqual({ status: "QUARANTINED", reason: "SELF_HARM" });
  });

  it("requires stable client idempotency keys", () => {
    expect(validIdempotencyKey("msg_1234567890123456")).toBe(true);
    expect(validIdempotencyKey("short")).toBe(false);
    expect(validIdempotencyKey("contains spaces 123456")).toBe(false);
    expect(validIdempotencyKey(null)).toBe(false);
  });

  it("limits private group size and requires a reason and duration for temporary moderation", () => {
    expect(createConversationSchema.safeParse({ type: "PRIVATE_GROUP", subject: "Sunday card", participantUserIds: ["a"] }).success).toBe(true);
    expect(createConversationSchema.safeParse({ type: "PRIVATE_GROUP", subject: "Sunday card", participantUserIds: Array.from({ length: 25 }, (_, index) => `p-${index}`) }).success).toBe(false);
    expect(moderationReviewSchema.safeParse({ action: "MUTE", reason: "Repeated targeted harassment" }).success).toBe(false);
    expect(moderationReviewSchema.safeParse({ action: "MUTE", reason: "Repeated targeted harassment", durationHours: 24 }).success).toBe(true);
  });

  it("allows public contexts to derive their subject and accepts the UI report reason alias", () => {
    expect(createConversationSchema.safeParse({ type: "PUBLIC_CHANNEL", contextType: "COURSE", contextId: "course-1" }).success).toBe(true);
    expect(reportSchema.parse({ targetType: "MESSAGE", targetId: "message-1", reason: "HARASSMENT" }).category).toBe("HARASSMENT");
    expect(reportSchema.safeParse({ targetType: "MESSAGE", targetId: "message-1" }).success).toBe(false);
  });
});
