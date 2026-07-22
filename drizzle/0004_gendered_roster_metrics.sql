ALTER TABLE `program_metrics` RENAME TO `program_metrics_legacy`;
--> statement-breakpoint
CREATE TABLE `program_metrics` (
  `school_id` text NOT NULL,
  `event` text NOT NULL,
  `gender` text NOT NULL,
  `roster_average` real NOT NULL,
  `recruiting_benchmark` real NOT NULL DEFAULT 0,
  `sample_size` integer NOT NULL DEFAULT 0,
  `season` text NOT NULL DEFAULT '',
  `standard_type` text NOT NULL DEFAULT 'Verified roster average',
  PRIMARY KEY (`school_id`, `event`, `gender`)
);
--> statement-breakpoint
INSERT INTO `program_metrics` (`school_id`,`event`,`gender`,`roster_average`,`recruiting_benchmark`,`sample_size`,`season`,`standard_type`)
SELECT `school_id`,`event`,'Men',`roster_average`,`recruiting_benchmark`,`sample_size`,`season`,`standard_type` FROM `program_metrics_legacy`;
--> statement-breakpoint
DROP TABLE `program_metrics_legacy`;
--> statement-breakpoint
CREATE INDEX `program_metrics_lookup_idx` ON `program_metrics` (`school_id`,`event`,`gender`);
