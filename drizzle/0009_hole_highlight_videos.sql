CREATE TABLE IF NOT EXISTS `hole_highlight_videos` (
  `id` text PRIMARY KEY NOT NULL,
  `course_id` text NOT NULL,
  `event_id` text NOT NULL,
  `hole_number` integer NOT NULL CHECK (`hole_number` BETWEEN 1 AND 36),
  `uploader_user_id` text NOT NULL,
  `uploader_display_name` text NOT NULL,
  `storage_key` text NOT NULL,
  `mime_type` text NOT NULL,
  `byte_size` integer NOT NULL CHECK (`byte_size` > 0 AND `byte_size` <= 26214400),
  `duration_ms` integer NOT NULL CHECK (`duration_ms` > 0 AND `duration_ms` <= 60000),
  `caption` text DEFAULT '' NOT NULL,
  `moderation_status` text DEFAULT 'PENDING' NOT NULL CHECK (`moderation_status` IN ('PENDING', 'APPROVED', 'REJECTED')),
  `moderation_reason` text,
  `moderated_by` text,
  `moderated_at` text,
  `rights_confirmed` integer NOT NULL CHECK (`rights_confirmed` IN (0, 1)),
  `participant_consent_confirmed` integer NOT NULL CHECK (`participant_consent_confirmed` IN (0, 1)),
  `minor_present` integer DEFAULT 0 NOT NULL CHECK (`minor_present` IN (0, 1)),
  `guardian_consent_confirmed` integer DEFAULT 0 NOT NULL CHECK (`guardian_consent_confirmed` IN (0, 1)),
  `idempotency_key` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `deleted_at` text,
  CHECK (`minor_present` = 0 OR `guardian_consent_confirmed` = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS `hole_highlight_videos_idempotency_unique` ON `hole_highlight_videos` (`idempotency_key`);
CREATE INDEX IF NOT EXISTS `hole_highlight_videos_scorecard_idx` ON `hole_highlight_videos` (`course_id`, `event_id`, `hole_number`, `moderation_status`);
CREATE INDEX IF NOT EXISTS `hole_highlight_videos_moderation_idx` ON `hole_highlight_videos` (`moderation_status`, `created_at`);
CREATE INDEX IF NOT EXISTS `hole_highlight_videos_uploader_idx` ON `hole_highlight_videos` (`uploader_user_id`, `created_at`);
PRAGMA optimize;
