import { getD1Database } from "@/db/runtime";
import type { AuthenticatedUser, Role } from "./types";
import type { OnboardingInput } from "./account-validation";
import {
  createPasswordRecord,
  randomToken,
  sha256Text,
  verifyPassword,
} from "./password";
import { jPhillipsTestAccount } from "./test-account";
import { legalPolicyVersions } from "@/config/public-launch";
import { rolesForConfiguredEmail } from "./configured-roles";

export const ACCOUNT_SESSION_COOKIE = "flightforge_session";
export const PASSWORD_RECOVERY_INTENT_COOKIE = "flightforge_recovery_intent";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;
const PASSWORD_RECOVERY_INTENT_SECONDS = 15 * 60;

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  mustChangePassword: number;
  passwordBootstrapVersion: number;
  status: string;
  isTestAccount: number;
  onboardingCompletedAt: string | null;
  authProviderSubject: string | null;
  emailVerifiedAt: string | null;
};

export type AccountSettings = OnboardingInput & {
  email: string;
  onboardingComplete: boolean;
  isTestAccount: boolean;
  mustChangePassword: boolean;
};

export class AccountEmailTakenError extends Error {
  constructor() {
    super("An account already exists for this email address.");
    this.name = "AccountEmailTakenError";
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("The current password is incorrect.");
    this.name = "InvalidCurrentPasswordError";
  }
}

export class PasswordChangeRequiredError extends Error {
  constructor() {
    super("Set a private password before completing profile setup.");
    this.name = "PasswordChangeRequiredError";
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Verify your email address before signing in.");
    this.name = "EmailVerificationRequiredError";
  }
}

export class ExternalIdentityLinkRequiredError extends Error {
  constructor() {
    super("Confirm your existing password before linking this Supabase identity.");
    this.name = "ExternalIdentityLinkRequiredError";
  }
}

export class RegistrationConsentRequiredError extends Error {
  constructor() {
    super("Create this Supabase account through the FlightForge sign-up form before continuing.");
    this.name = "RegistrationConsentRequiredError";
  }
}

let schemaInitialization: Promise<void> | null = null;

const accountSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL,
    password_hash TEXT, password_salt TEXT, password_iterations INTEGER,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    password_bootstrap_version INTEGER NOT NULL DEFAULT 0,
    auth_provider_subject TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE',
    is_test_account INTEGER NOT NULL DEFAULT 0, email_verified_at TEXT,
    onboarding_completed_at TEXT, last_signed_in_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_auth_provider_subject_unique ON users(auth_provider_subject)`,
  `CREATE INDEX IF NOT EXISTS users_status_idx ON users(status)`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
    revoked_at TEXT, user_agent TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_unique ON auth_sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS hosted_signup_intents (
    nonce TEXT PRIMARY KEY, email TEXT NOT NULL, terms_version TEXT NOT NULL,
    privacy_version TEXT NOT NULL, accepted_at TEXT NOT NULL, expires_at TEXT NOT NULL,
    auth_user_id TEXT, consumed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS hosted_signup_intents_email_expiry_idx
    ON hosted_signup_intents(email, expires_at)`,
  `CREATE TABLE IF NOT EXISTS password_recovery_intents (
    token_hash TEXT PRIMARY KEY, auth_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS password_recovery_intents_user_expiry_idx
    ON password_recovery_intents(auth_user_id, expires_at)`,
  `CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL, role TEXT NOT NULL, organization_id TEXT,
    created_at TEXT NOT NULL, created_by TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_roles_scope_unique ON user_roles(user_id, role, organization_id)`,
  `CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id)`,
  `CREATE TABLE IF NOT EXISTS player_profiles (
    user_id TEXT PRIMARY KEY, home_city TEXT, home_region_code TEXT, postal_code TEXT,
    experience_level TEXT, throwing_hand TEXT, controlled_distance_feet INTEGER,
    backhand_distance_feet INTEGER, forehand_distance_feet INTEGER,
    putting_confidence INTEGER, external_rating INTEGER, pdga_number TEXT,
    avatar_key TEXT, bio TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS player_preferences (
    user_id TEXT PRIMARY KEY, course_difficulty TEXT, play_style TEXT,
    desired_group_size INTEGER, social_matchmaking INTEGER NOT NULL DEFAULT 0,
    ai_recommendations INTEGER NOT NULL DEFAULT 1,
    tournament_notifications INTEGER NOT NULL DEFAULT 0,
    units TEXT NOT NULL DEFAULT 'IMPERIAL', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS player_privacy_settings (
    user_id TEXT PRIMARY KEY, profile_visibility TEXT NOT NULL DEFAULT 'PRIVATE',
    show_home_city INTEGER NOT NULL DEFAULT 0, show_round_history INTEGER NOT NULL DEFAULT 0,
    show_bag INTEGER NOT NULL DEFAULT 0, allow_messages TEXT NOT NULL DEFAULT 'CONNECTIONS',
    allow_game_invites INTEGER NOT NULL DEFAULT 1, analytics_opt_in INTEGER NOT NULL DEFAULT 0,
    ai_training_opt_in INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, consent_type TEXT NOT NULL,
    policy_version TEXT NOT NULL, granted INTEGER NOT NULL,
    recorded_at TEXT NOT NULL, revoked_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS consent_records_user_type_idx ON consent_records(user_id, consent_type)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, actor_user_id TEXT, organization_id TEXT,
    action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT,
    reason TEXT, request_id TEXT, metadata_json TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS email_verification_tokens_hash_unique
    ON email_verification_tokens(token_hash)`,
  `CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
    ON email_verification_tokens(user_id, expires_at)`,
] as const;

