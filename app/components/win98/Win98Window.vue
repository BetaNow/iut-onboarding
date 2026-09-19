<script setup lang="ts">
// Window chrome only: title bar, optional menu / toolbar / address / status bar,
// and an empty client area in the default slot. Position and size are stage
// pixels, so windows can be scattered rather than laid out on a grid.
import type { Win98ToolbarButton } from '~/types/win98'

const props = withDefaults(defineProps<{
  title: string
  icon?: string
  x: number
  y: number
  width: number
  height: number
  z?: number
  active?: boolean
  menus?: string[]
  toolbar?: Win98ToolbarButton[]
  address?: string
  status?: string[]
  // Countdown shown as a progress bar in the status bar, 0 to 1. Rides in its
  // own panel after the first, so `status` has to be set.
  progress?: number | null
  /** Client area gets the sunken white document well. Turn off for custom fills. */
  well?: boolean
  /** Property-sheet chrome: help and close only, no minimise or maximise. */
  dialog?: boolean
  /** Message-box chrome: close on its own. Takes precedence over `dialog`. */
  alert?: boolean
}>(), {
  icon: undefined,
  z: 1,
  active: true,
  menus: undefined,
  toolbar: undefined,
  address: undefined,
  status: undefined,
  progress: null,
  well: true,
  dialog: false,
  alert: false,
})

const frameStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  width: `${props.width}px`,
  height: `${props.height}px`,
  zIndex: props.z,
}))

/** Win98 underlines the Alt accelerator on every menu label. "?" has none. */
function accelerator(label: string) {
  return label.length > 1
    ? { head: label.slice(0, 1), tail: label.slice(1) }
    : { head: '', tail: label }
}
</script>

