<script setup lang="ts">
import type { ModuleDefinition } from '#shared/modules/catalogue'
import { partitionKnown } from '#shared/modules/catalogue'
import { Department } from '#shared/types/department'
import type { ConfigRow, DraftModule } from '~/types/admin'

const props = defineProps<{
  catalogue: ModuleDefinition[]
  rows: ConfigRow[]
  limits: { minDurationMs: number, maxDurationMs: number }
}>()

const emit = defineEmits<{ saved: [] }>()

const TABS = [
  { department: Department.BOTH, label: 'Commun' },
  { department: Department.INFO, label: 'Info' },
  { department: Department.SGM, label: 'SGM' },
]

const minSeconds = computed(() => Math.round(props.limits.minDurationMs / 1000))
const maxSeconds = computed(() => Math.round(props.limits.maxDurationMs / 1000))

const active = ref<Department>(Department.BOTH)
const drafts = ref<Record<string, DraftModule[]>>({})
const baseline = ref<Record<string, string>>({})
/** Rows naming a module that has been deleted from the code, per tab. */
const strays = ref<Record<string, string[]>>({})

const saving = ref(false)
const error = ref('')

/** Rebuilds every tab's draft from what the server last told us. */
function hydrate() {
  const next: Record<string, DraftModule[]> = {}
  const marks: Record<string, string> = {}
  const gone: Record<string, string[]> = {}

  for (const { department } of TABS) {
    const sorted = props.rows
      .filter(row => row.department === department)
      .sort((a, b) => a.position - b.position)

    // A row whose module has been deleted has no definition to draw a label,
    // icon or settings form from, so it is set aside instead of rendered.
    const { known, strays: orphaned } = partitionKnown(sorted, props.catalogue)

    const list = known.map(row => ({
      moduleId: row.moduleId,
      durationMs: row.durationMs,
      isEnabled: row.isEnabled,
      settings: { ...row.settings },
    }))

    next[department] = list
    marks[department] = JSON.stringify(list)
    gone[department] = orphaned.map(row => row.moduleId)
  }

  drafts.value = next
  baseline.value = marks
  strays.value = gone
}

watch(() => props.rows, hydrate, { immediate: true, deep: true })

const current = computed(() => drafts.value[active.value] ?? [])

const dirty = computed(() => JSON.stringify(current.value) !== baseline.value[active.value])

// Saving replaces the tab's whole list, so a stray row goes with it. Said out
// loud, because the row is invisible here and deleting it silently is a
// surprise.
const strayNote = computed(() => {
  const ids = strays.value[active.value] ?? []

  if (!ids.length) {
    return ''
  }

  const names = ids.map(id => `« ${id} »`).join(', ')

  return ids.length > 1
    ? `${names} n'existent plus dans le code. Enregistrer cet onglet retirera ces lignes.`
    : `${names} n'existe plus dans le code. Enregistrer cet onglet retirera cette ligne.`
})

const dirtyTabs = computed(() =>
  TABS.filter(tab => JSON.stringify(drafts.value[tab.department] ?? []) !== baseline.value[tab.department])
    .map(tab => tab.department),
)

function definitionFor(moduleId: string) {
  return props.catalogue.find(module => module.id === moduleId)
}

/** Catalogue entries this tab has not used yet. */
const available = computed(() =>
  props.catalogue.filter(module => !current.value.some(draft => draft.moduleId === module.id)),
)

function patch(index: number, changes: Partial<DraftModule>) {
  const list = [...current.value]
  const existing = list[index]

  if (!existing) {
    return
  }

  list[index] = { ...existing, ...changes }
  drafts.value[active.value] = list
}

function remove(index: number) {
  const list = [...current.value]
  list.splice(index, 1)
  drafts.value[active.value] = list
}

function move(from: number, to: number) {
  const list = [...current.value]
  const [item] = list.splice(from, 1)

  if (!item) {
    return
  }

  list.splice(to, 0, item)
  drafts.value[active.value] = list
}

function add(definition: ModuleDefinition) {
  drafts.value[active.value] = [...current.value, {
    moduleId: definition.id,
    durationMs: definition.defaultDurationMs,
    isEnabled: true,
    settings: Object.fromEntries(definition.settings.map(field => [field.key, field.default])),
  }]
}

const { container, draggingIndex, offsetY, start, dropEdge } = useDragSort(move)

function switchTab(department: Department) {
  if (department === active.value) {
    return
  }

  if (dirty.value && !confirm('Cet onglet a des modifications non enregistrées. Les abandonner ?')) {
    return
  }

  if (dirty.value) {
    drafts.value[active.value] = JSON.parse(baseline.value[active.value] ?? '[]')
  }

  error.value = ''
  active.value = department
}

async function save() {
  saving.value = true
  error.value = ''

  try {
    await $fetch(`/api/admin/config/${active.value}`, {
      method: 'PUT',
      body: { modules: current.value },
    })

    baseline.value[active.value] = JSON.stringify(current.value)
    emit('saved')
  }
  catch (cause) {
    // The edits stay in the draft: a rejected save must not cost the work.
    error.value = (cause as { statusMessage?: string }).statusMessage || 'Enregistrement impossible.'
  }
  finally {
    saving.value = false
  }
}

function discard() {
  drafts.value[active.value] = JSON.parse(baseline.value[active.value] ?? '[]')
  error.value = ''
}

