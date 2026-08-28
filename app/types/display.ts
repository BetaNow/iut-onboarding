import type { Component } from 'vue'
import type { ResolvedModule } from '#shared/modules/catalogue'
import type { Department } from '#shared/types/department'

/** A module the panel can actually mount: the wire shape plus its component. */
export interface RuntimeModule extends ResolvedModule {
  component: Component
}

export interface ScreenConfigResponse {
  screen: {
    slug: string
    name: string
    department: Department
    isActive: boolean
  }
  modules: ResolvedModule[]
  version: string
}