<template>
  <div
    class="w98-window"
    :class="{ 'w98-window--idle': !active }"
    :style="frameStyle"
  >
    <div class="w98-window__title">
      <div class="w98-window__id">
        <img
          v-if="icon"
          class="w98-window__icon"
          :src="icon"
          alt=""
          width="16"
          height="16"
        >
        <span class="w98-window__label">{{ title }}</span>
      </div>

      <div class="w98-window__buttons">
        <template v-if="alert" />
        <template v-else-if="dialog">
          <button
            type="button"
            class="w98-btn w98-btn--help"
            tabindex="-1"
            aria-label="Aide"
          >
            <span aria-hidden="true">?</span>
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="w98-btn w98-btn--min"
            tabindex="-1"
            aria-label="Réduire"
          />
          <button
            type="button"
            class="w98-btn w98-btn--max"
            tabindex="-1"
            aria-label="Agrandir"
          />
        </template>
        <button
          type="button"
          class="w98-btn w98-btn--close"
          tabindex="-1"
          aria-label="Fermer"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>

    <div
      v-if="menus?.length"
      class="w98-window__menu"
    >
      <span
        v-for="item in menus"
        :key="item"
        class="w98-window__menu-item"
      >
        <u v-if="accelerator(item).head">{{ accelerator(item).head }}</u>{{ accelerator(item).tail }}
      </span>
    </div>

    <div
      v-if="toolbar?.length || address"
      class="w98-window__toolbar"
    >
      <div
        v-if="toolbar?.length"
        class="w98-window__tools"
      >
        <button
          v-for="button in toolbar"
          :key="button.label"
          type="button"
          class="w98-window__tool"
          tabindex="-1"
        >
          <img
            v-if="button.icon"
            :src="button.icon"
            alt=""
            width="16"
            height="16"
          >
          {{ button.label }}
        </button>
      </div>

      <template v-if="address">
        <span
          v-if="toolbar?.length"
          class="w98-window__divider"
        />
        <span class="w98-window__address-label">Adresse</span>
        <div class="w98-window__address">
          {{ address }}
        </div>
      </template>
    </div>

    <div
      class="w98-window__client"
      :class="{ 'w98-window__client--well': well }"
    >
      <slot />
    </div>

    <div
      v-if="status?.length"
      class="w98-window__status"
    >
      <template
        v-for="(panel, index) in status"
        :key="index"
      >
        <span
          class="w98-window__status-panel"
          :class="{ 'w98-window__status-panel--grow': index === 0 }"
        >{{ panel }}</span>

        <div
          v-if="index === 0 && progress !== null"
          class="w98-window__status-panel w98-window__status-panel--progress"
        >
          <Win98ProgressBar :value="progress" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.w98-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  padding: 5px;
  background: var(--w98-face);
  box-shadow: var(--w98-raised), var(--w98-drop);

  &__title {
    display: flex;
    flex: 0 0 42px;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 0 7px;
    background: linear-gradient(90deg, var(--w98-title-deep), var(--w98-accent));
  }

  &--idle &__title {
    background: linear-gradient(90deg, var(--w98-title-idle-a), var(--w98-title-idle-b));
  }

  &__id {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 9px;
  }

  &__icon {
    flex: 0 0 auto;
    image-rendering: pixelated;
  }

  &__label {
    overflow: hidden;
    font-size: var(--w98-ui-size);
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.2px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__buttons {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 4px;
  }

  &__menu {
    display: flex;
    flex: 0 0 34px;
    align-items: center;
    gap: 22px;
    padding: 0 10px;
    font-size: var(--w98-ui-size);
  }

  &__menu-item u {
    text-underline-offset: 2px;
  }

  &__toolbar {
    display: flex;
    flex: 0 0 50px;
    align-items: center;
    gap: 10px;
    padding: 0 6px;
    border-top: 1px solid var(--w98-white);
    border-bottom: 1px solid var(--w98-shadow);
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__tool {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 11px;
    border: 0;
    background: var(--w98-face);
    box-shadow: var(--w98-raised);
    font: inherit;
    font-size: var(--w98-ui-size);
    color: var(--w98-text);

    img {
      image-rendering: pixelated;
    }
  }

  &__divider {
    width: 2px;
    height: 26px;
    background: var(--w98-shadow);
    box-shadow: 1px 0 0 var(--w98-white);
  }

  &__address-label {
    font-size: var(--w98-ui-size);
    color: var(--w98-text-dim);
  }

  &__address {
    display: flex;
    min-width: 0;
    height: 32px;
    flex: 1;
    align-items: center;
    padding: 0 9px;
    background: #fff;
    box-shadow: var(--w98-groove);
    font-family: var(--w98-mono-font);
    font-size: 19px;
  }

  &__client {
    position: relative;
    min-height: 0;
    flex: 1;
    margin-top: 4px;

    &--well {
      background: var(--w98-face);
      box-shadow: var(--w98-sunken);
    }
  }

  &__status {
    display: flex;
    flex: 0 0 34px;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
  }

  &__status-panel {
    display: flex;
    height: 100%;
    flex: 0 0 auto;
    align-items: center;
    padding: 0 10px;
    box-shadow: var(--w98-groove);
    font-size: var(--w98-ui-size);
    color: var(--w98-text-dim);
    white-space: nowrap;

    &--grow {
      min-width: 0;
      flex: 1;
      color: var(--w98-text);
    }

    // The bar brings its own groove, so this panel is only a slot for it.
    &--progress {
      flex: 0 0 280px;
      padding: 0;
      box-shadow: none;
    }
  }
}

// Title bar buttons: 16x14 glyph on a raised face, drawn in CSS like the originals.
.w98-btn {
  display: flex;
  width: 32px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
  font: inherit;
  color: var(--w98-text);

  &--min::before {
    width: 12px;
    height: 3px;
    margin-top: 9px;
    background: var(--w98-dark);
    content: "";
  }

  &--max::before {
    width: 13px;
    height: 11px;
    border: 2px solid var(--w98-dark);
    border-top-width: 4px;
    content: "";
  }

  &--help,
  &--close {
    padding-bottom: 2px;
    font-size: 19px;
    font-weight: 700;
    line-height: 1;
  }
}
</style>
