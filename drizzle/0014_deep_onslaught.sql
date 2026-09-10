CREATE TABLE `verification_delivery_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`origin` text NOT NULL,
	`return_to` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`lease_token` text,
	`lease_expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_delivery_user_unique` ON `verification_delivery_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_delivery_due_idx` ON `verification_delivery_jobs` (`status`,`next_attempt_at`);