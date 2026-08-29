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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDatabase()

  const offsetDays = Number(query.offsetDays ?? 0)

  if (!Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays > 7) {
    throw createError({
      statusCode: 400,
      statusMessage: 'offsetDays doit être un entier compris entre 0 et 7',
    })
  }

  const { apiDate, isoDate } = getTargetDate(offsetDays)

  const url = `https://api.croustillant.menu/v1/restaurants/${RESTAURANT_CODE}/menu/${apiDate}`

  let apiResponse: CrousApiResponse

  try {
    apiResponse = await $fetch<CrousApiResponse>(url, {
      headers: {
        'User-Agent': CROUS_USER_AGENT,
      },
    })
  }
  catch (error) {
    console.error('CROUStillant fetch failed:', error)

    throw createError({
      statusCode: 502,
      statusMessage: 'Impossible de récupérer le menu auprès de CROUStillant',
    })
  }

  if (!apiResponse.success || !apiResponse.data) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Réponse invalide de CROUStillant',
    })
  }

  if (apiResponse.data.date !== apiDate) {
    throw createError({
      statusCode: 502,
      statusMessage: `La date retournée par CROUStillant ne correspond pas à ${apiDate}`,
    })
  }

  const meal = apiResponse.data.repas.find(
    repas => repas.type.toLowerCase() === 'midi',
  ) ?? apiResponse.data.repas[0]

  if (!meal) {
    throw createError({
      statusCode: 404,
      statusMessage: `Aucun repas disponible pour le ${apiDate}`,
    })
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
    throw createError({
      statusCode: 404,
      statusMessage: `Le menu du ${apiDate} ne contient aucun plat`,
    })
  }

  const payload: CrousMenuPayload = {
    date: isoDate,
    service: meal.type.toLowerCase(),
    items,
  }

  await db
    .delete(crousMenuTable)
    .where(
      and(
        eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
        eq(crousMenuTable.date, isoDate),
        eq(crousMenuTable.service, payload.service),
      ),
    )

  await db.insert(crousMenuTable).values({
    restaurantId: RESTAURANT_CODE,
    date: isoDate,
    service: payload.service,
    payload,
    fetchedAt: new Date(),
  })

  return {
    ok: true,
    restaurantId: RESTAURANT_CODE,
    date: isoDate,
    service: payload.service,
    itemsCount: items.length,
  }
})
