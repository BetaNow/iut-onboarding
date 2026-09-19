<script setup lang="ts">
/**
 * The empty/error/loading moment a rotating module shows in place of its own
 * content. Every module used to hand-roll this with its own spacing and font
 * sizes; this is the one definition they all share now.
 */
withDefaults(defineProps<{
  icon?: string
  iconAlt?: string
  line: string
  detail?: string
  tone?: 'muted' | 'warn'
}>(), {
  icon: undefined,
  iconAlt: '',
  detail: undefined,
  tone: 'muted',
})
</script>

<template>
  <div class="w98-module-status">
    <img
      v-if="icon"
      :src="icon"
      :alt="iconAlt"
      width="32"
      height="32"
      class="w98-module-status__icon"
    >

    <p
      class="w98-module-status__line"
      :class="{ 'w98-module-status__line--warn': tone === 'warn' }"
    >
      {{ line }}
    </p>

    <p
      v-if="detail"
      class="w98-module-status__detail"
    >
      {{ detail }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.w98-module-status {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;

  &__icon {
    image-rendering: pixelated;
  }

  &__line {
    margin: 0;
    color: var(--w98-text-dim);
    font-size: var(--w98-ui-size);
    text-align: center;

    &--warn {
      color: #b00000;
    }
  }

  &__detail {
    max-width: 80%;
    margin: 0;
    color: var(--w98-text-mute);
    font-size: var(--w98-ui-size-sm);
    text-align: center;
  }
}
</style>
