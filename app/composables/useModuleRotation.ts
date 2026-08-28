import type { MaybeRefOrGetter } from 'vue'
import type { RuntimeModule } from '~/types/display'

// How often the countdown is re-measured. The progress bar steps in whole
// chunks, so ten updates a second is finer than it can show.
const TICK = 100

/** Fallback for a module whose row somehow carries no duration. */
const FALLBACK_DURATION = 30_000

// Runs the main window's rotation: which module is on screen and how much of its
// turn is spent. Elapsed time comes from performance.now() deltas, not a tick
// count, so a throttled background tab does not lose track of real time.
//
// A rotation edited in the admin arrives mid-turn and is held back until the
// running module's turn ends, so a save never cuts a module off part-way.
export function useModuleRotation(modules: MaybeRefOrGetter<RuntimeModule[]>) {
  const incoming = computed(() => toValue(modules))

  // Shallow: the list is always replaced wholesale, never mutated in place, so
  // there is nothing to gain from making every module object deeply reactive.
  const applied = shallowRef<RuntimeModule[]>([])
  const index = ref(0)
  const elapsed = ref(0)

  // Bumped every time a module takes the window, and used as its Vue key.
  // Monotonic rather than an index, so a single module still re-mounts each time
  // round instead of sitting there stale.
  const generation = ref(0)

  let pending: RuntimeModule[] | null = null

  watch(incoming, (list) => {
    // With nothing on screen there is no turn to finish, so waiting for a
    // boundary would leave the panel blank until one that never comes.
    if (!applied.value.length) {
      applied.value = list
      index.value = 0
      elapsed.value = 0
      generation.value += 1
      return
    }

    pending = list
  }, { immediate: true })

  const current = computed<RuntimeModule | undefined>(() => applied.value[index.value])
  const duration = computed(() => current.value?.durationMs || FALLBACK_DURATION)

  const progress = computed(() => {
    if (!current.value) {
      return 0
    }

    return Math.min(elapsed.value / duration.value, 1)
  })

  // A shrinking list must not leave the index pointing past the end.
  watch(() => applied.value.length, (length) => {
    if (index.value >= length) {
      index.value = 0
      elapsed.value = 0
    }
  })

  let timer: ReturnType<typeof setInterval>
  let last = 0

  onMounted(() => {
    last = performance.now()

    timer = setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now

      if (!applied.value.length && !pending) {
        return
      }

      elapsed.value += delta

      if (elapsed.value < duration.value) {
        return
      }

      elapsed.value = 0

      if (pending) {
        applied.value = pending
        pending = null
        index.value = 0
      }
      else {
        index.value = (index.value + 1) % applied.value.length
      }

      generation.value += 1
    }, TICK)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })

  return { current, index, progress, generation, applied }
}
