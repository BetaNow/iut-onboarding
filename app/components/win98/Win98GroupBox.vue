<script setup lang="ts">
/** Win98 group box: an etched groove with the label notched into the top edge. */
defineProps<{
  label: string
}>()
</script>

<template>
  <div class="w98-group">
    <span class="w98-group__label">{{ label }}</span>
    <div class="w98-group__body">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.w98-group {
  position: relative;
  padding: 24px 12px 14px;
  // Etched groove: dark then light on the top/left, light then dark on the
  // bottom/right. Four insets is what Win98 actually drew.
  box-shadow:
    inset 1px 1px 0 var(--w98-shadow),
    inset -1px -1px 0 var(--w98-white),
    inset 2px 2px 0 var(--w98-white),
    inset -2px -2px 0 var(--w98-shadow);

  &__label {
    position: absolute;
    top: 4px;
    left: 12px;
    padding: 0 6px;
    background: var(--w98-face);
    font-size: var(--w98-ui-size);
    line-height: 1;
    transform: translateY(-50%);
  }

  &__body {
    display: flex;
    height: 100%;
    flex-direction: column;
  }
}
</style>
