import type { Season } from '~/utils/season'

const HOUR = 60 * 60 * 1000

// The season currently on display, derived from the date so the panel re-themes
// itself unattended. Re-checked hourly, since a display left running from
// 30 November to 1 December has to notice. `?season=winter` pins one instead,
// for demoing out of season without touching the system clock.
export function useSeason() {
  const route = useRoute()

  // Starts on the server-safe value and settles on mount, so a stale prerender
  // can never pin the wrong season for the life of the process.
  const detected = ref<Season>(seasonForDate(new Date()))

  let timer: ReturnType<typeof setInterval>

  onMounted(() => {
    detected.value = seasonForDate(new Date())
    timer = setInterval(() => {
      detected.value = seasonForDate(new Date())
    }, HOUR)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })

  return computed<Season>(() => {
    const override = route.query.season
    return isSeason(override) ? override : detected.value
  })
}
