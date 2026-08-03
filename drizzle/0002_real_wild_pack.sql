CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `consent_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`policy_version` text NOT NULL,
	`granted` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `consent_records_user_type_idx` ON `consent_records` (`user_id`,`consent_type`);--> statement-breakpoint
CREATE TABLE `course_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`source_type` text NOT NULL,
	`external_id` text,
	`observation` text,
	`checked_at` text NOT NULL,
	`is_authoritative` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_sources_type_external_unique` ON `course_sources` (`source_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `course_sources_course_idx` ON `course_sources` (`course_id`);--> statement-breakpoint
CREATE TABLE `course_status_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`status` text NOT NULL,
	`source_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`expires_at` text,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `course_status_course_observed_idx` ON `course_status_observations` (`course_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`region_code` text NOT NULL,
	`country_code` text DEFAULT 'US' NOT NULL,
	`postal_code` text,
	`address_line_1` text,
	`latitude` text NOT NULL,
	`longitude` text NOT NULL,
	`hole_count` integer,
	`operational_status` text DEFAULT 'STATUS_UNVERIFIED' NOT NULL,
	`availability_type` text,
	`verification_level` text DEFAULT 'SOURCE_REVIEW_REQUIRED' NOT NULL,
	`claim_status` text DEFAULT 'UNCLAIMED' NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `courses_region_city_idx` ON `courses` (`region_code`,`city`);--> statement-breakpoint
CREATE INDEX `courses_operational_status_idx` ON `courses` (`operational_status`);--> statement-breakpoint
CREATE TABLE `player_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`course_difficulty` text,
	`play_style` text,
	`desired_group_size` integer,
	`social_matchmaking` integer DEFAULT false NOT NULL,
	`ai_recommendations` integer DEFAULT true NOT NULL,
	`tournament_notifications` integer DEFAULT false NOT NULL,
	`units` text DEFAULT 'IMPERIAL' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_privacy_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile_visibility` text DEFAULT 'PRIVATE' NOT NULL,
	`show_home_city` integer DEFAULT false NOT NULL,
	`show_round_history` integer DEFAULT false NOT NULL,
	`show_bag` integer DEFAULT false NOT NULL,
	`allow_messages` text DEFAULT 'CONNECTIONS' NOT NULL,
	`allow_game_invites` integer DEFAULT true NOT NULL,
	`analytics_opt_in` integer DEFAULT false NOT NULL,
	`ai_training_opt_in` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`home_city` text,
	`home_region_code` text,
	`postal_code` text,
	`experience_level` text,
	`throwing_hand` text,
	`controlled_distance_feet` integer,
	`backhand_distance_feet` integer,
	`forehand_distance_feet` integer,
	`putting_confidence` integer,
	`external_rating` integer,
	`pdga_number` text,
	`avatar_key` text,
	`bio` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`organization_id` text,
	`created_at` text NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_scope_unique` ON `user_roles` (`user_id`,`role`,`organization_id`);--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_org_idx` ON `user_roles` (`organization_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`password_iterations` integer,
	`auth_provider_subject` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`is_test_account` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`onboarding_completed_at` text,
	`last_signed_in_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_provider_subject_unique` ON `users` (`auth_provider_subject`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);