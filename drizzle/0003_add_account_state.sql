CREATE TABLE `user_state` (
  `user_id` text NOT NULL,
  `state_key` text NOT NULL,
  `value_json` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`user_id`, `state_key`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_state_user_id_idx` ON `user_state` (`user_id`);
