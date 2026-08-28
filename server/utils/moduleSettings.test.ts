import { describe, expect, it } from 'vitest'
import type { ModuleDefinition } from '../../shared/modules/catalogue'
import { ModuleSettingsError, validateSettings } from './moduleSettings'

const definition: ModuleDefinition = {
  id: 'demo',
  label: 'Demo',
  icon: '/demo.png',
  defaultDurationMs: 30_000,
  settings: [
    { key: 'subreddit', label: 'Subreddit', type: 'text', default: 'ProgrammerHumor' },
    { key: 'count', label: 'Nombre', type: 'number', default: 3, min: 1, max: 10 },
    { key: 'muted', label: 'Muet', type: 'boolean', default: false },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      default: 'jour',
      options: [{ value: 'jour', label: 'Jour' }, { value: 'nuit', label: 'Nuit' }],
    },
  ],
}

describe('validateSettings', () => {
  it('fills every declared key from the defaults when given nothing', () => {
    expect(validateSettings(definition, {})).toEqual({
      subreddit: 'ProgrammerHumor',
      count: 3,
      muted: false,
      mode: 'jour',
    })
  })

  it('keeps supplied values', () => {
    expect(validateSettings(definition, { subreddit: 'aww', count: 7, muted: true, mode: 'nuit' }))
      .toEqual({ subreddit: 'aww', count: 7, muted: true, mode: 'nuit' })
  })

  it('keeps keys the module never declared, so a blob written straight into the database survives a save', () => {
    expect(validateSettings(definition, { subreddit: 'aww', subreddit_info: 'ProgrammerHumor', subreddit_sgm: 'materials' }))
      .toMatchObject({ subreddit_info: 'ProgrammerHumor', subreddit_sgm: 'materials' })
  })

  it('keeps undeclared numbers and booleans as they are', () => {
    expect(validateSettings(definition, { extra_count: 7, extra_flag: true }))
      .toMatchObject({ extra_count: 7, extra_flag: true })
  })

  it('rejects an undeclared value that is not a primitive', () => {
    expect(() => validateSettings(definition, { nested: { a: 1 } })).toThrow(ModuleSettingsError)
    expect(() => validateSettings(definition, { list: [1, 2] })).toThrow(ModuleSettingsError)
  })

  it('accepts a numeric string, since form fields produce them', () => {
    expect(validateSettings(definition, { count: '7' })).toMatchObject({ count: 7 })
  })

  it('rejects a number outside the declared range', () => {
    expect(() => validateSettings(definition, { count: 99 })).toThrow(ModuleSettingsError)
    expect(() => validateSettings(definition, { count: 0 })).toThrow(ModuleSettingsError)
  })

  it('rejects a value of the wrong type', () => {
    expect(() => validateSettings(definition, { subreddit: 42 })).toThrow(ModuleSettingsError)
    expect(() => validateSettings(definition, { count: 'not a number' })).toThrow(ModuleSettingsError)
    expect(() => validateSettings(definition, { muted: 'yes' })).toThrow(ModuleSettingsError)
  })

  it('rejects a select value that is not one of the declared options', () => {
    expect(() => validateSettings(definition, { mode: 'crépuscule' })).toThrow(ModuleSettingsError)
  })

  it('names the offending field in the error', () => {
    expect(() => validateSettings(definition, { count: 99 })).toThrow(/Nombre/)
  })

  it('rejects a settings blob that is not an object', () => {
    expect(() => validateSettings(definition, 'nope')).toThrow(ModuleSettingsError)
    expect(() => validateSettings(definition, null)).toThrow(ModuleSettingsError)
  })

  it('gives a module with no declared settings whatever the row carries', () => {
    const plain: ModuleDefinition = { ...definition, settings: [] }

    expect(validateSettings(plain, { anything: 'here' })).toEqual({ anything: 'here' })
  })
})
