<script setup lang="ts">
// Fixed 1920x1080 stage for the hall display. Every child positions itself in
// raw stage pixels; on any other viewport the whole stage is scaled down to fit,
// so a dev preview is the panel, just smaller.
import type { Season } from '~/utils/season'

defineProps<{ season: Season }>()

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080

const scale = ref(1)

function fitToViewport() {
  scale.value = Math.min(
    window.innerWidth / STAGE_WIDTH,
    window.innerHeight / STAGE_HEIGHT,
  )
}

onMounted(() => {
  fitToViewport()
  window.addEventListener('resize', fitToViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', fitToViewport)
})

// Colour comes from [data-season] in _seasons.scss. An inline declaration would
// outrank every seasonal rule and pin the stage to one palette.
const stageStyle = computed(() => ({
  transform: `scale(${scale.value})`,
}))
</script>

<template>
  <div class="w98-viewport">
    <div
      class="w98-stage"
      :data-season="season"
      :style="stageStyle"
    >
      <!-- Behind everything: light on the backdrop only. -->
      <SeasonRays v-if="season === 'summer'" />

      <!-- Icons sit at the bottom of the stack so windows can cover them. -->
      <div class="w98-stage__icons">
        <slot name="icons" />
      </div>

      <slot />

      <slot name="taskbar" />

      <!-- In front of everything: falling particles, and the material that
           settles or grows along each window's top edge. -->
      <SeasonOverlay :season="season" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.w98-viewport {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #000;
}

.w98-stage {
  position: relative;
  flex: 0 0 auto;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: var(--w98-desktop);
  font-family: var(--w98-ui-font);
  font-size: var(--w98-ui-size);
  color: var(--w98-text);
  user-select: none;

  &__icons {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
}
</style>
