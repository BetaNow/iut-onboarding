CREATE TABLE `crous_menu_item_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`menuId` int NOT NULL,
	`category` enum('Entrée','Plat','Dessert') NOT NULL,
	`name` varchar(255) NOT NULL,
	`ordre` int NOT NULL DEFAULT 0,
	CONSTRAINT `crous_menu_item_table_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crous_menu_item_menu_idx` ON `crous_menu_item_table` (`menuId`);--> statement-breakpoint
ALTER TABLE `crous_menu_table` DROP COLUMN `payload`;