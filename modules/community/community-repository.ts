import { getD1Database } from "@/db/runtime";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { getCourseById } from "@/modules/courses/demo-courses";
import { canonicalConnectionPair, canStartConversation } from "./policy";
import { moderateMessage } from "./moderation";
import {
  COMMUNITY_GUIDELINES_VERSION,
  type ChannelContextType,
  type CommunityDashboard,
  type CommunityMessage,
  type CommunityReportRecord,
  type ConversationSummary,
  type ConversationType,
  type MessageModerationStatus,
  type PlayerSummary,
} from "./types";
import type { ConversationAction, CreateConversationInput, ModerationReviewInput, ReportInput } from "./validation";
import { ensureCommunityRuntimeSchema } from "./community-schema";

type CommunityErrorCode =
  | "FEATURE_DISABLED"
  | "AUTHENTICATION_REQUIRED"
  | "ADULT_ATTESTATION_REQUIRED"
  | "COMMUNITY_SUSPENDED"
  | "COMMUNITY_MUTED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

export class CommunityError extends Error {
  constructor(public readonly code: CommunityErrorCode, message: string, public readonly status: number) {
    super(message);
    this.name = "CommunityError";
  }
}

type CommunityStatus = {
  adultAttested: boolean;
  status: string;
  muted: boolean;
  suspended: boolean;
};

type ConversationRow = {
  id: string;
  conversationType: string;
  subject: string | null;
  contextType: string | null;
  contextId: string | null;
  memberCount: number;
  joined: number;
  muted: number;
  role: string | null;
  otherParticipantUserId: string | null;
  unreadCount: number;
  lastMessageId: string | null;
  lastMessageBody: string | null;
  lastMessageSender: string | null;
  lastMessageCreatedAt: string | null;
  lastMessageModerationStatus: string | null;
  updatedAt: string;
};

type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDisplayName: string;
  body: string;
  moderationStatus: string;
  moderationReason: string | null;
  replyToMessageId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export async function getCommunityDashboard(user: AuthenticatedUser): Promise<CommunityDashboard> {
  const database = getD1Database();
  const status = await getCommunityStatus(user.id);
  const privacy = await database.prepare(
    "SELECT allow_messages AS allowMessages FROM player_privacy_settings WHERE user_id = ? LIMIT 1",
  ).bind(user.id).first<{ allowMessages: string }>();
  const [channels, conversations, suggestedPlayers] = await Promise.all([
    status.adultAttested && !status.suspended ? listConversationSummaries(user.id, true) : Promise.resolve([]),
    status.adultAttested && !status.suspended ? listConversationSummaries(user.id, false) : Promise.resolve([]),
    status.adultAttested && !status.suspended ? listSuggestedPlayers(user.id) : Promise.resolve([]),
  ]);
  return {
    viewer: {
      adultAttested: status.adultAttested,
      policyVersion: COMMUNITY_GUIDELINES_VERSION,
      allowMessages: privacyValue(privacy?.allowMessages),
      unreadCount: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    },
    channels,
    conversations,
    suggestedPlayers,
  };
}

export async function recordAdultAttestation(user: AuthenticatedUser) {
  if (!user.emailVerified || user.identityLinkRequired) {
    throw new CommunityError("FORBIDDEN", "Verify and securely link your account before joining the community.", 403);
  }
  const now = new Date().toISOString();
  await getD1Database().batch([
    getD1Database().prepare(
      `INSERT INTO community_user_status
        (user_id, adult_attested_at, guidelines_version, guidelines_accepted_at, status, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)
       ON CONFLICT(user_id) DO UPDATE SET adult_attested_at = excluded.adult_attested_at,
         guidelines_version = excluded.guidelines_version,
         guidelines_accepted_at = excluded.guidelines_accepted_at,
         updated_at = excluded.updated_at`,
    ).bind(user.id, now, COMMUNITY_GUIDELINES_VERSION, now, now),
    getD1Database().prepare(
      `INSERT INTO consent_records (id, user_id, consent_type, policy_version, granted, recorded_at)
       VALUES (?, ?, 'COMMUNITY_ADULT_ATTESTATION', ?, 1, ?)`,
    ).bind(crypto.randomUUID(), user.id, COMMUNITY_GUIDELINES_VERSION, now),
    getD1Database().prepare(
      `INSERT INTO consent_records (id, user_id, consent_type, policy_version, granted, recorded_at)
       VALUES (?, ?, 'COMMUNITY_GUIDELINES', ?, 1, ?)`,
    ).bind(crypto.randomUUID(), user.id, COMMUNITY_GUIDELINES_VERSION, now),
    auditStatement(user.id, "COMMUNITY_ADULT_ATTESTED", "community_user_status", user.id, "Accepted adult community access", now),
  ]);
  return { adultAttested: true, policyVersion: COMMUNITY_GUIDELINES_VERSION, recordedAt: now };
}

export async function listUserConversations(userId: string): Promise<ConversationSummary[]> {
  await requireCommunityAccess(userId);
  return listConversationSummaries(userId, false);
}

export async function createConversation(user: AuthenticatedUser, input: CreateConversationInput): Promise<ConversationSummary> {
  await requireCommunityAccess(user.id);
  if (input.type === "DIRECT") return createDirectConversation(user, input.participantUserId);
  if (input.type === "PRIVATE_GROUP") return createPrivateGroup(user, input.subject, input.participantUserIds);
  return createPublicChannel(user, input.contextType, input.contextId);
}

