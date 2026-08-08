import { getD1Database, getPrivateMediaBucket } from "@/db/runtime";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { HoleHighlightContext } from "./validation";
import { EventAccessError, resolveEventHighlightContext } from "@/modules/events/event-repository";

export type HoleHighlight = {
  id: string;
  courseId: string;
  eventId: string;
  holeNumber: number;
  uploaderDisplayName: string;
  caption: string;
  transcript: string;
  durationSeconds: number;
  sanitizationStatus: "QUARANTINED" | "PROCESSING" | "CLEAN" | "REJECTED";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  ownedByViewer: boolean;
};

export class HoleHighlightError extends Error {
  constructor(message: string) { super(message); this.name = "HoleHighlightError"; }
}

export async function saveHoleHighlight(user: AuthenticatedUser, file: File, context: HoleHighlightContext): Promise<HoleHighlight> {
  const database = getD1Database();
  let association;
  try {
    association = await resolveEventHighlightContext({ ...context, user });
  } catch (error) {
    if (error instanceof EventAccessError) throw new HoleHighlightError("The event, course, hole, or participant registration could not be verified.");
    throw error;
  }
  const uploaderUserId = await ensurePersistedUserId(user);
  const idempotencyKey = `hole-highlight:${uploaderUserId}:${context.idempotencyKey}`;
  const prior = await database.prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_display_name AS uploaderDisplayName, caption, transcript, duration_ms AS durationMs, moderation_status AS moderationStatus,
      sanitization_status AS sanitizationStatus,
      created_at AS createdAt FROM hole_highlight_videos WHERE idempotency_key = ? AND deleted_at IS NULL`)
    .bind(idempotencyKey).first<Record<string, unknown>>();
  if (prior) return mapHighlight(prior, uploaderUserId, uploaderUserId);

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertVideoSignature(bytes, file.type);
  const durationSeconds = probeMp4Duration(bytes);
  if (!(durationSeconds > 0 && durationSeconds <= 60)) throw new HoleHighlightError("The server could not verify a duration of 60 seconds or less.");
  const id = crypto.randomUUID();
  const storageKey = `hole-highlights/quarantine/${safeSegment(uploaderUserId)}/${id}.${extensionFor(file.type)}`;
  const now = new Date().toISOString();
  await getPrivateMediaBucket().put(storageKey, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { ownerId: uploaderUserId, highlightId: id, moderationStatus: "PENDING" },
  });
  try {
    await database.batch([
      database.prepare(`INSERT INTO hole_highlight_videos
        (id, course_id, event_id, hole_number, uploader_user_id, uploader_display_name, storage_key, mime_type,
         byte_size, duration_ms, caption, transcript, moderation_status, rights_confirmed, participant_consent_confirmed,
         layout_id, participant_id, sanitization_status, duration_source,
         minor_present, guardian_consent_confirmed, idempotency_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, 1, ?, ?, 'QUARANTINED', 'SERVER_PROBED', ?, ?, ?, ?, ?)`)
        .bind(id, context.courseId, context.eventId, context.holeNumber, uploaderUserId, user.displayName, storageKey, file.type,
          file.size, Math.round(durationSeconds * 1000), context.caption, context.transcript, association.layoutId, association.participantId,
          context.containsMinor ? 1 : 0,
          context.guardianConsentConfirmed ? 1 : 0, idempotencyKey, now, now),
      database.prepare(`INSERT INTO audit_logs
        (id, actor_user_id, action, resource_type, resource_id, reason, metadata_json, created_at)
        VALUES (?, ?, 'HOLE_HIGHLIGHT_SUBMITTED', 'HOLE_HIGHLIGHT', ?, 'Submitted for moderation', ?, ?)`)
        .bind(crypto.randomUUID(), uploaderUserId, id, JSON.stringify({ courseId: context.courseId, eventId: context.eventId, holeNumber: context.holeNumber }), now),
    ]);
  } catch (error) {
    await getPrivateMediaBucket().delete(storageKey).catch(() => undefined);
    throw error;
  }
  return {
    id, courseId: context.courseId, eventId: context.eventId, holeNumber: context.holeNumber,
    uploaderDisplayName: user.displayName, caption: context.caption, transcript: context.transcript, durationSeconds,
    sanitizationStatus: "QUARANTINED", moderationStatus: "PENDING", createdAt: now, ownedByViewer: true,
  };
}

export async function listHoleHighlights(courseId: string, eventId: string, viewer: AuthenticatedUser | null): Promise<HoleHighlight[]> {
  const viewerId = viewer ? await ensurePersistedUserId(viewer).catch(() => "") : "";
  const result = await getD1Database().prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_user_id AS uploaderUserId, uploader_display_name AS uploaderDisplayName, caption, transcript, duration_ms AS durationMs,
      moderation_status AS moderationStatus, sanitization_status AS sanitizationStatus, created_at AS createdAt
    FROM hole_highlight_videos
    WHERE course_id = ? AND event_id = ? AND deleted_at IS NULL
      AND (moderation_status = 'APPROVED' OR uploader_user_id = ?)
    ORDER BY hole_number, created_at DESC LIMIT 100`)
    .bind(courseId, eventId, viewerId).all<Record<string, unknown>>();
  return result.results.map((row) => mapHighlight(row, viewerId, String(row.uploaderUserId ?? "")));
}

