import { getD1Database, getPrivateMediaBucket } from "@/db/runtime";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { coachingObservation, type ThrowType } from "./coaching-knowledge";
import type { CoachingContext } from "./coaching-validation";

export type CoachingUpload = {
  id: string; fileName: string; mediaType: string; byteSize: number; status: string;
  throwType: ThrowType; cameraAngle: string; result: string; expiresAt: string; createdAt: string;
  guidance: ReturnType<typeof coachingObservation>;
};

export class CoachingMediaError extends Error { constructor(message: string) { super(message); this.name = "CoachingMediaError"; } }

export async function saveCoachingUpload(user: AuthenticatedUser, file: File, context: CoachingContext): Promise<CoachingUpload> {
  const prior = await findCoachingUploadByIdempotency(user, context.idempotencyKey);
  if (prior) return prior;
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertFileSignature(bytes, file.type);
  const id = crypto.randomUUID();
  const extension = extensionFor(file.type);
  const storageKey = `coaching/${safeSegment(user.id)}/${id}.${extension}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + context.retainDays * 86_400_000).toISOString();
  const jobId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
  const guidance = coachingObservation(context.throwType, context.result);
  const database = getD1Database();

  await getPrivateMediaBucket().put(storageKey, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { ownerId: user.id, uploadId: id, expiresAt },
  });
  try {
    await database.batch([
      database.prepare(`INSERT INTO consent_records (id, user_id, consent_type, policy_version, granted, recorded_at)
        VALUES (?, ?, 'MEDIA_ANALYSIS', '2026-08-06', 1, ?)` ).bind(crypto.randomUUID(), user.id, now.toISOString()),
      database.prepare(`INSERT INTO media_uploads
        (id, user_id, storage_key, media_type, mime_type, byte_size, duration_ms, status, metadata_stripped, expires_at, created_at)
        VALUES (?, ?, ?, 'VIDEO', ?, ?, ?, 'QUARANTINED', 0, ?, ?)`)
        .bind(id, user.id, storageKey, file.type, file.size, Math.round(context.durationSeconds * 1000), expiresAt, now.toISOString()),
      database.prepare(`INSERT INTO media_analysis_jobs
        (id, media_upload_id, user_id, analysis_type, input_context_json, status, idempotency_key, attempts, created_at, completed_at)
        VALUES (?, ?, ?, 'THROW_COACHING', ?, 'GUIDANCE_READY', ?, 1, ?, ?)`)
        .bind(jobId, id, user.id, JSON.stringify({ ...context, originalFileName: sanitizeName(file.name) }), `coach:${user.id}:${context.idempotencyKey}`, now.toISOString(), now.toISOString()),
      database.prepare(`INSERT INTO media_analysis_results
        (id, media_analysis_job_id, output_json, confidence, limitations_json, model_version_id, prompt_version_id, created_at)
        VALUES (?, ?, ?, 'RULE_BASED', ?, NULL, 'evidence-guide-v1', ?)`)
        .bind(resultId, jobId, JSON.stringify(guidance), JSON.stringify([guidance.limitation, "No computer-vision model analyzed this recording."]), now.toISOString()),
    ]);
  } catch (error) {
    await getPrivateMediaBucket().delete(storageKey).catch(() => undefined);
    throw error;
  }
  return { id, fileName: sanitizeName(file.name), mediaType: file.type, byteSize: file.size, status: "QUARANTINED", throwType: context.throwType, cameraAngle: context.cameraAngle, result: context.result, expiresAt, createdAt: now.toISOString(), guidance };
}

async function findCoachingUploadByIdempotency(user: AuthenticatedUser, key: string): Promise<CoachingUpload | null> {
  const row = await getD1Database().prepare(`SELECT u.id, u.mime_type AS mediaType, u.byte_size AS byteSize, u.status,
      u.expires_at AS expiresAt, u.created_at AS createdAt, j.input_context_json AS contextJson, r.output_json AS outputJson
    FROM media_analysis_jobs j JOIN media_uploads u ON u.id = j.media_upload_id
    LEFT JOIN media_analysis_results r ON r.media_analysis_job_id = j.id
    WHERE j.user_id = ? AND j.idempotency_key = ? AND u.deleted_at IS NULL LIMIT 1`).bind(user.id, `coach:${user.id}:${key}`).first<Record<string, unknown>>();
  return row ? mapUpload(row) : null;
}

export async function listCoachingUploads(user: AuthenticatedUser): Promise<CoachingUpload[]> {
  await purgeExpiredCoachingUploads(user);
  const result = await getD1Database().prepare(`SELECT u.id, u.mime_type AS mediaType, u.byte_size AS byteSize, u.status,
      u.expires_at AS expiresAt, u.created_at AS createdAt, j.input_context_json AS contextJson, r.output_json AS outputJson
    FROM media_uploads u JOIN media_analysis_jobs j ON j.media_upload_id = u.id
    LEFT JOIN media_analysis_results r ON r.media_analysis_job_id = j.id
    WHERE u.user_id = ? AND u.deleted_at IS NULL AND j.analysis_type = 'THROW_COACHING'
    ORDER BY u.created_at DESC LIMIT 30`).bind(user.id).all<Record<string, unknown>>();
  return result.results.map(mapUpload);
}

function mapUpload(row: Record<string, unknown>): CoachingUpload {
  const context = JSON.parse(String(row.contextJson)) as CoachingContext & { originalFileName?: string };
  return { id: String(row.id), fileName: context.originalFileName ?? "Private coaching video", mediaType: String(row.mediaType), byteSize: Number(row.byteSize), status: String(row.status), throwType: context.throwType, cameraAngle: context.cameraAngle, result: context.result, expiresAt: String(row.expiresAt), createdAt: String(row.createdAt), guidance: row.outputJson ? JSON.parse(String(row.outputJson)) : coachingObservation(context.throwType, context.result) };
}

async function purgeExpiredCoachingUploads(user: AuthenticatedUser): Promise<void> {
  const database = getD1Database();
  const now = new Date().toISOString();
  const expired = await database.prepare("SELECT id, storage_key AS storageKey FROM media_uploads WHERE user_id = ? AND status != 'DELETED' AND deleted_at IS NULL AND expires_at <= ? LIMIT 30").bind(user.id, now).all<{ id: string; storageKey: string }>();
  for (const item of expired.results) {
    await getPrivateMediaBucket().delete(item.storageKey).catch(() => undefined);
    await database.batch([
      database.prepare("UPDATE media_uploads SET status = 'DELETED', deleted_at = ? WHERE id = ? AND user_id = ?").bind(now, item.id, user.id),
      database.prepare("UPDATE media_analysis_results SET deleted_at = ? WHERE media_analysis_job_id IN (SELECT id FROM media_analysis_jobs WHERE media_upload_id = ?)").bind(now, item.id),
    ]);
  }
}

export async function purgeExpiredCoachingMedia(limit = 100): Promise<{ deleted: number; failed: number }> {
  const database = getD1Database(); const now = new Date().toISOString();
  const expired = await database.prepare("SELECT id, user_id AS userId, storage_key AS storageKey FROM media_uploads WHERE status != 'DELETED' AND deleted_at IS NULL AND expires_at <= ? ORDER BY expires_at LIMIT ?").bind(now, Math.max(1, Math.min(limit, 500))).all<{ id: string; userId: string; storageKey: string }>();
  let deleted = 0, failed = 0;
  for (const item of expired.results) { try { await getPrivateMediaBucket().delete(item.storageKey); await database.batch([database.prepare("UPDATE media_uploads SET status = 'DELETED', deleted_at = ? WHERE id = ? AND user_id = ?").bind(now, item.id, item.userId), database.prepare("UPDATE media_analysis_results SET deleted_at = ? WHERE media_analysis_job_id IN (SELECT id FROM media_analysis_jobs WHERE media_upload_id = ?)").bind(now, item.id)]); deleted++; } catch { failed++; } }
  return { deleted, failed };
}

export async function deleteCoachingUpload(user: AuthenticatedUser, id: string): Promise<boolean> {
  const database = getD1Database();
  const row = await database.prepare("SELECT storage_key AS storageKey FROM media_uploads WHERE id = ? AND user_id = ? AND deleted_at IS NULL").bind(id, user.id).first<{ storageKey: string }>();
  if (!row) return false;
  const now = new Date().toISOString();
  await getPrivateMediaBucket().delete(row.storageKey);
  await database.batch([
    database.prepare("UPDATE media_uploads SET status = 'DELETED', deleted_at = ? WHERE id = ? AND user_id = ?").bind(now, id, user.id),
    database.prepare("UPDATE media_analysis_results SET deleted_at = ? WHERE media_analysis_job_id IN (SELECT id FROM media_analysis_jobs WHERE media_upload_id = ?)").bind(now, id),
  ]);
  return true;
}

function assertFileSignature(bytes: Uint8Array, mime: string) {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length > 7 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, i) => bytes[i] === value);
  const ftyp = bytes.length > 11 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const webm = bytes.length > 3 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (!((mime === "image/jpeg" && jpeg) || (mime === "image/png" && png) || ((mime === "video/mp4" || mime === "video/quicktime") && ftyp) || (mime === "video/webm" && webm))) throw new CoachingMediaError("The file contents do not match the declared media type.");
}
function extensionFor(mime: string) { return mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : mime === "video/mp4" ? "mp4" : mime === "image/png" ? "png" : "jpg"; }
function safeSegment(value: string) { return value.replaceAll(/[^a-zA-Z0-9:_-]/gu, "_"); }
function sanitizeName(value: string) { return value.replaceAll(/[^a-zA-Z0-9._ -]/gu, "_").slice(0, 120); }
