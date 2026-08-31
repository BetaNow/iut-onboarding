// server/types/siri.ts
export interface SiriRef {
  value: string
}

export type TbmVehicleType = 'bus' | 'tram'

export interface SiriLangValue {
  value: string
  lang?: string
}

export interface MonitoredCall {
  ExpectedArrivalTime?: string
  AimedArrivalTime?: string
  ExpectedDepartureTime?: string
  AimedDepartureTime?: string
  VehicleAtStop?: boolean
}

export interface MonitoredVehicleJourney {
  LineRef?: SiriRef
  DirectionRef?: SiriRef
  DestinationName?: SiriLangValue[]
  MonitoredCall?: MonitoredCall
}

export interface TbmStopResult extends TbmStopConfig {
  passages: TbmPassage[]
}

export interface MonitoredStopVisit {
  RecordedAtTime?: string
  MonitoringRef?: SiriRef
  MonitoredVehicleJourney?: MonitoredVehicleJourney
}

export interface StopMonitoringDelivery {
  ResponseTimestamp?: string
  Version?: string
  Status?: boolean
  MonitoredStopVisit?: MonitoredStopVisit[]
}

export interface ServiceDelivery {
  ResponseTimestamp?: string
  Version?: string
  ProducerRef?: string
  ResponseMessageIdentifier?: string
  StopMonitoringDelivery?: StopMonitoringDelivery[]
}

export interface StopMonitoringResponse {
  Siri: {
    ServiceDelivery: ServiceDelivery
  }
}

export interface TbmStopConfig {
  ref: string
  line: string
  label: string
  direction: string
  type: TbmVehicleType
}

export interface TbmPassage {
  ligne: string
  destination: string
  minutes: number | null
  tempsReel: boolean
  arretRef: string
}
