import { describe, expect, it } from 'vitest'
import type { ModuleDefinition } from '../../shared/modules/catalogue'
import { Department } from '../../shared/types/department'
import type { ModuleConfigRow } from './rotation'
import { configVersion, resolveRotation } from './rotation'

const CATALOGUE: ModuleDefinition[] = [
  {
    id: 'memes',
    label: 'Memes',
    icon: '/memes.png',
    defaultDurationMs: 30_000,
    usesDepartment: true,
    settings: [{ key: 'subreddit', label: 'Subreddit', type: 'text', default: 'ProgrammerHumor' }],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: '/planning.png',
    defaultDurationMs: 60_000,
    settings: [],
  },
  {
    id: 'ru',
    label: 'Infos & RU',
    icon: '/ru.png',
    defaultDurationMs: 45_000,
    settings: [],
  },
]

function row(overrides: Partial<ModuleConfigRow> & Pick<ModuleConfigRow, 'moduleId' | 'department'>): ModuleConfigRow {
  return {
    position: 0,
    durationMs: 30_000,
    isEnabled: true,
    settings: {},
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('resolveRotation', () => {
  it('plays the shared modules first, then the department its own', () => {
    const rows = [
      row({ moduleId: 'planning', department: Department.INFO, position: 0 }),
      row({ moduleId: 'memes', department: Department.BOTH, position: 0 }),
      row({ moduleId: 'ru', department: Department.BOTH, position: 1 }),
    ]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE).map(m => m.moduleId))
      .toEqual(['memes', 'ru', 'planning'])
  })

  it('orders each group by its own position', () => {
    const rows = [
      row({ moduleId: 'ru', department: Department.BOTH, position: 5 }),
      row({ moduleId: 'memes', department: Department.BOTH, position: 2 }),
    ]

    expect(resolveRotation(rows, Department.SGM, CATALOGUE).map(m => m.moduleId))
      .toEqual(['memes', 'ru'])
  })

  it('ignores rows belonging to another department', () => {
    const rows = [
      row({ moduleId: 'planning', department: Department.SGM }),
      row({ moduleId: 'memes', department: Department.BOTH }),
    ]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE).map(m => m.moduleId))
      .toEqual(['memes'])
  })

  it('gives a shared screen the shared rows only, and not twice', () => {
    const rows = [
      row({ moduleId: 'memes', department: Department.BOTH }),
      row({ moduleId: 'planning', department: Department.INFO }),
    ]

    expect(resolveRotation(rows, Department.BOTH, CATALOGUE).map(m => m.moduleId))
      .toEqual(['memes'])
  })

  it('drops disabled rows', () => {
    const rows = [
      row({ moduleId: 'memes', department: Department.BOTH, isEnabled: false }),
      row({ moduleId: 'ru', department: Department.BOTH, position: 1 }),
    ]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE).map(m => m.moduleId))
      .toEqual(['ru'])
  })

  it('drops a row naming a module the catalogue no longer has', () => {
    const rows = [
      row({ moduleId: 'retired-module', department: Department.BOTH }),
      row({ moduleId: 'memes', department: Department.BOTH, position: 1 }),
    ]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE).map(m => m.moduleId))
      .toEqual(['memes'])
  })

  it('fills in settings the stored row is missing', () => {
    const rows = [row({ moduleId: 'memes', department: Department.BOTH, settings: {} })]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE)[0]!.settings)
      .toEqual({ subreddit: 'ProgrammerHumor' })
  })

  it('keeps the stored setting over the default', () => {
    const rows = [row({ moduleId: 'memes', department: Department.BOTH, settings: { subreddit: 'aww' } })]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE)[0]!.settings)
      .toEqual({ subreddit: 'aww' })
  })

  it('passes through a stored key the catalogue does not declare', () => {
    const rows = [row({
      moduleId: 'memes',
      department: Department.BOTH,
      settings: { subreddit_info: 'ProgrammerHumor', subreddit_sgm: 'materials' },
    })]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE)[0]!.settings)
      .toMatchObject({ subreddit_info: 'ProgrammerHumor', subreddit_sgm: 'materials' })
  })

  it('still drops a stored value that is not a primitive', () => {
    const rows = [row({
      moduleId: 'memes',
      department: Department.BOTH,
      settings: { nested: { a: 1 } },
    })]

    expect(resolveRotation(rows, Department.INFO, CATALOGUE)[0]!.settings)
      .not.toHaveProperty('nested')
  })

  it('carries the duration and whether the module wants the department', () => {
    const rows = [
      row({ moduleId: 'memes', department: Department.BOTH, durationMs: 12_000 }),
      row({ moduleId: 'planning', department: Department.BOTH, position: 1 }),
    ]

    const resolved = resolveRotation(rows, Department.INFO, CATALOGUE)

    expect(resolved[0]).toMatchObject({ durationMs: 12_000, usesDepartment: true })
    expect(resolved[1]).toMatchObject({ usesDepartment: false })
  })
})

describe('configVersion', () => {
  const base = [
    row({ moduleId: 'memes', department: Department.BOTH, updatedAt: new Date('2026-01-01T00:00:00Z') }),
    row({ moduleId: 'ru', department: Department.BOTH, updatedAt: new Date('2026-02-01T00:00:00Z') }),
  ]

  it('is stable for the same rows', () => {
    expect(configVersion(base)).toBe(configVersion([...base]))
  })

  it('changes when a row is touched', () => {
    const touched = [base[0]!, { ...base[1]!, updatedAt: new Date('2026-03-01T00:00:00Z') }]

    expect(configVersion(touched)).not.toBe(configVersion(base))
  })

  it('changes when a row is removed, even though the newest timestamp is unchanged', () => {
    // The whole reason the count is in the string: dropping the older row leaves
    // max(updatedAt) exactly where it was.
    const removed = [base[1]!]

    expect(configVersion(removed)).not.toBe(configVersion(base))
  })

  it('is order independent', () => {
    expect(configVersion([base[1]!, base[0]!])).toBe(configVersion(base))
  })

  it('handles an empty rotation', () => {
    expect(configVersion([])).toBe('0-0')
  })
})
