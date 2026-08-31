// server/utils/tbm-parser.ts
import type { StopMonitoringResponse, TbmPassage, TbmStopConfig } from '~/types/siri'

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
