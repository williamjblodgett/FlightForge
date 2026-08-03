import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    passwordIterations: integer("password_iterations"),
    authProviderSubject: text("auth_provider_subject"),
    status: text("status").default("ACTIVE").notNull(),
    isTestAccount: integer("is_test_account", { mode: "boolean" }).default(false).notNull(),
    emailVerifiedAt: text("email_verified_at"),
    onboardingCompletedAt: text("onboarding_completed_at"),
    lastSignedInAt: text("last_signed_in_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_auth_provider_subject_unique").on(table.authProviderSubject),
    index("users_status_idx").on(table.status),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    revokedAt: text("revoked_at"),
    userAgent: text("user_agent"),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    organizationId: text("organization_id"),
    createdAt: text("created_at").notNull(),
    createdBy: text("created_by"),
  },
  (table) => [
    uniqueIndex("user_roles_scope_unique").on(table.userId, table.role, table.organizationId),
    index("user_roles_user_idx").on(table.userId),
    index("user_roles_org_idx").on(table.organizationId),
  ],
);

export const playerProfiles = sqliteTable(
  "player_profiles",
  {
    userId: text("user_id").primaryKey(),
    homeCity: text("home_city"),
    homeRegionCode: text("home_region_code"),
    postalCode: text("postal_code"),
    experienceLevel: text("experience_level"),
    throwingHand: text("throwing_hand"),
    controlledDistanceFeet: integer("controlled_distance_feet"),
    backhandDistanceFeet: integer("backhand_distance_feet"),
    forehandDistanceFeet: integer("forehand_distance_feet"),
    puttingConfidence: integer("putting_confidence"),
    externalRating: integer("external_rating"),
    pdgaNumber: text("pdga_number"),
    avatarKey: text("avatar_key"),
    bio: text("bio"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").default(1).notNull(),
  },
);

export const playerPreferences = sqliteTable(
  "player_preferences",
  {
    userId: text("user_id").primaryKey(),
    courseDifficulty: text("course_difficulty"),
    playStyle: text("play_style"),
    desiredGroupSize: integer("desired_group_size"),
    socialMatchmaking: integer("social_matchmaking", { mode: "boolean" }).default(false).notNull(),
    aiRecommendations: integer("ai_recommendations", { mode: "boolean" }).default(true).notNull(),
    tournamentNotifications: integer("tournament_notifications", { mode: "boolean" }).default(false).notNull(),
    units: text("units").default("IMPERIAL").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
);

export const playerPrivacySettings = sqliteTable(
  "player_privacy_settings",
  {
    userId: text("user_id").primaryKey(),
    profileVisibility: text("profile_visibility").default("PRIVATE").notNull(),
    showHomeCity: integer("show_home_city", { mode: "boolean" }).default(false).notNull(),
    showRoundHistory: integer("show_round_history", { mode: "boolean" }).default(false).notNull(),
    showBag: integer("show_bag", { mode: "boolean" }).default(false).notNull(),
    allowMessages: text("allow_messages").default("CONNECTIONS").notNull(),
    allowGameInvites: integer("allow_game_invites", { mode: "boolean" }).default(true).notNull(),
    analyticsOptIn: integer("analytics_opt_in", { mode: "boolean" }).default(false).notNull(),
    aiTrainingOptIn: integer("ai_training_opt_in", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
);

export const consentRecords = sqliteTable(
  "consent_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    consentType: text("consent_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    granted: integer("granted", { mode: "boolean" }).notNull(),
    recordedAt: text("recorded_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [index("consent_records_user_type_idx").on(table.userId, table.consentType)],
);

export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    regionCode: text("region_code").notNull(),
    countryCode: text("country_code").default("US").notNull(),
    postalCode: text("postal_code"),
    addressLine1: text("address_line_1"),
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    holeCount: integer("hole_count"),
    operationalStatus: text("operational_status").default("STATUS_UNVERIFIED").notNull(),
    availabilityType: text("availability_type"),
    verificationLevel: text("verification_level").default("SOURCE_REVIEW_REQUIRED").notNull(),
    claimStatus: text("claim_status").default("UNCLAIMED").notNull(),
    isPublished: integer("is_published", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_region_city_idx").on(table.regionCode, table.city),
    index("courses_operational_status_idx").on(table.operationalStatus),
  ],
);

export const courseSources = sqliteTable(
  "course_sources",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type").notNull(),
    externalId: text("external_id"),
    observation: text("observation"),
    checkedAt: text("checked_at").notNull(),
    isAuthoritative: integer("is_authoritative", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("course_sources_type_external_unique").on(table.sourceType, table.externalId),
    index("course_sources_course_idx").on(table.courseId),
  ],
);

export const courseStatusObservations = sqliteTable(
  "course_status_observations",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    status: text("status").notNull(),
    sourceId: text("source_id").notNull(),
    observedAt: text("observed_at").notNull(),
    expiresAt: text("expires_at"),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("course_status_course_observed_idx").on(table.courseId, table.observedAt)],
);

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
