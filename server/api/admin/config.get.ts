import { asc } from 'drizzle-orm'
import { DURATION_MAX_MS, DURATION_MIN_MS, MODULE_CATALOGUE } from '../../../shared/modules/catalogue'
import { moduleConfigTable } from '../../database/moduleConfig'
import { useDatabase } from '../../utils/database'

// Everything the rotation editor needs in one call: the saved rows and the
// catalogue they are drawn from. The settings form is built from the
// declaration, not from anything hard-coded in the page.
export default defineEventHandler(async () => {
  const db = useDatabase()

  const rows = await db
    .select()
    .from(moduleConfigTable)
    .orderBy(asc(moduleConfigTable.position))

  return {
    rows,
    catalogue: MODULE_CATALOGUE,
    limits: { minDurationMs: DURATION_MIN_MS, maxDurationMs: DURATION_MAX_MS },
  }
})
