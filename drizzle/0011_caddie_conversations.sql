CREATE TABLE IF NOT EXISTS `caddie_conversations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `knowledge_version` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `deleted_at` text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `caddie_conversations_user_updated_idx` ON `caddie_conversations` (`user_id`, `updated_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `caddie_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `conversation_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `provider` text,
  `model_version` text,
  `confidence` text,
  `safety_result` text,
  `created_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `caddie_messages_conversation_created_idx` ON `caddie_messages` (`conversation_id`, `created_at`);
