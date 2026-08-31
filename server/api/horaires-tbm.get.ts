import type { StopMonitoringResponse, TbmStopConfig, TbmStopResult } from '~/types/siri'
import { parseStopMonitoring } from '../utils/tbm-parser.ts'

const STOPS: TbmStopConfig[] = [
  { ref: 'bordeaux:StopPoint:BP:3251:LOC', line: 'bordeaux:Line:31:LOC', label: 'Ligne 31', direction: 'Village 6 IUT (Beausoleil)', type: 'bus' },
  { ref: 'bordeaux:StopPoint:BP:3323:LOC', line: 'bordeaux:Line:31:LOC', label: 'Ligne 31', direction: 'Village 6 IUT (Ambes St Exupery / Cenon Gare)', type: 'bus' },
  { ref: 'bordeaux:StopPoint:BP:3729:LOC', line: 'bordeaux:Line:60:LOC', label: 'Tram B', direction: 'Montaigne - Montesquieu (Berges de la Garonne)', type: 'tram' },
  { ref: 'bordeaux:StopPoint:BP:3730:LOC', line: 'bordeaux:Line:60:LOC', label: 'Tram B', direction: 'Montaigne - Montesquieu (Pessac Centre / France Alouette)', type: 'tram' },
]

interface CachedPayload {
  data: TbmStopResult[]
  expiresAt: number
}

const CACHE_TTL_MS = 15_000

export default defineEventHandler(async () => {
  const storage = useStorage('cache')
  const cacheKey = 'tbm:horaires'
  const cached = await storage.getItem<CachedPayload>(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const config = useRuntimeConfig()

  const results = await Promise.all(
    STOPS.map(async (stop) => {
      const raw = await $fetch<StopMonitoringResponse>(
        'https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/stop-monitoring.json',
        {
          query: {
            AccountKey: config.tbmApiKey ?? 'opendata-bordeaux-metropole-flux-gtfs-rt',
            MonitoringRef: stop.ref,
            LineRef: stop.line,
            MaximumStopVisits: 2,
          },
          headers: { Accept: 'application/json' },
        },
      )
      return { ...stop, passages: parseStopMonitoring(raw, stop) }
    }),
  )

  await storage.setItem(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS })
  return results
})
