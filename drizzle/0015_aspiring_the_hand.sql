CREATE TABLE `companion_rsvps` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`attended` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companion_event_user_unique` ON `companion_rsvps` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `companion_waitlist_idx` ON `companion_rsvps` (`event_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `passport_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`state` text NOT NULL,
	`visited_on` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passport_owner_course_unique` ON `passport_entries` (`user_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `play_group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`status` text NOT NULL,
	`round_id` text,
	`guest_scores_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `play_group_user_unique` ON `play_group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `play_group_status_idx` ON `play_group_members` (`group_id`,`status`);--> statement-breakpoint
CREATE TABLE `play_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`course_id` text NOT NULL,
	`context_json` text NOT NULL,
	`starts_at` text NOT NULL,
	`visibility` text NOT NULL,
	`pace` text NOT NULL,
	`beginners_welcome` integer NOT NULL,
	`capacity` integer NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `play_group_token_unique` ON `play_groups` (`token_hash`);--> statement-breakpoint
CREATE INDEX `play_groups_discovery_idx` ON `play_groups` (`visibility`,`starts_at`);--> statement-breakpoint
CREATE TABLE `player_itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_tool_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`action` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `player_tool_audit_resource_idx` ON `player_tool_audit` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `practice_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`disc_id` text NOT NULL,
	`throw_type` text NOT NULL,
	`distance_feet` real NOT NULL,
	`uncertainty_meters` real NOT NULL,
	`use_for_caddie` integer DEFAULT 0 NOT NULL,
	`measured_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `practice_owner_disc_idx` ON `practice_measurements` (`user_id`,`disc_id`);--> statement-breakpoint
CREATE TABLE `recovery_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`finder_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`course_id` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recovery_case_owner_idx` ON `recovery_cases` (`owner_id`);--> statement-breakpoint
CREATE INDEX `recovery_case_finder_idx` ON `recovery_cases` (`finder_id`);--> statement-breakpoint
CREATE TABLE `recovery_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recovery_case_messages_idx` ON `recovery_messages` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `recovery_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`disc_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recovery_token_unique` ON `recovery_tags` (`token_hash`);--> statement-breakpoint
CREATE INDEX `recovery_owner_idx` ON `recovery_tags` (`user_id`);