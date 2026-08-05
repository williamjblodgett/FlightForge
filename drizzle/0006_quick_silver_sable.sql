CREATE UNIQUE INDEX `disc_observations_recommendation_user_unique` ON `disc_observations` (`ai_recommendation_id`,`user_id`);
--> statement-breakpoint
INSERT INTO `feature_flags` (`key`, `description`, `enabled`, `rules_json`, `updated_at`)
VALUES
  ('digital_bag', 'Persistent physical disc inventory and sourced catalog', true, NULL, datetime('now')),
  ('ai_caddie', 'Explainable owned-disc recommendation rules engine', true, NULL, datetime('now')),
  ('event_publishing', 'Coordinator-owned event draft and publication workflow', true, NULL, datetime('now'))
ON CONFLICT (`key`) DO NOTHING;
