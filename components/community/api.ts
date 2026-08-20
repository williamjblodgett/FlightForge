import type {
  CommunityApiError,
  CommunityMessage,
  CommunitySnapshot,
  CommunityViewer,
  ConnectionState,
  ConversationSummary,
  ConversationType,
  MessagePage,
  PlayerSummary,
} from "./types";

export class CommunityRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: CommunityApiError) {
    super(error.message);
    this.name = "CommunityRequestError";
    this.code = error.code;
    this.status = error.status;
  }
}

export async function communityRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const raw = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const record = asRecord(raw);
    const nested = asRecord(record.error);
    throw new CommunityRequestError({
      code: readString(nested.code) ?? readString(record.code) ?? `HTTP_${response.status}`,
      message: readString(nested.message) ?? readString(record.message) ?? "FlightForge could not complete that request.",
      status: response.status,
    });
  }
  return raw as T;
}

export async function loadCommunity(): Promise<CommunitySnapshot> {
  const raw = await communityRequest<unknown>("/api/community");
  const root = unwrap(raw, "community");
  return {
    viewer: normalizeViewer(root.viewer),
    channels: readArray(root.channels).map(normalizeConversation),
    conversations: readArray(root.conversations).map(normalizeConversation),
    suggestedPlayers: readArray(root.suggestedPlayers ?? root.players).map(normalizePlayer),
  };
}

export async function loadConversations(): Promise<{ conversations: ConversationSummary[]; viewer: CommunityViewer | null }> {
  const raw = await communityRequest<unknown>("/api/community/conversations");
  const root = unwrap(raw, "data");
  return {
    conversations: readArray(root.conversations).map(normalizeConversation),
    viewer: root.viewer ? normalizeViewer(root.viewer) : null,
  };
}

export async function loadMessages(conversationId: string, cursor?: string): Promise<MessagePage> {
  const query = new URLSearchParams({ limit: "60" });
  if (cursor) query.set("cursor", cursor);
  const raw = await communityRequest<unknown>(`/api/community/conversations/${encodeURIComponent(conversationId)}/messages?${query}`);
  const root = unwrap(raw, "data");
  return {
    conversation: root.conversation ? normalizeConversation(root.conversation) : null,
    messages: readArray(root.messages).map(normalizeMessage),
    nextCursor: readString(root.nextCursor),
  };
}

export function normalizeConversation(value: unknown): ConversationSummary {
  const record = asRecord(value);
  const lastMessageRecord = asRecord(record.lastMessage);
  const type = readConversationType(record.type ?? record.conversationType);
  const subject = readString(record.subject)
    ?? readString(record.name)
    ?? readString(record.displayName)
    ?? (type === "DIRECT" ? "Player conversation" : "Community conversation");
  const otherParticipant = asRecord(record.otherParticipant);
  const context = asRecord(record.context);
  return {
    id: readString(record.id) ?? "",
    type,
    subject,
    contextType: readContextType(record.contextType ?? context.type),
    contextId: readString(record.contextId ?? context.id),
    contextLabel: readString(record.contextLabel ?? context.label),
    memberCount: readNumber(record.memberCount) ?? readArray(record.members).length,
    unreadCount: readNumber(record.unreadCount) ?? 0,
    muted: readBoolean(record.muted ?? record.isMuted),
    joined: record.joined === undefined ? true : readBoolean(record.joined),
    canLeave: record.canLeave === undefined ? type !== "DIRECT" : readBoolean(record.canLeave),
    canBlock: record.canBlock === undefined ? type === "DIRECT" : readBoolean(record.canBlock),
    otherParticipantUserId: readString(record.otherParticipantUserId ?? otherParticipant.id),
    lastMessage: readString(lastMessageRecord.body ?? lastMessageRecord.content)
      ? {
          body: readString(lastMessageRecord.body ?? lastMessageRecord.content) ?? "",
          senderDisplayName: readString(lastMessageRecord.senderDisplayName ?? lastMessageRecord.senderName) ?? "Player",
          createdAt: readString(lastMessageRecord.createdAt) ?? "",
        }
      : null,
    updatedAt: readString(record.updatedAt ?? record.lastMessageAt) ?? "",
  };
}

export function normalizeMessage(value: unknown): CommunityMessage {
  const record = asRecord(value);
  const sender = asRecord(record.sender);
  return {
    id: readString(record.id) ?? "",
    conversationId: readString(record.conversationId) ?? "",
    senderUserId: readString(record.senderUserId ?? record.userId ?? sender.id) ?? "",
    senderDisplayName: readString(record.senderDisplayName ?? record.senderName ?? sender.displayName) ?? "Player",
    body: readString(record.body ?? record.content) ?? "",
    state: readMessageState(record.moderationStatus ?? record.state ?? record.status),
    createdAt: readString(record.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(record.editedAt ?? record.updatedAt),
    isOwn: readBoolean(record.isOwn ?? record.own),
  };
}

function normalizeViewer(value: unknown): CommunityViewer {
  const record = asRecord(value);
  const allowMessages = readString(record.allowMessages);
  return {
    adultAttested: readBoolean(record.adultAttested ?? record.isAdult),
    policyVersion: readString(record.policyVersion) ?? "current",
    allowMessages: allowMessages === "NO_ONE" || allowMessages === "EVERYONE" ? allowMessages : "CONNECTIONS",
    unreadCount: readNumber(record.unreadCount) ?? 0,
  };
}

function normalizePlayer(value: unknown): PlayerSummary {
  const record = asRecord(value);
  const displayName = readString(record.displayName ?? record.name) ?? "FlightForge player";
  const state = readString(record.connectionState ?? record.connectionStatus);
  return {
    id: readString(record.id ?? record.userId) ?? "",
    connectionId: readString(record.connectionId),
    displayName,
    initials: readString(record.initials) ?? initials(displayName),
    homeCity: readString(record.homeCity ?? record.city),
    homeRegionCode: readString(record.homeRegionCode ?? record.regionCode ?? record.state),
    experienceLevel: readString(record.experienceLevel),
    connectionState: readConnectionState(state),
    canMessage: record.canMessage === undefined ? state === "CONNECTED" : readBoolean(record.canMessage),
    sharedConnectionCount: readNumber(record.sharedConnectionCount ?? record.mutualConnectionCount) ?? 0,
  };
}

function unwrap(value: unknown, fallbackKey: string): Record<string, unknown> {
  const root = asRecord(value);
  const data = asRecord(root.data);
  const fallback = asRecord(root[fallbackKey]);
  return Object.keys(data).length ? data : Object.keys(fallback).length ? fallback : root;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function readConversationType(value: unknown): ConversationType {
  return value === "DIRECT" || value === "PRIVATE_GROUP" ? value : "PUBLIC_CHANNEL";
}

function readContextType(value: unknown): ConversationSummary["contextType"] {
  return value === "REGION" || value === "STATE" || value === "COURSE" || value === "EVENT" ? value : null;
}

function readMessageState(value: unknown): CommunityMessage["state"] {
  return value === "PENDING" || value === "QUARANTINED" || value === "REMOVED" || value === "DELETED" ? value : "PUBLISHED";
}

function readConnectionState(value: string | null): ConnectionState {
  return value === "PENDING_SENT" || value === "PENDING_RECEIVED" || value === "CONNECTED" ? value : "NONE";
}

function initials(name: string): string {
  return name.split(/\s+/u).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FF";
}