export async function listMessages(
  user: AuthenticatedUser,
  conversationId: string,
  cursor: string | null,
  limit: number,
): Promise<{ messages: CommunityMessage[]; nextCursor: string | null }> {
  await requireCommunityAccess(user.id);
  await requireConversationMember(conversationId, user.id);
  const decoded = decodeCursor(cursor);
  const database = getD1Database();
  const bindings: unknown[] = [conversationId, user.id, user.id];
  let cursorSql = "";
  if (decoded) {
    cursorSql = " AND (m.created_at < ? OR (m.created_at = ? AND m.id < ?))";
    bindings.push(decoded.createdAt, decoded.createdAt, decoded.id);
  }
  bindings.push(limit + 1);
  const result = await database.prepare(
    `SELECT m.id, m.conversation_id AS conversationId, m.sender_user_id AS senderUserId,
       u.display_name AS senderDisplayName, m.body, m.moderation_status AS moderationStatus,
       m.moderation_reason AS moderationReason, m.reply_to_message_id AS replyToMessageId,
       m.created_at AS createdAt, m.edited_at AS editedAt, m.deleted_at AS deletedAt
     FROM messages m JOIN users u ON u.id = m.sender_user_id
     WHERE m.conversation_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM blocked_users b
         WHERE (b.blocker_user_id = ? AND b.blocked_user_id = m.sender_user_id)
            OR (b.blocker_user_id = m.sender_user_id AND b.blocked_user_id = ?)
       )${cursorSql}
     ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
  ).bind(...bindings).all<MessageRow>();
  const rows = result.results;
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    messages: page.reverse().map((row) => mapMessage(row, user)),
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function sendMessage(
  user: AuthenticatedUser,
  conversationId: string,
  body: string,
  idempotencyKey: string,
  replyToMessageId?: string | null,
): Promise<CommunityMessage> {
  const status = await requireCommunityAccess(user.id);
  if (status.muted) throw new CommunityError("COMMUNITY_MUTED", "Messaging is temporarily muted for this account.", 403);
  const conversation = await requireConversationMember(conversationId, user.id);
  if (conversation.type === "DIRECT") {
    const target = await getD1Database().prepare(
      "SELECT user_id AS userId FROM conversation_members WHERE conversation_id = ? AND user_id != ? AND left_at IS NULL LIMIT 1",
    ).bind(conversationId, user.id).first<{ userId: string }>();
    if (!target) throw new CommunityError("CONFLICT", "This direct conversation no longer has another participant.", 409);
    await requireMessagePermission(user.id, target.userId);
  }
  if (conversation.type !== "PUBLIC_CHANNEL" && await hasBlockedParticipant(conversationId, user.id)) {
    throw new CommunityError("FORBIDDEN", "This conversation is no longer available.", 403);
  }
  const database = getD1Database();
  const existing = await database.prepare(
    `SELECT m.id, m.conversation_id AS conversationId, m.sender_user_id AS senderUserId,
       u.display_name AS senderDisplayName, m.body, m.moderation_status AS moderationStatus,
       m.moderation_reason AS moderationReason, m.reply_to_message_id AS replyToMessageId,
       m.created_at AS createdAt, m.edited_at AS editedAt, m.deleted_at AS deletedAt
     FROM messages m JOIN users u ON u.id = m.sender_user_id
     WHERE m.sender_user_id = ? AND m.client_message_id = ? LIMIT 1`,
  ).bind(user.id, idempotencyKey).first<MessageRow>();
  if (existing) return mapMessage(existing, user);
  if (replyToMessageId) {
    const reply = await database.prepare("SELECT id FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1")
      .bind(replyToMessageId, conversationId).first();
    if (!reply) throw new CommunityError("NOT_FOUND", "The message being replied to was not found.", 404);
  }
  const moderation = moderateMessage(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await database.batch([
      database.prepare(
        `INSERT INTO messages
          (id, conversation_id, sender_user_id, body, client_message_id, moderation_status,
           moderation_reason, reply_to_message_id, created_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ).bind(id, conversationId, user.id, body, idempotencyKey, moderation.status, moderation.reason, replyToMessageId ?? null, now),
      database.prepare(
        "UPDATE conversations SET last_message_at = ?, updated_at = ?, version = version + 1 WHERE id = ?",
      ).bind(now, now, conversationId),
      database.prepare(
        "UPDATE conversation_members SET last_read_at = ?, last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?",
      ).bind(now, id, conversationId, user.id),
      auditStatement(user.id, moderation.status === "QUARANTINED" ? "COMMUNITY_MESSAGE_QUARANTINED" : "COMMUNITY_MESSAGE_SENT", "message", id, moderation.reason, now),
    ]);
  } catch (error) {
    const raced = await database.prepare(
      `SELECT m.id, m.conversation_id AS conversationId, m.sender_user_id AS senderUserId,
       u.display_name AS senderDisplayName, m.body, m.moderation_status AS moderationStatus,
       m.moderation_reason AS moderationReason, m.reply_to_message_id AS replyToMessageId,
       m.created_at AS createdAt, m.edited_at AS editedAt, m.deleted_at AS deletedAt
       FROM messages m JOIN users u ON u.id = m.sender_user_id
       WHERE m.sender_user_id = ? AND m.client_message_id = ? LIMIT 1`,
    ).bind(user.id, idempotencyKey).first<MessageRow>();
    if (raced) return mapMessage(raced, user);
    throw error;
  }
  return {
    id,
    conversationId,
    sender: { id: user.id, displayName: user.displayName },
    body,
    moderationStatus: moderation.status,
    moderationReason: moderation.reason,
    replyToMessageId: replyToMessageId ?? null,
    createdAt: now,
    editedAt: null,
    own: true,
  };
}

export async function editMessage(user: AuthenticatedUser, conversationId: string, messageId: string, body: string): Promise<CommunityMessage> {
  const status = await requireCommunityAccess(user.id);
  if (status.muted) throw new CommunityError("COMMUNITY_MUTED", "Messaging is temporarily muted for this account.", 403);
  await requireConversationMember(conversationId, user.id);
  const database = getD1Database();
  const existing = await database.prepare(
    "SELECT sender_user_id AS senderUserId, moderation_status AS moderationStatus, created_at AS createdAt, deleted_at AS deletedAt FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1",
  ).bind(messageId, conversationId).first<{ senderUserId: string; moderationStatus: string; createdAt: string; deletedAt: string | null }>();
  if (!existing) throw new CommunityError("NOT_FOUND", "That message was not found.", 404);
  if (existing.senderUserId !== user.id) throw new CommunityError("FORBIDDEN", "Only the sender can edit this message.", 403);
  if (existing.deletedAt || existing.moderationStatus === "DELETED") throw new CommunityError("CONFLICT", "A deleted message cannot be edited.", 409);
  if (existing.moderationStatus === "REMOVED") throw new CommunityError("CONFLICT", "A moderator-removed message cannot be edited.", 409);
  if (Date.now() - Date.parse(existing.createdAt) > 15 * 60_000) {
    throw new CommunityError("CONFLICT", "Messages can be edited for 15 minutes after sending.", 409);
  }
  const moderation = moderateMessage(body);
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      `UPDATE messages SET body = ?, moderation_status = ?, moderation_reason = ?, edited_at = ?, version = version + 1
       WHERE id = ? AND conversation_id = ? AND sender_user_id = ?`,
    ).bind(body, moderation.status, moderation.reason, now, messageId, conversationId, user.id),
    auditStatement(user.id, "COMMUNITY_MESSAGE_EDITED", "message", messageId, moderation.reason, now),
  ]);
  const updated = await readMessageRow(messageId);
  if (!updated) throw new CommunityError("NOT_FOUND", "That message was not found.", 404);
  return mapMessage(updated, user);
}

export async function deleteMessage(user: AuthenticatedUser, conversationId: string, messageId: string) {
  await requireCommunityAccess(user.id);
  await requireConversationMember(conversationId, user.id);
  const database = getD1Database();
  const message = await database.prepare(
    "SELECT sender_user_id AS senderUserId, deleted_at AS deletedAt FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1",
  ).bind(messageId, conversationId).first<{ senderUserId: string; deletedAt: string | null }>();
  if (!message) throw new CommunityError("NOT_FOUND", "That message was not found.", 404);
  if (message.senderUserId !== user.id && !user.roles.includes("PLATFORM_ADMIN")) {
    throw new CommunityError("FORBIDDEN", "Only the sender can delete this message.", 403);
  }
  if (message.deletedAt) return { deleted: true, id: messageId };
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      "UPDATE messages SET moderation_status = 'DELETED', deleted_at = ?, version = version + 1 WHERE id = ?",
    ).bind(now, messageId),
    auditStatement(user.id, "COMMUNITY_MESSAGE_DELETED", "message", messageId, "User requested deletion", now),
  ]);
  return { deleted: true, id: messageId };
}