export async function ensureAccountSchema(): Promise<void> {
  if (!schemaInitialization) {
    schemaInitialization = initializeSchema().catch((error: unknown) => {
      schemaInitialization = null;
      throw error;
    });
  }
  await schemaInitialization;
}

async function initializeSchema(): Promise<void> {
  const database = getD1Database();
  await database.batch(accountSchemaStatements.map((statement) => database.prepare(statement)));
  const columns = await database.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  const names = new Set(columns.results.map((column) => column.name));
  const additions: D1PreparedStatement[] = [];
  if (!names.has("must_change_password")) {
    additions.push(database.prepare("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0"));
  }
  if (!names.has("password_bootstrap_version")) {
    additions.push(database.prepare("ALTER TABLE users ADD COLUMN password_bootstrap_version INTEGER NOT NULL DEFAULT 0"));
  }
  if (additions.length) await database.batch(additions);
}

export async function createHostedSignupIntent(emailInput: string): Promise<string> {
  await ensureAccountSchema();
  const versions = legalPolicyVersions();
  if (!versions) throw new Error("Legal policy versions are not configured.");
  const nonce = crypto.randomUUID();
  const acceptedAt = new Date();
  const expiresAt = new Date(acceptedAt.getTime() + 48 * 60 * 60_000);
  await getD1Database().prepare(
    `INSERT INTO hosted_signup_intents
      (nonce, email, terms_version, privacy_version, accepted_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(nonce, emailInput.trim().toLowerCase(), versions.terms, versions.privacy,
    acceptedAt.toISOString(), expiresAt.toISOString()).run();
  return nonce;
}

export async function abandonHostedSignupIntent(nonce: string): Promise<void> {
  await ensureAccountSchema();
  await getD1Database().prepare(
    "DELETE FROM hosted_signup_intents WHERE nonce = ? AND consumed_at IS NULL",
  ).bind(nonce).run();
}

export async function createPasswordRecoveryIntent(authUserId: string): Promise<string> {
  await ensureAccountSchema();
  const token = randomToken(32);
  const tokenHash = await sha256Text(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PASSWORD_RECOVERY_INTENT_SECONDS * 1000);
  const database = getD1Database();
  await database.batch([
    database.prepare(
      `UPDATE password_recovery_intents SET consumed_at = ?
       WHERE auth_user_id = ? AND consumed_at IS NULL`,
    ).bind(createdAt.toISOString(), authUserId),
    database.prepare(
      `INSERT INTO password_recovery_intents
        (token_hash, auth_user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    ).bind(tokenHash, authUserId, createdAt.toISOString(), expiresAt.toISOString()),
  ]);
  return token;
}

export async function consumePasswordRecoveryIntent(input: {
  token: string;
  authUserId: string;
}): Promise<boolean> {
  await ensureAccountSchema();
  const tokenHash = await sha256Text(input.token);
  const consumedAt = new Date().toISOString();
  const result = await getD1Database().prepare(
    `UPDATE password_recovery_intents SET consumed_at = ?
     WHERE token_hash = ? AND auth_user_id = ? AND consumed_at IS NULL AND expires_at > ?`,
  ).bind(consumedAt, tokenHash, input.authUserId, consumedAt).run();
  return Boolean(result.meta.changes);
}

async function claimHostedSignupIntent(input: { nonce: string | null; email: string; authUserId: string }) {
  if (!input.nonce) throw new RegistrationConsentRequiredError();
  const versions = legalPolicyVersions();
  if (!versions) throw new RegistrationConsentRequiredError();
  const now = new Date().toISOString();
  const result = await getD1Database().prepare(
    `UPDATE hosted_signup_intents SET auth_user_id = ?, consumed_at = ?
     WHERE nonce = ? AND email = ? AND terms_version = ? AND privacy_version = ?
       AND consumed_at IS NULL AND expires_at > ?`,
  ).bind(input.authUserId, now, input.nonce, input.email, versions.terms, versions.privacy, now).run();
  if (!result.meta.changes) throw new RegistrationConsentRequiredError();
  return { termsVersion: versions.terms, privacyVersion: versions.privacy, recordedAt: now };
}

async function releaseHostedSignupIntent(nonce: string | null, authUserId: string): Promise<void> {
  if (!nonce) return;
  await getD1Database().prepare(
    `UPDATE hosted_signup_intents SET auth_user_id = NULL, consumed_at = NULL
     WHERE nonce = ? AND auth_user_id = ?`,
  ).bind(nonce, authUserId).run().catch(() => undefined);
}

