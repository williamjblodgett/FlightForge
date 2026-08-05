-- Production event publishing, sourced disc catalog, physical bag inventory,
-- and evidence-aware caddie profiles. The domain foundation in 0003 already
-- owns the base manufacturers, discs, bags, and AI tables, so this migration
-- extends those tables instead of recreating them.

CREATE TABLE `catalog_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `source_type` text NOT NULL,
  `source_name` text NOT NULL,
  `source_url` text NOT NULL,
  `license_note` text,
  `checked_at` text NOT NULL,
  `is_authoritative` integer DEFAULT false NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_sources_url_unique` ON `catalog_sources` (`source_url`);
--> statement-breakpoint
CREATE INDEX `catalog_sources_type_idx` ON `catalog_sources` (`source_type`);
--> statement-breakpoint

CREATE TABLE `disc_rating_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `disc_mold_id` text NOT NULL,
  `disc_variant_id` text,
  `source_id` text NOT NULL,
  `rating_system` text NOT NULL,
  `speed` real NOT NULL,
  `glide` real NOT NULL,
  `turn` real NOT NULL,
  `fade` real NOT NULL,
  `effective_from` text NOT NULL,
  `effective_to` text,
  `is_current` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disc_rating_versions_identity_unique`
  ON `disc_rating_versions` (`disc_mold_id`, `source_id`, `effective_from`);
--> statement-breakpoint
CREATE INDEX `disc_rating_versions_current_idx`
  ON `disc_rating_versions` (`disc_mold_id`, `is_current`);
--> statement-breakpoint

CREATE TABLE `plastic_families` (
  `id` text PRIMARY KEY NOT NULL,
  `manufacturer_id` text NOT NULL,
  `source_id` text NOT NULL,
  `name` text NOT NULL,
  `durability_class` text,
  `grip_class` text,
  `stability_note` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plastic_families_manufacturer_name_unique`
  ON `plastic_families` (`manufacturer_id`, `name`);
--> statement-breakpoint

ALTER TABLE `disc_molds` ADD `slug` text;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `pdga_certification_number` text;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `approved_at` text;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `max_weight_grams` real;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `diameter_cm` real;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `height_cm` real;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `rim_depth_cm` real;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `rim_thickness_cm` real;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `is_active` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `disc_molds` ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE INDEX `disc_molds_category_idx` ON `disc_molds` (`category`);
--> statement-breakpoint

ALTER TABLE `disc_variants` ADD `plastic_family_id` text;
--> statement-breakpoint
ALTER TABLE `disc_variants` ADD `run_name` text;
--> statement-breakpoint
ALTER TABLE `disc_variants` ADD `source_id` text;
--> statement-breakpoint
ALTER TABLE `disc_variants` ADD `is_active` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `disc_variants` ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE INDEX `disc_variants_mold_idx` ON `disc_variants` (`disc_mold_id`);
--> statement-breakpoint

ALTER TABLE `player_discs` ADD `disc_mold_id` text;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `rating_version_id` text;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `manual_speed` real;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `manual_glide` real;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `manual_turn` real;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `manual_fade` real;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `wear_rating` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `dome_profile` text;
--> statement-breakpoint
ALTER TABLE `player_discs` ADD `run_name` text;
--> statement-breakpoint
CREATE INDEX `player_discs_user_status_idx` ON `player_discs` (`user_id`, `status`);
--> statement-breakpoint
CREATE INDEX `player_discs_mold_idx` ON `player_discs` (`disc_mold_id`);
--> statement-breakpoint
CREATE INDEX `player_discs_variant_idx` ON `player_discs` (`disc_variant_id`);
--> statement-breakpoint
CREATE INDEX `bags_user_active_idx` ON `bags` (`user_id`, `is_active`);
--> statement-breakpoint
CREATE INDEX `bag_slots_bag_sort_idx` ON `bag_slots` (`bag_id`, `sort_order`);
--> statement-breakpoint

CREATE TABLE `player_disc_profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `player_disc_id` text NOT NULL,
  `throw_type` text NOT NULL,
  `sample_count` integer DEFAULT 0 NOT NULL,
  `typical_distance_feet` real,
  `success_rate` real,
  `observed_turn` real,
  `observed_fade` real,
  `confidence` real DEFAULT 0 NOT NULL,
  `updated_at` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_disc_profiles_disc_throw_unique`
  ON `player_disc_profiles` (`player_disc_id`, `throw_type`);
--> statement-breakpoint
CREATE INDEX `player_disc_profiles_user_idx` ON `player_disc_profiles` (`user_id`);
--> statement-breakpoint

CREATE TABLE `disc_observations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `player_disc_id` text NOT NULL,
  `ai_recommendation_id` text,
  `throw_type` text NOT NULL,
  `intended_shape` text,
  `result` text NOT NULL,
  `miss_direction` text,
  `distance_feet` integer,
  `wind_mph` integer,
  `wind_direction` text,
  `representative` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `disc_observations_disc_created_idx`
  ON `disc_observations` (`player_disc_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `ai_sessions_user_feature_idx` ON `ai_sessions` (`user_id`, `feature`);
--> statement-breakpoint
CREATE INDEX `ai_recommendations_user_created_idx` ON `ai_recommendations` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `ai_feedback_recommendation_idx` ON `ai_feedback` (`ai_recommendation_id`);
--> statement-breakpoint

CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `organizer_user_id` text NOT NULL,
  `organizer_email` text NOT NULL,
  `organization_name` text NOT NULL,
  `event_type` text NOT NULL,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `description` text NOT NULL,
  `course_id` text,
  `venue_name` text NOT NULL,
  `address_line_1` text,
  `city` text NOT NULL,
  `region_code` text NOT NULL,
  `country_code` text DEFAULT 'US' NOT NULL,
  `starts_at` text NOT NULL,
  `ends_at` text NOT NULL,
  `registration_opens_at` text,
  `registration_closes_at` text,
  `registration_url` text,
  `contact_email` text NOT NULL,
  `capacity` integer,
  `entry_fee_cents` integer DEFAULT 0 NOT NULL,
  `currency` text DEFAULT 'USD' NOT NULL,
  `format` text NOT NULL,
  `divisions_json` text NOT NULL,
  `accessibility_notes` text,
  `status` text DEFAULT 'DRAFT' NOT NULL,
  `visibility` text DEFAULT 'PUBLIC' NOT NULL,
  `published_at` text,
  `cancelled_at` text,
  `cancellation_reason` text,
  `idempotency_key` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `deleted_at` text,
  `version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_idempotency_unique` ON `events` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `events_public_schedule_idx` ON `events` (`status`, `visibility`, `starts_at`);
--> statement-breakpoint
CREATE INDEX `events_organizer_updated_idx` ON `events` (`organizer_user_id`, `updated_at`);
--> statement-breakpoint

CREATE TABLE `event_audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `actor_user_id` text NOT NULL,
  `action` text NOT NULL,
  `from_status` text,
  `to_status` text,
  `reason` text,
  `metadata_json` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `event_audit_event_created_idx`
  ON `event_audit_events` (`event_id`, `created_at`);
