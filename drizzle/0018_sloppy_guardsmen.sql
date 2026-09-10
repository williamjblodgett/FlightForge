CREATE TABLE `league_event_links` (
	`event_id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_tool_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "player_tool_guard_valid" CHECK("player_tool_guards"."valid"=1)
);
