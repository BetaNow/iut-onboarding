import { boolean, int, json, mysqlEnum, mysqlTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { Department } from '../../shared/types/department.ts'
import { MODULE_DEFAULT_DURATION } from '../../shared/modules/catalogue.ts'

// One row per module per department: the rotation, as the admin edits it. A
// screen has no row of its own; it reads the `both` rows, then its department's.
//
// `settings` is validated against the catalogue on the way in. No column default,
// because MySQL refuses a literal default on a JSON column.
export const moduleConfigTable = mysqlTable('module_config_table', {
  id: serial().primaryKey(),
  moduleId: varchar({ length: 64 }).notNull(),
  department: mysqlEnum(Department).notNull().default(Department.BOTH),
  /** Order within this department's own list, from zero. */
  position: int().notNull().default(0),
  durationMs: int().notNull().default(MODULE_DEFAULT_DURATION),
  isEnabled: boolean().notNull().default(true),
  settings: json().$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp().notNull().defaultNow().onUpdateNow(),
}, table => [
  // A module appears at most once per department. Without this a repeated save
  // would leave it in the list twice.
  uniqueIndex('module_department').on(table.moduleId, table.department),
])
