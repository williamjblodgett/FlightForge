ALTER TABLE `courses` ADD `facility_id` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `record_type` text DEFAULT 'COURSE' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `location_precision` text DEFAULT 'DIRECTORY_APPROXIMATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `next_review_due_at` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `archived_reason` text;--> statement-breakpoint
ALTER TABLE `course_sources` ADD `valid_until` text;--> statement-breakpoint
ALTER TABLE `course_sources` ADD `supported_fields` text;--> statement-breakpoint
CREATE TABLE `course_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_id` text NOT NULL,
	`field_code` text NOT NULL,
	`evidence_value` text,
	`checked_at` text NOT NULL,
	`valid_until` text,
	`review_status` text DEFAULT 'APPROVED' NOT NULL,
	`reviewed_by` text,
	`created_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `course_evidence_course_source_field_unique` ON `course_evidence` (`course_id`,`source_id`,`field_code`);--> statement-breakpoint
CREATE INDEX `course_evidence_review_due_idx` ON `course_evidence` (`review_status`,`valid_until`);--> statement-breakpoint
PRAGMA optimize;
