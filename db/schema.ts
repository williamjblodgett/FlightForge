import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const favoriteCourses = sqliteTable(
  "favorite_courses",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    courseId: text("course_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("favorite_courses_user_course_unique").on(
      table.userEmail,
      table.courseId,
    ),
    index("favorite_courses_user_idx").on(table.userEmail),
  ],
);

export const courseClaims = sqliteTable(
  "course_claims",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    applicantUserEmail: text("applicant_user_email").notNull(),
    applicantName: text("applicant_name").notNull(),
    applicantRole: text("applicant_role").notNull(),
    businessEmail: text("business_email").notNull(),
    businessPhone: text("business_phone").notNull(),
    website: text("website"),
    explanation: text("explanation").notNull(),
    supportingDocumentKey: text("supporting_document_key"),
    status: text("status").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewReason: text("review_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("course_claims_course_applicant_unique").on(
      table.courseId,
      table.applicantUserEmail,
    ),
    index("course_claims_status_idx").on(table.status),
  ],
);

export const courseClaimAuditEvents = sqliteTable(
  "course_claim_audit_events",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id").notNull(),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reason: text("reason"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("claim_audit_claim_created_idx").on(table.claimId, table.createdAt)],
);

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: text("id").primaryKey(),
    sourceLabel: text("source_label").notNull(),
    status: text("status").notNull(),
    recordCount: integer("record_count").notNull(),
    duplicateCount: integer("duplicate_count").default(0).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("import_batches_status_idx").on(table.status)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
