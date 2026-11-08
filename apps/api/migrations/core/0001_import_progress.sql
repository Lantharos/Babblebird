ALTER TABLE `project` ADD `import_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project` ADD `import_done` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project` ADD `import_started_at` integer;