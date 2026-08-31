import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import type {
  TbmNetworkLevel,
  TbmNetworkIncident,
  TbmNetworkService,
  TbmNetworkStatus,
} from '#shared/types/tbm-network.ts'

const TRACKED_LINES = {
  bus: {
    id: 'bus',
    label: 'Bus',
    lineLabel: 'Ligne 31',
    lineRef: 'bordeaux:Line:31:LOC',
  },
  tram: {
    id: 'tram',
    label: 'Tram',
    lineLabel: 'Tram B',
    lineRef: 'bordeaux:Line:60:LOC',
  },
} as const

const LEVEL_PRIORITY: Record<TbmNetworkLevel, number> = {
  normal: 0,
  info: 1,
  warning: 2,
  disruption: 3,
}

const getWorstLevel = (
  current: TbmNetworkLevel,
  candidate: TbmNetworkLevel,
): TbmNetworkLevel => {
  const currentPriority = LEVEL_PRIORITY[current] ?? 0
  const candidatePriority = LEVEL_PRIORITY[candidate] ?? 0

  return candidatePriority > currentPriority ? candidate : current
}

const getLevelFromEffect = (
  effect?: number | null,
): TbmNetworkLevel => {
  const Effect = GtfsRealtimeBindings.transit_realtime.Alert.Effect

  switch (effect) {
    case Effect.NO_SERVICE:
      return 'disruption'

    case Effect.REDUCED_SERVICE:
    case Effect.SIGNIFICANT_DELAYS:
    case Effect.DETOUR:
    case Effect.MODIFIED_SERVICE:
    case Effect.STOP_MOVED:
      return 'warning'

    default:
      return 'info'
  }
}

const getText = (
  translated?: GtfsRealtimeBindings.transit_realtime.ITranslatedString | null,
): string | null => {
  const translations = translated?.translation ?? []

  const frenchTranslation = translations.find(translation =>
    translation.language?.toLowerCase().startsWith('fr'),
  )

  return frenchTranslation?.text
    ?? translations[0]?.text
    ?? null
}

const getAlertMessage = (
  gtfsAlert: GtfsRealtimeBindings.transit_realtime.IAlert,
): string => {
  return getText(gtfsAlert.descriptionText)
    ?? getText(gtfsAlert.headerText)
    ?? 'Information trafic communiquée par TBM.'
}

const alertTargetsLine = (
  gtfsAlert: GtfsRealtimeBindings.transit_realtime.IAlert,
  lineRef: string,
): boolean => {
  const entities = gtfsAlert.informedEntity ?? []
  if (entities.length === 0) {
    return true
  }

  return entities.some((entity) => {
    return entity.routeId === lineRef
      || entity.trip?.routeId === lineRef
  })
}

export const parseTbmAlerts = (
  buffer: ArrayBuffer,
): TbmNetworkStatus => {
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer),
  )
  console.log(
    JSON.stringify(
      feed.entity?.map(entity => ({
        id: entity.id,
        effect: entity.alert?.effect,
        informedEntity: entity.alert?.informedEntity,
      })),
      null,
      2,
    ),
  )

  const services: TbmNetworkService[] = [
    {
      id: TRACKED_LINES.bus.id,
      label: TRACKED_LINES.bus.label,
      level: 'normal',
    },
    {
      id: TRACKED_LINES.tram.id,
      label: TRACKED_LINES.tram.label,
      level: 'normal',
    },
  ]

  const incidents: TbmNetworkIncident[] = []

  for (const entity of feed.entity ?? []) {
    if (!entity.alert) {
      continue
    }

    const gtfsAlert = entity.alert
    const level = getLevelFromEffect(gtfsAlert.effect)
    const message = getAlertMessage(gtfsAlert)

    const affectedLines = [
      TRACKED_LINES.bus,
      TRACKED_LINES.tram,
    ].filter(line => alertTargetsLine(gtfsAlert, line.lineRef))

    for (const line of affectedLines) {
      const service = services.find(item => item.id === line.id)

      if (service) {
        service.level = getWorstLevel(service.level, level)
      }

      if (level !== 'normal') {
        incidents.push({
          id: `${entity.id ?? 'tbm-alert'}-${line.id}`,
          level,
          line: line.lineLabel,
          message,
        })
      }
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    services,
    incidents,
  }
}
