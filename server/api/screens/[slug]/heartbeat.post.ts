import { eq, inArray } from 'drizzle-orm'
import { moduleConfigTable } from '../../../database/moduleConfig'
import { screenTable } from '../../../database/screens'
import { useDatabase } from '../../../utils/database'
import { configVersion, relevantDepartments } from '../../../utils/rotation'

// A panel checking in. Keeps lastSeenAt current for the admin, and returns the
// version stamp so a panel running untouched for days notices a change and
// refetches its configuration.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Écran non précisé.' })
  }

  const db = useDatabase()

  const [screen] = await db
    .select({
      id: screenTable.id,
      department: screenTable.department,
      isActive: screenTable.isActive,
    })
    .from(screenTable)
    .where(eq(screenTable.slug, slug))
    .limit(1)

  if (!screen) {
    throw createError({ statusCode: 404, statusMessage: 'Écran introuvable.' })
  }

  await db
    .update(screenTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(screenTable.id, screen.id))

  const rows = await db
    .select({ updatedAt: moduleConfigTable.updatedAt })
    .from(moduleConfigTable)
    .where(inArray(moduleConfigTable.department, relevantDepartments(screen.department)))

  return {
    version: configVersion(rows),
    isActive: screen.isActive,
  }
})
