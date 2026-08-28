import { and, eq, notInArray } from 'drizzle-orm'
import { DURATION_MAX_MS, DURATION_MIN_MS, findModuleDefinition } from '../../../../shared/modules/catalogue'
import { Department } from '../../../../shared/types/department'
import { moduleConfigTable } from '../../../database/moduleConfig'
import { ModuleSettingsError, validateSettings } from '../../../utils/moduleSettings'
import { useDatabase } from '../../../utils/database'

interface IncomingModule {
  moduleId?: unknown
  durationMs?: unknown
  isEnabled?: unknown
  settings?: unknown
}

function isDepartment(value: unknown): value is Department {
  return typeof value === 'string' && (Object.values(Department) as string[]).includes(value)
}

// Replaces one department's whole ordered list in a single call. Order is a
// property of the list, so there is no natural per-row request, and taking the
// finished list leaves no window where a half-applied reorder is live.
export default defineEventHandler(async (event) => {
  const department = getRouterParam(event, 'department')

  if (!isDepartment(department)) {
    throw createError({ statusCode: 400, statusMessage: 'Département inconnu.' })
  }

  const body = await readBody<{ modules?: unknown }>(event)

  if (!Array.isArray(body?.modules)) {
    throw createError({ statusCode: 400, statusMessage: '« modules » doit être une liste.' })
  }

  const seen = new Set<string>()

  const prepared = (body.modules as IncomingModule[]).map((entry, index) => {
    const moduleId = entry?.moduleId

    if (typeof moduleId !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Chaque entrée doit nommer un module.' })
    }

    const definition = findModuleDefinition(moduleId)

    if (!definition) {
      throw createError({ statusCode: 400, statusMessage: `Module inconnu : ${moduleId}.` })
    }

    // The unique index catches this too, but as a 500 halfway through the
    // transaction instead of a message the editor can show.
    if (seen.has(moduleId)) {
      throw createError({ statusCode: 400, statusMessage: `« ${definition.label} » figure deux fois dans la liste.` })
    }

    seen.add(moduleId)

    const durationMs = Number(entry?.durationMs)

    if (!Number.isFinite(durationMs) || durationMs < DURATION_MIN_MS || durationMs > DURATION_MAX_MS) {
      throw createError({
        statusCode: 400,
        statusMessage: `La durée de « ${definition.label} » doit être comprise entre ${DURATION_MIN_MS / 1000} et ${DURATION_MAX_MS / 1000} secondes.`,
      })
    }

    if (typeof entry?.isEnabled !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: `L'état de « ${definition.label} » doit être un booléen.` })
    }

    try {
      return {
        moduleId,
        department,
        position: index,
        durationMs: Math.round(durationMs),
        isEnabled: entry.isEnabled,
        settings: validateSettings(definition, entry.settings ?? {}),
      }
    }
    catch (cause) {
      if (cause instanceof ModuleSettingsError) {
        throw createError({ statusCode: 400, statusMessage: `${definition.label} : ${cause.message}` })
      }

      throw cause
    }
  })

  const db = useDatabase()

  await db.transaction(async (tx) => {
    const keptIds = prepared.map(entry => entry.moduleId)

    // Anything the editor left out is gone from this department's list.
    await tx.delete(moduleConfigTable).where(
      keptIds.length
        ? and(eq(moduleConfigTable.department, department), notInArray(moduleConfigTable.moduleId, keptIds))
        : eq(moduleConfigTable.department, department),
    )

    // Upsert, not delete-and-recreate: MySQL leaves updatedAt alone when a row
    // is rewritten with the same values, so a save that changed nothing does not
    // bump the version and send every panel refetching.
    for (const entry of prepared) {
      await tx
        .insert(moduleConfigTable)
        .values(entry)
        .onDuplicateKeyUpdate({
          set: {
            position: entry.position,
            durationMs: entry.durationMs,
            isEnabled: entry.isEnabled,
            settings: entry.settings,
          },
        })
    }
  })

  return { ok: true }
})
