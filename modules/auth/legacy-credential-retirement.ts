/** Incremental repair of pre-link credentials; login guards do not depend on this sweep. */
export async function retireLinkedCredentials(database: D1Database, limit = 100): Promise<number> {
  const result = await database.prepare(`SELECT id FROM users u WHERE auth_provider_subject GLOB 'supabase:*'
    AND (password_hash IS NOT NULL OR password_salt IS NOT NULL OR password_iterations IS NOT NULL
      OR EXISTS(SELECT 1 FROM auth_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL))
    ORDER BY id LIMIT ?`).bind(Math.max(1,Math.min(limit,500))).all<{id:string}>();
  const now = new Date().toISOString();
  for (const {id} of result.results) await database.batch([
    database.prepare(`INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,created_at)
      SELECT ?,?,'LEGACY_CREDENTIALS_RETIRED','user',?,? WHERE EXISTS(
        SELECT 1 FROM users u WHERE id=? AND auth_provider_subject GLOB 'supabase:*'
        AND (password_hash IS NOT NULL OR password_salt IS NOT NULL OR password_iterations IS NOT NULL
          OR EXISTS(SELECT 1 FROM auth_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL)))`).bind(crypto.randomUUID(),id,id,now,id),
    database.prepare("UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM users WHERE id=? AND auth_provider_subject GLOB 'supabase:*')").bind(now,id,id),
    database.prepare("UPDATE users SET password_hash=NULL,password_salt=NULL,password_iterations=NULL,must_change_password=0,updated_at=?,version=version+1 WHERE id=? AND auth_provider_subject GLOB 'supabase:*' AND (password_hash IS NOT NULL OR password_salt IS NOT NULL OR password_iterations IS NOT NULL)").bind(now,id),
  ]);
  return result.results.length;
}
