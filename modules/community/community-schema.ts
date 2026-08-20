import { getD1Database } from "@/db/runtime";

let initialization: Promise<void> | null = null;

/**
 * Keeps local previews and rolling deployments usable while the authoritative
 * migration is being applied. Every statement is additive and idempotent.
 */
export async function ensureCommunityRuntimeSchema(): Promise<void> {
  if (!initialization) {
    initialization = initialize().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

async function initialize() {
  const database = getD1Database();
  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS community_user_status (
      user_id TEXT PRIMARY KEY NOT NULL, adult_attested_at TEXT, guidelines_version TEXT,
      guidelines_accepted_at TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', muted_until TEXT,
      suspended_until TEXT, updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS player_connections (
      id TEXT PRIMARY KEY NOT NULL, requester_user_id TEXT NOT NULL, addressee_user_id TEXT NOT NULL,
      pair_key TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS blocked_users (
      id TEXT PRIMARY KEY NOT NULL, blocker_user_id TEXT NOT NULL, blocked_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL, conversation_type TEXT NOT NULL, subject TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE', context_type TEXT, context_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', created_by TEXT NOT NULL, last_message_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS conversation_members (
      id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER', joined_at TEXT NOT NULL, left_at TEXT,
      last_read_at TEXT, last_read_message_id TEXT, notifications_muted INTEGER NOT NULL DEFAULT 0
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, sender_user_id TEXT NOT NULL,
      body TEXT NOT NULL, client_message_id TEXT, moderation_status TEXT NOT NULL DEFAULT 'PUBLISHED',
      moderation_reason TEXT, reply_to_message_id TEXT, created_at TEXT NOT NULL,
      edited_at TEXT, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY NOT NULL, reporter_user_id TEXT NOT NULL, target_type TEXT NOT NULL,
      target_id TEXT NOT NULL, conversation_id TEXT, category TEXT NOT NULL, details TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN', resolved_by TEXT, resolved_at TEXT,
      resolution_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY NOT NULL, report_id TEXT, moderator_user_id TEXT NOT NULL,
      action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
      reason TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL
    )`),
  ]);

  await Promise.all([
    ensureColumns("player_connections", {
      pair_key: "pair_key TEXT",
    }),
    ensureColumns("conversations", {
      visibility: "visibility TEXT NOT NULL DEFAULT 'PRIVATE'",
      context_type: "context_type TEXT",
      context_id: "context_id TEXT",
      status: "status TEXT NOT NULL DEFAULT 'ACTIVE'",
      last_message_at: "last_message_at TEXT",
      version: "version INTEGER NOT NULL DEFAULT 1",
    }),
    ensureColumns("conversation_members", {
      role: "role TEXT NOT NULL DEFAULT 'MEMBER'",
      last_read_message_id: "last_read_message_id TEXT",
      notifications_muted: "notifications_muted INTEGER NOT NULL DEFAULT 0",
    }),
    ensureColumns("messages", {
      client_message_id: "client_message_id TEXT",
      moderation_reason: "moderation_reason TEXT",
      reply_to_message_id: "reply_to_message_id TEXT",
      version: "version INTEGER NOT NULL DEFAULT 1",
    }),
    ensureColumns("reports", {
      conversation_id: "conversation_id TEXT",
      resolved_by: "resolved_by TEXT",
      resolved_at: "resolved_at TEXT",
      resolution_reason: "resolution_reason TEXT",
    }),
  ]);

  await database.batch([
    database.prepare(`UPDATE player_connections SET pair_key = CASE
      WHEN requester_user_id < addressee_user_id THEN requester_user_id || ':' || addressee_user_id
      ELSE addressee_user_id || ':' || requester_user_id END WHERE pair_key IS NULL`),
    database.prepare("UPDATE messages SET moderation_status = 'PUBLISHED' WHERE moderation_status = 'CLEAR'"),
    database.prepare("CREATE INDEX IF NOT EXISTS community_user_status_state_idx ON community_user_status(status, suspended_until)"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS player_connections_pair_key_unique ON player_connections(pair_key)"),
    database.prepare("CREATE INDEX IF NOT EXISTS player_connections_requester_status_idx ON player_connections(requester_user_id, status)"),
    database.prepare("CREATE INDEX IF NOT EXISTS player_connections_addressee_status_idx ON player_connections(addressee_user_id, status)"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS blocked_users_pair_unique ON blocked_users(blocker_user_id, blocked_user_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_user_id, blocker_user_id)"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS conversations_public_context_unique ON conversations(context_type, context_id) WHERE conversation_type = 'PUBLIC_CHANNEL' AND status = 'ACTIVE'"),
    database.prepare("CREATE INDEX IF NOT EXISTS conversations_public_updated_idx ON conversations(conversation_type, status, updated_at)"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS conversation_members_unique ON conversation_members(conversation_id, user_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS conversation_members_user_active_idx ON conversation_members(user_id, left_at)"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_client_unique ON messages(sender_user_id, client_message_id) WHERE client_message_id IS NOT NULL"),
    database.prepare("CREATE INDEX IF NOT EXISTS messages_conversation_cursor_idx ON messages(conversation_id, created_at DESC, id DESC)"),
    database.prepare("CREATE INDEX IF NOT EXISTS messages_moderation_idx ON messages(moderation_status, created_at)"),
    database.prepare("CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports(status, created_at)"),
    database.prepare("CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS moderation_actions_target_created_idx ON moderation_actions(target_type, target_id, created_at)"),
    database.prepare(`INSERT OR IGNORE INTO conversations
      (id, conversation_type, subject, visibility, context_type, context_id, status, created_by, created_at, updated_at, version)
     VALUES
      ('96cc0000-0000-4000-8000-000000000001','PUBLIC_CHANNEL','New England Clubhouse','PUBLIC','REGION','new-england','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000002','PUBLIC_CHANNEL','Maine Clubhouse','PUBLIC','STATE','ME','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000003','PUBLIC_CHANNEL','New Hampshire Clubhouse','PUBLIC','STATE','NH','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000004','PUBLIC_CHANNEL','Vermont Clubhouse','PUBLIC','STATE','VT','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000005','PUBLIC_CHANNEL','Massachusetts Clubhouse','PUBLIC','STATE','MA','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000006','PUBLIC_CHANNEL','Connecticut Clubhouse','PUBLIC','STATE','CT','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1),
      ('96cc0000-0000-4000-8000-000000000007','PUBLIC_CHANNEL','Rhode Island Clubhouse','PUBLIC','STATE','RI','ACTIVE','SYSTEM','2026-08-20T00:00:00.000Z','2026-08-20T00:00:00.000Z',1)`),
  ]);
}

async function ensureColumns(table: string, additions: Record<string, string>) {
  const database = getD1Database();
  const columns = await database.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const present = new Set(columns.results.map((column) => column.name));
  const missing = Object.entries(additions)
    .filter(([name]) => !present.has(name))
    .map(([, definition]) => database.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`));
  if (missing.length) await database.batch(missing);
}
