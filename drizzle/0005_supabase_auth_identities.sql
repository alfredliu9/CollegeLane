CREATE TABLE IF NOT EXISTS `auth_identities` (
  `provider` text NOT NULL,
  `provider_subject` text NOT NULL,
  `user_id` text NOT NULL,
  `email` text NOT NULL,
  `created_at` integer NOT NULL,
  PRIMARY KEY(`provider`, `provider_subject`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `auth_identities_provider_email_unique`
ON `auth_identities` (`provider`, `email`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `auth_identities_user_id_idx`
ON `auth_identities` (`user_id`);
