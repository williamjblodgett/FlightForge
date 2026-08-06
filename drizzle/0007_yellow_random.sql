-- The domain foundation migration created these tables before they were represented
-- in the typed Drizzle schema. This migration adds only the production query indexes.
CREATE INDEX IF NOT EXISTS `media_analysis_jobs_user_created_idx` ON `media_analysis_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `media_analysis_results_job_idx` ON `media_analysis_results` (`media_analysis_job_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `media_uploads_user_created_idx` ON `media_uploads` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `media_uploads_expiry_idx` ON `media_uploads` (`status`,`expires_at`);
