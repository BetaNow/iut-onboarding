const ICON = '/windows98-icons/png'

/** Time on screen for a module whose row does not say otherwise. */
export const MODULE_DEFAULT_DURATION = 30_000

// A module fetches when it mounts, so a turn shorter than its own request never
// finishes drawing.
export const DURATION_MIN_MS = 5_000
export const DURATION_MAX_MS = 3_600_000

// The id is the component filename, kebab-cased: memes -> MemesModule.vue.
// app/utils/modules.ts globs the components directory through this, so there is
// no registry to update. catalogue.test.ts checks the pairing.
export function componentFileForModuleId(id: string): string {
  const pascal = id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  return `${pascal}Module.vue`
}

export function moduleIdFromComponentFile(file: string): string {
  return file
    .replace(/Module\.vue$/, '')
    .replace(/(?<!^)([A-Z])/g, '-$1')
    .toLowerCase()
}

export type ModuleSettingValue = string | number | boolean

export interface ModuleSettingOption {
  value: string
  label: string
}

// One editable option. The admin builds its form from this list alone, so
// declaring an option here is the only edit needed.
export interface ModuleSettingField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select'
  default: ModuleSettingValue
  help?: string
  /** `select` only. */
  options?: ModuleSettingOption[]
  /** `number` only. */
  min?: number
  max?: number
}

export interface ModuleDefinition {
  /** Stable identifier. This is what the config rows reference. */
  id: string
  label: string
  icon: string
  defaultDurationMs: number
  // Pass the screen's department to the module. Off by default, or a module
  // that never asked for it gets a stray attribute on its root element.
  usesDepartment?: boolean
  settings: ModuleSettingField[]
}

// Every module that can be put into a rotation. Metadata only and free of Vue
// imports, so the server can validate saved rows against it too. The components
// are in app/utils/modules.ts, keyed by these ids.
export const MODULE_CATALOGUE: ModuleDefinition[] = [
  {
    id: 'memes',
    label: 'Memes',
    icon: `${ICON}/directory_open_file_mydocs-4.png`,
    defaultDurationMs: MODULE_DEFAULT_DURATION,
    usesDepartment: true,
    // One subreddit per department: a module in the Commun list plays on Info
    // and SGM alike. The module reads the key matching the screen it is on.
    settings: [
      {
        key: 'subreddit_info',
        label: 'Subreddit (Info)',
        type: 'text',
        default: 'ProgrammerHumor',
        help: 'Sans le préfixe r/.',
      },
      {
        key: 'subreddit_sgm',
        label: 'Subreddit (SGM)',
        type: 'text',
        default: 'ProgrammerHumor',
        help: 'Sans le préfixe r/.',
      },
    ],
  },
]

// Splits stored rows into the ones the catalogue still describes and the ones it
// does not. Deleting a module leaves its rows behind, and a row with no
// definition has no label, icon or settings form to render.
export function partitionKnown<Row extends { moduleId: string }>(
  rows: Row[],
  catalogue: ModuleDefinition[] = MODULE_CATALOGUE,
): { known: Row[], strays: Row[] } {
  const declared = new Set(catalogue.map(module => module.id))

  return {
    known: rows.filter(row => declared.has(row.moduleId)),
    strays: rows.filter(row => !declared.has(row.moduleId)),
  }
}

export function findModuleDefinition(id: string): ModuleDefinition | undefined {
  return MODULE_CATALOGUE.find(module => module.id === id)
}

/** The settings a module starts with before anyone has edited it. */
export function defaultSettings(definition: ModuleDefinition): Record<string, ModuleSettingValue> {
  return Object.fromEntries(definition.settings.map(field => [field.key, field.default]))
}

// A module as the display receives it: ready to mount, nothing left to look up.
export interface ResolvedModule {
  moduleId: string
  label: string
  icon: string
  durationMs: number
  usesDepartment: boolean
  settings: Record<string, ModuleSettingValue>
}
