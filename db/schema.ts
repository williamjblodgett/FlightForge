import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    passwordIterations: integer("password_iterations"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).default(false).notNull(),
    passwordBootstrapVersion: integer("password_bootstrap_version").default(0).notNull(),
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
    facilityId: text("facility_id"),
    recordType: text("record_type").default("COURSE").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    regionCode: text("region_code").notNull(),
    countryCode: text("country_code").default("US").notNull(),
    postalCode: text("postal_code"),
    addressLine1: text("address_line_1"),
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    locationPrecision: text("location_precision").default("DIRECTORY_APPROXIMATE").notNull(),
    holeCount: integer("hole_count"),
    operationalStatus: text("operational_status").default("STATUS_UNVERIFIED").notNull(),
    availabilityType: text("availability_type"),
    verificationLevel: text("verification_level").default("SOURCE_REVIEW_REQUIRED").notNull(),
    claimStatus: text("claim_status").default("UNCLAIMED").notNull(),
    isPublished: integer("is_published", { mode: "boolean" }).default(true).notNull(),
    nextReviewDueAt: text("next_review_due_at"),
    archivedReason: text("archived_reason"),
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
    validUntil: text("valid_until"),
    supportedFields: text("supported_fields"),
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

export const catalogSources = sqliteTable(
  "catalog_sources",
  {
    id: text("id").primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    licenseNote: text("license_note"),
    checkedAt: text("checked_at").notNull(),
    isAuthoritative: integer("is_authoritative", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("catalog_sources_url_unique").on(table.sourceUrl),
    index("catalog_sources_type_idx").on(table.sourceType),
  ],
);

export const manufacturers = sqliteTable(
  "manufacturers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    website: text("website"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("manufacturers_slug_unique").on(table.slug)],
);

export const discMolds = sqliteTable(
  "disc_molds",
  {
    id: text("id").primaryKey(),
    manufacturerId: text("manufacturer_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug"),
    category: text("category").notNull(),
    speed: text("speed"),
    glide: text("glide"),
    turn: text("turn"),
    fade: text("fade"),
    approvedReference: text("approved_reference"),
    pdgaCertificationNumber: text("pdga_certification_number"),
    approvedAt: text("approved_at"),
    maxWeightGrams: real("max_weight_grams"),
    diameterCm: real("diameter_cm"),
    heightCm: real("height_cm"),
    rimDepthCm: real("rim_depth_cm"),
    rimThicknessCm: real("rim_thickness_cm"),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("disc_molds_manufacturer_name_unique").on(table.manufacturerId, table.name),
    index("disc_molds_category_idx").on(table.category),
  ],
);

export const discRatingVersions = sqliteTable(
  "disc_rating_versions",
  {
    id: text("id").primaryKey(),
    discMoldId: text("disc_mold_id").notNull(),
    discVariantId: text("disc_variant_id"),
    sourceId: text("source_id").notNull(),
    ratingSystem: text("rating_system").notNull(),
    speed: real("speed").notNull(),
    glide: real("glide").notNull(),
    turn: real("turn").notNull(),
    fade: real("fade").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    isCurrent: integer("is_current", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("disc_rating_versions_identity_unique").on(
      table.discMoldId,
      table.sourceId,
      table.effectiveFrom,
    ),
    index("disc_rating_versions_current_idx").on(table.discMoldId, table.isCurrent),
  ],
);

export const plasticFamilies = sqliteTable(
  "plastic_families",
  {
    id: text("id").primaryKey(),
    manufacturerId: text("manufacturer_id").notNull(),
    sourceId: text("source_id").notNull(),
    name: text("name").notNull(),
    durabilityClass: text("durability_class"),
    gripClass: text("grip_class"),
    stabilityNote: text("stability_note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("plastic_families_manufacturer_name_unique").on(table.manufacturerId, table.name),
  ],
);

export const discVariants = sqliteTable(
  "disc_variants",
  {
    id: text("id").primaryKey(),
    discMoldId: text("disc_mold_id").notNull(),
    plastic: text("plastic"),
    plasticFamilyId: text("plastic_family_id"),
    runName: text("run_name"),
    weightGrams: integer("weight_grams"),
    color: text("color"),
    stability: text("stability"),
    sourceId: text("source_id"),
    catalogMetadataJson: text("catalog_metadata_json"),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [index("disc_variants_mold_idx").on(table.discMoldId)],
);

export const playerDiscs = sqliteTable(
  "player_discs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    discMoldId: text("disc_mold_id"),
    discVariantId: text("disc_variant_id"),
    ratingVersionId: text("rating_version_id"),
    manufacturerName: text("manufacturer_name"),
    moldName: text("mold_name").notNull(),
    manualSpeed: real("manual_speed"),
    manualGlide: real("manual_glide"),
    manualTurn: real("manual_turn"),
    manualFade: real("manual_fade"),
    plastic: text("plastic"),
    weightGrams: integer("weight_grams"),
    color: text("color"),
    nickname: text("nickname"),
    condition: text("condition"),
    wearRating: integer("wear_rating").default(0).notNull(),
    domeProfile: text("dome_profile"),
    runName: text("run_name"),
    status: text("status").default("IN_BAG").notNull(),
    purchaseDate: text("purchase_date"),
    purchasePriceCents: integer("purchase_price_cents"),
    photoKey: text("photo_key"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    index("player_discs_user_status_idx").on(table.userId, table.status),
    index("player_discs_mold_idx").on(table.discMoldId),
    index("player_discs_variant_idx").on(table.discVariantId),
  ],
);

export const bags = sqliteTable(
  "bags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    bagType: text("bag_type").default("PRIMARY").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("bags_user_active_idx").on(table.userId, table.isActive)],
);

export const bagSlots = sqliteTable(
  "bag_slots",
  {
    id: text("id").primaryKey(),
    bagId: text("bag_id").notNull(),
    playerDiscId: text("player_disc_id").notNull(),
    category: text("category"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("bag_slots_bag_disc_unique").on(table.bagId, table.playerDiscId),
    index("bag_slots_bag_sort_idx").on(table.bagId, table.sortOrder),
  ],
);

export const playerDiscProfiles = sqliteTable(
  "player_disc_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    playerDiscId: text("player_disc_id").notNull(),
    throwType: text("throw_type").notNull(),
    sampleCount: integer("sample_count").default(0).notNull(),
    typicalDistanceFeet: real("typical_distance_feet"),
    successRate: real("success_rate"),
    observedTurn: real("observed_turn"),
    observedFade: real("observed_fade"),
    confidence: real("confidence").default(0).notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("player_disc_profiles_disc_throw_unique").on(table.playerDiscId, table.throwType),
    index("player_disc_profiles_user_idx").on(table.userId),
  ],
);

export const discObservations = sqliteTable(
  "disc_observations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    playerDiscId: text("player_disc_id").notNull(),
    aiRecommendationId: text("ai_recommendation_id"),
    throwType: text("throw_type").notNull(),
    intendedShape: text("intended_shape"),
    result: text("result").notNull(),
    missDirection: text("miss_direction"),
    distanceFeet: integer("distance_feet"),
    windMph: integer("wind_mph"),
    windDirection: text("wind_direction"),
    representative: integer("representative", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("disc_observations_disc_created_idx").on(table.playerDiscId, table.createdAt),
    uniqueIndex("disc_observations_recommendation_user_unique").on(table.aiRecommendationId, table.userId),
  ],
);

export const aiSessions = sqliteTable(
  "ai_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    feature: text("feature").notNull(),
    provider: text("provider"),
    modelVersion: text("model_version"),
    promptVersion: text("prompt_version"),
    outputSchemaVersion: text("output_schema_version"),
    status: text("status").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    latencyMs: integer("latency_ms"),
    usageJson: text("usage_json"),
    costMicros: integer("cost_micros"),
    safetyResult: text("safety_result"),
    failureReason: text("failure_reason"),
  },
  (table) => [index("ai_sessions_user_feature_idx").on(table.userId, table.feature)],
);

export const aiRecommendations = sqliteTable(
  "ai_recommendations",
  {
    id: text("id").primaryKey(),
    aiSessionId: text("ai_session_id").notNull(),
    userId: text("user_id").notNull(),
    recommendationType: text("recommendation_type").notNull(),
    inputSummaryJson: text("input_summary_json").notNull(),
    outputJson: text("output_json").notNull(),
    confidence: text("confidence"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at"),
  },
  (table) => [index("ai_recommendations_user_created_idx").on(table.userId, table.createdAt)],
);

export const aiFeedback = sqliteTable(
  "ai_feedback",
  {
    id: text("id").primaryKey(),
    aiRecommendationId: text("ai_recommendation_id").notNull(),
    userId: text("user_id").notNull(),
    rating: text("rating"),
    correctionJson: text("correction_json"),
    comment: text("comment"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("ai_feedback_recommendation_idx").on(table.aiRecommendationId)],
);

export const mediaUploads = sqliteTable(
  "media_uploads",
  {
    id: text("id").primaryKey(), userId: text("user_id").notNull(), storageKey: text("storage_key").notNull(),
    mediaType: text("media_type").notNull(), mimeType: text("mime_type").notNull(), byteSize: integer("byte_size").notNull(),
    durationMs: integer("duration_ms"), width: integer("width"), height: integer("height"), status: text("status").notNull(),
    metadataStripped: integer("metadata_stripped", { mode: "boolean" }).default(false).notNull(), expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull(), deletedAt: text("deleted_at"),
  },
  (table) => [index("media_uploads_user_created_idx").on(table.userId, table.createdAt), index("media_uploads_expiry_idx").on(table.status, table.expiresAt)],
);

export const courseEvidence = sqliteTable(
  "course_evidence",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    sourceId: text("source_id").notNull(),
    fieldCode: text("field_code").notNull(),
    evidenceValue: text("evidence_value"),
    checkedAt: text("checked_at").notNull(),
    validUntil: text("valid_until"),
    reviewStatus: text("review_status").default("APPROVED").notNull(),
    reviewedBy: text("reviewed_by"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("course_evidence_course_source_field_unique").on(table.courseId, table.sourceId, table.fieldCode),
    index("course_evidence_review_due_idx").on(table.reviewStatus, table.validUntil),
  ],
);

export const mediaAnalysisJobs = sqliteTable(
  "media_analysis_jobs",
  {
    id: text("id").primaryKey(), mediaUploadId: text("media_upload_id").notNull(), userId: text("user_id").notNull(),
    analysisType: text("analysis_type").notNull(), inputContextJson: text("input_context_json").notNull(), status: text("status").notNull(),
    idempotencyKey: text("idempotency_key").notNull(), attempts: integer("attempts").default(0).notNull(), createdAt: text("created_at").notNull(),
    startedAt: text("started_at"), completedAt: text("completed_at"), failureReason: text("failure_reason"),
  },
  (table) => [uniqueIndex("media_analysis_jobs_idempotency_unique").on(table.idempotencyKey), index("media_analysis_jobs_user_created_idx").on(table.userId, table.createdAt)],
);

export const mediaAnalysisResults = sqliteTable(
  "media_analysis_results",
  {
    id: text("id").primaryKey(), mediaAnalysisJobId: text("media_analysis_job_id").notNull(), outputJson: text("output_json").notNull(),
    confidence: text("confidence"), limitationsJson: text("limitations_json"), modelVersionId: text("model_version_id"),
    promptVersionId: text("prompt_version_id"), createdAt: text("created_at").notNull(), deletedAt: text("deleted_at"),
  },
  (table) => [index("media_analysis_results_job_idx").on(table.mediaAnalysisJobId)],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    organizerUserId: text("organizer_user_id").notNull(),
    organizerEmail: text("organizer_email").notNull(),
    organizationName: text("organization_name").notNull(),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    courseId: text("course_id"),
    venueName: text("venue_name").notNull(),
    addressLine1: text("address_line_1"),
    city: text("city").notNull(),
    regionCode: text("region_code").notNull(),
    countryCode: text("country_code").default("US").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    registrationOpensAt: text("registration_opens_at"),
    registrationClosesAt: text("registration_closes_at"),
    registrationUrl: text("registration_url"),
    contactEmail: text("contact_email").notNull(),
    capacity: integer("capacity"),
    entryFeeCents: integer("entry_fee_cents").default(0).notNull(),
    currency: text("currency").default("USD").notNull(),
    format: text("format").notNull(),
    divisionsJson: text("divisions_json").notNull(),
    accessibilityNotes: text("accessibility_notes"),
    status: text("status").default("DRAFT").notNull(),
    visibility: text("visibility").default("PUBLIC").notNull(),
    publishedAt: text("published_at"),
    cancelledAt: text("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    idempotencyKey: text("idempotency_key"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("events_slug_unique").on(table.slug),
    uniqueIndex("events_idempotency_unique").on(table.idempotencyKey),
    index("events_public_schedule_idx").on(table.status, table.visibility, table.startsAt),
    index("events_organizer_updated_idx").on(table.organizerUserId, table.updatedAt),
  ],
);

export const eventAuditEvents = sqliteTable(
  "event_audit_events",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reason: text("reason"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("event_audit_event_created_idx").on(table.eventId, table.createdAt)],
);
