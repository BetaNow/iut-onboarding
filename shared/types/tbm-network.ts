export type TbmNetworkLevel
  = | 'normal'
    | 'info'
    | 'warning'
    | 'disruption'

export interface TbmNetworkService {
  id: 'bus' | 'tram'
  label: 'Bus' | 'Tram'
  level: TbmNetworkLevel
}

export interface TbmNetworkIncident {
  id: string
  level: Exclude<TbmNetworkLevel, 'normal'>
  line: string
  message: string
}

export interface TbmNetworkStatus {
  updatedAt: string
  services: TbmNetworkService[]
  incidents: TbmNetworkIncident[]
}
