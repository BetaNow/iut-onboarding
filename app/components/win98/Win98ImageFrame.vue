<script setup lang="ts">
// Sunken image well with the CRT scanline overlay. The lines cover the image
// only, not the whole stage, so text in the other windows stays crisp at
// hall-viewing distance.
withDefaults(defineProps<{
  src?: string
  alt?: string
  placeholder?: string
  scanlines?: boolean
  /** Slow vertical drift of a brighter band, like a CRT out of sync. */
  roll?: boolean
  fit?: 'contain' | 'cover'
  /** Letterbox fill behind the image. Black reads as a screen, white as paper. */
  surface?: string
}>(), {
  src: undefined,
  alt: '',
  placeholder: 'Aucune image',
  scanlines: true,
  roll: false,
  fit: 'contain',
  surface: '#000',
})
</script>

<template>
  <div class="w98-frame">
    <div
      class="w98-frame__inner"
      :style="{ background: surface }"
    >
      <img
        v-if="src"
        class="w98-frame__img"
        :src="src"
        :alt="alt"
        :style="{ objectFit: fit }"
      >
      <div
        v-else
        class="w98-frame__placeholder"
      >
        {{ placeholder }}
      </div>

      <div
        v-if="scanlines"
        class="w98-frame__scanlines"
      />
      <div
        v-if="scanlines && roll"
        class="w98-frame__roll"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.w98-frame {
  width: 100%;
  height: 100%;
  padding: 3px;
  background: #fff;
  box-shadow: var(--w98-sunken);

  &__inner {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: repeating-conic-gradient(#e8e8e8 0% 25%, #f8f8f8 0% 50%) 0 0 / 16px 16px;
    font-size: 15px;
    color: var(--w98-text-mute);
    text-align: center;
  }

  // 1px dark line every 3px, multiplied over the image.
  &__scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgb(0 0 0 / 30%) 0 1px,
      rgb(0 0 0 / 0%) 1px 3px
    );
    mix-blend-mode: multiply;
    pointer-events: none;
  }

  &__roll {
    position: absolute;
    right: 0;
    left: 0;
    height: 22%;
    background: linear-gradient(
      to bottom,
      rgb(255 255 255 / 0%),
      rgb(255 255 255 / 7%),
      rgb(255 255 255 / 0%)
    );
    animation: w98-roll 7s linear infinite;
    pointer-events: none;
  }
}

@keyframes w98-roll {
  from { top: -22%; }
  to { top: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .w98-frame__roll {
    animation: none;
    opacity: 0;
  }
}
</style>
