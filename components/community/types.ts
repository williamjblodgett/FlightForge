export type ConversationType = "DIRECT" | "PRIVATE_GROUP" | "PUBLIC_CHANNEL";

export type ChannelContextType = "REGION" | "STATE" | "COURSE" | "EVENT" | null;

export type ConnectionState =
  | "NONE"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "CONNECTED";

export type CommunityViewer = {
  adultAttested: boolean;
  policyVersion: string;
  allowMessages: "NO_ONE" | "CONNECTIONS" | "EVERYONE";
  unreadCount: number;
};

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  subject: string;
  contextType: ChannelContextType;
  contextId: string | null;
  contextLabel: string | null;
  memberCount: number;
  unreadCount: number;
  muted: boolean;
  joined: boolean;
  canLeave: boolean;
  canBlock: boolean;
  otherParticipantUserId: string | null;
  lastMessage: {
    body: string;
    senderDisplayName: string;
    createdAt: string;
  } | null;
  updatedAt: string;
};

export type PlayerSummary = {
  id: string;
  connectionId: string | null;
  displayName: string;
  initials: string;
  homeCity: string | null;
  homeRegionCode: string | null;
  experienceLevel: string | null;
  connectionState: ConnectionState;
  canMessage: boolean;
  sharedConnectionCount: number;
};

export type CommunitySnapshot = {
  viewer: CommunityViewer;
  channels: ConversationSummary[];
  conversations: ConversationSummary[];
  suggestedPlayers: PlayerSummary[];
};

export type CommunityMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDisplayName: string;
  body: string;
  state: "PENDING" | "PUBLISHED" | "QUARANTINED" | "REMOVED" | "DELETED";
  createdAt: string;
  updatedAt: string | null;
  isOwn: boolean;
  pending?: boolean;
  failed?: boolean;
};

export type MessagePage = {
  conversation: ConversationSummary | null;
  messages: CommunityMessage[];
  nextCursor: string | null;
};

export type CommunityApiError = {
  code: string;
  message: string;
  status: number;
};
