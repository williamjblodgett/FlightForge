CREATE TABLE `course_claim_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`actor_email` text,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`reason` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `claim_audit_claim_created_idx` ON `course_claim_audit_events` (`claim_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `course_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`applicant_user_email` text NOT NULL,
	`applicant_name` text NOT NULL,
	`applicant_role` text NOT NULL,
	`business_email` text NOT NULL,
	`business_phone` text NOT NULL,
	`website` text,
	`explanation` text NOT NULL,
	`supporting_document_key` text,
	`status` text NOT NULL,
	`reviewed_by` text,
	`review_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_claims_course_applicant_unique` ON `course_claims` (`course_id`,`applicant_user_email`);--> statement-breakpoint
CREATE INDEX `course_claims_status_idx` ON `course_claims` (`status`);--> statement-breakpoint
CREATE TABLE `favorite_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`course_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_courses_user_course_unique` ON `favorite_courses` (`user_email`,`course_id`);--> statement-breakpoint
CREATE INDEX `favorite_courses_user_idx` ON `favorite_courses` (`user_email`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_label` text NOT NULL,
	`status` text NOT NULL,
	`record_count` integer NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_batches_status_idx` ON `import_batches` (`status`);