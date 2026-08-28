CREATE TABLE `module_config_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`moduleId` varchar(64) NOT NULL,
	`department` enum('info','sgm','both') NOT NULL DEFAULT 'both',
	`position` int NOT NULL DEFAULT 0,
	`durationMs` int NOT NULL DEFAULT 30000,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`settings` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_config_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_department` UNIQUE(`moduleId`,`department`)
);

--> statement-breakpoint
-- The rotation as it was written in code before the admin existed: memes on
-- every screen, thirty seconds a turn, one subreddit per department. Without
-- this a fresh database has an empty rotation, which is a blank panel rather
-- than a working default.
INSERT INTO `module_config_table` (`moduleId`, `department`, `position`, `durationMs`, `isEnabled`, `settings`)
VALUES
	('memes', 'both', 0, 30000, true, '{"subreddit_info":"ProgrammerHumor","subreddit_sgm":"ProgrammerHumor"}')
AS new
ON DUPLICATE KEY UPDATE `moduleId` = new.`moduleId`;