export async function applyConversationAction(user: AuthenticatedUser, conversationId: string, input: ConversationAction) {
  await requireCommunityAccess(user.id);
  const database = getD1Database();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new CommunityError("NOT_FOUND", "That conversation was not found.", 404);
  const membership = await database.prepare(
    "SELECT id, role, left_at AS leftAt FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1",
  ).bind(conversationId, user.id).first<{ id: string; role: string; leftAt: string | null }>();
  const now = new Date().toISOString();
  if (input.action === "JOIN") {
    if (conversation.type !== "PUBLIC_CHANNEL" || conversation.status !== "ACTIVE") {
      throw new CommunityError("FORBIDDEN", "Only active public channels can be joined.", 403);
    }
    await assertJoinablePublicChannelContext(conversation.contextType, conversation.contextId);
    if (membership) {
      await database.prepare("UPDATE conversation_members SET left_at = NULL, joined_at = ? WHERE id = ?").bind(now, membership.id).run();
    } else {
      await database.prepare(
        `INSERT INTO conversation_members
          (id, conversation_id, user_id, role, joined_at, notifications_muted)
         VALUES (?, ?, ?, 'MEMBER', ?, 0)`,
      ).bind(crypto.randomUUID(), conversationId, user.id, now).run();
    }
    return { saved: true, joined: true };
  }
  if (!membership || membership.leftAt) throw new CommunityError("FORBIDDEN", "Join this conversation before changing it.", 403);
  if (input.action === "LEAVE") {
    await database.prepare("UPDATE conversation_members SET left_at = ? WHERE id = ?").bind(now, membership.id).run();
    return { saved: true, joined: false };
  }
  if (input.action === "MUTE" || input.action === "UNMUTE") {
    const muted = input.action === "MUTE" ? 1 : 0;
    await database.prepare("UPDATE conversation_members SET notifications_muted = ? WHERE id = ?").bind(muted, membership.id).run();
    return { saved: true, muted: Boolean(muted) };
  }
  let readAt = now;
  let readMessageId: string | null = input.messageId ?? null;
  if (input.messageId) {
    const message = await database.prepare("SELECT created_at AS createdAt FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1")
      .bind(input.messageId, conversationId).first<{ createdAt: string }>();
    if (!message) throw new CommunityError("NOT_FOUND", "That message was not found.", 404);
    readAt = message.createdAt;
  } else {
    const latest = await database.prepare(
      "SELECT id, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    ).bind(conversationId).first<{ id: string; createdAt: string }>();
    if (latest) { readAt = latest.createdAt; readMessageId = latest.id; }
  }
  await database.prepare(
    "UPDATE conversation_members SET last_read_at = ?, last_read_message_id = ? WHERE id = ?",
  ).bind(readAt, readMessageId, membership.id).run();
  return { saved: true, readAt, messageId: readMessageId };
}

export async function blockUser(user: AuthenticatedUser, blockedUserId: string) {
  await requireCommunityAccess(user.id);
  if (blockedUserId === user.id) throw new CommunityError("CONFLICT", "You cannot block your own account.", 409);
  const database = getD1Database();
  const target = await database.prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(blockedUserId).first();
  if (!target) throw new CommunityError("NOT_FOUND", "That player was not found.", 404);
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      "INSERT OR IGNORE INTO blocked_users (id, blocker_user_id, blocked_user_id, created_at) VALUES (?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), user.id, blockedUserId, now),
    database.prepare("DELETE FROM player_connections WHERE pair_key = ?")
      .bind(canonicalConnectionPair(user.id, blockedUserId)),
    auditStatement(user.id, "COMMUNITY_USER_BLOCKED", "user", blockedUserId, "User initiated block", now),
  ]);
  return { saved: true, blockedUserId };
}

export async function unblockUser(user: AuthenticatedUser, blockedUserId: string) {
  await requireCommunityAccess(user.id);
  await getD1Database().prepare("DELETE FROM blocked_users WHERE blocker_user_id = ? AND blocked_user_id = ?")
    .bind(user.id, blockedUserId).run();
  return { saved: true, blockedUserId };
}

