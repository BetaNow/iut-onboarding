import type { ModuleDefinition, ModuleSettingValue } from '#shared/modules/catalogue'
import type { Department } from '#shared/types/department'

export interface AdminScreen {
  id: number
  slug: string
  name: string
  department: Department
  isActive: boolean
  lastSeenAt: string | null
}

export interface ConfigRow {
  id: number
  moduleId: string
  department: Department
  position: number
  durationMs: number
  isEnabled: boolean
  settings: Record<string, ModuleSettingValue>
  updatedAt: string
}

export interface AdminConfigResponse {
  rows: ConfigRow[]
  catalogue: ModuleDefinition[]
  limits: {
    minDurationMs: number
    maxDurationMs: number
  }
}

/** A module as the editor holds it: the saved shape, minus what the server owns. */
export interface DraftModule {
  moduleId: string
  durationMs: number
  isEnabled: boolean
  settings: Record<string, ModuleSettingValue>
}