export async function getHighlightMediaAccess(id: string, viewer: AuthenticatedUser | null) {
  const row = await getD1Database().prepare(`SELECT sanitized_storage_key AS storageKey, mime_type AS mimeType,
      moderation_status AS moderationStatus, sanitization_status AS sanitizationStatus, uploader_user_id AS uploaderUserId
    FROM hole_highlight_videos WHERE id = ? AND deleted_at IS NULL`).bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  const viewerId = viewer ? await ensurePersistedUserId(viewer).catch(() => "") : "";
  const mayView = row.sanitizationStatus === "CLEAN" && Boolean(row.storageKey)
    && (row.moderationStatus === "APPROVED" || viewerId === row.uploaderUserId || viewer?.roles.includes("PLATFORM_ADMIN"));
  if (!mayView) return null;
  const object = await getPrivateMediaBucket().get(String(row.storageKey));
  return object ? { object, mimeType: String(row.mimeType) } : null;
}

export async function deleteHoleHighlight(id: string, user: AuthenticatedUser): Promise<boolean> {
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const row = await database.prepare(`SELECT storage_key AS storageKey, sanitized_storage_key AS sanitizedStorageKey FROM hole_highlight_videos
    WHERE id = ? AND uploader_user_id = ? AND deleted_at IS NULL`).bind(id, userId).first<{ storageKey: string; sanitizedStorageKey: string | null }>();
  if (!row) return false;
  await getPrivateMediaBucket().delete([row.storageKey, row.sanitizedStorageKey].filter((key): key is string => Boolean(key)));
  const now = new Date().toISOString();
  await database.batch([
    database.prepare("UPDATE hole_highlight_videos SET deleted_at = ?, updated_at = ? WHERE id = ? AND uploader_user_id = ?").bind(now, now, id, userId),
    database.prepare(`INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
      VALUES (?, ?, 'HOLE_HIGHLIGHT_DELETED', 'HOLE_HIGHLIGHT', ?, 'Uploader deleted video', ?)`)
      .bind(crypto.randomUUID(), userId, id, now),
  ]);
  return true;
}

