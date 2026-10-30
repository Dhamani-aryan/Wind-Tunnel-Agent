CREATE TABLE `live_quota` (
	`quota_key` text PRIMARY KEY NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
