ALTER TABLE `user` ADD `credit_name` text;--> statement-breakpoint
ALTER TABLE `user` ADD `credited` integer DEFAULT true NOT NULL;