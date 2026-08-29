import {
  index,
  int,
  json,
  mysqlTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

export type CrousMenuItem = {
  category: 'Entrée' | 'Plat' | 'Dessert'
  name: string
}

export type CrousMenuPayload = {
  date: string
  service: string
  items: CrousMenuItem[]
}

export const crousMenuTable = mysqlTable(
  'crous_menu_table',
  {
    id: serial().primaryKey(),

    restaurantId: int().notNull(),

    date: varchar({ length: 10 }).notNull(),

    service: varchar({ length: 16 }).notNull(),

    payload: json()
      .$type<CrousMenuPayload>()
      .notNull(),

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
