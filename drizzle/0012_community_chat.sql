-- FlightForge adult community chat, privacy controls, and moderation workflow.

CREATE TABLE IF NOT EXISTS hosted_signup_intents (
  nonce TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  auth_user_id TEXT,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS hosted_signup_intents_email_expiry_idx
  ON hosted_signup_intents(email, expires_at);

CREATE TABLE IF NOT EXISTS password_recovery_intents (
  token_hash TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS password_recovery_intents_user_expiry_idx
  ON password_recovery_intents(auth_user_id, expires_at);

CREATE TABLE IF NOT EXISTS community_user_status (
  user_id TEXT PRIMARY KEY NOT NULL,
  adult_attested_at TEXT,
  guidelines_version TEXT,
  guidelines_accepted_at TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  muted_until TEXT,
  suspended_until TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_user_status_state_idx
  ON community_user_status(status, suspended_until);

ALTER TABLE player_connections ADD COLUMN pair_key TEXT;
UPDATE player_connections
SET pair_key = CASE
  WHEN requester_user_id < addressee_user_id THEN requester_user_id || ':' || addressee_user_id
  ELSE addressee_user_id || ':' || requester_user_id
END
WHERE pair_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS player_connections_pair_key_unique
  ON player_connections(pair_key);
CREATE INDEX IF NOT EXISTS player_connections_requester_status_idx
  ON player_connections(requester_user_id, status);
CREATE INDEX IF NOT EXISTS player_connections_addressee_status_idx
  ON player_connections(addressee_user_id, status);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx
  ON blocked_users(blocked_user_id, blocker_user_id);

ALTER TABLE conversations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE conversations ADD COLUMN context_type TEXT;
ALTER TABLE conversations ADD COLUMN context_id TEXT;
ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE conversations ADD COLUMN last_message_at TEXT;
ALTER TABLE conversations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_public_context_unique
  ON conversations(context_type, context_id)
  WHERE conversation_type = 'PUBLIC_CHANNEL' AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS conversations_public_updated_idx
  ON conversations(conversation_type, status, updated_at);

ALTER TABLE conversation_members ADD COLUMN role TEXT NOT NULL DEFAULT 'MEMBER';
ALTER TABLE conversation_members ADD COLUMN last_read_message_id TEXT;
ALTER TABLE conversation_members ADD COLUMN notifications_muted INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS conversation_members_user_active_idx
  ON conversation_members(user_id, left_at);

ALTER TABLE messages ADD COLUMN client_message_id TEXT;
ALTER TABLE messages ADD COLUMN moderation_reason TEXT;
ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT;
ALTER TABLE messages ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
UPDATE messages SET moderation_status = 'PUBLISHED' WHERE moderation_status = 'CLEAR';
CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_client_unique
  ON messages(sender_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_conversation_cursor_idx
  ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS messages_moderation_idx
  ON messages(moderation_status, created_at);

ALTER TABLE reports ADD COLUMN conversation_id TEXT;
ALTER TABLE reports ADD COLUMN resolved_by TEXT;
ALTER TABLE reports ADD COLUMN resolved_at TEXT;
ALTER TABLE reports ADD COLUMN resolution_reason TEXT;
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS moderation_actions_target_created_idx
  ON moderation_actions(target_type, target_id, created_at);

-- The offline round synchronizer uses this nullable acknowledgement marker.
ALTER TABLE rounds ADD COLUMN last_mutation_id TEXT;

INSERT OR IGNORE INTO feature_flags (key, description, enabled, updated_at)
VALUES ('community_chat', 'Adult community channels and private player messaging', 1, '2026-08-20T00:00:00.000Z');

INSERT OR IGNORE INTO conversations
  (id, conversation_type, subject, visibility, context_type, context_id, status, created_by, created_at, updated_at, version)
VALUES
  ('96cc0000-0000-4000-8000-000000000001', 'PUBLIC_CHANNEL', 'New England Clubhouse', 'PUBLIC', 'REGION', 'new-england', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000002', 'PUBLIC_CHANNEL', 'Maine Clubhouse', 'PUBLIC', 'STATE', 'ME', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000003', 'PUBLIC_CHANNEL', 'New Hampshire Clubhouse', 'PUBLIC', 'STATE', 'NH', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000004', 'PUBLIC_CHANNEL', 'Vermont Clubhouse', 'PUBLIC', 'STATE', 'VT', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000005', 'PUBLIC_CHANNEL', 'Massachusetts Clubhouse', 'PUBLIC', 'STATE', 'MA', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000006', 'PUBLIC_CHANNEL', 'Connecticut Clubhouse', 'PUBLIC', 'STATE', 'CT', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1),
  ('96cc0000-0000-4000-8000-000000000007', 'PUBLIC_CHANNEL', 'Rhode Island Clubhouse', 'PUBLIC', 'STATE', 'RI', 'ACTIVE', 'SYSTEM', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 1);

PRAGMA optimize;
