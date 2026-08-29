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

// Essaie de récupérer le menu pour un jour précis.
// Retourne le payload en cas de succès, ou `null` si aucun menu n'existe ce jour-là (404).
// Lève une erreur pour tout autre problème (réseau, format inattendu, etc.).
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

  // On avance jour après jour tant qu'on ne trouve pas de menu.
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
