<script setup lang="ts">
/** A desktop shortcut, positioned in stage pixels so the column can be jittered. */
withDefaults(defineProps<{
  icon: string
  label: string
  x: number
  y: number
  size?: number
  selected?: boolean
}>(), {
  size: 48,
  selected: false,
})
</script>

<template>
  <div
    class="w98-icon"
    :class="{ 'w98-icon--selected': selected }"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <img
      class="w98-icon__glyph"
      :src="icon"
      :alt="''"
      :width="size"
      :height="size"
    >
    <span class="w98-icon__label">{{ label }}</span>
  </div>
</template>

<style scoped lang="scss">
.w98-icon {
  position: absolute;
  display: flex;
  width: 132px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;

  &__glyph {
    display: block;
    // Win98 icons are hand-pixelled; never let the browser smooth them.
    image-rendering: pixelated;
  }

  &__label {
    padding: 2px 4px;
    font-size: var(--w98-ui-size);
    line-height: 1.25;
    color: #fff;
    text-shadow: 1px 1px 0 rgb(0 0 0 / 75%);
    letter-spacing: 0.2px;
    text-wrap: pretty;
  }

  &--selected &__label {
    background: var(--w98-select);
    text-shadow: none;
    outline: 1px dotted #fff;
    outline-offset: -1px;
  }
}
</style>
