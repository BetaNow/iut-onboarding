#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CATALOGUE = `${ROOT}shared/modules/catalogue.ts`
const COMPONENTS = `${ROOT}app/components/modules`
const ICONS = `${ROOT}public/windows98-icons/png`

const DEFAULT_ICON = 'program_manager-0.png'

const USAGE = `Usage: npm run module:new -- <id> "<Label>" [options]

  <id>               kebab-case, e.g. menu-ru. Becomes MenuRuModule.vue.
  <Label>            what the admin and the taskbar call it.

  --department       hand the module the screen's department as a prop.
  --icon <file>      filename under public/windows98-icons/png.
                     default: ${DEFAULT_ICON}
  --duration <s>     seconds on screen before the rotation moves on.

Example:
  npm run module:new -- menu-ru "Menu du RU" --department --duration 20`

function fail(message) {
  console.error(`\n${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  const positional = []
  const flags = { department: false, icon: DEFAULT_ICON, duration: null }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--department') {
      flags.department = true
    }
    else if (arg === '--icon') {
      flags.icon = argv[++i]
    }
    else if (arg === '--duration') {
      flags.duration = argv[++i]
    }
    else if (arg === '--help' || arg === '-h') {
      console.log(USAGE)
      process.exit(0)
    }
    else if (arg.startsWith('-')) {
      fail(`Unknown option: ${arg}\n\n${USAGE}`)
    }
    else {
      positional.push(arg)
    }
  }

  return { positional, flags }
}

const pascal = id => id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('')

// Read off the catalogue rather than repeated here: the server validates saves
// against the same two constants.
function durationBounds(source) {
  const read = (name) => {
    const match = source.match(new RegExp(`export const ${name} = ([\\d_]+)`))

    if (!match) {
      fail(`Could not find ${name} in shared/modules/catalogue.ts.`)
    }

    return Number(match[1].replaceAll('_', ''))
  }

  return { min: read('DURATION_MIN_MS'), max: read('DURATION_MAX_MS') }
}

function component({ id, label, department }) {
  const props = department
    ? `\n// Settings declared for \`${id}\` in the catalogue arrive here as props, under\n`
    + `// exactly the keys the database stores them under. \`department\` is the screen\n`
    + `// this module is running on, because the catalogue entry asked for it.\ndefineProps<{\n  department: string\n}>()\n`
    : `\n// Declare settings for \`${id}\` in shared/modules/catalogue.ts and they arrive\n`
      + `// here as props, under exactly the keys the database stores them under:\n`
      + `//\n//   defineProps<{ city?: string }>()\n`

  return `<script setup lang="ts">${props}</script>

<template>
  <div class="${id}">
    <p class="${id}__title">
      ${label}
    </p>
    <p class="${id}__hint">
      app/components/modules/${pascal(id)}Module.vue
    </p>
  </div>
</template>

<style scoped lang="scss">
.${id} {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.${id}__title {
  font-size: 34px;
  font-weight: 700;
}

.${id}__hint {
  font-size: 17px;
  color: var(--w98-text-dim);
}
</style>
`
}

function entry({ id, label, icon, department, durationMs }) {
  return `  {
    id: '${id}',
    label: '${label.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}',
    icon: \`\${ICON}/${icon}\`,
    defaultDurationMs: ${durationMs ?? 'MODULE_DEFAULT_DURATION'},
${department ? '    usesDepartment: true,\n' : ''}    // Every field here becomes an input in the admin and a prop on the
    // component, under this exact key:
    //   { key: 'city', label: 'Ville', type: 'text', default: 'Bordeaux' }
    settings: [],
  },
`
}

/** Puts the entry at the end of MODULE_CATALOGUE, empty array or not. */
function splice(source, text) {
  const open = 'export const MODULE_CATALOGUE: ModuleDefinition[] = ['

  if (source.includes(`${open}]`)) {
    return source.replace(`${open}]`, `${open}\n${text}]`)
  }

  const start = source.indexOf(open)

  if (start === -1) {
    fail('Could not find MODULE_CATALOGUE in shared/modules/catalogue.ts.')
  }

  const close = source.indexOf('\n]\n', start)

  if (close === -1) {
    fail('Could not find the end of MODULE_CATALOGUE in shared/modules/catalogue.ts.')
  }

  return `${source.slice(0, close + 1)}${text}${source.slice(close + 1)}`
}

const { positional, flags } = parseArgs(process.argv.slice(2))
const [id, label] = positional

if (!id || !label) {
  fail(USAGE)
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  fail(`« ${id} » is not a valid id. Use lowercase words joined by hyphens, e.g. menu-ru.`)
}

if (positional.length > 2) {
  fail(`Unexpected argument: ${positional[2]}\n\nQuote the label if it has spaces.\n\n${USAGE}`)
}

if (!existsSync(`${ICONS}/${flags.icon}`)) {
  fail(`No icon called « ${flags.icon} » in public/windows98-icons/png.`)
}

const source = readFileSync(CATALOGUE, 'utf8')
const bounds = durationBounds(source)

let durationMs = null

if (flags.duration !== null) {
  const seconds = Number(flags.duration)

  if (!Number.isFinite(seconds) || seconds * 1000 < bounds.min || seconds * 1000 > bounds.max) {
    fail(`--duration must be between ${bounds.min / 1000} and ${bounds.max / 1000} seconds.`)
  }

  durationMs = Math.round(seconds) * 1000
}

if (new RegExp(`id: '${id}'`).test(source)) {
  fail(`« ${id} » is already in the catalogue. Pick another id, or edit the entry it already has.`)
}

const file = `${COMPONENTS}/${pascal(id)}Module.vue`

if (existsSync(file)) {
  fail(`${pascal(id)}Module.vue already exists. Pick another id.`)
}

// The component first: a catalogue entry with no component is a module the panel
// silently drops.
writeFileSync(file, component({ id, label, department: flags.department }))
writeFileSync(CATALOGUE, splice(source, entry({ id, label, icon: flags.icon, department: flags.department, durationMs })))

console.log(`
Created ${label}:

  app/components/modules/${pascal(id)}Module.vue
  shared/modules/catalogue.ts   (entry « ${id} »)

Next:

  1. Restart the dev server; a new component directory entry needs a rebuild.
  2. Open /admin, add « ${label} » to a rotation, and save.
  3. Write the module in ${pascal(id)}Module.vue.

Settings, and its own database table if it needs one, are in the README under
"Adding a module".
`)
