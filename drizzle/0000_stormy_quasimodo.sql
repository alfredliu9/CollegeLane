CREATE TABLE `program_metrics` (
	`school_id` text NOT NULL,
	`event` text NOT NULL,
	`roster_average` real NOT NULL,
	`recruiting_benchmark` real NOT NULL,
	`sample_size` integer NOT NULL,
	`season` text NOT NULL,
	`standard_type` text NOT NULL,
	PRIMARY KEY(`school_id`, `event`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`region` text NOT NULL,
	`country` text NOT NULL,
	`pathway` text NOT NULL,
	`division` text NOT NULL,
	`conference` text NOT NULL,
	`size` text NOT NULL,
	`majors_json` text NOT NULL,
	`team_category` text NOT NULL,
	`source_url` text NOT NULL,
	`source_label` text NOT NULL,
	`reviewed_at` text NOT NULL
);
