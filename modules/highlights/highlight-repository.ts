import { getD1Database, getPrivateMediaBucket } from "@/db/runtime";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { HoleHighlightContext } from "./validation";

export type HoleHighlight = {
  id: string;
  courseId: string;
  eventId: string;
  holeNumber: number;
  uploaderDisplayName: string;
  caption: string;
  durationSeconds: number;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  ownedByViewer: boolean;
};

export class HoleHighlightError extends Error {
  constructor(message: string) { super(message); this.name = "HoleHighlightError"; }
}

export async function saveHoleHighlight(user: AuthenticatedUser, file: File, context: HoleHighlightContext): Promise<HoleHighlight> {
  const database = getD1Database();
  const idempotencyKey = `hole-highlight:${user.id}:${context.idempotencyKey}`;
  const prior = await database.prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_display_name AS uploaderDisplayName, caption, duration_ms AS durationMs, moderation_status AS moderationStatus,
      created_at AS createdAt FROM hole_highlight_videos WHERE idempotency_key = ? AND deleted_at IS NULL`)
    .bind(idempotencyKey).first<Record<string, unknown>>();
  if (prior) return mapHighlight(prior, user.id, user.id);

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertVideoSignature(bytes, file.type);
  const id = crypto.randomUUID();
  const storageKey = `hole-highlights/${safeSegment(user.id)}/${id}.${extensionFor(file.type)}`;
  const now = new Date().toISOString();
  await getPrivateMediaBucket().put(storageKey, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { ownerId: user.id, highlightId: id, moderationStatus: "PENDING" },
  });
  try {
    await database.batch([
      database.prepare(`INSERT INTO hole_highlight_videos
        (id, course_id, event_id, hole_number, uploader_user_id, uploader_display_name, storage_key, mime_type,
         byte_size, duration_ms, caption, moderation_status, rights_confirmed, participant_consent_confirmed,
         minor_present, guardian_consent_confirmed, idempotency_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, 1, ?, ?, ?, ?, ?)`)
        .bind(id, context.courseId, context.eventId, context.holeNumber, user.id, user.displayName, storageKey, file.type,
          file.size, Math.round(context.durationSeconds * 1000), context.caption, context.containsMinor ? 1 : 0,
          context.guardianConsentConfirmed ? 1 : 0, idempotencyKey, now, now),
      database.prepare(`INSERT INTO audit_logs
        (id, actor_user_id, action, resource_type, resource_id, reason, metadata_json, created_at)
        VALUES (?, ?, 'HOLE_HIGHLIGHT_SUBMITTED', 'HOLE_HIGHLIGHT', ?, 'Submitted for moderation', ?, ?)`)
        .bind(crypto.randomUUID(), user.id, id, JSON.stringify({ courseId: context.courseId, eventId: context.eventId, holeNumber: context.holeNumber }), now),
    ]);
  } catch (error) {
    await getPrivateMediaBucket().delete(storageKey).catch(() => undefined);
    throw error;
  }
  return {
    id, courseId: context.courseId, eventId: context.eventId, holeNumber: context.holeNumber,
    uploaderDisplayName: user.displayName, caption: context.caption, durationSeconds: context.durationSeconds,
    moderationStatus: "PENDING", createdAt: now, ownedByViewer: true,
  };
}

export async function listHoleHighlights(courseId: string, eventId: string, viewer: AuthenticatedUser | null): Promise<HoleHighlight[]> {
  const viewerId = viewer?.id ?? "";
  const result = await getD1Database().prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_user_id AS uploaderUserId, uploader_display_name AS uploaderDisplayName, caption, duration_ms AS durationMs,
      moderation_status AS moderationStatus, created_at AS createdAt
    FROM hole_highlight_videos
    WHERE course_id = ? AND event_id = ? AND deleted_at IS NULL
      AND (moderation_status = 'APPROVED' OR uploader_user_id = ?)
    ORDER BY hole_number, created_at DESC LIMIT 100`)
    .bind(courseId, eventId, viewerId).all<Record<string, unknown>>();
  return result.results.map((row) => mapHighlight(row, viewerId, String(row.uploaderUserId ?? "")));
}

