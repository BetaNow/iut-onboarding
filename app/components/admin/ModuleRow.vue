<script setup lang="ts">
import type { ModuleDefinition, ModuleSettingValue } from '#shared/modules/catalogue'
import type { DraftModule } from '~/types/admin'

const props = defineProps<{
  draft: DraftModule
  definition: ModuleDefinition
  index: number
  count: number
  minSeconds: number
  maxSeconds: number
  dragging: boolean
  dropEdge: 'before' | 'after' | null
  offsetY: number
}>()

const emit = defineEmits<{
  patch: [patch: Partial<DraftModule>]
  remove: []
  move: [to: number]
  grab: [event: PointerEvent]
}>()

const expanded = ref(false)

const seconds = computed(() => Math.round(props.draft.durationMs / 1000))

function setSeconds(value: number) {
  if (!Number.isFinite(value)) {
    return
  }

  const clamped = Math.min(Math.max(Math.round(value), props.minSeconds), props.maxSeconds)

  emit('patch', { durationMs: clamped * 1000 })
}

function updateSettings(settings: Record<string, ModuleSettingValue>) {
  emit('patch', { settings })
}

// The handle is a button, so the same reordering is reachable without a pointer.
function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowUp' && props.index > 0) {
    event.preventDefault()
    emit('move', props.index - 1)
  }

  if (event.key === 'ArrowDown' && props.index < props.count - 1) {
    event.preventDefault()
    emit('move', props.index + 1)
  }
}
</script>

<template>
  <li
    data-sort-item
    class="row"
    :class="{
      'row--dragging': dragging,
      'row--drop-before': dropEdge === 'before',
      'row--drop-after': dropEdge === 'after',
      'row--off': !draft.isEnabled,
    }"
    :style="dragging ? { transform: `translateY(${offsetY}px)` } : undefined"
  >
    <div class="row__main">
      <button
        type="button"
        class="row__grab"
        :aria-label="`Déplacer ${definition.label}. Position ${index + 1} sur ${count}. Flèches haut et bas pour déplacer.`"
        @pointerdown="emit('grab', $event)"
        @keydown="onKey"
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <img
        class="row__icon"
        :src="definition.icon"
        alt=""
        width="20"
        height="20"
      >

      <span class="row__label">{{ definition.label }}</span>

      <label class="row__duration">
        <input
          class="row__seconds admin-mono"
          type="number"
          :min="minSeconds"
          :max="maxSeconds"
          :value="seconds"
          :aria-label="`Durée de ${definition.label} en secondes`"
          @change="setSeconds(Number(($event.target as HTMLInputElement).value))"
        >
        <span class="row__unit">s</span>
      </label>

      <label class="row__toggle">
        <input
          type="checkbox"
          :checked="draft.isEnabled"
          :aria-label="`Activer ${definition.label}`"
          @change="emit('patch', { isEnabled: ($event.target as HTMLInputElement).checked })"
        >
        <span class="row__track" />
      </label>

      <button
        type="button"
        class="row__icon-button"
        :aria-expanded="expanded"
        :aria-label="`Réglages de ${definition.label}`"
        @click="expanded = !expanded"
      >
        ⚙
      </button>

      <button
        type="button"
        class="row__icon-button row__icon-button--danger"
        :aria-label="`Retirer ${definition.label} de la rotation`"
        @click="emit('remove')"
      >
        ✕
      </button>
    </div>

    <AdminModuleSettingsForm
      v-if="expanded"
      :definition="definition"
      :model-value="draft.settings"
      @update:model-value="updateSettings"
    />
  </li>
</template>

<style scoped lang="scss">
.row {
  position: relative;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  list-style: none;

  &--dragging {
    z-index: 2;
    box-shadow: var(--admin-shadow);
    border-color: var(--admin-border-strong);
    cursor: grabbing;
  }

  // The insertion line. Drawn on the row the dragged item would land against,
  // on the side it would land.
  &--drop-before::before,
  &--drop-after::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--admin-accent);
    border-radius: 2px;
  }

  &--drop-before::before {
    top: -5px;
  }

  &--drop-after::after {
    bottom: -5px;
  }

  &--off {
    background: var(--admin-sunken);
  }

  &--off &__label,
  &--off &__icon {
    opacity: .5;
  }

  &__main {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .7rem .8rem;
  }

  &__grab {
    padding: .2rem .3rem;
    font-size: 1rem;
    line-height: 1;
    color: var(--admin-text-dim);
    background: none;
    border: 0;
    border-radius: 5px;
    cursor: grab;
    touch-action: none;

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
    }
  }

  &__icon {
    flex: 0 0 auto;
    image-rendering: pixelated;
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: .95rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__duration {
    display: flex;
    align-items: baseline;
    gap: .25rem;
  }

  &__seconds {
    width: 4.2rem;
    padding: .35rem .45rem;
    font: inherit;
    font-size: .9rem;
    text-align: right;
    color: var(--admin-text);
    background: var(--admin-sunken);
    border: 1px solid var(--admin-border-strong);
    border-radius: 6px;
  }

  &__unit {
    font-size: .8rem;
    color: var(--admin-text-dim);
  }

  &__toggle {
    position: relative;
    flex: 0 0 auto;
    width: 2.4rem;
    height: 1.35rem;

    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      margin: 0;
      cursor: pointer;
    }
  }

  &__track {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--admin-offline);
    border-radius: 999px;
    transition: background .15s ease;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: calc(1.35rem - 6px);
      height: calc(1.35rem - 6px);
      background: #fff;
      border-radius: 50%;
      transition: transform .15s ease;
    }
  }

  input:checked + &__track {
    background: var(--admin-accent);

    &::after {
      transform: translateX(calc(2.4rem - 1.35rem));
    }
  }

  input:focus-visible + &__track {
    outline: 2px solid var(--admin-accent);
    outline-offset: 2px;
  }

  &__icon-button {
    padding: .3rem .45rem;
    font-size: .9rem;
    line-height: 1;
    color: var(--admin-text-dim);
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background: var(--admin-sunken);
      border-color: var(--admin-border);
    }

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
    }

    &--danger:hover {
      color: var(--admin-danger);
    }
  }
}
</style>
