import { defineEventHandler, getQuery } from 'h3'
import { asc, and, eq, gte, inArray } from 'drizzle-orm'
import { useDatabase } from '../utils/database'
import {
  crousMenuTable,
  crousMenuItemTable,
} from '#server/database'

type CrousMenuItem = {
  category: 'Entrée' | 'Plat' | 'Dessert'
  name: string
}

type CrousMenuDay = {
  date: string
  label: string
  service: string
  items: CrousMenuItem[]
}

type CrousMenuResponse = {
  restaurantName: string
  restaurantCity: string
  days: CrousMenuDay[]
}

const RESTAURANT_CODE = 19

function getLocalIsoDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${year}-${month}-${day}`
}

function formatDateLabel(dateIso: string, todayIso: string) {
  const date = new Date(`${dateIso}T12:00:00`)
  const today = new Date(`${todayIso}T12:00:00`)

  const differenceInDays = Math.round(
    (date.getTime() - today.getTime()) / 86_400_000,
  )

  if (differenceInDays === 0) {
    return 'Aujourd’hui'
  }

  if (differenceInDays === 1) {
    return 'Demain'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

export default defineEventHandler(async (event): Promise<CrousMenuResponse> => {
  const query = getQuery(event)
  const db = useDatabase()

  const requestedDays = Number(query.daysAhead ?? 3)

  const daysAhead = Number.isInteger(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), 7)
    : 3

  const today = new Date()
  const todayIso = getLocalIsoDate(today)

  const menuRows = await db
    .select()
    .from(crousMenuTable)
    .where(
      and(
        eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
        gte(crousMenuTable.date, todayIso),
      ),
    )
    .orderBy(asc(crousMenuTable.date))
    .limit(daysAhead)

  if (!menuRows.length) {
    return {
      restaurantName: '(S)pace\' Campus - Resto U\'',
      restaurantCity: 'Pessac',
      days: [],
    }
  }

  const menuIds = menuRows.map(row => row.id)

  const itemRows = await db
    .select()
    .from(crousMenuItemTable)
    .where(inArray(crousMenuItemTable.menuId, menuIds))
    .orderBy(asc(crousMenuItemTable.ordre))
  const itemsByMenuId = new Map<number, CrousMenuItem[]>()

  for (const item of itemRows) {
    const list = itemsByMenuId.get(item.menuId) ?? []
    list.push({ category: item.category, name: item.name })
    itemsByMenuId.set(item.menuId, list)
  }

  const days: CrousMenuDay[] = menuRows.map(row => ({
    date: row.date,
    service: row.service,
    label: formatDateLabel(row.date, todayIso),
    items: itemsByMenuId.get(row.id) ?? [],
  }))

  return {
    restaurantName: '(S)pace\' Campus - Resto U\'',
    restaurantCity: 'Pessac',
    days,
  }
})
