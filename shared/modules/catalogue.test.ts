import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { componentFileForModuleId, MODULE_CATALOGUE, moduleIdFromComponentFile, partitionKnown } from './catalogue'

const MODULES_DIR = fileURLToPath(new URL('../../app/components/modules', import.meta.url))

function componentFiles(): string[] {
  return readdirSync(MODULES_DIR).filter(name => name.endsWith('Module.vue'))
}

describe('the component naming convention', () => {
  it('reads an id off a component filename', () => {
    expect(moduleIdFromComponentFile('MemesModule.vue')).toBe('memes')
    expect(moduleIdFromComponentFile('MenuRuModule.vue')).toBe('menu-ru')
  })

  it('names the component file an id belongs in', () => {
    expect(componentFileForModuleId('memes')).toBe('MemesModule.vue')
    expect(componentFileForModuleId('menu-ru')).toBe('MenuRuModule.vue')
  })
})

// Declaration and component are wired together by filename alone, and a drift
// says nothing at runtime: the panel just drops the module. These turn that into
// a failed build.
describe('every catalogue entry', () => {
  it('has a component file named after its id', () => {
    const present = new Set(componentFiles())

    const missing = MODULE_CATALOGUE
      .filter(module => !present.has(componentFileForModuleId(module.id)))
      .map(module => `${module.id} needs app/components/modules/${componentFileForModuleId(module.id)}`)

    expect(missing.join('\n')).toBe('')
  })

  it('carries an id the filename convention can express', () => {
    const unrepresentable = MODULE_CATALOGUE
      .map(module => module.id)
      .filter(id => moduleIdFromComponentFile(componentFileForModuleId(id)) !== id)

    expect(unrepresentable.join('\n')).toBe('')
  })
})

describe('every module component', () => {
  it('is declared in the catalogue', () => {
    const declared = new Set(MODULE_CATALOGUE.map(module => module.id))

    const undeclared = componentFiles()
      .map(file => `${moduleIdFromComponentFile(file)} needs an entry in shared/modules/catalogue.ts`)
      .filter(line => !declared.has(line.split(' ')[0]!))

    expect(undeclared.join('\n')).toBe('')
  })
})

// Deleting a module leaves its rows behind in module_config_table. The display
// skips them; the editor has to as well, or a tab holding one renders a row with
// no definition to read a label off.
describe('partitioning stored rows', () => {
  const catalogue = [{
    id: 'memes',
    label: 'Memes',
    icon: '',
    defaultDurationMs: 30_000,
    settings: [],
  }]

  it('keeps the rows the catalogue still describes', () => {
    const { known, strays } = partitionKnown([{ moduleId: 'memes' }], catalogue)

    expect(known).toEqual([{ moduleId: 'memes' }])
    expect(strays).toEqual([])
  })

  it('sets aside rows naming a module that has been deleted', () => {
    const { known, strays } = partitionKnown([{ moduleId: 'memes' }, { moduleId: 'ghost' }], catalogue)

    expect(known).toEqual([{ moduleId: 'memes' }])
    expect(strays).toEqual([{ moduleId: 'ghost' }])
  })

  it('preserves the order of what it keeps', () => {
    const rows = [{ moduleId: 'ghost' }, { moduleId: 'memes' }, { moduleId: 'phantom' }]

    expect(partitionKnown(rows, catalogue).known).toEqual([{ moduleId: 'memes' }])
    expect(partitionKnown(rows, catalogue).strays).toEqual([{ moduleId: 'ghost' }, { moduleId: 'phantom' }])
  })
})
