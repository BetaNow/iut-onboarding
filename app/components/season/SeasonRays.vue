<script setup lang="ts">
// Summer sun rays across the desktop backdrop. Painted behind the windows,
// unlike the falling particles: a wash of light over a title bar costs more
// contrast than it is worth on a hall display. The blur is static and only
// opacity and transform animate, so nothing re-rasterises a 1920x1080 blur.
const BEAMS = [
  { left: -6, width: 190, delay: 0, duration: 19 },
  { left: 14, width: 120, delay: -7, duration: 23 },
  { left: 31, width: 240, delay: -13, duration: 17 },
  { left: 55, width: 150, delay: -4, duration: 26 },
]
</script>

<template>
  <div
    class="season-rays"
    aria-hidden="true"
  >
    <span
      v-for="(beam, index) in BEAMS"
      :key="index"
      class="season-rays__beam"
      :style="{
        left: `${beam.left}%`,
        width: `${beam.width}px`,
        animationDelay: `${beam.delay}s`,
        animationDuration: `${beam.duration}s`,
      }"
    />
  </div>
</template>

<style scoped lang="scss">
.season-rays {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  &__beam {
    position: absolute;
    top: -30%;
    height: 170%;
    background: linear-gradient(to bottom, rgb(255 244 200 / 34%), rgb(255 244 200 / 0%));
    filter: blur(22px);
    transform: rotate(16deg);
    animation-name: season-rays-drift;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }
}

@keyframes season-rays-drift {
  from {
    opacity: 0.45;
    transform: rotate(16deg) translateX(-26px);
  }

  to {
    opacity: 0.9;
    transform: rotate(19deg) translateX(26px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .season-rays__beam {
    animation: none;
    opacity: 0.6;
  }
}
</style>
