ALTER TABLE `practice_measurements` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `practice_measurements` ADD `deleted_at` text;