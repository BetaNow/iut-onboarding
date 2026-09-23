import type { ModuleDefinition, ModuleSettingField, ModuleSettingValue } from '../../shared/modules/catalogue'

// A rejected settings blob. The message is shown in the admin form, so it is
// written for whoever is editing it.
export class ModuleSettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleSettingsError'
  }
}

// A data URL this size decodes to roughly 2.2 MB — plenty for a kiosk
// announcement graphic, small enough to keep in a JSON column without
// bumping into MySQL's default max_allowed_packet.
const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|gif|webp);base64,/

function coerce(field: ModuleSettingField, value: unknown): ModuleSettingValue {
  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') {
        throw new ModuleSettingsError(`« ${field.label} » doit être du texte.`)
      }

      return value
    }

    case 'number': {
      // A number field in a form arrives as a string often enough that refusing
      // one would be pedantry rather than validation.
      const parsed = typeof value === 'number' ? value : Number(value)

      if (typeof value === 'boolean' || value === '' || !Number.isFinite(parsed)) {
        throw new ModuleSettingsError(`« ${field.label} » doit être un nombre.`)
      }

      if (field.min !== undefined && parsed < field.min) {
        throw new ModuleSettingsError(`« ${field.label} » doit être au moins ${field.min}.`)
      }

      if (field.max !== undefined && parsed > field.max) {
        throw new ModuleSettingsError(`« ${field.label} » ne peut pas dépasser ${field.max}.`)
      }

      return parsed
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        throw new ModuleSettingsError(`« ${field.label} » doit être coché ou décoché.`)
      }

      return value
    }

    case 'select': {
      const allowed = field.options?.map(option => option.value) ?? []

      if (typeof value !== 'string' || !allowed.includes(value)) {
        throw new ModuleSettingsError(`« ${field.label} » n'accepte pas cette valeur.`)
      }

      return value
    }

    case 'image': {
      if (typeof value !== 'string') {
        throw new ModuleSettingsError(`« ${field.label} » doit être une image.`)
      }

      if (value === '') {
        return value
      }

      if (!IMAGE_DATA_URL_PATTERN.test(value)) {
        throw new ModuleSettingsError(`« ${field.label} » doit être une image PNG, JPEG, GIF ou WebP.`)
      }

      if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
        throw new ModuleSettingsError(`« ${field.label} » est trop lourde (2 Mo maximum).`)
      }

      return value
    }
  }
}

function isPrimitive(value: unknown): value is ModuleSettingValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

// Checks a settings blob against the module's declaration, fills in defaults for
// missing declared keys, and keeps the rest as it stands.
//
// Undeclared keys are kept, not dropped: the admin renders a field for whatever
// it finds, so stripping them would delete keys on the first save. They still
// have to be primitives, since the display spreads this object onto a component.
export function validateSettings(definition: ModuleDefinition, input: unknown): Record<string, ModuleSettingValue> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ModuleSettingsError('Les réglages doivent être un objet.')
  }

  const supplied = input as Record<string, unknown>
  const declared = new Set(definition.settings.map(field => field.key))

  const settings: Record<string, ModuleSettingValue> = Object.fromEntries(
    definition.settings.map((field) => {
      const value = supplied[field.key]

      return [field.key, value === undefined ? field.default : coerce(field, value)]
    }),
  )

  for (const [key, value] of Object.entries(supplied)) {
    if (declared.has(key)) {
      continue
    }

    if (!isPrimitive(value)) {
      throw new ModuleSettingsError(`« ${key} » doit être du texte, un nombre ou un booléen.`)
    }

    settings[key] = value
  }

  return settings
}
