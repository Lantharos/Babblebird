CREATE TABLE `contribution` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`edits` integer DEFAULT 0 NOT NULL,
	`last_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contribution_recent` ON `contribution` (`user_id`,`last_at`);--> statement-breakpoint
ALTER TABLE `project` ADD `progress` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `project` ADD `pending` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `shard`;