export async function listPendingHighlights(): Promise<HoleHighlight[]> {
  const result = await getD1Database().prepare(`SELECT id, course_id AS courseId, event_id AS eventId, hole_number AS holeNumber,
      uploader_user_id AS uploaderUserId, uploader_display_name AS uploaderDisplayName, caption, transcript, duration_ms AS durationMs,
      moderation_status AS moderationStatus, sanitization_status AS sanitizationStatus, created_at AS createdAt
    FROM hole_highlight_videos WHERE moderation_status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at LIMIT 100`)
    .all<Record<string, unknown>>();
  return result.results.map((row) => mapHighlight(row, "", String(row.uploaderUserId ?? "")));
}

export async function reviewHoleHighlight(id: string, reviewer: AuthenticatedUser, status: "APPROVED" | "REJECTED", reason: string): Promise<boolean> {
  const database = getD1Database();
  const existing = await database.prepare("SELECT id FROM hole_highlight_videos WHERE id = ? AND moderation_status = 'PENDING' AND sanitization_status = 'CLEAN' AND sanitized_storage_key IS NOT NULL AND deleted_at IS NULL")
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
    uploaderDisplayName: String(row.uploaderDisplayName), caption: String(row.caption ?? ""), transcript: String(row.transcript ?? ""),
    durationSeconds: Math.max(1, Math.round(Number(row.durationMs) / 1000)),
    moderationStatus: String(row.moderationStatus) as HoleHighlight["moderationStatus"],
    sanitizationStatus: String(row.sanitizationStatus ?? "QUARANTINED") as HoleHighlight["sanitizationStatus"],
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

function probeMp4Duration(bytes: Uint8Array): number {
  for (let offset = 4; offset + 32 < bytes.length; offset += 1) {
    if (bytes[offset] !== 0x6d || bytes[offset + 1] !== 0x76 || bytes[offset + 2] !== 0x68 || bytes[offset + 3] !== 0x64) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = bytes[offset + 4];
    const timescaleOffset = version === 1 ? offset + 24 : offset + 16;
    const durationOffset = version === 1 ? offset + 28 : offset + 20;
    if (durationOffset + (version === 1 ? 8 : 4) > bytes.length) return 0;
    const timescale = view.getUint32(timescaleOffset);
    const duration = version === 1
      ? Number(view.getBigUint64(durationOffset))
      : view.getUint32(durationOffset);
    return timescale > 0 ? duration / timescale : 0;
  }
  return 0;
}

export async function completeHighlightSanitization(input: { id: string; status: "CLEAN" | "REJECTED"; sanitizedStorageKey: string | null; reason: string }) {
  const database = getD1Database();
  const existing = await database.prepare("SELECT storage_key AS storageKey FROM hole_highlight_videos WHERE id = ? AND deleted_at IS NULL").bind(input.id).first<{ storageKey: string }>();
  if (!existing) return false;
  if (input.status === "CLEAN") {
    if (!input.sanitizedStorageKey?.startsWith(`hole-highlights/sanitized/${input.id}/`)) throw new HoleHighlightError("The sanitized object key is outside the approved prefix.");
    const object = await getPrivateMediaBucket().head(input.sanitizedStorageKey);
    if (!object) throw new HoleHighlightError("The sanitized object does not exist.");
    if (!object.httpMetadata?.contentType?.startsWith("video/")) throw new HoleHighlightError("The sanitized object is not a video.");
  }
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(`UPDATE hole_highlight_videos SET sanitization_status = ?, sanitized_storage_key = ?,
      sanitization_reason = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`).bind(input.status, input.status === "CLEAN" ? input.sanitizedStorageKey : null, input.reason, now, input.id),
    database.prepare(`INSERT INTO audit_logs (id, action, resource_type, resource_id, reason, metadata_json, created_at)
      VALUES (?, 'HOLE_HIGHLIGHT_SANITIZATION_COMPLETED', 'HOLE_HIGHLIGHT', ?, ?, ?, ?)`).bind(crypto.randomUUID(), input.id, input.reason, JSON.stringify({ status: input.status }), now),
  ]);
  if (input.status === "CLEAN") await getPrivateMediaBucket().delete(existing.storageKey);
  return true;
}
