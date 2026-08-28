CREATE TABLE `meme_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`postLink` text NOT NULL,
	`subreddit` varchar(100) NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`author` varchar(255) NOT NULL,
	`preview` json NOT NULL,
	`department` enum('info','sgm','both') NOT NULL DEFAULT 'both',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meme_table_id` PRIMARY KEY(`id`)
);
