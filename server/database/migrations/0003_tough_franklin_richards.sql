CREATE TABLE `crous_menu_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`service` varchar(16) NOT NULL,
	`payload` json NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crous_menu_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `crous_menu_restaurant_date_service_unique` UNIQUE(`restaurantId`,`date`,`service`)
);
--> statement-breakpoint
CREATE INDEX `crous_menu_date_idx` ON `crous_menu_table` (`date`);