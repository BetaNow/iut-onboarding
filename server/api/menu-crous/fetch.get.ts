import { createError, defineEventHandler, getQuery } from 'h3'
import { and, eq } from 'drizzle-orm'
import { useDatabase } from '../../utils/database'
import {
  crousMenuTable,
  crousMenuItemTable,
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

type NormalizedItem = {
  category: 'Entrée' | 'Plat' | 'Dessert'
  name: string
  ordre: number
}

type NormalizedMenu = {
  isoDate: string
  service: string
  items: NormalizedItem[]
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

function normalizeCategory(categoryName: string): NormalizedItem['category'] {
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

async function tryFetchMenuForOffset(offset: number): Promise<NormalizedMenu | null> {
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

  const items: NormalizedItem[] = []
  let ordre = 0

  for (const category of meal.categories) {
    const targetCategory = normalizeCategory(category.libelle)

    for (const dish of category.plats) {
      if (!dish.libelle.trim()) {
        continue
      }

      items.push({
        category: targetCategory,
        name: dish.libelle.trim(),
        ordre: ordre++,
      })
    }
  }

  if (!items.length) {
    console.log(`[crous] Menu vide le ${apiDate}, on essaie le jour suivant`)
    return null
  }

  return {
    isoDate,
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

  for (let offset = startOffset; offset < startOffset + MAX_DAYS_TO_TRY; offset++) {
    const menu = await tryFetchMenuForOffset(offset)

    if (!menu) {
      continue
    }

    const existing = await db
      .select({ id: crousMenuTable.id })
      .from(crousMenuTable)
      .where(
        and(
          eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
          eq(crousMenuTable.date, menu.isoDate),
          eq(crousMenuTable.service, menu.service),
        ),
      )

    for (const row of existing) {
      await db.delete(crousMenuItemTable).where(eq(crousMenuItemTable.menuId, row.id))
    }

    await db
      .delete(crousMenuTable)
      .where(
        and(
          eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
          eq(crousMenuTable.date, menu.isoDate),
          eq(crousMenuTable.service, menu.service),
        ),
      )
    const [insertedMenu] = await db
      .insert(crousMenuTable)
      .values({
        restaurantId: RESTAURANT_CODE,
        date: menu.isoDate,
        service: menu.service,
      })
      .$returningId()

    if (!insertedMenu) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Échec de l’insertion du menu CROUS',
      })
    }

    await db.insert(crousMenuItemTable).values(
      menu.items.map(item => ({
        menuId: insertedMenu.id,
        category: item.category,
        name: item.name,
        ordre: item.ordre,
      })),
    )

    return {
      ok: true,
      restaurantId: RESTAURANT_CODE,
      date: menu.isoDate,
      service: menu.service,
      itemsCount: menu.items.length,
      skippedDays: offset - startOffset,
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: `Aucun menu trouvé dans les ${MAX_DAYS_TO_TRY} jours suivant offsetDays=${startOffset}`,
  })
})
