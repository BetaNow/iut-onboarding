CREATE TABLE `screen_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` text NOT NULL,
	`department` enum('info','sgm','both') NOT NULL DEFAULT 'both',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSeenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screen_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `screen_slug` UNIQUE(`slug`)
);

--> statement-breakpoint
-- The two panels that exist today, keeping /info and /sgm working now that a
-- screen is a database row rather than a hard-coded slug. Idempotent, so a
-- database that already has them is left alone.
INSERT INTO `screen_table` (`slug`, `name`, `department`, `isActive`)
VALUES
	('info', 'BUT Informatique', 'info', true),
	('sgm', 'BUT SGM', 'sgm', true)
AS new
ON DUPLICATE KEY UPDATE `slug` = new.`slug`;
