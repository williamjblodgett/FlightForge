export const COMMUNITY_GUIDELINES_VERSION = "2026-08-20";

export const conversationTypeValues = ["DIRECT", "PRIVATE_GROUP", "PUBLIC_CHANNEL"] as const;
export const channelContextValues = ["REGION", "STATE", "COURSE", "EVENT"] as const;
export const messageModerationValues = ["PUBLISHED", "QUARANTINED", "REMOVED", "DELETED"] as const;

export type ConversationType = (typeof conversationTypeValues)[number];
export type ChannelContextType = (typeof channelContextValues)[number];
export type MessageModerationStatus = (typeof messageModerationValues)[number];

export type MessagePreview = {
  id: string;
  body: string;
  senderDisplayName: string;
  createdAt: string;
  moderationStatus: MessageModerationStatus;
};

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  subject: string;
  contextType: ChannelContextType | null;
  contextId: string | null;
  memberCount: number;
  joined: boolean;
  muted: boolean;
  role: "OWNER" | "MODERATOR" | "MEMBER" | null;
  otherParticipantUserId: string | null;
  canLeave: boolean;
  canBlock: boolean;
  unreadCount: number;
  lastMessage: MessagePreview | null;
  updatedAt: string;
};

export type PlayerSummary = {
  id: string;
  displayName: string;
  homeCity: string | null;
  homeRegionCode: string | null;
  experienceLevel: string | null;
  connectionId: string | null;
  connectionStatus: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "CONNECTED";
  canMessage: boolean;
};

export type CommunityMessage = {
  id: string;
  conversationId: string;
  sender: { id: string; displayName: string };
  body: string;
  moderationStatus: MessageModerationStatus;
  moderationReason: string | null;
  replyToMessageId: string | null;
  createdAt: string;
  editedAt: string | null;
  own: boolean;
};

export type CommunityReportTargetType = "MESSAGE" | "USER" | "CONVERSATION";

export type CommunityReportRecord = {
  id: string;
  reporterUserId: string;
  reporterDisplayName: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  conversationId: string | null;
  category: string;
  details: string | null;
  status: string;
  createdAt: string;
  targetBody: string | null;
  targetDisplayName: string | null;
  moderationStatus: MessageModerationStatus | null;
  moderationTargetUserId: string | null;
};

export const reportReviewActionValues = ["DISMISS", "REMOVE_CONTENT", "MUTE", "SUSPEND", "BAN"] as const;
export type ReportReviewAction = (typeof reportReviewActionValues)[number];

/** Keeps destructive user actions out of the UI unless the report resolves to one account. */
export function availableReportReviewActions(
  report: Pick<CommunityReportRecord, "targetType" | "targetBody" | "moderationStatus" | "moderationTargetUserId">,
): ReportReviewAction[] {
  const actions: ReportReviewAction[] = ["DISMISS"];
  if (
    report.targetType === "MESSAGE"
    && report.targetBody !== null
    && report.moderationStatus !== "REMOVED"
    && report.moderationStatus !== "DELETED"
  ) actions.push("REMOVE_CONTENT");
  if (report.moderationTargetUserId) actions.push("MUTE", "SUSPEND", "BAN");
  return actions;
}

export type CommunityDashboard = {
  viewer: {
    adultAttested: boolean;
    policyVersion: string;
    allowMessages: "NO_ONE" | "CONNECTIONS" | "EVERYONE";
    unreadCount: number;
  };
  channels: ConversationSummary[];
  conversations: ConversationSummary[];
  suggestedPlayers: PlayerSummary[];
};
