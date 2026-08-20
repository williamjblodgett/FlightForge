import { describe, expect, it } from "vitest";
import { availableReportReviewActions, type CommunityReportRecord } from "./types";

function report(overrides: Partial<CommunityReportRecord> = {}): CommunityReportRecord {
  return {
    id: "report-1",
    reporterUserId: "reporter-1",
    reporterDisplayName: "Reporter",
    targetType: "CONVERSATION",
    targetId: "conversation-1",
    conversationId: "conversation-1",
    category: "SPAM",
    details: null,
    status: "OPEN",
    createdAt: "2026-08-20T00:00:00.000Z",
    targetBody: null,
    targetDisplayName: "Clubhouse",
    moderationStatus: null,
    moderationTargetUserId: null,
    ...overrides,
  };
}

describe("availableReportReviewActions", () => {
  it("does not offer punitive actions for an unresolved conversation target", () => {
    expect(availableReportReviewActions(report())).toEqual(["DISMISS"]);
  });

  it("offers user actions only when the report resolves to one player", () => {
    expect(availableReportReviewActions(report({ moderationTargetUserId: "player-2" }))).toEqual([
      "DISMISS", "MUTE", "SUSPEND", "BAN",
    ]);
  });

  it("offers content removal only for an available message that is not already removed", () => {
    expect(availableReportReviewActions(report({
      targetType: "MESSAGE", targetBody: "Reported text", moderationStatus: "PUBLISHED",
    }))).toContain("REMOVE_CONTENT");
    expect(availableReportReviewActions(report({
      targetType: "MESSAGE", targetBody: "Reported text", moderationStatus: "REMOVED",
    }))).not.toContain("REMOVE_CONTENT");
  });
});
