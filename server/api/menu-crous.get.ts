/**
 * API route that reads the stored CROUStillant menu data for the campus
 * restaurant and returns a simple set of upcoming days to the client.
 *
 * It keeps the logic light: it filters the database rows for the restaurant and
 * for dates starting today, orders them chronologically, and formats the result
 * into a lightweight payload with labels such as "Aujourd’hui" and "Demain".
 */
import { defineEventHandler, getQuery } from 'h3'
import { and, asc, eq, gte } from 'drizzle-orm'
import { useDatabase } from '../utils/database'
import {
  crousMenuTable,
  type CrousMenuPayload,
} from '#server/database'

type CrousMenuDay = CrousMenuPayload & {
  label: string
}

type CrousMenuResponse = {
  restaurantName: string
  restaurantCity: string
  days: CrousMenuDay[]
}

const RESTAURANT_CODE = 19

/**
 * Builds an ISO date string in the local timezone, using the current date by
 * default.
 *
 * This is used to compare database rows with the current day in a format that is
 * easy to sort and filter. The result is `YYYY-MM-DD`.
 */
function getLocalIsoDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${year}-${month}-${day}`
}

/**
 * Creates a user-friendly label for a menu date based on its distance from the
 * current day.
 *
 * It returns strings such as "Aujourd’hui", "Demain", or the localized weekday
 * and numeric date when the menu is further away.
 */
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

/**
 * Reads the next available menu entries for the campus restaurant and exposes
 * them through the API.
 *
 * The route validates the `daysAhead` query parameter, fetches matching rows for
 * the configured restaurant from the database, and truncates the result to the
 * requested count while preserving chronological order. Finally, it formats a
 * human-readable name and city alongside each day payload for the frontend.
 */
export default defineEventHandler(async (event): Promise<CrousMenuResponse> => {
  const query = getQuery(event)
  const db = useDatabase()

  const requestedDays = Number(query.daysAhead ?? 3)

  const daysAhead = Number.isInteger(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), 7)
    : 3

  const today = new Date()
  const todayIso = getLocalIsoDate(today)

  const rows = await db
    .select()
    .from(crousMenuTable)
    .where(
      and(
        eq(crousMenuTable.restaurantId, RESTAURANT_CODE),
        gte(crousMenuTable.date, todayIso),
      ),
    )
    .orderBy(asc(crousMenuTable.date))

  const days: CrousMenuDay[] = []

  for (const row of rows) {
    if (days.length >= daysAhead) {
      break
    }

    const payload = row.payload as CrousMenuPayload

    days.push({
      date: payload.date,
      service: payload.service,
      items: payload.items,
      label: formatDateLabel(payload.date, todayIso),
    })
  }

  return {
    restaurantName: '(S)pace\' Campus - Resto U\'',
    restaurantCity: 'Pessac',
    days,
  }
})