export async function getHighlightMediaAccess(id: string, viewer: AuthenticatedUser | null) {
  const row = await getD1Database().prepare(`SELECT storage_key AS storageKey, mime_type AS mimeType,
      moderation_status AS moderationStatus, uploader_user_id AS uploaderUserId
    FROM hole_highlight_videos WHERE id = ? AND deleted_at IS NULL`).bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  const mayView = row.moderationStatus === "APPROVED" || viewer?.id === row.uploaderUserId || viewer?.roles.includes("PLATFORM_ADMIN");
  if (!mayView) return null;
  const object = await getPrivateMediaBucket().get(String(row.storageKey));
  return object ? { object, mimeType: String(row.mimeType) } : null;
}

export async function deleteHoleHighlight(id: string, user: AuthenticatedUser): Promise<boolean> {
  const database = getD1Database();
  const row = await database.prepare(`SELECT storage_key AS storageKey FROM hole_highlight_videos
    WHERE id = ? AND uploader_user_id = ? AND deleted_at IS NULL`).bind(id, user.id).first<{ storageKey: string }>();
  if (!row) return false;
  await getPrivateMediaBucket().delete(row.storageKey);
  const now = new Date().toISOString();
  await database.batch([
    database.prepare("UPDATE hole_highlight_videos SET deleted_at = ?, updated_at = ? WHERE id = ? AND uploader_user_id = ?").bind(now, now, id, user.id),
    database.prepare(`INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
      VALUES (?, ?, 'HOLE_HIGHLIGHT_DELETED', 'HOLE_HIGHLIGHT', ?, 'Uploader deleted video', ?)`)
      .bind(crypto.randomUUID(), user.id, id, now),
  ]);
  return true;
}

export async function listPendingHighlights(): Promise<HoleHighlight[]> {
  const result = await getD1Database().prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_user_id AS uploaderUserId, uploader_display_name AS uploaderDisplayName, caption, duration_ms AS durationMs,
      moderation_status AS moderationStatus, created_at AS createdAt
    FROM hole_highlight_videos WHERE moderation_status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at LIMIT 100`)
    .all<Record<string, unknown>>();
  return result.results.map((row) => mapHighlight(row, "", String(row.uploaderUserId ?? "")));
}

export async function reviewHoleHighlight(id: string, reviewer: AuthenticatedUser, status: "APPROVED" | "REJECTED", reason: string): Promise<boolean> {
  const database = getD1Database();
  const existing = await database.prepare("SELECT id FROM hole_highlight_videos WHERE id = ? AND moderation_status = 'PENDING' AND deleted_at IS NULL")
    .bind(id).first<{ id: string }>();
  if (!existing) return false;
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(`UPDATE hole_highlight_videos SET moderation_status = ?, moderation_reason = ?, moderated_by = ?, moderated_at = ?, updated_at = ? WHERE id = ?`)
      .bind(status, reason, reviewer.id, now, now, id),
    database.prepare(`INSERT INTO audit_logs
      (id, actor_user_id, action, resource_type, resource_id, reason, metadata_json, created_at)
      VALUES (?, ?, ?, 'HOLE_HIGHLIGHT', ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), reviewer.id, `HOLE_HIGHLIGHT_${status}`, id, reason, JSON.stringify({ status }), now),
  ]);
  return true;
}

function mapHighlight(row: Record<string, unknown>, viewerId: string, uploaderId: string): HoleHighlight {
  return {
    id: String(row.id), courseId: String(row.courseId), eventId: String(row.eventId), holeNumber: Number(row.holeNumber),
    uploaderDisplayName: String(row.uploaderDisplayName), caption: String(row.caption ?? ""),
    durationSeconds: Math.max(1, Math.round(Number(row.durationMs) / 1000)),
    moderationStatus: String(row.moderationStatus) as HoleHighlight["moderationStatus"],
    createdAt: String(row.createdAt), ownedByViewer: Boolean(viewerId && viewerId === uploaderId),
  };
}

function assertVideoSignature(bytes: Uint8Array, mime: string) {
  const ftyp = bytes.length > 11 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const webm = bytes.length > 3 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (!(((mime === "video/mp4" || mime === "video/quicktime") && ftyp) || (mime === "video/webm" && webm))) {
    throw new HoleHighlightError("The file contents do not match a supported MP4, MOV, or WebM video.");
  }
}
function extensionFor(mime: string) { return mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4"; }
function safeSegment(value: string) { return value.replaceAll(/[^a-zA-Z0-9:_-]/gu, "_"); }
