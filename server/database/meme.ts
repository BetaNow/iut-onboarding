import { json, mysqlEnum, mysqlTable, serial, text, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { Department } from '../../shared/types/department.ts'

export const memeTable = mysqlTable('meme_table', {
  id: serial().primaryKey(),
  postLink: text().notNull(),
  subreddit: varchar({ length: 100 }).notNull(),
  title: text().notNull(),
  url: text().notNull(),
  author: varchar({ length: 255 }).notNull(),
  preview: json().$type<string[]>().notNull(),
  department: mysqlEnum(Department).notNull().default(Department.BOTH),
  createdAt: timestamp().notNull().defaultNow(),
})
