<script setup lang="ts">
import type { ModuleDefinition, ModuleSettingField, ModuleSettingValue } from '#shared/modules/catalogue'

const props = defineProps<{
  definition: ModuleDefinition
  modelValue: Record<string, ModuleSettingValue>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, ModuleSettingValue>]
}>()

const DEPARTMENT_LABELS: Record<string, string> = {
  info: 'Info',
  sgm: 'SGM',
  both: 'Commun',
}

// A readable label for a key the catalogue never declared. A trailing department
// is a qualifier, so subreddit_sgm reads as "Subreddit (SGM)".
function labelFor(key: string): string {
  const parts = key.split('_')
  const department = parts.length > 1 ? DEPARTMENT_LABELS[parts[parts.length - 1]!] : undefined
  const words = (department ? parts.slice(0, -1) : parts).join(' ')
  const titled = words.charAt(0).toUpperCase() + words.slice(1)

  return department ? `${titled} (${department})` : titled
}

function inferType(value: ModuleSettingValue): ModuleSettingField['type'] {
  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'text'
}

// Every setting this row carries. The stored JSON decides which fields exist, so
// a key put straight into the database gets an input here. Declared fields keep
// their label, help text and type; the rest are described from the value.
const fields = computed<ModuleSettingField[]>(() => {
  const declared = props.definition.settings
  const known = new Set(declared.map(field => field.key))

  const undeclared = Object.entries(props.modelValue)
    .filter(([key]) => !known.has(key))
    .map(([key, value]) => ({
      key,
      label: labelFor(key),
      type: inferType(value),
      default: value,
    }))

  return [...declared, ...undeclared]
})

function update(key: string, value: ModuleSettingValue) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function fieldId(key: string) {
  return `setting-${props.definition.id}-${key}`
}

// One <input type="file"> per image field, keyed so the dropzone's click
// handler can reach the right hidden input without a ref per row in the template.
const fileInputs: Record<string, HTMLInputElement | null> = {}

function setFileInput(key: string, el: Element | null) {
  fileInputs[key] = el as HTMLInputElement | null
}

function triggerBrowse(key: string) {
  fileInputs[key]?.click()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function handleFile(key: string, file: File | undefined | null) {
  if (!file || !file.type.startsWith('image/')) {
    return
  }

  update(key, await readFileAsDataUrl(file))
}

function onDrop(event: DragEvent, key: string) {
  handleFile(key, event.dataTransfer?.files?.[0])
}

function onFileChange(event: Event, key: string) {
  handleFile(key, (event.target as HTMLInputElement).files?.[0])
}
</script>

<template>
  <div class="settings">
    <p
      v-if="!fields.length"
      class="settings__empty"
    >
      Ce module n'a rien à régler.
    </p>

    <div
      v-for="field in fields"
      :key="field.key"
      class="field"
    >
      <label
        class="field__label"
        :for="fieldId(field.key)"
      >{{ field.label }}</label>

      <input
        v-if="field.type === 'text'"
        :id="fieldId(field.key)"
        class="field__input"
        type="text"
        :value="modelValue[field.key]"
        @input="update(field.key, ($event.target as HTMLInputElement).value)"
      >

      <input
        v-else-if="field.type === 'number'"
        :id="fieldId(field.key)"
        class="field__input field__input--number admin-mono"
        type="number"
        :min="field.min"
        :max="field.max"
        :value="modelValue[field.key]"
        @input="update(field.key, Number(($event.target as HTMLInputElement).value))"
      >

      <label
        v-else-if="field.type === 'boolean'"
        class="field__check"
      >
        <input
          :id="fieldId(field.key)"
          type="checkbox"
          :checked="Boolean(modelValue[field.key])"
          @change="update(field.key, ($event.target as HTMLInputElement).checked)"
        >
        <span>{{ modelValue[field.key] ? 'Activé' : 'Désactivé' }}</span>
      </label>

      <div
        v-else-if="field.type === 'image'"
        class="field__image"
      >
        <div
          class="field__dropzone"
          :class="{ 'field__dropzone--filled': modelValue[field.key] }"
          @click="triggerBrowse(field.key)"
          @dragover.prevent
          @drop.prevent="onDrop($event, field.key)"
        >
          <img
            v-if="modelValue[field.key]"
            class="field__preview"
            :src="String(modelValue[field.key])"
            alt=""
          >
          <p
            v-else
            class="field__dropzone-hint"
          >
            Glissez une image ici, ou cliquez pour en choisir une
          </p>
        </div>

        <input
          :id="fieldId(field.key)"
          :ref="el => setFileInput(field.key, el as Element | null)"
          type="file"
          accept="image/*"
          class="field__file-input"
          @change="onFileChange($event, field.key)"
        >

        <button
          v-if="modelValue[field.key]"
          type="button"
          class="field__remove"
          @click="update(field.key, '')"
        >
          Retirer l'image
        </button>
      </div>

      <select
        v-else
        :id="fieldId(field.key)"
        class="field__input"
        :value="modelValue[field.key]"
        @change="update(field.key, ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="option in field.options ?? []"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <p
        v-if="field.help"
        class="field__help"
      >
        {{ field.help }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings {
  display: flex;
  flex-direction: column;
  gap: .9rem;
  padding: .9rem 1rem 1rem;
  background: var(--admin-sunken);
  border-top: 1px solid var(--admin-border);

  &__empty {
    font-size: .85rem;
    color: var(--admin-text-dim);
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: .35rem;
  max-width: 24rem;

  &__label {
    font-size: .8rem;
    font-weight: 500;
    color: var(--admin-text-dim);
  }

  &__input {
    padding: .5rem .6rem;
    font: inherit;
    font-size: .9rem;
    color: var(--admin-text);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: 6px;

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
      outline-offset: 1px;
    }

    &--number {
      max-width: 8rem;
    }
  }

  &__check {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .9rem;
  }

  &__help {
    font-size: .78rem;
    color: var(--admin-text-dim);
  }

  &__image {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }

  &__dropzone {
    display: flex;
    overflow: hidden;
    min-height: 6rem;
    align-items: center;
    justify-content: center;
    padding: .75rem;
    cursor: pointer;
    background: var(--admin-surface);
    border: 1px dashed var(--admin-border-strong);
    border-radius: 6px;

    &:hover {
      border-color: var(--admin-accent);
    }

    &--filled {
      padding: 0;
      cursor: default;
    }
  }

  &__preview {
    display: block;
    max-width: 100%;
    max-height: 10rem;
    object-fit: contain;
  }

  &__dropzone-hint {
    margin: 0;
    font-size: .85rem;
    color: var(--admin-text-dim);
    text-align: center;
  }

  &__file-input {
    display: none;
  }

  &__remove {
    align-self: flex-start;
    padding: .35rem .7rem;
    font-size: .8rem;
    color: var(--admin-text);
    cursor: pointer;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: 6px;

    &:hover {
      border-color: var(--admin-accent);
    }
  }
}
</style>
