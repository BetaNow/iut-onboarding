import { eq, inArray } from 'drizzle-orm'
import { moduleConfigTable } from '../../../database/moduleConfig'
import { screenTable } from '../../../database/screens'
import { useDatabase } from '../../../utils/database'
import { configVersion, relevantDepartments, resolveRotation } from '../../../utils/rotation'

// Everything a panel needs to run: who it is and the rotation it should play.
// Public on purpose, since a screen in a corridor has no session, and this
// exposes nothing an onlooker could not read off the wall.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Écran non précisé.' })
  }

  const db = useDatabase()

  const [screen] = await db
    .select()
    .from(screenTable)
    .where(eq(screenTable.slug, slug))
    .limit(1)

  if (!screen) {
    throw createError({ statusCode: 404, statusMessage: 'Écran introuvable.' })
  }

  const rows = await db
    .select()
    .from(moduleConfigTable)
    .where(inArray(moduleConfigTable.department, relevantDepartments(screen.department)))

  return {
    screen: {
      slug: screen.slug,
      name: screen.name,
      department: screen.department,
      isActive: screen.isActive,
    },
    modules: resolveRotation(rows, screen.department),
    version: configVersion(rows),
  }
})
