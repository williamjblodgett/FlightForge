ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `password_bootstrap_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `users`
SET `must_change_password` = true, `password_bootstrap_version` = 0
WHERE lower(`email`) = 'jphillips@demo.flightforge.app' AND `is_test_account` = true;
