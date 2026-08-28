import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import { createPool } from 'mysql2/promise'
import * as schema from '../database'

let database: MySql2Database<typeof schema> | undefined

export function useDatabase(): MySql2Database<typeof schema> {
  if (!database) {
    const config = useRuntimeConfig()
    const pool = createPool(config.databaseUrl)

    database = drizzle(pool, { schema, mode: 'default' })
  }

  return database
}
