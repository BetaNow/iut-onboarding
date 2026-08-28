<script setup lang="ts">
// Win98's chunked progress bar: a sunken well filled by discrete blocks. The
// chunk count is fixed and the blocks share the width, so the fill steps a whole
// block at a time without the component measuring itself.
const props = withDefaults(defineProps<{
  /** Fraction filled, 0 to 1. */
  value: number
  chunks?: number
}>(), {
  chunks: 20,
})

const ratio = computed(() => Math.min(Math.max(props.value, 0), 1))
const filled = computed(() => Math.round(ratio.value * props.chunks))
</script>

<template>
  <div
    class="w98-progress"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(ratio * 100)"
  >
    <span
      v-for="chunk in chunks"
      :key="chunk"
      class="w98-progress__chunk"
      :class="{ 'w98-progress__chunk--on': chunk <= filled }"
    />
  </div>
</template>

<style scoped lang="scss">
.w98-progress {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: stretch;
  gap: 2px;
  padding: 3px;
  background: var(--w98-face);
  box-shadow: var(--w98-groove);

  &__chunk {
    flex: 1;
    background: transparent;

    // Navy, not the seasonal accent. Win98 drew its chunks in the system
    // highlight colour whatever the desktop was themed to.
    &--on {
      background: var(--w98-title-deep);
    }
  }
}
</style>
