import { eq } from 'drizzle-orm'
import { screenTable } from '../../../database/screens'
import { useDatabase } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant d\'écran invalide.' })
  }

  const body = await readBody<{ isActive?: unknown }>(event)

  // Deliberately the only writable field: the admin turns a panel on and off,
  // it does not rename or re-home one.
  if (typeof body?.isActive !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '« isActive » doit être un booléen.' })
  }

  const db = useDatabase()

  const [existing] = await db
    .select({ id: screenTable.id })
    .from(screenTable)
    .where(eq(screenTable.id, id))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Écran introuvable.' })
  }

  await db
    .update(screenTable)
    .set({ isActive: body.isActive })
    .where(eq(screenTable.id, id))

  return { ok: true }
})
