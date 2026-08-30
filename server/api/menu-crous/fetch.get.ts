/**
 * API route that fetches the restaurant menu from the CROUStillant service,
 * normalizes the response, and stores the valid menu in the database.
 *
 * The handler accepts an `offsetDays` query parameter so the client can request
 * a menu starting from today or from a nearby day in the next week. It will try
 * several consecutive dates until a valid menu is found, then insert or replace
 * the corresponding row in `crousMenuTable`.
 */
import { createError, defineEventHandler, getQuery } from 'h3'
import { and, eq } from 'drizzle-orm'
import { useDatabase } from '../../utils/database'
import {
  crousMenuTable,
  type CrousMenuItem,
  type CrousMenuPayload,
} from '#server/database'

type CrousApiDish = {
  code: number
  ordre: number
  libelle: string
}

type CrousApiCategory = {
  code: number
  libelle: string
  ordre: number
  plats: CrousApiDish[]
}

type CrousApiRepas = {
  code: number
  type: string
  categories: CrousApiCategory[]
}

type CrousApiData = {
  code: number
  date: string
  repas: CrousApiRepas[]
}

type CrousApiResponse = {
  success: boolean
  data: CrousApiData
}

const RESTAURANT_CODE = 19
const MAX_DAYS_TO_TRY = 7

const CROUS_USER_AGENT = 'IUT-Onboarding/1.0 (timothe.velasco@orange.fr) [Affichage des menus des restaurants universitaires sur panneau d accueil IUT]'

/**
 * Builds the date string expected by the CROUStillant API and the ISO date
 * used internally in the database.
 *
 * The API requires a day-month-year format, while the persisted menu payload uses
 * the ISO YYYY-MM-DD format for easier filtering and comparisons.
 */
function getTargetDate(offsetDays: number) {
  const date = new Date()

  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())

  return {
    apiDate: `${day}-${month}-${year}`,
    isoDate: `${year}-${month}-${day}`,
  }
}

/**
 * Converts a raw category label from the external API into the normalized
 * category values used by the application.
 *
 * The CROUStillant API may return labels such as "Entrées", "Desserts", or
 * other variants. The function strips accents and performs a keyword-based
 * mapping so the application can rely on consistent values: `Entrée`, `Plat`,
 * and `Dessert`.
 */
function normalizeCategory(categoryName: string): CrousMenuItem['category'] {
  const label = categoryName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  if (label.includes('entree')) {
    return 'Entrée'
  }

  if (label.includes('dessert')) {
    return 'Dessert'
  }

  return 'Plat'
}

/**
 * Fetches a single menu for one day and converts it into the application's
 * normalized internal payload.
 *
 * The handler checks whether the source API returns a valid response for the
 * requested date, picks the lunch service when available, and drops empty/blank
 * dish names before returning the data. If the date has no menu, the function
 * returns `null` so the caller can continue to the next day.
 */
async function tryFetchMenuForOffset(offset: number): Promise<CrousMenuPayload | null> {
  const { apiDate, isoDate } = getTargetDate(offset)
  const url = `https://api.croustillant.menu/v1/restaurants/${RESTAURANT_CODE}/menu/${apiDate}`

  let apiResponse: CrousApiResponse

  try {
    apiResponse = await $fetch<CrousApiResponse>(url, {
      headers: {
        'User-Agent': CROUS_USER_AGENT,
      },
    })
  }
  catch (e: unknown) {
    const error = e as { status?: number, statusCode?: number, response?: { status?: number }, data?: { statusCode?: number } }

    const status
      = error?.status
        ?? error?.statusCode
        ?? error?.response?.status
        ?? error?.data?.statusCode

    if (status === 404) {
      console.log(`[crous] Aucun menu le ${apiDate} (404), on essaie le jour suivant`)
      return null
    }

    console.error('[crous] Erreur inattendue lors de l’appel à CROUStillant:', error)
    throw createError({
      statusCode: 502,
      statusMessage: `Impossible de contacter CROUStillant pour le ${apiDate}`,
    })
  }

  if (apiResponse.data.date !== apiDate) {
    console.warn(`[crous] Date retournée (${apiResponse.data.date}) ≠ date demandée (${apiDate})`)
    return null
  }

  const meal = apiResponse.data.repas.find(
    repas => repas.type.toLowerCase() === 'midi',
  ) ?? apiResponse.data.repas[0]

  if (!meal) {
    console.log(`[crous] Aucun repas exploitable le ${apiDate}, on essaie le jour suivant`)
    return null
  }

  const items: CrousMenuItem[] = []

  for (const category of meal.categories) {
    const targetCategory = normalizeCategory(category.libelle)

    for (const dish of category.plats) {
      if (!dish.libelle.trim()) {
        continue
      }

      items.push({
        category: targetCategory,
        name: dish.libelle.trim(),
      })
    }
  }

  if (!items.length) {
    console.log(`[crous] Menu vide le ${apiDate}, on essaie le jour suivant`)
    return null
  }

  return {
    date: isoDate,
    service: meal.type.toLowerCase(),
    items,
  }
}

/**
 * HTTP endpoint that retrieves the next available restaurant menu for a given
 * offset day and persists it in the database.
 *
 * Validation ensures `offsetDays` is a non-negative integer in the range 0..7.
 * Then the route scans up to 7 consecutive days, skipping empty dates and
 * stopping as soon as a valid menu is found. Once a menu is saved, it responds
 * with the restaurant identifier, the date, the meal service, and the number of
 * menu items returned.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDatabase()

  const startOffset = Number(query.offsetDays ?? 0)

  if (!Number.isInteger(startOffset) || startOffset < 0 || startOffset > 7) {
    throw createError({
      statusCode: 400,
      statusMessage: 'offsetDays doit être un entier compris entre 0 et 7',
    })
  }

  for (let offset = startOffset; offset < startOffset + MAX_DAYS_TO_TRY; offset++) {
    const payload = await tryFetchMenuForOffset(offset)

    if (!payload) {
      continue
    }

    await db
      .delete(crousMenuTable)
      .where(
        and(
          eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
          eq(crousMenuTable.date, payload.date),
          eq(crousMenuTable.service, payload.service),
        ),
      )

    await db.insert(crousMenuTable).values({
      restaurantId: RESTAURANT_CODE,
      date: payload.date,
      service: payload.service,
      payload,
      fetchedAt: new Date(),
    })

    return {
      ok: true,
      restaurantId: RESTAURANT_CODE,
      date: payload.date,
      service: payload.service,
      itemsCount: payload.items.length,
      skippedDays: offset - startOffset,
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: `Aucun menu trouvé dans les ${MAX_DAYS_TO_TRY} jours suivant offsetDays=${startOffset}`,
  })
})
