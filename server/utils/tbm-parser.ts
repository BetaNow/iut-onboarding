// server/utils/tbm-parser.ts
import type { StopMonitoringResponse, TbmPassage, TbmStopConfig } from '~/types/siri'
import type {
  TbmNetworkIncident,
  TbmNetworkLevel,
  TbmNetworkService,
  TbmNetworkStatus,
} from '#shared/types/tbm-network.ts'
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

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
  return LEVEL_PRIORITY[candidate] > LEVEL_PRIORITY[current]
    ? candidate
    : current
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

const getTranslatedText = (
  translated?: GtfsRealtimeBindings.transit_realtime.ITranslatedString | null,
): string | null => {
  const translations = translated?.translation ?? []

  const frenchTranslation = translations.find(item =>
    item.language?.toLowerCase().startsWith('fr'),
  )

  return frenchTranslation?.text
    ?? translations[0]?.text
    ?? null
}

const getAlertMessage = (
  alert: GtfsRealtimeBindings.transit_realtime.IAlert,
): string => {
  return getTranslatedText(alert.descriptionText)
    ?? getTranslatedText(alert.headerText)
    ?? 'Information trafic communiquée par TBM.'
}

/*
 * Une alerte peut être associée :
 *
 * - à une ligne via informedEntity.routeId ;
 * - à un trajet via informedEntity.trip.routeId ;
 * - au réseau entier lorsqu'elle ne contient aucune informedEntity.
 *
 * Une alerte globale est affichée pour Bus et Tram, car elle concerne tout
 * le réseau TBM.
 */
const alertTargetsLine = (
  alert: GtfsRealtimeBindings.transit_realtime.IAlert,
  lineRef: string,
): boolean => {
  const entities = alert.informedEntity ?? []

  if (entities.length === 0) {
    return true
  }

  return entities.some((entity) => {
    return entity.routeId === lineRef
      || entity.trip?.routeId === lineRef
  })
}

export const parseTbmAlerts = (
  raw: ArrayBuffer,
): TbmNetworkStatus => {
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(raw),
  )

  const services: TbmNetworkService[] = [
    {
      id: 'bus',
      label: 'Bus',
      level: 'normal',
    },
    {
      id: 'tram',
      label: 'Tram',
      level: 'normal',
    },
  ]

  const incidents: TbmNetworkIncident[] = []

  for (const entity of feed.entity ?? []) {
    if (!entity.alert) {
      continue
    }

    const alert = entity.alert
    const level = getLevelFromEffect(alert.effect)
    const message = getAlertMessage(alert)

    const affectedLines = [
      TRACKED_LINES.bus,
      TRACKED_LINES.tram,
    ].filter(line => alertTargetsLine(alert, line.lineRef))

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

export function parseStopMonitoring(raw: StopMonitoringResponse, meta: TbmStopConfig): TbmPassage[] {
  const visits = raw.Siri.ServiceDelivery.StopMonitoringDelivery?.[0]?.MonitoredStopVisit ?? []
  const now = Date.now()

  return visits
    .map((visit): TbmPassage => {
      const call = visit.MonitoredVehicleJourney?.MonitoredCall
      const arrivalTime = call?.ExpectedArrivalTime ?? call?.AimedArrivalTime

      const minutes = arrivalTime
        ? Math.max(0, Math.round((new Date(arrivalTime).getTime() - now) / 60000))
        : null

      const destination = visit.MonitoredVehicleJourney?.DestinationName?.[0]?.value ?? meta.direction

      return {
        ligne: meta.label,
        destination,
        minutes,
        tempsReel: Boolean(call?.ExpectedArrivalTime),
        arretRef: visit.MonitoringRef?.value ?? meta.ref,
      }
    })
    .sort((a, b) => (a.minutes ?? Number.POSITIVE_INFINITY) - (b.minutes ?? Number.POSITIVE_INFINITY))
}
