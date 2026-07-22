CREATE TABLE `coaches` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` text NOT NULL,
  `name` text NOT NULL,
  `role` text NOT NULL,
  `email` text NOT NULL DEFAULT '',
  `source_url` text NOT NULL,
  `verified_at` integer NOT NULL
);
CREATE INDEX `coaches_school_id_idx` ON `coaches` (`school_id`);
CREATE TABLE `user_uploads` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `kind` text NOT NULL,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size` integer NOT NULL,
  `object_key` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE INDEX `user_uploads_user_id_idx` ON `user_uploads` (`user_id`);
