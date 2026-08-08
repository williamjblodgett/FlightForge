CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `consumed_at` text,
  `created_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `email_verification_tokens_hash_unique` ON `email_verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_verification_tokens_user_idx` ON `email_verification_tokens` (`user_id`, `expires_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization_course_access` (
  `organization_id` text NOT NULL,
  `course_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`organization_id`, `course_id`)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `organization_course_access_course_idx` ON `organization_course_access` (`course_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `coordinator_applications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `organization_id` text,
  `organization_name` text NOT NULL,
  `course_id` text,
  `requested_role` text NOT NULL,
  `experience` text NOT NULL,
  `status` text NOT NULL DEFAULT 'PENDING',
  `reviewed_by` text,
  `review_reason` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `coordinator_applications_status_idx` ON `coordinator_applications` (`status`, `created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `course_correction_requests` (
  `id` text PRIMARY KEY NOT NULL, `course_id` text, `course_name` text NOT NULL,
  `reporter_name` text NOT NULL, `reporter_email` text NOT NULL, `correction_type` text NOT NULL,
  `details` text NOT NULL, `source_url` text, `status` text NOT NULL DEFAULT 'PENDING',
  `created_at` text NOT NULL, `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `course_correction_requests_status_idx` ON `course_correction_requests` (`status`, `created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `coordinator_invitations` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `organization_id` text NOT NULL,
  `course_id` text,
  `role` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `accepted_at` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `coordinator_invitations_token_unique` ON `coordinator_invitations` (`token_hash`);--> statement-breakpoint
ALTER TABLE `events` ADD `time_zone` text NOT NULL DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE `events` ADD `layout_id` text;--> statement-breakpoint
ALTER TABLE `events` ADD `hole_count` integer NOT NULL DEFAULT 18;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_participants` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `course_id` text NOT NULL,
  `layout_id` text,
  `status` text NOT NULL DEFAULT 'REGISTERED',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `event_participants_event_user_unique` ON `event_participants` (`event_id`, `user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_participants_user_idx` ON `event_participants` (`user_id`, `status`);--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `layout_id` text;--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `participant_id` text;--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `sanitized_storage_key` text;--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `sanitization_status` text NOT NULL DEFAULT 'QUARANTINED';--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `sanitization_reason` text;--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `duration_source` text NOT NULL DEFAULT 'CLIENT_UNTRUSTED';--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `transcript` text;--> statement-breakpoint
ALTER TABLE `hole_highlight_videos` ADD `captions_vtt` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hole_highlight_videos_sanitization_idx` ON `hole_highlight_videos` (`sanitization_status`, `created_at`);--> statement-breakpoint
ALTER TABLE `rounds` ADD `event_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `rounds_user_event_active_unique` ON `rounds` (`created_by`, `event_id`) WHERE `status` = 'IN_PROGRESS';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `hole_scores_scorecard_hole_unique` ON `hole_scores` (`scorecard_id`, `hole_number`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `round_score_audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `round_id` text NOT NULL,
  `scorecard_id` text NOT NULL,
  `hole_number` integer NOT NULL,
  `actor_user_id` text NOT NULL,
  `from_strokes` integer,
  `to_strokes` integer NOT NULL,
  `from_penalties` integer,
  `to_penalties` integer NOT NULL,
  `client_mutation_id` text NOT NULL,
  `created_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `round_score_audit_mutation_unique` ON `round_score_audit_events` (`client_mutation_id`);--> statement-breakpoint
ALTER TABLE `import_batches` ADD `uploaded_by` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `payload_hash` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `preview_json` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `applied_at` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `rolled_back_at` text;--> statement-breakpoint
ALTER TABLE `import_batches` ADD `rollback_json` text;--> statement-breakpoint
UPDATE `course_evidence`
SET `review_status` = CASE
  WHEN `valid_until` IS NULL THEN 'REVIEW_DUE'
  WHEN datetime(`valid_until`) < datetime('now') THEN 'STALE'
  WHEN datetime(`valid_until`) < datetime('now', '+30 days') THEN 'REVIEW_DUE'
  ELSE 'CURRENT'
END;--> statement-breakpoint
PRAGMA optimize;
