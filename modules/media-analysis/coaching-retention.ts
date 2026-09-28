import { logError } from "../../lib/observability/logger";

type Candidate = { id: string; userId: string; storageKey: string };

export async function purgeCoachingObject(db: D1Database, bucket: R2Bucket, item: Candidate): Promise<void> {
  const confirmed = await db.prepare("SELECT id FROM audit_logs WHERE action='COACHING_MEDIA_PURGED' AND resource_type='media_upload' AND resource_id=? LIMIT 1").bind(item.id).first();
  if (confirmed) return;
  // Only confirmed storage deletion may tombstone the record. If DB commit
  // fails after deletion, another idempotent R2 delete safely completes it.
  await bucket.delete(item.storageKey);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE media_uploads SET status='DELETED',deleted_at=COALESCE(deleted_at,?) WHERE id=? AND user_id=? AND storage_key=?").bind(now,item.id,item.userId,item.storageKey),
    db.prepare("UPDATE media_analysis_results SET deleted_at=COALESCE(deleted_at,?) WHERE media_analysis_job_id IN (SELECT id FROM media_analysis_jobs WHERE media_upload_id=? AND user_id=?)").bind(now,item.id,item.userId),
    db.prepare(`INSERT INTO audit_logs(id,action,resource_type,resource_id,reason,created_at)
      SELECT ?,'COACHING_MEDIA_PURGED','media_upload',?,'Private object deletion confirmed.',?
      WHERE NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='COACHING_MEDIA_PURGED' AND resource_type='media_upload' AND resource_id=?)`).bind(crypto.randomUUID(),item.id,now,item.id),
  ]);
}

/** Used by both history access and the scheduled worker, including old false tombstones. */
export async function purgeCoachingCandidates(db: D1Database, bucket: R2Bucket, limit = 100, userId?: string) {
  const rows = await db.prepare(`SELECT u.id,u.user_id AS userId,u.storage_key AS storageKey FROM media_uploads u
    WHERE EXISTS(SELECT 1 FROM media_analysis_jobs j WHERE j.media_upload_id=u.id AND j.analysis_type='THROW_COACHING')
    AND (u.expires_at<=? OR u.deleted_at IS NOT NULL OR u.status='DELETED')
    AND NOT EXISTS(SELECT 1 FROM audit_logs a WHERE a.action='COACHING_MEDIA_PURGED' AND a.resource_type='media_upload' AND a.resource_id=u.id)
    ${userId ? "AND u.user_id=?" : ""} ORDER BY COALESCE(u.expires_at,u.deleted_at),u.id LIMIT ?`)
    .bind(new Date().toISOString(),...(userId ? [userId] : []),Math.max(1,Math.min(limit,500))).all<Candidate>();
  let deleted = 0, failed = 0;
  for (const item of rows.results) {
    try { await purgeCoachingObject(db,bucket,item); deleted++; }
    catch { failed++; logError("media.retention_retry_required",new Error("Private object deletion not confirmed"),{uploadId:item.id}); }
  }
  return { deleted, failed };
}
