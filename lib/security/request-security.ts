import { getD1Database } from "@/db/runtime";

let rateLimitSchemaInitialization: Promise<void> | null = null;
export { isSameOriginMutation, requestClientKey } from "./request-origin";

export async function checkRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await ensureRateLimitSchema();
  const database = getD1Database();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + windowSeconds;
  const key = await hashRateLimitKey(`${scope}:${subject.toLowerCase()}`);

  await database
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count, expires_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.expires_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.expires_at <= ? THEN ? ELSE rate_limits.window_start END,
         expires_at = CASE WHEN rate_limits.expires_at <= ? THEN ? ELSE rate_limits.expires_at END`,
    )
    .bind(key, now, expiresAt, now, now, now, now, expiresAt)
    .run();

  const record = await database
    .prepare("SELECT count, expires_at AS expiresAt FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number; expiresAt: number }>();
  if (!record) return { allowed: false, retryAfterSeconds: windowSeconds };
  return {
    allowed: record.count <= limit,
    retryAfterSeconds: Math.max(1, record.expiresAt - now),
  };
}

async function ensureRateLimitSchema(): Promise<void> {
  if (!rateLimitSchemaInitialization) {
    const database = getD1Database();
    rateLimitSchemaInitialization = database
      .prepare(
        `CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          window_start INTEGER NOT NULL,
          count INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        )`,
      )
      .run()
      .then(() => undefined)
      .catch((error: unknown) => {
        rateLimitSchemaInitialization = null;
        throw error;
      });
  }
  await rateLimitSchemaInitialization;
}

async function hashRateLimitKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
