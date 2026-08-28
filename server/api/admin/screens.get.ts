import { asc } from 'drizzle-orm'
import { screenTable } from '../../database/screens'
import { useDatabase } from '../../utils/database'

export default defineEventHandler(async () => {
  const db = useDatabase()

  return db
    .select({
      id: screenTable.id,
      slug: screenTable.slug,
      name: screenTable.name,
      department: screenTable.department,
      isActive: screenTable.isActive,
      lastSeenAt: screenTable.lastSeenAt,
    })
    .from(screenTable)
    .orderBy(asc(screenTable.slug))
})
