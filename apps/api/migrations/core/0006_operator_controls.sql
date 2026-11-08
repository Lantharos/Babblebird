ALTER TABLE `user` ADD `suspended_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `suspended_reason` text;--> statement-breakpoint
ALTER TABLE `project` ADD `paused_at` integer;--> statement-breakpoint
ALTER TABLE `project` ADD `paused_reason` text;--> statement-breakpoint
ALTER TABLE `project` ADD `pult_item` text;