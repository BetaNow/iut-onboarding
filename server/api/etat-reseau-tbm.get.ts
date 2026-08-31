import type { TbmNetworkStatus } from '#shared/types/tbm-network.ts'

interface CachedPayload {
  data: TbmNetworkStatus
  expiresAt: number
}

const CACHE_TTL_MS = 15_000

export default defineEventHandler(async () => {
  const storage = useStorage('cache')
  const cacheKey = 'tbm:etat-reseau'
  const cached = await storage.getItem<CachedPayload>(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const config = useRuntimeConfig()

  const raw = await $fetch<ArrayBuffer>(
    'https://bdx.mecatran.com/utw/ws/gtfsfeed/alerts/bordeaux',
    {
      query: {
        apiKey: config.tbmApiKey
          ?? 'opendata-bordeaux-metropole-flux-gtfs-rt',
      },
      responseType: 'arrayBuffer',
      headers: {
        Accept: 'application/x-protobuf',
      },
    },
  )
  const data = parseTbmAlerts(raw)

  await storage.setItem(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return data
})
