import { boolean, mysqlEnum, mysqlTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { Department } from '../../shared/types/department'

export const screenTable = mysqlTable('screen_table', {
  id: serial().primaryKey(),
  // The panel's URL. varchar rather than text so it can carry a unique index:
  // the display resolves a screen by slug.
  slug: varchar({ length: 100 }).notNull(),
  name: text().notNull(),
  department: mysqlEnum(Department).notNull().default(Department.BOTH),
  isActive: boolean().notNull().default(true),
  /** Last heartbeat. Null until the panel has checked in once. */
  lastSeenAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
}, table => [
  uniqueIndex('screen_slug').on(table.slug),
])
