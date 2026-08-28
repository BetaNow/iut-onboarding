<script setup lang="ts">
// The pile every Windows user remembers: one message box respawning faster than
// it can be dismissed. Only the front copy carries content; the rest are the
// same box stepped up and left by one title bar, so all that shows is a
// staircase. Each copy is a real .w98-window at stage coordinates, so the season
// dresses every step like any other window.
const ICON = '/windows98-icons/png'

// One step back: left by a nudge, up by a title bar plus whatever the season
// grows on its top edge. Stage pixels, not scaled with the copies, because the
// season's material is a fixed height and the step has to clear it.
const STEP_X = 13
const STEP_Y = 56

const props = withDefaults(defineProps<{
  title: string
  /** Kept to one line: the box is sized around it, never the other way round. */
  message: string
  buttons: string[]
  /** The front copy. The rest cascade up and to the left of it. */
  x: number
  y: number
  width: number
  height: number
  z?: number
  count?: number
  icon?: string
  // Shrinks the boxes without touching their layout. They are drawn from the
  // top-left corner, so x/y stay the front copy's position and width/height stay
  // the size the content is laid out at.
  scale?: number
}>(), {
  z: 1,
  count: 7,
  icon: `${ICON}/executable-1.png`,
  scale: 1,
})

/** Back to front, so the copy holding the message is the last one painted. */
const copies = computed(() => Array.from({ length: props.count }, (_, index) => {
  const depth = props.count - 1 - index

  return {
    x: props.x - depth * STEP_X,
    y: props.y - depth * STEP_Y,
    front: depth === 0,
  }
}))

const frameStyle = computed(() => ({
  transform: `scale(${props.scale})`,
  transformOrigin: 'top left',
}))
</script>

<template>
  <Win98Window
    v-for="(copy, index) in copies"
    :key="index"
    :style="frameStyle"
    :title="title"
    :icon="icon"
    :x="copy.x"
    :y="copy.y"
    :width="width"
    :height="height"
    :z="z"
    alert
    :well="false"
  >
    <div
      v-if="copy.front"
      class="alert"
    >
      <div class="alert__body">
        <img
          class="alert__icon"
          :src="`${ICON}/msg_warning-0.png`"
          alt=""
          width="64"
          height="64"
        >
        <p class="alert__message">
          {{ message }}
        </p>
      </div>

      <div class="alert__actions">
        <button
          v-for="(label, position) in buttons"
          :key="label"
          type="button"
          class="alert__button"
          :class="{ 'alert__button--default': position === 0 }"
          tabindex="-1"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </Win98Window>
</template>

<style scoped lang="scss">
.alert {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 18px 14px;

  &__body {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  &__icon {
    flex: 0 0 auto;
    image-rendering: pixelated;
  }

  &__message {
    font-size: var(--w98-ui-size);
    line-height: 1.35;
    white-space: nowrap;
  }

  // Win98 centres the buttons of a message box rather than ranging them right.
  &__actions {
    display: flex;
    flex: 0 0 auto;
    justify-content: center;
    gap: 10px;
  }

  &__button {
    min-width: 100px;
    padding: 9px 12px;
    border: 0;
    background: var(--w98-face);
    box-shadow: var(--w98-raised);
    font: inherit;
    font-size: var(--w98-ui-size);
    color: var(--w98-text);
    white-space: nowrap;
  }

  // The default button carries the focus rectangle, drawn inside its bevel.
  &__button--default {
    outline: 2px dotted var(--w98-dark);
    outline-offset: -7px;
  }
}
</style>
