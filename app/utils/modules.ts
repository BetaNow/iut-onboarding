import type { Component } from 'vue'
import { moduleIdFromComponentFile } from '#shared/modules/catalogue'

const found = import.meta.glob<{ default: Component }>('../components/modules/*Module.vue', { eager: true })

// Keyed by filename: WeatherModule.vue -> `weather`. Nothing is registered by
// hand. The catalogue entry in shared/modules/catalogue.ts holds the label,
// icon and duration, and stays free of Vue imports so the server can read it.
//
// A missing half on either side is silent at runtime, so catalogue.test.ts
// fails the build on it.
export const MODULE_COMPONENTS: Record<string, Component> = Object.fromEntries(
  Object.entries(found).map(([path, module]) => [
    moduleIdFromComponentFile(path.slice(path.lastIndexOf('/') + 1)),
    module.default,
  ]),
)