export async function createReport(user: AuthenticatedUser, input: ReportInput) {
  await requireCommunityAccess(user.id);
  const database = getD1Database();
  let conversationId = input.conversationId ?? null;
  if (input.targetType === "MESSAGE") {
    const message = await database.prepare("SELECT conversation_id AS conversationId FROM messages WHERE id = ? LIMIT 1")
      .bind(input.targetId).first<{ conversationId: string }>();
    if (!message) throw new CommunityError("NOT_FOUND", "That message was not found.", 404);
    await requireConversationMember(message.conversationId, user.id);
    conversationId = message.conversationId;
  } else if (input.targetType === "CONVERSATION") {
    await requireConversationMember(input.targetId, user.id);
    conversationId = input.targetId;
  } else {
    if (input.targetId === user.id) throw new CommunityError("CONFLICT", "You cannot report your own account.", 409);
    const target = await database.prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1").bind(input.targetId).first();
    if (!target) throw new CommunityError("NOT_FOUND", "That player was not found.", 404);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      `INSERT INTO reports
        (id, reporter_user_id, target_type, target_id, conversation_id, category, details, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
    ).bind(id, user.id, input.targetType, input.targetId, conversationId, input.category, input.details ?? null, now, now),
    auditStatement(user.id, "COMMUNITY_REPORT_CREATED", input.targetType.toLowerCase(), input.targetId, input.category, now),
  ]);
  return { id, status: "OPEN" as const, createdAt: now };
}

export async function listOpenReports(admin: AuthenticatedUser) {
  await ensureCommunityRuntimeSchema();
  requireAdmin(admin);
  const result = await getD1Database().prepare(
    `SELECT r.id, r.reporter_user_id AS reporterUserId, reporter.display_name AS reporterDisplayName,
       r.target_type AS targetType, r.target_id AS targetId, r.conversation_id AS conversationId,
       r.category, r.details, r.status, r.created_at AS createdAt,
       CASE WHEN r.target_type = 'MESSAGE' THEN (SELECT body FROM messages WHERE id = r.target_id)
         ELSE NULL END AS targetBody,
       CASE WHEN r.target_type = 'MESSAGE' THEN
         (SELECT sender.display_name FROM messages reported JOIN users sender ON sender.id = reported.sender_user_id WHERE reported.id = r.target_id)
         WHEN r.target_type = 'USER' THEN (SELECT display_name FROM users WHERE id = r.target_id)
         ELSE (SELECT subject FROM conversations WHERE id = r.target_id) END AS targetDisplayName,
       CASE WHEN r.target_type = 'MESSAGE' THEN (SELECT moderation_status FROM messages WHERE id = r.target_id)
         ELSE NULL END AS moderationStatus,
       CASE WHEN r.target_type = 'MESSAGE' THEN
         (SELECT reported.sender_user_id FROM messages reported
          JOIN users target_user ON target_user.id = reported.sender_user_id
          WHERE reported.id = r.target_id AND target_user.deleted_at IS NULL)
         WHEN r.target_type = 'USER' THEN
         (SELECT target_user.id FROM users target_user WHERE target_user.id = r.target_id AND target_user.deleted_at IS NULL)
         WHEN r.target_type = 'CONVERSATION' THEN
         (SELECT member.user_id FROM conversations conversation
          JOIN conversation_members member ON member.conversation_id = conversation.id
          JOIN users target_user ON target_user.id = member.user_id AND target_user.deleted_at IS NULL
          WHERE conversation.id = r.target_id AND conversation.conversation_type = 'DIRECT'
            AND member.user_id != r.reporter_user_id AND member.left_at IS NULL LIMIT 1)
         ELSE NULL END AS moderationTargetUserId
     FROM reports r JOIN users reporter ON reporter.id = r.reporter_user_id
     WHERE r.status = 'OPEN' ORDER BY r.created_at ASC LIMIT 100`,
  ).all<CommunityReportRecord>();
  return result.results;
}

export async function reviewReport(admin: AuthenticatedUser, reportId: string, input: ModerationReviewInput) {
  requireAdmin(admin);
  const database = getD1Database();
  const report = await database.prepare(
    "SELECT id, reporter_user_id AS reporterUserId, target_type AS targetType, target_id AS targetId, status FROM reports WHERE id = ? LIMIT 1",
  ).bind(reportId).first<{ id: string; reporterUserId: string; targetType: string; targetId: string; status: string }>();
  if (!report) throw new CommunityError("NOT_FOUND", "That report was not found.", 404);
  if (report.status !== "OPEN") throw new CommunityError("CONFLICT", "That report has already been reviewed.", 409);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const moderationTargetUserId = await resolveModerationTargetUserId(database, report);
  if (input.action === "REMOVE_CONTENT") {
    if (report.targetType !== "MESSAGE") throw new CommunityError("CONFLICT", "Only reported messages can be removed as content.", 409);
    const message = await database.prepare("SELECT moderation_status AS moderationStatus FROM messages WHERE id = ? LIMIT 1")
      .bind(report.targetId).first<{ moderationStatus: string }>();
    if (!message) throw new CommunityError("CONFLICT", "The reported message is no longer available.", 409);
    if (message.moderationStatus === "REMOVED" || message.moderationStatus === "DELETED") {
      throw new CommunityError("CONFLICT", "The reported message has already been removed.", 409);
    }
    statements.push(database.prepare(
      "UPDATE messages SET moderation_status = 'REMOVED', moderation_reason = ?, version = version + 1 WHERE id = ?",
    ).bind(input.reason, report.targetId));
  }
  if (input.action === "MUTE" || input.action === "SUSPEND" || input.action === "BAN") {
    if (!moderationTargetUserId) throw new CommunityError("CONFLICT", "This report does not identify a user for that action.", 409);
    const until = input.durationHours ? new Date(Date.now() + input.durationHours * 3_600_000).toISOString() : null;
    if (input.action === "MUTE") {
      statements.push(database.prepare(
        `INSERT INTO community_user_status (user_id, status, muted_until, updated_at) VALUES (?, 'ACTIVE', ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET muted_until = excluded.muted_until, updated_at = excluded.updated_at`,
      ).bind(moderationTargetUserId, until, now));
    } else {
      const status = input.action === "BAN" ? "BANNED" : "SUSPENDED";
      statements.push(database.prepare(
        `INSERT INTO community_user_status (user_id, status, suspended_until, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, suspended_until = excluded.suspended_until,
           updated_at = excluded.updated_at`,
      ).bind(moderationTargetUserId, status, input.action === "BAN" ? null : until, now));
    }
  }
  const resolutionStatus = input.action === "DISMISS" ? "DISMISSED" : "ACTIONED";
  statements.push(
    database.prepare(
      "UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ?, resolution_reason = ?, updated_at = ? WHERE id = ?",
    ).bind(resolutionStatus, admin.id, now, input.reason, now, reportId),
    database.prepare(
      `INSERT INTO moderation_actions
        (id, report_id, moderator_user_id, action, target_type, target_id, reason, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), reportId, admin.id, input.action, report.targetType, report.targetId, input.reason,
      JSON.stringify({ durationHours: input.durationHours ?? null }), now),
    auditStatement(admin.id, `COMMUNITY_MODERATION_${input.action}`, report.targetType.toLowerCase(), report.targetId, input.reason, now),
  );
  await database.batch(statements);
  return { id: reportId, status: resolutionStatus, action: input.action, resolvedAt: now };
}

async function resolveModerationTargetUserId(
  database: D1Database,
  report: { reporterUserId: string; targetType: string; targetId: string },
): Promise<string | null> {
  if (report.targetType === "USER") {
    return (await database.prepare("SELECT id AS userId FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1")
      .bind(report.targetId).first<{ userId: string }>())?.userId ?? null;
  }
  if (report.targetType === "MESSAGE") {
    return (await database.prepare(
      `SELECT message.sender_user_id AS userId FROM messages message
       JOIN users target_user ON target_user.id = message.sender_user_id
       WHERE message.id = ? AND target_user.deleted_at IS NULL LIMIT 1`,
    ).bind(report.targetId).first<{ userId: string }>())?.userId ?? null;
  }
  if (report.targetType === "CONVERSATION") {
    return (await database.prepare(
      `SELECT member.user_id AS userId FROM conversations conversation
       JOIN conversation_members member ON member.conversation_id = conversation.id
       JOIN users target_user ON target_user.id = member.user_id
       WHERE conversation.id = ? AND conversation.conversation_type = 'DIRECT'
         AND member.user_id != ? AND member.left_at IS NULL AND target_user.deleted_at IS NULL LIMIT 1`,
    ).bind(report.targetId, report.reporterUserId).first<{ userId: string }>())?.userId ?? null;
  }
  return null;
}

export async function requestConnection(user: AuthenticatedUser, addresseeUserId: string) {
  await requireCommunityAccess(user.id);
  if (addresseeUserId === user.id) throw new CommunityError("CONFLICT", "You cannot connect with your own account.", 409);
  await requireActiveAdultUser(addresseeUserId);
  const discoverable = await getD1Database().prepare(
    "SELECT user_id FROM player_privacy_settings WHERE user_id = ? AND profile_visibility = 'PUBLIC' LIMIT 1",
  ).bind(addresseeUserId).first();
  if (!discoverable) throw new CommunityError("FORBIDDEN", "That player is not accepting community connection requests.", 403);
  if (await isBlockedEitherWay(user.id, addresseeUserId)) throw new CommunityError("FORBIDDEN", "That player is unavailable.", 403);
  const database = getD1Database();
  const pairKey = canonicalConnectionPair(user.id, addresseeUserId);
  const existing = await database.prepare(
    "SELECT id, status FROM player_connections WHERE pair_key = ? LIMIT 1",
  ).bind(pairKey).first<{ id: string; status: string }>();
  if (existing && existing.status !== "DECLINED") return { id: existing.id, status: existing.status };
  if (existing) {
    const now = new Date().toISOString();
    await database.prepare(
      "UPDATE player_connections SET requester_user_id = ?, addressee_user_id = ?, status = 'PENDING', updated_at = ? WHERE id = ?",
    ).bind(user.id, addresseeUserId, now, existing.id).run();
    return { id: existing.id, status: "PENDING" as const };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.prepare(
    `INSERT INTO player_connections
      (id, requester_user_id, addressee_user_id, pair_key, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
  ).bind(id, user.id, addresseeUserId, pairKey, now, now).run();
  return { id, status: "PENDING" as const };
}

export async function respondToConnection(user: AuthenticatedUser, connectionId: string, accept: boolean) {
  await requireCommunityAccess(user.id);
  const database = getD1Database();
  const connection = await database.prepare(
    "SELECT id, addressee_user_id AS addresseeUserId, status FROM player_connections WHERE id = ? LIMIT 1",
  ).bind(connectionId).first<{ id: string; addresseeUserId: string; status: string }>();
  if (!connection) throw new CommunityError("NOT_FOUND", "That connection request was not found.", 404);
  if (connection.addresseeUserId !== user.id || connection.status !== "PENDING") {
    throw new CommunityError("FORBIDDEN", "Only the invited player can answer this request.", 403);
  }
  const status = accept ? "ACCEPTED" : "DECLINED";
  await database.prepare("UPDATE player_connections SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), connectionId).run();
  return { id: connectionId, status };
}

export async function removeConnection(user: AuthenticatedUser, targetUserId: string) {
  await requireCommunityAccess(user.id);
  const pairKey = canonicalConnectionPair(user.id, targetUserId);
  await getD1Database().prepare(
    "DELETE FROM player_connections WHERE pair_key = ? AND (requester_user_id = ? OR addressee_user_id = ?)",
  ).bind(pairKey, user.id, user.id).run();
  return { saved: true, targetUserId };
}

async function createDirectConversation(user: AuthenticatedUser, targetUserId: string): Promise<ConversationSummary> {
  await requireMessagePermission(user.id, targetUserId);
  const database = getD1Database();
  const existing = await database.prepare(
    `SELECT c.id FROM conversations c
     JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = ? AND mine.left_at IS NULL
     JOIN conversation_members theirs ON theirs.conversation_id = c.id AND theirs.user_id = ? AND theirs.left_at IS NULL
     WHERE c.conversation_type = 'DIRECT' AND c.status = 'ACTIVE'
       AND (SELECT count(*) FROM conversation_members active WHERE active.conversation_id = c.id AND active.left_at IS NULL) = 2
     LIMIT 1`,
  ).bind(user.id, targetUserId).first<{ id: string }>();
  if (existing) return requireSummary(existing.id, user.id);
  const target = await database.prepare("SELECT display_name AS displayName FROM users WHERE id = ? LIMIT 1")
    .bind(targetUserId).first<{ displayName: string }>();
  if (!target) throw new CommunityError("NOT_FOUND", "That player was not found.", 404);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      `INSERT INTO conversations
        (id, conversation_type, subject, visibility, status, created_by, created_at, updated_at, version)
       VALUES (?, 'DIRECT', ?, 'PRIVATE', 'ACTIVE', ?, ?, ?, 1)`,
    ).bind(id, target.displayName, user.id, now, now),
    memberInsert(id, user.id, "OWNER", now),
    memberInsert(id, targetUserId, "MEMBER", now),
  ]);
  return requireSummary(id, user.id);
}

async function createPrivateGroup(user: AuthenticatedUser, subject: string, targetIds: string[]): Promise<ConversationSummary> {
  const participants = Array.from(new Set(targetIds.filter((id) => id !== user.id)));
  if (!participants.length) throw new CommunityError("CONFLICT", "Add at least one other player.", 409);
  for (const targetId of participants) await requireMessagePermission(user.id, targetId);
  const database = getD1Database();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      `INSERT INTO conversations
        (id, conversation_type, subject, visibility, status, created_by, created_at, updated_at, version)
       VALUES (?, 'PRIVATE_GROUP', ?, 'PRIVATE', 'ACTIVE', ?, ?, ?, 1)`,
    ).bind(id, subject, user.id, now, now),
    memberInsert(id, user.id, "OWNER", now),
    ...participants.map((participantId) => memberInsert(id, participantId, "MEMBER", now)),
  ]);
  return requireSummary(id, user.id);
}

async function createPublicChannel(
  user: AuthenticatedUser,
  contextType: ChannelContextType,
  contextId: string,
): Promise<ConversationSummary> {
  const database = getD1Database();
  const existing = await database.prepare(
    "SELECT id FROM conversations WHERE conversation_type = 'PUBLIC_CHANNEL' AND context_type = ? AND context_id = ? AND status = 'ACTIVE' LIMIT 1",
  ).bind(contextType, contextId).first<{ id: string }>();
  if (existing) {
    await assertJoinablePublicChannelContext(contextType, contextId);
    await joinPublicChannel(existing.id, user.id);
    return requireSummary(existing.id, user.id);
  }
  const subject = await derivePublicChannelSubject(user, contextType, contextId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await database.batch([
      database.prepare(
        `INSERT INTO conversations
          (id, conversation_type, subject, visibility, context_type, context_id, status, created_by, created_at, updated_at, version)
         VALUES (?, 'PUBLIC_CHANNEL', ?, 'PUBLIC', ?, ?, 'ACTIVE', 'SYSTEM', ?, ?, 1)`,
      ).bind(id, subject, contextType, contextId, now, now),
      memberInsert(id, user.id, "MEMBER", now),
      auditStatement(user.id, "COMMUNITY_CHANNEL_PROVISIONED", contextType.toLowerCase(), contextId, subject, now),
    ]);
    return requireSummary(id, user.id);
  } catch (error) {
    const raced = await database.prepare(
      "SELECT id FROM conversations WHERE conversation_type = 'PUBLIC_CHANNEL' AND context_type = ? AND context_id = ? AND status = 'ACTIVE' LIMIT 1",
    ).bind(contextType, contextId).first<{ id: string }>();
    if (!raced) throw error;
    await assertJoinablePublicChannelContext(contextType, contextId);
    await joinPublicChannel(raced.id, user.id);
    return requireSummary(raced.id, user.id);
  }
}

async function derivePublicChannelSubject(user: AuthenticatedUser, contextType: ChannelContextType, contextId: string): Promise<string> {
  if (contextType === "REGION" || contextType === "STATE") {
    if (!user.roles.includes("PLATFORM_ADMIN")) {
      throw new CommunityError("FORBIDDEN", "Regional and state channels are curated by FlightForge.", 403);
    }
  }
  return resolveJoinablePublicChannelSubject(contextType, contextId);
}

const seededChannelSubjects: Readonly<Record<string, string>> = {
  "REGION:new-england": "New England Clubhouse",
  "STATE:ME": "Maine Clubhouse",
  "STATE:MA": "Massachusetts Clubhouse",
  "STATE:NH": "New Hampshire Clubhouse",
  "STATE:VT": "Vermont Clubhouse",
  "STATE:CT": "Connecticut Clubhouse",
  "STATE:RI": "Rhode Island Clubhouse",
};

/** Revalidates the backing public record immediately before any join. */
export async function assertJoinablePublicChannelContext(
  contextType: ChannelContextType | null,
  contextId: string | null,
): Promise<void> {
  await resolveJoinablePublicChannelSubject(contextType, contextId);
}

async function resolveJoinablePublicChannelSubject(
  contextType: ChannelContextType | null,
  contextId: string | null,
): Promise<string> {
  if (!contextType || !contextId) throw new CommunityError("NOT_FOUND", "That community context was not found.", 404);
  const seededSubject = seededChannelSubjects[`${contextType}:${contextId}`];
  if (contextType === "REGION" || contextType === "STATE") {
    if (!seededSubject) throw new CommunityError("NOT_FOUND", "That curated community was not found.", 404);
    return seededSubject;
  }
  const database = getD1Database();
  if (contextType === "EVENT") {
    const event = await database.prepare(
      "SELECT title FROM events WHERE id = ? AND status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL LIMIT 1",
    ).bind(contextId).first<{ title: string }>();
    if (!event) throw new CommunityError("NOT_FOUND", "That published event is no longer available.", 404);
    return `${event.title} Event Chat`;
  }
  const course = await database.prepare(
    "SELECT name, is_published AS isPublished, deleted_at AS deletedAt FROM courses WHERE id = ? LIMIT 1",
  ).bind(contextId).first<{ name: string; isPublished: number | boolean; deletedAt: string | null }>();
  if (course) {
    if (!(course.isPublished === true || Number(course.isPublished) === 1) || course.deletedAt) {
      throw new CommunityError("NOT_FOUND", "That published course is no longer available.", 404);
    }
    return `${course.name} Clubhouse`;
  }
  // Until the D1 catalog cutover completes, the same reviewed catalog used by
  // public discovery is an allowed fallback only when D1 has no row at all.
  const catalogCourse = getCourseById(contextId);
  if (!catalogCourse) throw new CommunityError("NOT_FOUND", "That published course is no longer available.", 404);
  return `${catalogCourse.name} Clubhouse`;
}

async function joinPublicChannel(conversationId: string, userId: string): Promise<void> {
  const database = getD1Database();
  const existing = await database.prepare(
    "SELECT id, left_at AS leftAt FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1",
  ).bind(conversationId, userId).first<{ id: string; leftAt: string | null }>();
  const now = new Date().toISOString();
  if (!existing) {
    await memberInsert(conversationId, userId, "MEMBER", now).run();
  } else if (existing.leftAt) {
    await database.prepare("UPDATE conversation_members SET left_at = NULL, joined_at = ? WHERE id = ?")
      .bind(now, existing.id).run();
  }
}

async function requireMessagePermission(senderUserId: string, targetUserId: string): Promise<void> {
  const database = getD1Database();
  const target = await database.prepare(
    `SELECT u.id, COALESCE(p.allow_messages, 'CONNECTIONS') AS allowMessages,
       CASE WHEN s.adult_attested_at IS NOT NULL AND s.guidelines_version = ?
         AND s.guidelines_accepted_at IS NOT NULL
         AND (s.status = 'ACTIVE' OR (s.status = 'SUSPENDED' AND s.suspended_until IS NOT NULL
           AND datetime(s.suspended_until) <= datetime('now'))) THEN 1 ELSE 0 END AS adultAttested
     FROM users u LEFT JOIN player_privacy_settings p ON p.user_id = u.id
       LEFT JOIN community_user_status s ON s.user_id = u.id
     WHERE u.id = ? AND u.status = 'ACTIVE' AND u.deleted_at IS NULL LIMIT 1`,
  ).bind(COMMUNITY_GUIDELINES_VERSION, targetUserId).first<{ id: string; allowMessages: string; adultAttested: number }>();
  if (!target) throw new CommunityError("NOT_FOUND", "That player was not found.", 404);
  const blockedEitherWay = await isBlockedEitherWay(senderUserId, targetUserId);
  const connected = Boolean(await database.prepare(
    "SELECT id FROM player_connections WHERE pair_key = ? AND status = 'ACCEPTED' LIMIT 1",
  ).bind(canonicalConnectionPair(senderUserId, targetUserId)).first());
  if (!canStartConversation({
    targetPrivacy: privacyValue(target.allowMessages), connected, blockedEitherWay,
    targetAdultAttested: Number(target.adultAttested) === 1, sameUser: senderUserId === targetUserId,
  })) throw new CommunityError("FORBIDDEN", "That player is not accepting messages from this account.", 403);
}

async function listConversationSummaries(userId: string, publicOnly: boolean): Promise<ConversationSummary[]> {
  const bindings: string[] = [userId, userId, userId, userId, userId, userId];
  if (!publicOnly) bindings.push(userId, userId, userId);
  const result = await getD1Database().prepare(
    `SELECT c.id, c.conversation_type AS conversationType,
       CASE WHEN c.conversation_type = 'DIRECT' THEN
         (SELECT direct_user.display_name FROM conversation_members direct_member
          JOIN users direct_user ON direct_user.id = direct_member.user_id
          WHERE direct_member.conversation_id = c.id AND direct_member.user_id != ? AND direct_member.left_at IS NULL LIMIT 1)
       ELSE c.subject END AS subject,
       c.context_type AS contextType,
       c.context_id AS contextId, c.updated_at AS updatedAt,
       CASE WHEN c.conversation_type = 'DIRECT' THEN
         (SELECT direct_member.user_id FROM conversation_members direct_member
          WHERE direct_member.conversation_id = c.id AND direct_member.user_id != ? AND direct_member.left_at IS NULL LIMIT 1)
       ELSE NULL END AS otherParticipantUserId,
       (SELECT count(*) FROM conversation_members members WHERE members.conversation_id = c.id AND members.left_at IS NULL) AS memberCount,
       CASE WHEN cm.id IS NOT NULL AND cm.left_at IS NULL THEN 1 ELSE 0 END AS joined,
       COALESCE(cm.notifications_muted, 0) AS muted, cm.role,
       CASE WHEN cm.id IS NULL OR cm.left_at IS NOT NULL THEN 0 ELSE
         (SELECT count(*) FROM messages unread WHERE unread.conversation_id = c.id
          AND unread.sender_user_id != ? AND unread.moderation_status = 'PUBLISHED'
          AND NOT EXISTS (SELECT 1 FROM blocked_users unread_block WHERE
            (unread_block.blocker_user_id = ? AND unread_block.blocked_user_id = unread.sender_user_id)
            OR (unread_block.blocker_user_id = unread.sender_user_id AND unread_block.blocked_user_id = ?))
          AND (unread.created_at > COALESCE(cm.last_read_at, '')
            OR (unread.created_at = COALESCE(cm.last_read_at, '')
              AND unread.id > COALESCE(cm.last_read_message_id, '')))) END AS unreadCount,
       (SELECT latest.id FROM messages latest WHERE latest.conversation_id = c.id AND latest.moderation_status = 'PUBLISHED'
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1) AS lastMessageId,
       (SELECT latest.body FROM messages latest WHERE latest.conversation_id = c.id AND latest.moderation_status = 'PUBLISHED'
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1) AS lastMessageBody,
       (SELECT sender.display_name FROM messages latest JOIN users sender ON sender.id = latest.sender_user_id
         WHERE latest.conversation_id = c.id AND latest.moderation_status = 'PUBLISHED'
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1) AS lastMessageSender,
       (SELECT latest.created_at FROM messages latest WHERE latest.conversation_id = c.id AND latest.moderation_status = 'PUBLISHED'
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1) AS lastMessageCreatedAt,
       (SELECT latest.moderation_status FROM messages latest WHERE latest.conversation_id = c.id AND latest.moderation_status = 'PUBLISHED'
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1) AS lastMessageModerationStatus
     FROM conversations c LEFT JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
     WHERE c.status = 'ACTIVE' AND ${publicOnly
       ? "c.conversation_type = 'PUBLIC_CHANNEL'"
       : `c.conversation_type != 'PUBLIC_CHANNEL' AND cm.left_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM conversation_members blocked_member JOIN blocked_users blocked_pair ON
              ((blocked_pair.blocker_user_id = ? AND blocked_pair.blocked_user_id = blocked_member.user_id)
               OR (blocked_pair.blocker_user_id = blocked_member.user_id AND blocked_pair.blocked_user_id = ?))
            WHERE blocked_member.conversation_id = c.id AND blocked_member.user_id != ? AND blocked_member.left_at IS NULL
          )`}
     ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC LIMIT ${publicOnly ? 100 : 50}`,
  ).bind(...bindings).all<ConversationRow>();
  return result.results.map(mapConversationSummary);
}

async function requireSummary(conversationId: string, userId: string): Promise<ConversationSummary> {
  const summaries = await listConversationSummaries(userId, false);
  const direct = summaries.find((summary) => summary.id === conversationId);
  if (direct) return direct;
  const channels = await listConversationSummaries(userId, true);
  const channel = channels.find((summary) => summary.id === conversationId);
  if (!channel) throw new CommunityError("NOT_FOUND", "That conversation was not found.", 404);
  return channel;
}

async function listSuggestedPlayers(userId: string): Promise<PlayerSummary[]> {
  const result = await getD1Database().prepare(
    `SELECT u.id, u.display_name AS displayName,
       CASE WHEN privacy.show_home_city = 1 THEN profile.home_city ELSE NULL END AS homeCity,
       CASE WHEN privacy.show_home_city = 1 THEN profile.home_region_code ELSE NULL END AS homeRegionCode,
       profile.experience_level AS experienceLevel, privacy.allow_messages AS allowMessages,
       connection.id AS connectionId, connection.requester_user_id AS requesterUserId, connection.status AS connectionStatus
     FROM users u
       JOIN player_privacy_settings privacy ON privacy.user_id = u.id AND privacy.profile_visibility = 'PUBLIC'
       JOIN community_user_status community ON community.user_id = u.id
         AND community.adult_attested_at IS NOT NULL AND community.guidelines_version = ?
         AND (community.status = 'ACTIVE' OR (community.status = 'SUSPENDED' AND community.suspended_until IS NOT NULL
           AND datetime(community.suspended_until) <= datetime('now')))
       LEFT JOIN player_profiles profile ON profile.user_id = u.id
       LEFT JOIN player_connections connection ON connection.pair_key = CASE WHEN u.id < ? THEN u.id || ':' || ? ELSE ? || ':' || u.id END
     WHERE u.id != ? AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM blocked_users blocked WHERE
         (blocked.blocker_user_id = ? AND blocked.blocked_user_id = u.id)
         OR (blocked.blocker_user_id = u.id AND blocked.blocked_user_id = ?))
     ORDER BY CASE WHEN profile.home_region_code IS NULL THEN 1 ELSE 0 END, u.display_name LIMIT 24`,
  ).bind(COMMUNITY_GUIDELINES_VERSION, userId, userId, userId, userId, userId, userId).all<{
    id: string; displayName: string; homeCity: string | null; homeRegionCode: string | null;
    experienceLevel: string | null; allowMessages: string; connectionId: string | null; requesterUserId: string | null; connectionStatus: string | null;
  }>();
  return result.results.map((row) => {
    const connectionStatus = row.connectionStatus === "ACCEPTED" ? "CONNECTED"
      : row.connectionStatus === "PENDING" && row.requesterUserId === userId ? "PENDING_SENT"
        : row.connectionStatus === "PENDING" ? "PENDING_RECEIVED" : "NONE";
    return {
      id: row.id, displayName: row.displayName, homeCity: row.homeCity, homeRegionCode: row.homeRegionCode,
      experienceLevel: row.experienceLevel, connectionId: row.connectionId, connectionStatus,
      canMessage: privacyValue(row.allowMessages) === "EVERYONE" || connectionStatus === "CONNECTED",
    };
  });
}

async function getCommunityStatus(userId: string): Promise<CommunityStatus> {
  const row = await getD1Database().prepare(
    `SELECT adult_attested_at AS adultAttestedAt, guidelines_version AS guidelinesVersion,
       guidelines_accepted_at AS guidelinesAcceptedAt, status, muted_until AS mutedUntil,
       suspended_until AS suspendedUntil FROM community_user_status WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{
    adultAttestedAt: string | null; guidelinesVersion: string | null; guidelinesAcceptedAt: string | null;
    status: string; mutedUntil: string | null; suspendedUntil: string | null;
  }>();
  const now = Date.now();
  return {
    adultAttested: Boolean(row?.adultAttestedAt && row.guidelinesAcceptedAt && row.guidelinesVersion === COMMUNITY_GUIDELINES_VERSION),
    status: row?.status ?? "ACTIVE",
    muted: Boolean(row?.mutedUntil && Date.parse(row.mutedUntil) > now),
    suspended: row?.status === "BANNED" || Boolean(row?.status === "SUSPENDED" && (!row.suspendedUntil || Date.parse(row.suspendedUntil) > now)),
  };
}

async function requireCommunityAccess(userId: string): Promise<CommunityStatus> {
  const status = await getCommunityStatus(userId);
  if (!status.adultAttested) throw new CommunityError("ADULT_ATTESTATION_REQUIRED", "Confirm that you are 18 or older and accept the community guidelines first.", 403);
  if (status.suspended) throw new CommunityError("COMMUNITY_SUSPENDED", "Community access is unavailable for this account.", 403);
  return status;
}

async function requireActiveAdultUser(userId: string) {
  const user = await getD1Database().prepare(
    `SELECT u.id FROM users u JOIN community_user_status s ON s.user_id = u.id
     WHERE u.id = ? AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
       AND s.adult_attested_at IS NOT NULL AND s.guidelines_accepted_at IS NOT NULL
       AND s.guidelines_version = ?
       AND (s.status = 'ACTIVE' OR (s.status = 'SUSPENDED' AND s.suspended_until IS NOT NULL
         AND datetime(s.suspended_until) <= datetime('now'))) LIMIT 1`,
  ).bind(userId, COMMUNITY_GUIDELINES_VERSION).first();
  if (!user) throw new CommunityError("NOT_FOUND", "That player is not available in the adult community.", 404);
}

async function requireConversationMember(conversationId: string, userId: string) {
  const row = await getD1Database().prepare(
    `SELECT c.id, c.conversation_type AS type, c.status FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     WHERE c.id = ? AND m.user_id = ? AND m.left_at IS NULL AND c.status = 'ACTIVE' LIMIT 1`,
  ).bind(conversationId, userId).first<{ id: string; type: ConversationType; status: string }>();
  if (!row) throw new CommunityError("FORBIDDEN", "Join this conversation before viewing or posting messages.", 403);
  return row;
}

async function getConversation(conversationId: string) {
  return getD1Database().prepare(
    `SELECT id, conversation_type AS type, status, context_type AS contextType, context_id AS contextId
     FROM conversations WHERE id = ? LIMIT 1`,
  ).bind(conversationId).first<{
    id: string; type: ConversationType; status: string;
    contextType: ChannelContextType | null; contextId: string | null;
  }>();
}

async function readMessageRow(messageId: string): Promise<MessageRow | null> {
  return getD1Database().prepare(
    `SELECT m.id, m.conversation_id AS conversationId, m.sender_user_id AS senderUserId,
       u.display_name AS senderDisplayName, m.body, m.moderation_status AS moderationStatus,
       m.moderation_reason AS moderationReason, m.reply_to_message_id AS replyToMessageId,
       m.created_at AS createdAt, m.edited_at AS editedAt, m.deleted_at AS deletedAt
     FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.id = ? LIMIT 1`,
  ).bind(messageId).first<MessageRow>();
}

async function hasBlockedParticipant(conversationId: string, userId: string): Promise<boolean> {
  return Boolean(await getD1Database().prepare(
    `SELECT 1 FROM conversation_members member JOIN blocked_users blocked ON
      ((blocked.blocker_user_id = ? AND blocked.blocked_user_id = member.user_id)
       OR (blocked.blocker_user_id = member.user_id AND blocked.blocked_user_id = ?))
     WHERE member.conversation_id = ? AND member.user_id != ? AND member.left_at IS NULL LIMIT 1`,
  ).bind(userId, userId, conversationId, userId).first());
}

async function isBlockedEitherWay(firstUserId: string, secondUserId: string): Promise<boolean> {
  return Boolean(await getD1Database().prepare(
    `SELECT id FROM blocked_users WHERE
      (blocker_user_id = ? AND blocked_user_id = ?) OR (blocker_user_id = ? AND blocked_user_id = ?) LIMIT 1`,
  ).bind(firstUserId, secondUserId, secondUserId, firstUserId).first());
}

function mapConversationSummary(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    type: row.conversationType as ConversationType,
    subject: row.subject ?? "Conversation",
    contextType: row.contextType as ChannelContextType | null,
    contextId: row.contextId,
    memberCount: Number(row.memberCount),
    joined: Number(row.joined) === 1,
    muted: Number(row.muted) === 1,
    role: row.role as ConversationSummary["role"],
    otherParticipantUserId: row.otherParticipantUserId,
    canLeave: row.conversationType !== "DIRECT",
    canBlock: row.conversationType === "DIRECT" && Boolean(row.otherParticipantUserId),
    unreadCount: Number(row.unreadCount),
    lastMessage: row.lastMessageId && row.lastMessageCreatedAt ? {
      id: row.lastMessageId,
      body: row.lastMessageBody ?? "",
      senderDisplayName: row.lastMessageSender ?? "Player",
      createdAt: row.lastMessageCreatedAt,
      moderationStatus: (row.lastMessageModerationStatus ?? "PUBLISHED") as MessageModerationStatus,
    } : null,
    updatedAt: row.updatedAt,
  };
}

function mapMessage(row: MessageRow, viewer: AuthenticatedUser): CommunityMessage {
  const own = row.senderUserId === viewer.id;
  const moderationStatus = row.deletedAt ? "DELETED" : row.moderationStatus as MessageModerationStatus;
  let body = row.body;
  let moderationReason: string | null = null;
  if (moderationStatus === "QUARANTINED" && !own && !viewer.roles.includes("PLATFORM_ADMIN")) body = "Message held for safety review.";
  if (moderationStatus === "REMOVED") body = "Message removed by a moderator.";
  if (moderationStatus === "DELETED") body = "Message deleted.";
  if (own || viewer.roles.includes("PLATFORM_ADMIN")) moderationReason = row.moderationReason;
  return {
    id: row.id, conversationId: row.conversationId,
    sender: { id: row.senderUserId, displayName: row.senderDisplayName },
    body, moderationStatus, moderationReason, replyToMessageId: row.replyToMessageId,
    createdAt: row.createdAt, editedAt: row.editedAt, own,
  };
}

function privacyValue(value: string | null | undefined): "NO_ONE" | "CONNECTIONS" | "EVERYONE" {
  return value === "NO_ONE" || value === "EVERYONE" ? value : "CONNECTIONS";
}

function memberInsert(conversationId: string, userId: string, role: "OWNER" | "MEMBER", now: string) {
  return getD1Database().prepare(
    `INSERT INTO conversation_members
      (id, conversation_id, user_id, role, joined_at, notifications_muted)
     VALUES (?, ?, ?, ?, ?, 0)`,
  ).bind(crypto.randomUUID(), conversationId, userId, role, now);
}

function auditStatement(actorUserId: string, action: string, resourceType: string, resourceId: string, reason: string | null, now: string) {
  return getD1Database().prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), actorUserId, action, resourceType, resourceId, reason, now);
}

function requireAdmin(user: AuthenticatedUser) {
  if (!user.roles.includes("PLATFORM_ADMIN") || user.identityLinkRequired) {
    throw new CommunityError("FORBIDDEN", "Platform administrator access is required.", 403);
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return btoa(JSON.stringify({ createdAt, id })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
  if (!cursor || cursor.length > 500) return null;
  try {
    const padded = cursor.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const value = JSON.parse(atob(padded)) as { createdAt?: unknown; id?: unknown };
    if (typeof value.createdAt !== "string" || typeof value.id !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return null;
    return { createdAt: value.createdAt, id: value.id };
  } catch {
    return null;
  }
}
