CREATE TABLE `notice` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notice_created` ON `notice` (`created_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `email_replies` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `email_strings` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `email_announcements` integer DEFAULT true NOT NULL;