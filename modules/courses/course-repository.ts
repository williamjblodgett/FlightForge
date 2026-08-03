import { getD1Database } from "@/db/runtime";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { ClaimStatus, CourseClaimApplication } from "./types";

export type CourseClaimRecord = CourseClaimApplication & {
  id: string;
  applicantUserEmail: string;
  supportingDocumentKey: string | null;
  status: ClaimStatus;
  reviewedBy: string | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ClaimAuditRecord = {
  id: string;
  claimId: string;
  actorEmail: string | null;
  action: string;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus | null;
  reason: string | null;
  createdAt: string;
};

let schemaInitialization: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS favorite_courses (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    course_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS favorite_courses_user_course_unique
    ON favorite_courses (user_email, course_id)`,
  `CREATE INDEX IF NOT EXISTS favorite_courses_user_idx
    ON favorite_courses (user_email)`,
  `CREATE TABLE IF NOT EXISTS course_claims (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    applicant_user_email TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_role TEXT NOT NULL,
    business_email TEXT NOT NULL,
    business_phone TEXT NOT NULL,
    website TEXT,
    explanation TEXT NOT NULL,
    supporting_document_key TEXT,
    status TEXT NOT NULL,
    reviewed_by TEXT,
    review_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS course_claims_course_applicant_unique
    ON course_claims (course_id, applicant_user_email)`,
  `CREATE INDEX IF NOT EXISTS course_claims_status_idx
    ON course_claims (status)`,
  `CREATE TABLE IF NOT EXISTS course_claim_audit_events (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS claim_audit_claim_created_idx
    ON course_claim_audit_events (claim_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    source_label TEXT NOT NULL,
    status TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS import_batches_status_idx
    ON import_batches (status)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
] as const;

async function ensureSchema(): Promise<void> {
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
  await database.batch(schemaStatements.map((statement) => database.prepare(statement)));

  const now = "2026-08-03T12:00:00.000Z";
  await database.batch([
    database
      .prepare(
        `INSERT OR IGNORE INTO import_batches
          (id, source_label, status, record_count, duplicate_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "30000000-0000-4000-8000-000000000001",
        "Maine reviewed demonstration seed — 2026-08-03",
        "APPLIED",
        8,
        0,
        now,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO favorite_courses
          (id, user_email, course_id, created_at)
          VALUES (?, ?, ?, ?)`,
      )
      .bind(
        "40000000-0000-4000-8000-000000000001",
        "advanced@demo.flightforge.app",
        "20000000-0000-4000-8000-000000000006",
        now,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO course_claims
          (id, course_id, applicant_user_email, applicant_name, applicant_role,
           business_email, business_phone, website, explanation,
           supporting_document_key, status, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "50000000-0000-4000-8000-000000000001",
        "20000000-0000-4000-8000-000000000005",
        "owner@demo.flightforge.app",
        "Morgan Pine",
        "General manager",
        "owner@demo.flightforge.app",
        "207-555-0142",
        "https://example.com/demo-course-owner",
        "Fictional demonstration claim showing the administrator review workflow.",
        null,
        "CLAIM_SUBMITTED",
        now,
        now,
        1,
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO course_claim_audit_events
          (id, claim_id, actor_email, action, from_status, to_status, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "60000000-0000-4000-8000-000000000001",
        "50000000-0000-4000-8000-000000000001",
        "owner@demo.flightforge.app",
        "CLAIM_SUBMITTED",
        null,
        "CLAIM_SUBMITTED",
        "Seeded fictional workflow data",
        now,
      ),
  ]);
}

export async function getFavoriteCourseIds(userEmail: string): Promise<string[]> {
  await ensureSchema();
  const result = await getD1Database()
    .prepare(
      "SELECT course_id AS courseId FROM favorite_courses WHERE user_email = ? ORDER BY created_at DESC",
    )
    .bind(userEmail.toLowerCase())
    .all<{ courseId: string }>();
  return result.results.map((row) => row.courseId);
}

export async function toggleFavoriteCourse(
  user: AuthenticatedUser,
  courseId: string,
): Promise<{ favorited: boolean }> {
  await ensureSchema();
  const database = getD1Database();
  const email = user.email.toLowerCase();
  const existing = await database
    .prepare("SELECT id FROM favorite_courses WHERE user_email = ? AND course_id = ?")
    .bind(email, courseId)
    .first<{ id: string }>();

  if (existing) {
    await database
      .prepare("DELETE FROM favorite_courses WHERE id = ?")
      .bind(existing.id)
      .run();
    return { favorited: false };
  }

  await database
    .prepare(
      `INSERT INTO favorite_courses (id, user_email, course_id, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), email, courseId, new Date().toISOString())
    .run();
  return { favorited: true };
}

export async function submitCourseClaim(
  user: AuthenticatedUser,
  application: CourseClaimApplication,
  supportingDocumentKey: string | null,
): Promise<CourseClaimRecord> {
  await ensureSchema();
  const database = getD1Database();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await database.batch([
    database
      .prepare(
        `INSERT INTO course_claims
          (id, course_id, applicant_user_email, applicant_name, applicant_role,
           business_email, business_phone, website, explanation,
           supporting_document_key, status, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        application.courseId,
        user.email.toLowerCase(),
        application.applicantName,
        application.applicantRole,
        application.businessEmail,
        application.businessPhone,
        application.website,
        application.explanation,
        supportingDocumentKey,
        "CLAIM_SUBMITTED",
        timestamp,
        timestamp,
        1,
      ),
    database
      .prepare(
        `INSERT INTO course_claim_audit_events
          (id, claim_id, actor_email, action, from_status, to_status, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        user.email.toLowerCase(),
        "CLAIM_SUBMITTED",
        null,
        "CLAIM_SUBMITTED",
        "Application submitted by claimant",
        timestamp,
      ),
  ]);

  const claim = await getCourseClaim(id);
  if (!claim) throw new Error("The saved claim could not be loaded.");
  return claim;
}

export async function listCourseClaims(): Promise<CourseClaimRecord[]> {
  await ensureSchema();
  const result = await getD1Database()
    .prepare(
      `SELECT id, course_id AS courseId, applicant_user_email AS applicantUserEmail,
        applicant_name AS applicantName, applicant_role AS applicantRole,
        business_email AS businessEmail, business_phone AS businessPhone,
        website, explanation, supporting_document_key AS supportingDocumentKey,
        status, reviewed_by AS reviewedBy, review_reason AS reviewReason,
        created_at AS createdAt, updated_at AS updatedAt, version
       FROM course_claims
       ORDER BY CASE status WHEN 'CLAIM_SUBMITTED' THEN 0 ELSE 1 END, created_at DESC`,
    )
    .all<CourseClaimRecord>();
  return result.results;
}

export async function getCourseClaim(id: string): Promise<CourseClaimRecord | null> {
  await ensureSchema();
  return getD1Database()
    .prepare(
      `SELECT id, course_id AS courseId, applicant_user_email AS applicantUserEmail,
        applicant_name AS applicantName, applicant_role AS applicantRole,
        business_email AS businessEmail, business_phone AS businessPhone,
        website, explanation, supporting_document_key AS supportingDocumentKey,
        status, reviewed_by AS reviewedBy, review_reason AS reviewReason,
        created_at AS createdAt, updated_at AS updatedAt, version
       FROM course_claims WHERE id = ?`,
    )
    .bind(id)
    .first<CourseClaimRecord>();
}

export async function listClaimAuditEvents(claimId: string): Promise<ClaimAuditRecord[]> {
  await ensureSchema();
  const result = await getD1Database()
    .prepare(
      `SELECT id, claim_id AS claimId, actor_email AS actorEmail, action,
        from_status AS fromStatus, to_status AS toStatus, reason,
        created_at AS createdAt
       FROM course_claim_audit_events WHERE claim_id = ? ORDER BY created_at ASC`,
    )
    .bind(claimId)
    .all<ClaimAuditRecord>();
  return result.results;
}

export async function reviewCourseClaim(
  reviewer: AuthenticatedUser,
  claimId: string,
  status: Exclude<ClaimStatus, "UNCLAIMED" | "CLAIM_SUBMITTED">,
  reason: string,
): Promise<CourseClaimRecord | null> {
  await ensureSchema();
  const database = getD1Database();
  const current = await getCourseClaim(claimId);
  if (!current) return null;

  const timestamp = new Date().toISOString();
  await database.batch([
    database
      .prepare(
        `UPDATE course_claims SET status = ?, reviewed_by = ?, review_reason = ?,
          updated_at = ?, version = version + 1 WHERE id = ? AND version = ?`,
      )
      .bind(
        status,
        reviewer.email.toLowerCase(),
        reason,
        timestamp,
        claimId,
        current.version,
      ),
    database
      .prepare(
        `INSERT INTO course_claim_audit_events
          (id, claim_id, actor_email, action, from_status, to_status, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        claimId,
        reviewer.email.toLowerCase(),
        "CLAIM_REVIEWED",
        current.status,
        status,
        reason,
        timestamp,
      ),
  ]);

  return getCourseClaim(claimId);
}

export async function getImportBatchSummary() {
  await ensureSchema();
  return getD1Database()
    .prepare(
      `SELECT id, source_label AS sourceLabel, status, record_count AS recordCount,
        duplicate_count AS duplicateCount, created_at AS createdAt
       FROM import_batches ORDER BY created_at DESC LIMIT 1`,
    )
    .first<{
      id: string;
      sourceLabel: string;
      status: string;
      recordCount: number;
      duplicateCount: number;
      createdAt: string;
    }>();
}
