<script setup lang="ts">
import type { Win98Task } from '~/types/win98'

withDefaults(defineProps<{
  tasks?: Win98Task[]
  time: string
  tray?: string[]
}>(), {
  tasks: () => [],
  tray: () => [],
})
</script>

<template>
  <div class="w98-taskbar">
    <button
      type="button"
      class="w98-taskbar__start"
      tabindex="-1"
    >
      <img
        src="/windows98-icons/png/windows-5.png"
        alt=""
        width="22"
        height="22"
      >
      Démarrer
    </button>

    <span class="w98-taskbar__divider" />

    <div class="w98-taskbar__tasks">
      <button
        v-for="task in tasks"
        :key="task.label"
        type="button"
        class="w98-taskbar__task"
        :class="{ 'w98-taskbar__task--active': task.active }"
        tabindex="-1"
      >
        <img
          v-if="task.icon"
          :src="task.icon"
          alt=""
          width="16"
          height="16"
        >
        <span>{{ task.label }}</span>
      </button>
    </div>

    <div class="w98-taskbar__tray">
      <img
        v-for="glyph in tray"
        :key="glyph"
        :src="glyph"
        alt=""
        width="16"
        height="16"
      >
      <span class="w98-taskbar__clock">{{ time }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.w98-taskbar {
  position: absolute;
  z-index: 9;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 58px;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  background: var(--w98-face);
  box-shadow: inset 0 2px 0 var(--w98-white), inset 0 3px 0 var(--w98-light);

  img {
    flex: 0 0 auto;
    image-rendering: pixelated;
  }

  &__start {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 9px;
    padding: 7px 14px 7px 10px;
    border: 0;
    background: var(--w98-face);
    box-shadow: var(--w98-raised);
    font: inherit;
    font-size: var(--w98-ui-size);
    font-weight: 700;
    color: var(--w98-text);
  }

  &__divider {
    width: 3px;
    height: 38px;
    background: var(--w98-shadow);
    box-shadow: 1px 0 0 var(--w98-white);
  }

  &__tasks {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 7px;
  }

  &__task {
    display: flex;
    min-width: 0;
    // Win98 sizes task buttons to a comfortable width and leaves the rest of
    // the bar empty rather than stretching them edge to edge.
    flex: 0 1 300px;
    align-items: center;
    gap: 10px;
    padding: 9px 13px;
    border: 0;
    background: var(--w98-face);
    box-shadow: var(--w98-raised);
    font: inherit;
    font-size: var(--w98-ui-size);
    color: var(--w98-text);

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &--active {
      background: var(--w98-face-dim);
      box-shadow: var(--w98-pressed);
      font-weight: 700;
    }
  }

  &__tray {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 12px;
    padding: 6px 14px;
    box-shadow: var(--w98-groove);
  }

  &__clock {
    font-family: var(--w98-mono-font);
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}
</style>