export async function createAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUser> {
  await ensureAccountSchema();
  const database = getD1Database();
  const email = input.email.trim().toLowerCase();
  if (await findUserRowByEmail(email)) throw new AccountEmailTakenError();

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const versions = legalPolicyVersions();
  if (!versions) throw new Error("Legal policy versions are not configured.");
  const password = await createPasswordRecord(input.password);
  try {
    await database.batch([
      database.prepare(
        `INSERT INTO users
          (id, email, display_name, password_hash, password_salt, password_iterations,
           status, is_test_account, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING_EMAIL_VERIFICATION', 0, ?, ?, 1)`,
      ).bind(
        id,
        email,
        input.displayName,
        password.hash,
        password.salt,
        password.iterations,
        timestamp,
        timestamp,
      ),
      database.prepare(
        `INSERT INTO user_roles (user_id, role, organization_id, created_at, created_by)
         VALUES (?, 'PLAYER', NULL, ?, ?)`,
      ).bind(id, timestamp, id),
      database.prepare(
        `INSERT INTO player_profiles (user_id, created_at, updated_at, version)
         VALUES (?, ?, ?, 1)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO player_preferences
          (user_id, social_matchmaking, ai_recommendations, tournament_notifications,
           units, created_at, updated_at)
         VALUES (?, 0, 1, 0, 'IMPERIAL', ?, ?)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO player_privacy_settings
          (user_id, profile_visibility, show_home_city, show_round_history, show_bag,
           allow_messages, allow_game_invites, analytics_opt_in, ai_training_opt_in,
           created_at, updated_at)
         VALUES (?, 'PRIVATE', 0, 0, 0, 'CONNECTIONS', 1, 0, 0, ?, ?)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO consent_records
          (id, user_id, consent_type, policy_version, granted, recorded_at)
         VALUES (?, ?, 'TERMS', ?, 1, ?)`,
      ).bind(crypto.randomUUID(), id, versions.terms, timestamp),
      database.prepare(
        `INSERT INTO consent_records
          (id, user_id, consent_type, policy_version, granted, recorded_at)
         VALUES (?, ?, 'PRIVACY', ?, 1, ?)`,
      ).bind(crypto.randomUUID(), id, versions.privacy, timestamp),
      auditStatement(database, id, "ACCOUNT_CREATED", "user", id, timestamp),
    ]);
  } catch (error) {
    if (await findUserRowByEmail(email)) throw new AccountEmailTakenError();
    throw error;
  }

  return {
    id,
    email,
    displayName: input.displayName,
    roles: ["PLAYER"],
    source: "password",
    onboardingComplete: false,
    isTestAccount: false,
    mustChangePassword: false,
    emailVerified: false,
  };
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  await ensureAccountSchema();
  const token = randomToken(32);
  const tokenHash = await sha256Text(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60_000).toISOString();
  await getD1Database().batch([
    getD1Database().prepare(
      "UPDATE email_verification_tokens SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
    ).bind(now.toISOString(), userId),
    getD1Database().prepare(
      `INSERT INTO email_verification_tokens
        (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now.toISOString()),
  ]);
  return token;
}

export async function verifyAccountEmail(token: string): Promise<AuthenticatedUser | null> {
  await ensureAccountSchema();
  const tokenHash = await sha256Text(token);
  const now = new Date().toISOString();
  const row = await getD1Database().prepare(
    `SELECT t.id AS tokenId, t.user_id AS userId
     FROM email_verification_tokens t
     WHERE t.token_hash = ? AND t.consumed_at IS NULL AND t.expires_at > ? LIMIT 1`,
  ).bind(tokenHash, now).first<{ tokenId: string; userId: string }>();
  if (!row) return null;
  await getD1Database().batch([
    getD1Database().prepare(
      "UPDATE email_verification_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
    ).bind(now, row.tokenId),
    getD1Database().prepare(
      `UPDATE users SET email_verified_at = ?, status = 'ACTIVE', updated_at = ?, version = version + 1
       WHERE id = ? AND status = 'PENDING_EMAIL_VERIFICATION'`,
    ).bind(now, now, row.userId),
    auditStatement(getD1Database(), row.userId, "EMAIL_VERIFIED", "user", row.userId, now),
  ]);
  const verified = await findUserRowById(row.userId);
  if (!verified) return null;
  await persistConfiguredRoles(verified.id, verified.email);
  return accountUserFromRow(verified, await rolesForUser(verified.id));
}

export async function authenticateAccount(
  emailInput: string,
  passwordInput: string,
): Promise<AuthenticatedUser | null> {
  await ensureAccountSchema();
  const email = emailInput.trim().toLowerCase();
  if (email === jPhillipsTestAccount.email) {
    await ensureJPhillipsTestAccount();
  }
  const row = await findUserRowByEmail(email);

  if (!row?.passwordHash || !row.passwordSalt || !row.passwordIterations) {
    await verifyPassword(passwordInput, {
      hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      salt: "AAAAAAAAAAAAAAAAAAAAAA",
      iterations: 210_000,
    });
    return null;
  }
  const verified = await verifyPassword(passwordInput, {
    hash: row.passwordHash,
    salt: row.passwordSalt,
    iterations: row.passwordIterations,
  });
  if (!verified) return null;
  if (row.status === "PENDING_EMAIL_VERIFICATION" || !row.emailVerifiedAt) {
    throw new EmailVerificationRequiredError();
  }
  if (row.status !== "ACTIVE") return null;

  const timestamp = new Date().toISOString();
  await getD1Database()
    .prepare("UPDATE users SET last_signed_in_at = ?, updated_at = ? WHERE id = ?")
    .bind(timestamp, timestamp, row.id)
    .run();
  return accountUserFromRow(row, await rolesForUser(row.id));
}

export async function createAccountSession(
  userId: string,
  userAgent: string | null,
): Promise<{ token: string; maxAge: number }> {
  await ensureAccountSchema();
  const token = randomToken();
  const tokenHash = await sha256Text(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);
  await getD1Database()
    .prepare(
      `INSERT INTO auth_sessions
        (id, user_id, token_hash, created_at, expires_at, last_seen_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      userAgent?.slice(0, 300) ?? null,
    )
    .run();
  return { token, maxAge: SESSION_DURATION_SECONDS };
}

export async function getAccountUserBySession(
  token: string,
): Promise<AuthenticatedUser | null> {
  await ensureAccountSchema();
  const tokenHash = await sha256Text(token);
  const row = await getD1Database()
    .prepare(
      `SELECT u.id, u.email, u.display_name AS displayName,
        u.password_hash AS passwordHash, u.password_salt AS passwordSalt,
        u.password_iterations AS passwordIterations,
        u.must_change_password AS mustChangePassword,
        u.password_bootstrap_version AS passwordBootstrapVersion, u.status,
        u.is_test_account AS isTestAccount,
        u.onboarding_completed_at AS onboardingCompletedAt,
        u.auth_provider_subject AS authProviderSubject,
        u.email_verified_at AS emailVerifiedAt
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
         AND u.deleted_at IS NULL LIMIT 1`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<UserRow>();
  if (!row || row.status !== "ACTIVE") return null;
  return accountUserFromRow(row, await rolesForUser(row.id));
}

export async function revokeAccountSession(token: string): Promise<void> {
  await ensureAccountSchema();
  const tokenHash = await sha256Text(token);
  await getD1Database()
    .prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .bind(new Date().toISOString(), tokenHash)
    .run();
}

export async function findAccountUserByEmail(emailInput: string): Promise<AuthenticatedUser | null> {
  await ensureAccountSchema();
  const row = await findUserRowByEmail(emailInput.trim().toLowerCase());
  return row ? accountUserFromRow(row, await rolesForUser(row.id)) : null;
}

export async function findAccountUserByProviderSubject(subject: string): Promise<AuthenticatedUser | null> {
  await ensureAccountSchema();
  const row = await findUserRowByProviderSubject(subject);
  return row ? accountUserFromRow(row, await rolesForUser(row.id)) : null;
}

export async function resolveSupabaseAccount(input: {
  authUserId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  registrationNonce?: string | null;
}): Promise<AuthenticatedUser> {
  await ensureAccountSchema();
  if (!input.emailVerified) throw new EmailVerificationRequiredError();
  const subject = `supabase:${input.authUserId}`;
  const linked = await findUserRowByProviderSubject(subject);
  if (linked) {
    await persistConfiguredRoles(linked.id, input.email);
    const resolved = accountUserFromRow(linked, await rolesForUser(linked.id));
    return { ...resolved, source: "supabase", emailVerified: true };
  }

  const email = input.email.trim().toLowerCase();
  const collision = await findUserRowByEmail(email);
  if (collision) {
    return {
      id: subject,
      email,
      displayName: input.displayName,
      roles: ["PLAYER"],
      source: "supabase",
      onboardingComplete: false,
      isTestAccount: false,
      mustChangePassword: false,
      emailVerified: input.emailVerified,
      identityLinkRequired: true,
    };
  }

  const database = getD1Database();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const consent = await claimHostedSignupIntent({ nonce: input.registrationNonce ?? null, email, authUserId: input.authUserId });
  const configuredRoles = rolesForConfiguredEmail(email);
  try {
    await database.batch([
      database.prepare(
        `INSERT INTO users
          (id, email, display_name, auth_provider_subject, status, is_test_account,
           email_verified_at, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, 1)`,
      ).bind(id, email, input.displayName, subject, timestamp, timestamp, timestamp),
      ...configuredRoles.map((role) => database.prepare(
        `INSERT INTO user_roles (user_id, role, organization_id, created_at, created_by)
         VALUES (?, ?, NULL, ?, ?)`,
      ).bind(id, role, timestamp, id)),
      database.prepare(
        `INSERT INTO player_profiles (user_id, created_at, updated_at, version)
         VALUES (?, ?, ?, 1)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO player_preferences
          (user_id, social_matchmaking, ai_recommendations, tournament_notifications,
           units, created_at, updated_at)
         VALUES (?, 0, 1, 0, 'IMPERIAL', ?, ?)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO player_privacy_settings
          (user_id, profile_visibility, show_home_city, show_round_history, show_bag,
           allow_messages, allow_game_invites, analytics_opt_in, ai_training_opt_in,
           created_at, updated_at)
         VALUES (?, 'PRIVATE', 0, 0, 0, 'CONNECTIONS', 1, 0, 0, ?, ?)`,
      ).bind(id, timestamp, timestamp),
      database.prepare(
        `INSERT INTO consent_records (id, user_id, consent_type, policy_version, granted, recorded_at)
         VALUES (?, ?, 'TERMS', ?, 1, ?)`,
      ).bind(crypto.randomUUID(), id, consent.termsVersion, consent.recordedAt),
      database.prepare(
        `INSERT INTO consent_records (id, user_id, consent_type, policy_version, granted, recorded_at)
         VALUES (?, ?, 'PRIVACY', ?, 1, ?)`,
      ).bind(crypto.randomUUID(), id, consent.privacyVersion, consent.recordedAt),
      auditStatement(database, id, "SUPABASE_ACCOUNT_CREATED", "user", id, timestamp),
      ...configuredRoles.filter((role) => role !== "PLAYER").map((role) =>
        auditStatement(database, id, "HOSTED_ROLE_GRANTED", "user_role", `${id}:${role}`, timestamp, role)),
    ]);
  } catch (error) {
    await releaseHostedSignupIntent(input.registrationNonce ?? null, input.authUserId);
    throw error;
  }
  const created = await findUserRowById(id);
  if (!created) throw new Error("The Supabase account could not be provisioned.");
  const resolved = accountUserFromRow(created, await rolesForUser(id));
  return { ...resolved, source: "supabase", emailVerified: true };
}

async function persistConfiguredRoles(userId: string, email: string): Promise<void> {
  const existing = new Set(await rolesForUser(userId));
  const missing = rolesForConfiguredEmail(email).filter((role) => !existing.has(role));
  if (!missing.length) return;
  const database = getD1Database();
  const timestamp = new Date().toISOString();
  await database.batch(missing.flatMap((role) => [
    database.prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role, organization_id, created_at, created_by)
       VALUES (?, ?, NULL, ?, ?)`,
    ).bind(userId, role, timestamp, userId),
    auditStatement(database, userId, "HOSTED_ROLE_GRANTED", "user_role", `${userId}:${role}`, timestamp, role),
  ]));
}

export async function linkSupabaseIdentity(input: {
  email: string;
  authUserId: string;
  password: string;
}): Promise<AuthenticatedUser> {
  await ensureAccountSchema();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.authUserId)) {
    throw new ExternalIdentityLinkRequiredError();
  }
  const providerSubject = `supabase:${input.authUserId}`;
  const row = await findUserRowByEmail(input.email);
  if (!row?.passwordHash || !row.passwordSalt || !row.passwordIterations) {
    throw new InvalidCurrentPasswordError();
  }
  const valid = await verifyPassword(input.password, {
    hash: row.passwordHash,
    salt: row.passwordSalt,
    iterations: row.passwordIterations,
  });
  if (!valid) throw new InvalidCurrentPasswordError();
  const existingSubject = await findUserRowByProviderSubject(providerSubject);
  if (existingSubject && existingSubject.id !== row.id) throw new ExternalIdentityLinkRequiredError();
  const now = new Date().toISOString();
  await getD1Database().batch([
    getD1Database().prepare(
      `UPDATE users SET auth_provider_subject = ?, email_verified_at = COALESCE(email_verified_at, ?),
       status = 'ACTIVE', updated_at = ?, version = version + 1 WHERE id = ?`,
    ).bind(providerSubject, now, now, row.id),
    auditStatement(getD1Database(), row.id, "SUPABASE_IDENTITY_LINKED", "user", row.id, now),
  ]);
  const linked = await findUserRowById(row.id);
  if (!linked) throw new Error("The linked account could not be loaded.");
  return accountUserFromRow(linked, await rolesForUser(linked.id));
}

export async function changeAccountPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await ensureAccountSchema();
  const row = await findUserRowById(userId);
  if (!row?.passwordHash || !row.passwordSalt || !row.passwordIterations) {
    throw new InvalidCurrentPasswordError();
  }
  const verified = await verifyPassword(currentPassword, {
    hash: row.passwordHash,
    salt: row.passwordSalt,
    iterations: row.passwordIterations,
  });
  if (!verified) throw new InvalidCurrentPasswordError();

  const replacement = await createPasswordRecord(newPassword);
  const timestamp = new Date().toISOString();
  const database = getD1Database();
  await database.batch([
    database.prepare(
      `UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?,
        must_change_password = 0, updated_at = ?, version = version + 1 WHERE id = ?`,
    ).bind(replacement.hash, replacement.salt, replacement.iterations, timestamp, userId),
    database.prepare(
      "UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    ).bind(timestamp, userId),
    auditStatement(database, userId, "PASSWORD_CHANGED", "user", userId, timestamp),
  ]);
}

export async function getAccountSettings(user: AuthenticatedUser): Promise<AccountSettings> {
  await ensureAccountSchema();
  const userId = await ensurePersistedUserId(user);
  const row = await getD1Database()
    .prepare(
      `SELECT u.email, u.display_name AS displayName,
        u.onboarding_completed_at AS onboardingCompletedAt,
        u.is_test_account AS isTestAccount,
        u.must_change_password AS mustChangePassword,
        p.home_city AS homeCity, p.home_region_code AS homeRegionCode,
        p.postal_code AS postalCode, p.experience_level AS experienceLevel,
        p.throwing_hand AS throwingHand,
        p.controlled_distance_feet AS controlledDistanceFeet,
        pref.play_style AS playStyle, pref.social_matchmaking AS socialMatchmaking,
        pref.ai_recommendations AS aiRecommendations,
        pref.tournament_notifications AS tournamentNotifications,
        privacy.profile_visibility AS profileVisibility,
        privacy.show_home_city AS showHomeCity,
        privacy.show_round_history AS showRoundHistory,
        privacy.show_bag AS showBag, privacy.allow_messages AS allowMessages,
        privacy.allow_game_invites AS allowGameInvites,
        privacy.analytics_opt_in AS analyticsOptIn,
        privacy.ai_training_opt_in AS aiTrainingOptIn
       FROM users u
       LEFT JOIN player_profiles p ON p.user_id = u.id
       LEFT JOIN player_preferences pref ON pref.user_id = u.id
       LEFT JOIN player_privacy_settings privacy ON privacy.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<Record<string, unknown>>();
  if (!row) throw new Error("The account settings could not be loaded.");

  return {
    email: String(row.email),
    displayName: String(row.displayName),
    onboardingComplete: Boolean(row.onboardingCompletedAt),
    isTestAccount: Boolean(row.isTestAccount),
    mustChangePassword: Boolean(row.mustChangePassword),
    homeCity: nullableString(row.homeCity),
    homeRegionCode: nullableString(row.homeRegionCode),
    postalCode: nullableString(row.postalCode),
    experienceLevel: enumOr(row.experienceLevel, "NEW"),
    throwingHand: enumOr(row.throwingHand, "PREFER_NOT_TO_SAY"),
    controlledDistanceFeet: typeof row.controlledDistanceFeet === "number" ? row.controlledDistanceFeet : null,
    playStyle: enumOr(row.playStyle, "CASUAL"),
    socialMatchmaking: Boolean(row.socialMatchmaking),
    aiRecommendations: row.aiRecommendations == null ? true : Boolean(row.aiRecommendations),
    tournamentNotifications: Boolean(row.tournamentNotifications),
    profileVisibility: enumOr(row.profileVisibility, "PRIVATE"),
    showHomeCity: Boolean(row.showHomeCity),
    showRoundHistory: Boolean(row.showRoundHistory),
    showBag: Boolean(row.showBag),
    allowMessages: enumOr(row.allowMessages, "CONNECTIONS"),
    allowGameInvites: row.allowGameInvites == null ? true : Boolean(row.allowGameInvites),
    analyticsOptIn: Boolean(row.analyticsOptIn),
    aiTrainingOptIn: Boolean(row.aiTrainingOptIn),
  } as AccountSettings;
}

export async function saveOnboarding(
  user: AuthenticatedUser,
  input: OnboardingInput,
): Promise<void> {
  await ensureAccountSchema();
  if (user.mustChangePassword) throw new PasswordChangeRequiredError();
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const timestamp = new Date().toISOString();
  await database.batch([
    database.prepare(
      `UPDATE users SET display_name = ?, onboarding_completed_at = ?, updated_at = ?,
        version = version + 1 WHERE id = ?`,
    ).bind(input.displayName, timestamp, timestamp, userId),
    database.prepare(
      `INSERT INTO player_profiles
        (user_id, home_city, home_region_code, postal_code, experience_level,
         throwing_hand, controlled_distance_feet, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(user_id) DO UPDATE SET
         home_city = excluded.home_city, home_region_code = excluded.home_region_code,
         postal_code = excluded.postal_code, experience_level = excluded.experience_level,
         throwing_hand = excluded.throwing_hand,
         controlled_distance_feet = excluded.controlled_distance_feet,
         updated_at = excluded.updated_at, version = player_profiles.version + 1`,
    ).bind(
      userId,
      input.homeCity,
      input.homeRegionCode,
      input.postalCode,
      input.experienceLevel,
      input.throwingHand,
      input.controlledDistanceFeet,
      timestamp,
      timestamp,
    ),
    database.prepare(
      `INSERT INTO player_preferences
        (user_id, play_style, social_matchmaking, ai_recommendations,
         tournament_notifications, units, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'IMPERIAL', ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         play_style = excluded.play_style,
         social_matchmaking = excluded.social_matchmaking,
         ai_recommendations = excluded.ai_recommendations,
         tournament_notifications = excluded.tournament_notifications,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      input.playStyle,
      input.socialMatchmaking ? 1 : 0,
      input.aiRecommendations ? 1 : 0,
      input.tournamentNotifications ? 1 : 0,
      timestamp,
      timestamp,
    ),
    database.prepare(
      `INSERT INTO player_privacy_settings
        (user_id, profile_visibility, show_home_city, show_round_history, show_bag,
         allow_messages, allow_game_invites, analytics_opt_in, ai_training_opt_in,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         profile_visibility = excluded.profile_visibility,
         show_home_city = excluded.show_home_city,
         show_round_history = excluded.show_round_history,
         show_bag = excluded.show_bag,
         allow_messages = excluded.allow_messages,
         allow_game_invites = excluded.allow_game_invites,
         analytics_opt_in = excluded.analytics_opt_in,
         ai_training_opt_in = excluded.ai_training_opt_in,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      input.profileVisibility,
      input.showHomeCity ? 1 : 0,
      input.showRoundHistory ? 1 : 0,
      input.showBag ? 1 : 0,
      input.allowMessages,
      input.allowGameInvites ? 1 : 0,
      input.analyticsOptIn ? 1 : 0,
      input.aiTrainingOptIn ? 1 : 0,
      timestamp,
      timestamp,
    ),
    auditStatement(database, userId, "ONBOARDING_UPDATED", "user", userId, timestamp),
  ]);
}

async function ensureJPhillipsTestAccount(): Promise<void> {
  const existing = await findUserRowByEmail(jPhillipsTestAccount.email);
  if (
    existing
    && existing.passwordBootstrapVersion >= jPhillipsTestAccount.passwordBootstrapVersion
    && existing.emailVerifiedAt
    && existing.status === "ACTIVE"
  ) return;
  const database = getD1Database();
  const password = await createPasswordRecord(jPhillipsTestAccount.password);
  const timestamp = new Date().toISOString();
  if (existing) {
    await database.batch([
      database.prepare(
        `UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?,
          must_change_password = 1, password_bootstrap_version = ?, status = 'ACTIVE',
          email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?,
          version = version + 1 WHERE id = ?`,
      ).bind(
        password.hash,
        password.salt,
        password.iterations,
        jPhillipsTestAccount.passwordBootstrapVersion,
        timestamp,
        timestamp,
        existing.id,
      ),
      auditStatement(database, existing.id, "TEMPORARY_PASSWORD_ISSUED", "user", existing.id, timestamp),
    ]);
    return;
  }
  await database.batch([
    database.prepare(
      `INSERT OR IGNORE INTO users
        (id, email, display_name, password_hash, password_salt, password_iterations,
         must_change_password, password_bootstrap_version, status, is_test_account,
         email_verified_at, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'ACTIVE', 1, ?, ?, ?, 1)`,
    ).bind(
      jPhillipsTestAccount.id,
      jPhillipsTestAccount.email,
      jPhillipsTestAccount.displayName,
      password.hash,
      password.salt,
      password.iterations,
      jPhillipsTestAccount.passwordBootstrapVersion,
      timestamp,
      timestamp,
      timestamp,
    ),
    database.prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role, organization_id, created_at, created_by)
       VALUES (?, 'PLAYER', NULL, ?, ?)`,
    ).bind(jPhillipsTestAccount.id, timestamp, jPhillipsTestAccount.id),
    database.prepare(
      `INSERT OR IGNORE INTO player_profiles (user_id, created_at, updated_at, version)
       VALUES (?, ?, ?, 1)`,
    ).bind(jPhillipsTestAccount.id, timestamp, timestamp),
    database.prepare(
      `INSERT OR IGNORE INTO player_preferences
        (user_id, social_matchmaking, ai_recommendations, tournament_notifications,
         units, created_at, updated_at)
       VALUES (?, 0, 1, 0, 'IMPERIAL', ?, ?)`,
    ).bind(jPhillipsTestAccount.id, timestamp, timestamp),
    database.prepare(
      `INSERT OR IGNORE INTO player_privacy_settings
        (user_id, profile_visibility, show_home_city, show_round_history, show_bag,
         allow_messages, allow_game_invites, analytics_opt_in, ai_training_opt_in,
         created_at, updated_at)
       VALUES (?, 'PRIVATE', 0, 0, 0, 'CONNECTIONS', 1, 0, 0, ?, ?)`,
    ).bind(jPhillipsTestAccount.id, timestamp, timestamp),
  ]);
}

async function ensureExternalAccount(user: AuthenticatedUser): Promise<string> {
  const providerSubject = user.source === "chatgpt" ? user.id.replace(/^chatgpt:/u, "") : null;
  if (providerSubject) {
    const linked = await findUserRowByProviderSubject(providerSubject);
    if (linked) return linked.id;
  }
  const existing = await findUserRowByEmail(user.email);
  if (existing) throw new ExternalIdentityLinkRequiredError();
  const database = getD1Database();
  const timestamp = new Date().toISOString();
  await database.batch([
    database.prepare(
      `INSERT OR IGNORE INTO users
        (id, email, display_name, auth_provider_subject, status, is_test_account,
         email_verified_at, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, 1)`,
    ).bind(user.id, user.email.toLowerCase(), user.displayName, providerSubject, timestamp, timestamp, timestamp),
    database.prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role, organization_id, created_at, created_by)
       VALUES (?, 'PLAYER', NULL, ?, ?)`,
    ).bind(user.id, timestamp, user.id),
  ]);
  return (await findUserRowByEmail(user.email))?.id ?? user.id;
}

export async function ensurePersistedUserId(user: AuthenticatedUser): Promise<string> {
  await ensureAccountSchema();
  if (user.source === "password") {
    const persisted = await findUserRowByEmail(user.email);
    if (!persisted || persisted.id !== user.id) throw new Error("The authenticated account no longer exists.");
    return persisted.id;
  }
  if (user.source === "supabase") {
    if (user.identityLinkRequired) throw new ExternalIdentityLinkRequiredError();
    const persisted = await findUserRowById(user.id);
    if (!persisted) throw new Error("The authenticated Supabase account no longer exists.");
    return persisted.id;
  }
  if (user.source === "chatgpt") throw new ExternalIdentityLinkRequiredError();
  return ensureExternalAccount(user);
}

async function findUserRowByEmail(email: string): Promise<UserRow | null> {
  return getD1Database()
    .prepare(
      `SELECT id, email, display_name AS displayName,
        password_hash AS passwordHash, password_salt AS passwordSalt,
        password_iterations AS passwordIterations,
        must_change_password AS mustChangePassword,
        password_bootstrap_version AS passwordBootstrapVersion, status,
        is_test_account AS isTestAccount,
        onboarding_completed_at AS onboardingCompletedAt,
        auth_provider_subject AS authProviderSubject,
        email_verified_at AS emailVerifiedAt
       FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(email.toLowerCase())
    .first<UserRow>();
}

async function findUserRowById(id: string): Promise<UserRow | null> {
  return getD1Database()
    .prepare(
      `SELECT id, email, display_name AS displayName,
        password_hash AS passwordHash, password_salt AS passwordSalt,
        password_iterations AS passwordIterations,
        must_change_password AS mustChangePassword,
        password_bootstrap_version AS passwordBootstrapVersion, status,
        is_test_account AS isTestAccount,
        onboarding_completed_at AS onboardingCompletedAt,
        auth_provider_subject AS authProviderSubject,
        email_verified_at AS emailVerifiedAt
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(id)
    .first<UserRow>();
}

async function findUserRowByProviderSubject(subject: string): Promise<UserRow | null> {
  return getD1Database().prepare(
    `SELECT id, email, display_name AS displayName,
      password_hash AS passwordHash, password_salt AS passwordSalt,
      password_iterations AS passwordIterations,
      must_change_password AS mustChangePassword,
      password_bootstrap_version AS passwordBootstrapVersion, status,
      is_test_account AS isTestAccount,
      onboarding_completed_at AS onboardingCompletedAt,
      auth_provider_subject AS authProviderSubject,
      email_verified_at AS emailVerifiedAt
     FROM users WHERE auth_provider_subject = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(subject).first<UserRow>();
}

async function rolesForUser(userId: string): Promise<Role[]> {
  const result = await getD1Database()
    .prepare("SELECT role FROM user_roles WHERE user_id = ? ORDER BY role")
    .bind(userId)
    .all<{ role: string }>();
  const roles = result.results
    .map((row) => row.role)
    .filter(isRole);
  return roles.length ? roles : ["PLAYER"];
}

function accountUserFromRow(row: UserRow, roles: Role[]): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    roles,
    source: row.authProviderSubject?.startsWith("supabase:")
      ? "supabase"
      : row.authProviderSubject
        ? "chatgpt"
        : "password",
    onboardingComplete: Boolean(row.onboardingCompletedAt),
    isTestAccount: Boolean(row.isTestAccount),
    mustChangePassword: Boolean(row.mustChangePassword),
    emailVerified: Boolean(row.emailVerifiedAt),
  };
}

function auditStatement(
  database: D1Database,
  actorUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  createdAt: string,
  reason: string | null = null,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO audit_logs
      (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), actorUserId, action, resourceType, resourceId, reason, createdAt);
}

function isRole(value: string): value is Role {
  return [
    "PLAYER",
    "COURSE_STAFF",
    "COURSE_OWNER",
    "TOURNAMENT_DIRECTOR",
    "LEAGUE_ADMIN",
    "INSTRUCTOR",
    "PLATFORM_ADMIN",
  ].includes(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function enumOr<T extends string>(value: unknown, fallback: T): T {
  return (typeof value === "string" && value.length ? value : fallback) as T;
}
