import {
  boolean,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleCode = pgEnum("role_code", [
  "PLAYER",
  "COURSE_STAFF",
  "COURSE_OWNER",
  "TOURNAMENT_DIRECTOR",
  "LEAGUE_ADMIN",
  "INSTRUCTOR",
  "PLATFORM_ADMIN",
]);

export const courseClaimStatus = pgEnum("course_claim_status", [
  "UNCLAIMED",
  "CLAIM_SUBMITTED",
  "ADDITIONAL_INFORMATION_REQUIRED",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export const importBatchStatus = pgEnum("import_batch_status", [
  "UPLOADED",
  "VALIDATING",
  "READY_FOR_REVIEW",
  "APPROVED",
  "APPLIED",
  "ROLLED_BACK",
  "FAILED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    authProviderSubject: text("auth_provider_subject"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: roleCode("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("roles_code_unique").on(table.code)],
);

export const permissionRecords = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("permissions_code_unique").on(table.code)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionRecords.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_organization_idx").on(table.organizationId),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    organizationType: text("organization_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("ACTIVE").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: text("facility_id"),
    recordType: text("record_type").default("COURSE").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    claimStatus: courseClaimStatus("claim_status").default("UNCLAIMED").notNull(),
    dataVerificationStatus: text("data_verification_status")
      .default("UNREVIEWED")
      .notNull(),
    holeCount: integer("hole_count").default(0).notNull(),
    difficulty: text("difficulty"),
    priceType: text("price_type").default("FREE").notNull(),
    isFictionalDemo: boolean("is_fictional_demo").default(false).notNull(),
    nextReviewDueAt: timestamp("next_review_due_at", { withTimezone: true }),
    archivedReason: text("archived_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_claim_status_idx").on(table.claimStatus),
  ],
);

export const courseLocations = pgTable(
  "course_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    addressLine1: text("address_line_1"),
    city: text("city").notNull(),
    regionCode: text("region_code").notNull(),
    postalCode: text("postal_code"),
    countryCode: text("country_code").default("US").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    coordinates: geometry("coordinates", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    precision: text("precision").default("APPROXIMATE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("course_locations_course_unique").on(table.courseId),
    index("course_locations_region_city_idx").on(table.regionCode, table.city),
    index("course_locations_coordinates_gist_idx").using("gist", table.coordinates),
  ],
);

export const amenities = pgTable(
  "amenities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    label: text("label").notNull(),
  },
  (table) => [uniqueIndex("amenities_code_unique").on(table.code)],
);

export const courseAmenities = pgTable(
  "course_amenities",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    amenityId: uuid("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "restrict" }),
    details: text("details"),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.amenityId] })],
);

export const courseSources = pgTable(
  "course_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type").notNull(),
    externalId: text("external_id"),
    attribution: text("attribution"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    supportedFields: jsonb("supported_fields").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("course_sources_external_unique").on(
      table.sourceType,
      table.externalId,
    ),
    index("course_sources_course_idx").on(table.courseId),
  ],
);

export const courseEvidence = pgTable(
  "course_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => courseSources.id, { onDelete: "cascade" }),
    fieldCode: text("field_code").notNull(),
    evidenceValue: text("evidence_value"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    reviewStatus: text("review_status").default("APPROVED").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("course_evidence_course_source_field_unique").on(table.courseId, table.sourceId, table.fieldCode),
    index("course_evidence_review_due_idx").on(table.reviewStatus, table.validUntil),
  ],
);

export const holeHighlightVideos = pgTable(
  "hole_highlight_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: text("course_id").notNull(),
    eventId: text("event_id").notNull(),
    holeNumber: integer("hole_number").notNull(),
    uploaderUserId: uuid("uploader_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    uploaderDisplayName: text("uploader_display_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    durationMs: integer("duration_ms").notNull(),
    caption: text("caption").default("").notNull(),
    moderationStatus: text("moderation_status").default("PENDING").notNull(),
    moderationReason: text("moderation_reason"),
    moderatedBy: uuid("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    rightsConfirmed: boolean("rights_confirmed").notNull(),
    participantConsentConfirmed: boolean("participant_consent_confirmed").notNull(),
    minorPresent: boolean("minor_present").default(false).notNull(),
    guardianConsentConfirmed: boolean("guardian_consent_confirmed").default(false).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("hole_highlight_videos_idempotency_unique").on(table.idempotencyKey),
    index("hole_highlight_videos_scorecard_idx").on(table.courseId, table.eventId, table.holeNumber, table.moderationStatus),
    index("hole_highlight_videos_moderation_idx").on(table.moderationStatus, table.createdAt),
    index("hole_highlight_videos_uploader_idx").on(table.uploaderUserId, table.createdAt),
  ],
);

export const favoriteCourses = pgTable(
  "favorite_courses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.courseId] })],
);

export const courseClaims = pgTable(
  "course_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    applicantUserId: uuid("applicant_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    applicantName: text("applicant_name").notNull(),
    applicantRole: text("applicant_role").notNull(),
    businessEmail: text("business_email").notNull(),
    businessPhone: text("business_phone").notNull(),
    website: text("website"),
    explanation: text("explanation").notNull(),
    supportingDocumentKey: text("supporting_document_key"),
    status: courseClaimStatus("status").default("CLAIM_SUBMITTED").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewReason: text("review_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    index("course_claims_course_idx").on(table.courseId),
    index("course_claims_status_idx").on(table.status),
  ],
);

export const courseClaimAuditEvents = pgTable(
  "course_claim_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => courseClaims.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    fromStatus: courseClaimStatus("from_status"),
    toStatus: courseClaimStatus("to_status"),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("claim_audit_claim_created_idx").on(table.claimId, table.createdAt)],
);

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceLabel: text("source_label").notNull(),
    sourceType: text("source_type").notNull(),
    status: importBatchStatus("status").default("UPLOADED").notNull(),
    recordCount: integer("record_count").default(0).notNull(),
    duplicateCount: integer("duplicate_count").default(0).notNull(),
    validationSummary: jsonb("validation_summary").$type<Record<string, unknown>>(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  },
  (table) => [index("import_batches_status_idx").on(table.status)],
);

export const importRecords = pgTable(
  "import_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    externalId: text("external_id"),
    normalizedName: text("normalized_name").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    matchedCourseId: uuid("matched_course_id").references(() => courses.id),
    reviewStatus: text("review_status").default("PENDING").notNull(),
    validationErrors: jsonb("validation_errors").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("import_records_batch_row_unique").on(table.batchId, table.rowNumber),
    index("import_records_match_idx").on(table.matchedCourseId),
  ],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    key: text("key").primaryKey(),
    description: text("description").notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    rules: jsonb("rules").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    reason: text("reason"),
    requestId: text("request_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
  ],
);
