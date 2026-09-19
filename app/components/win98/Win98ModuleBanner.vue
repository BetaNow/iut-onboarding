<script setup lang="ts">
/**
 * The header a rotating module shows above its own content: an icon and a
 * title on the same navy-to-accent gradient the desktop's own windows use.
 * Every module used to hand-copy this bar with its own height, font size and
 * icon size; this is the one definition they all share now.
 */
defineProps<{
  icon: string
  iconAlt?: string
  title: string
}>()
</script>

<template>
  <div class="w98-module-banner">
    <span class="w98-module-banner__icon">
      <img
        :src="icon"
        :alt="iconAlt ?? ''"
      >
    </span>

    <span class="w98-module-banner__title">{{ title }}</span>
  </div>
</template>

<style scoped lang="scss">
.w98-module-banner {
  display: flex;
  flex: 0 0 64px;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  background: linear-gradient(90deg, var(--w98-title-deep), var(--w98-accent));

  &__icon {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;

    img {
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
    }
  }

  &__title {
    overflow: hidden;
    color: var(--w98-white);
    font-size: var(--w98-ui-size);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
