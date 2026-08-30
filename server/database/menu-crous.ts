import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

export const crousMenuTable = mysqlTable(
  'crous_menu_table',
  {
    id: serial().primaryKey(),
    restaurantId: int().notNull(),
    date: varchar({ length: 10 }).notNull(),
    service: varchar({ length: 16 }).notNull(),
    fetchedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    unique('crous_menu_restaurant_date_service_unique').on(
      table.restaurantId,
      table.date,
      table.service,
    ),
    index('crous_menu_date_idx').on(table.date),
  ],
)

export const crousMenuItemTable = mysqlTable(
  'crous_menu_item_table',
  {
    id: serial().primaryKey(),
    menuId: int().notNull(),
    category: mysqlEnum(['Entrée', 'Plat', 'Dessert']).notNull(),
    name: varchar({ length: 255 }).notNull(),
    ordre: int().notNull().default(0),
  },
  table => [
    index('crous_menu_item_menu_idx').on(table.menuId),
  ],
)