onBeforeRouteLeave(() => {
  if (!dirtyTabs.value.length) {
    return true
  }

  return confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')
})

function warnOnUnload(event: BeforeUnloadEvent) {
  if (dirtyTabs.value.length) {
    event.preventDefault()
  }
}

onMounted(() => window.addEventListener('beforeunload', warnOnUnload))
onUnmounted(() => window.removeEventListener('beforeunload', warnOnUnload))
</script>

<template>
  <section class="editor">
    <header class="editor__head">
      <h2 class="editor__title">
        Rotation
      </h2>

      <div
        class="tabs"
        role="tablist"
      >
        <button
          v-for="tab in TABS"
          :key="tab.department"
          type="button"
          role="tab"
          class="tabs__tab"
          :class="{ 'tabs__tab--active': tab.department === active }"
          :aria-selected="tab.department === active"
          @click="switchTab(tab.department)"
        >
          {{ tab.label }}
          <span
            v-if="dirtyTabs.includes(tab.department)"
            class="tabs__dot"
            :aria-label="'modifications non enregistrées'"
          />
        </button>
      </div>
    </header>

    <p class="editor__note">
      <template v-if="active === Department.BOTH">
        Les modules communs passent en premier sur tous les écrans, avant ceux du département.
      </template>
      <template v-else>
        Ces modules passent après les modules communs, sur les écrans de ce département.
      </template>
    </p>

    <p
      v-if="strayNote"
      class="editor__stray"
    >
      {{ strayNote }}
    </p>

    <ul
      ref="container"
      class="list"
    >
      <AdminModuleRow
        v-for="(draft, index) in current"
        :key="draft.moduleId"
        :draft="draft"
        :definition="definitionFor(draft.moduleId)!"
        :index="index"
        :count="current.length"
        :min-seconds="minSeconds"
        :max-seconds="maxSeconds"
        :dragging="draggingIndex === index"
        :drop-edge="dropEdge(index)"
        :offset-y="offsetY"
        @patch="patch(index, $event)"
        @remove="remove(index)"
        @move="move(index, $event)"
        @grab="start($event, index)"
      />

      <li
        v-if="!current.length"
        class="list__empty"
      >
        Aucun module. Les écrans concernés n'afficheront rien de cette liste.
      </li>
    </ul>

    <div
      v-if="available.length"
      class="add"
    >
      <span class="add__label">Ajouter :</span>
      <button
        v-for="definition in available"
        :key="definition.id"
        type="button"
        class="add__button"
        @click="add(definition)"
      >
        <img
          :src="definition.icon"
          alt=""
          width="16"
          height="16"
        >
        {{ definition.label }}
      </button>
    </div>

    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>

    <footer class="editor__foot">
      <span
        v-if="dirty"
        class="editor__dirty"
      >Modifications non enregistrées</span>

      <button
        v-if="dirty"
        type="button"
        class="ghost"
        :disabled="saving"
        @click="discard"
      >
        Annuler
      </button>

      <button
        type="button"
        class="primary"
        :disabled="!dirty || saving"
        @click="save"
      >
        {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  gap: .9rem;
  padding: 1.2rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: .8rem;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
  }

  &__note {
    font-size: .82rem;
    color: var(--admin-text-dim);
  }

  &__stray {
    font-size: .82rem;
    color: var(--admin-danger);
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: .7rem;
    padding-top: .3rem;
  }

  &__dirty {
    margin-right: auto;
    font-size: .8rem;
    color: var(--admin-text-dim);
  }
}

.tabs {
  display: flex;
  gap: .25rem;
  padding: .2rem;
  background: var(--admin-sunken);
  border: 1px solid var(--admin-border);
  border-radius: 999px;

  &__tab {
    display: flex;
    align-items: center;
    gap: .35rem;
    padding: .35rem .85rem;
    font: inherit;
    font-size: .85rem;
    color: var(--admin-text-dim);
    background: none;
    border: 0;
    border-radius: 999px;
    cursor: pointer;

    &--active {
      color: var(--admin-text);
      background: var(--admin-surface);
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
    }

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    background: var(--admin-accent);
    border-radius: 50%;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  list-style: none;

  &__empty {
    padding: 1.4rem;
    font-size: .88rem;
    text-align: center;
    color: var(--admin-text-dim);
    background: var(--admin-sunken);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--admin-radius);
  }
}

.add {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem;

  &__label {
    font-size: .82rem;
    color: var(--admin-text-dim);
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .35rem .7rem;
    font: inherit;
    font-size: .85rem;
    color: var(--admin-text);
    background: var(--admin-sunken);
    border: 1px solid var(--admin-border-strong);
    border-radius: 999px;
    cursor: pointer;

    img {
      image-rendering: pixelated;
    }

    &:hover {
      border-color: var(--admin-accent);
    }

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
    }
  }
}

.error {
  padding: .55rem .7rem;
  font-size: .85rem;
  color: var(--admin-danger);
  background: rgb(200 55 45 / 7%);
  border-radius: 6px;
}

.primary,
.ghost {
  padding: .55rem 1.1rem;
  font: inherit;
  font-size: .88rem;
  border-radius: 7px;
  cursor: pointer;

  &:disabled {
    opacity: .5;
    cursor: default;
  }
}

.primary {
  font-weight: 500;
  color: #fff;
  background: var(--admin-accent);
  border: 0;
}

.ghost {
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border-strong);
}
</style>
