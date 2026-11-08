CREATE TABLE `invitation` (
	`project_id` text NOT NULL,
	`who` text NOT NULL,
	`role` text NOT NULL,
	`languages` text,
	`areas` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `who`),
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invitation_who` ON `invitation` (`who`);