ALTER TABLE `rounds` ADD `session_key` text;
--> statement-breakpoint
ALTER TABLE `rounds` ADD `context_json` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_user_session_unique` ON `rounds` (`created_by`, `session_key`);
