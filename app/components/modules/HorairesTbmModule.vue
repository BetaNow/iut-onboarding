<script setup lang="ts">
import type { TbmStopConfig, TbmPassage } from '~/types/siri'

// One entry per physical direction, exactly the shape server/api/horaires-tbm.get.ts
// returns: the static config for that direction plus its resolved passages.
interface TbmStopResult extends TbmStopConfig {
  passages: TbmPassage[]
}

// Lazy and not awaited, same reasoning as the other modules: this has to mount
// at once on the kiosk rotation and fill in afterwards, not suspend the board.
const { data, error, refresh } = useLazyFetch<TbmStopResult[]>('/api/horaires-tbm')

// The route already dedupes bus 31 / tram B into separate directions; here we
// only regroup them by line so the panel reads as two blocks (Ligne 31 / Tram
// B) instead of four flat rows, the same way the CROUS panel groups items by
// category rather than listing every dish in one column.
const groups = computed(() => {
  if (!data.value) {
    return []
  }

  const byLine = new Map<string, TbmStopResult[]>()
  for (const stop of data.value) {
    const existing = byLine.get(stop.label) ?? []
    existing.push(stop)
    byLine.set(stop.label, existing)
  }

  return Array.from(byLine.entries()).map(([label, stops]) => ({
    label,
    // stops should always contain at least one element, but TS can't
    // guarantee that. Use optional chaining with a sensible default to
    // avoid `Object is possibly 'undefined'` errors during type-check.
    type: stops[0]?.type ?? 'bus',
    stops,
  }))
})

// Real-time TBM data ages fast: a stale panel is worse than a blank one, so the
// board refreshes on its own instead of waiting for the kiosk's slide rotation.
let timer: ReturnType<typeof setInterval> | undefined
const lastUpdated = ref(new Date())

onMounted(() => {
  timer = setInterval(() => {
    refresh()
    lastUpdated.value = new Date()
  }, 20_000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

const formattedTime = computed(() =>
  lastUpdated.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
)

// TODO: une fois les 4 arrêts revérifiés en journée (service coupé la nuit),
// remplacer stop.direction par le vrai DestinationName renvoyé par l'API pour
// confirmer quel StopPointRef va vers l'IUT et lequel va vers le centre.
const isImminent = (minutes: number | null) => minutes !== null && minutes <= 2

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) {
    return '–'
  }
  if (minutes === 0) {
    return 'à quai'
  }
  return `${minutes} min`
}
</script>

<template>
  <div class="tbm">
    <!-- Accent banner, same slot the CROUS panel fills with its red circle and
         blue bar: brand colour, white text, nothing fancier than that. -->
    <div class="tbm__banner">
      <span class="tbm__banner-icon">
        <img
          src="/windows98-icons/png/transports/bus.png"
          alt="bus"
          class="tbm__transport-icon"
        >
        /
        <img
          src="/windows98-icons/png/transports/tram.png"
          alt="tram"
          class="tbm__transport-icon"
        >
      </span>
      <span class="tbm__banner-title">Prochains passages TBM</span>
    </div>

    <div
      v-if="error"
      class="tbm__empty"
    >
      <p class="tbm__empty-line">
        Service indisponible
      </p>
      <p class="tbm__empty-why">
        {{ error.statusMessage ?? error.message }}
      </p>
    </div>

    <div
      v-else-if="data"
      class="tbm__content"
    >
      <div
        v-for="group in groups"
        :key="group.label"
        class="tbm__section"
      >
        <div>
          <div class="tbm__section-title-container">
            <span class="tbm__section-title">{{ group.label }}</span>
            <img
              v-if="group.type === 'tram'"
              src="/windows98-icons/png/transports/tram.png"
              alt="Tram"
              class="tbm__section-icon"
            >
            <img
              v-else
              src="/windows98-icons/png/transports/bus.png"
              alt="Bus"
              class="tbm__section-icon"
            >
          </div>
        </div>

        <div
          v-for="stop in group.stops"
          :key="stop.ref"
          class="tbm__stop"
        >
          <p class="tbm__stop-name">
            {{ stop.direction }}
          </p>

          <table class="tbm__table">
            <tbody>
              <tr v-if="stop.passages.length === 0">
                <td
                  colspan="2"
                  class="tbm__cell tbm__cell--muted"
                >
                  Aucun passage prévu
                </td>
              </tr>
              <tr
                v-for="(passage, index) in stop.passages"
                :key="`${stop.ref}-${index}`"
                :class="{ 'tbm__row--imminent': isImminent(passage.minutes) }"
              >
                <td class="tbm__cell tbm__cell--destination">
                  {{ passage.destination }}
                  <span
                    v-if="!passage.tempsReel"
                    class="tbm__badge"
                  >théorique</span>
                </td>
                <td class="tbm__cell tbm__cell--time">
                  {{ formatMinutes(passage.minutes) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="tbm__source">
        Source : bdx.mecatran.com (SIRI-Lite)
      </p>
    </div>

    <div
      v-else
      class="tbm__empty"
    >
      <p class="tbm__empty-line">
        Chargement...
      </p>
    </div>

    <!-- Status bar, identical structure to the CROUS panel's footer: state on
         the left, a decorative progress strip in the middle, timestamp and
         source on the right. -->
    <div class="tbm__statusbar">
      <span class="tbm__status-cell">Prêt</span>
      <span class="tbm__status-progress">
        <span
          v-for="n in 12"
          :key="n"
          class="tbm__status-block"
        />
      </span>
      <span class="tbm__status-cell">Actualisé à {{ formattedTime }}</span>
      <span class="tbm__status-cell">Réseau TBM</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tbm__transport-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}
.tbm {
  // Same face/shadow/highlight vocabulary the other modules draw their 3D
  // borders from, with local fallbacks in case this panel is previewed outside
  // the desktop shell.
  --tbm-face: var(--w98-face, #c0c0c0);
  --tbm-shadow: var(--w98-shadow, #808080);
  --tbm-dark-shadow: var(--w98-dark-shadow, #404040);
  --tbm-white: var(--w98-white, #fff);
  --tbm-blue: #0a246a;
  --tbm-blue-light: #a6caf0;
  --tbm-text: #000;
  --tbm-muted: #555;
  --tbm-warn: #b00000;

  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--tbm-white);
  font-family: var(--w98-ui-font), sans-serif;
  color: var(--tbm-text);
}

// Brand banner: TBM's own navy/blue, the same way the CROUS panel spends its
// one splash of colour on a red circle and blue bar rather than theming the
// whole window.
.tbm__banner {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--tbm-blue);
  color: var(--tbm-white);
}

.tbm__banner-icon {
  font-size: 20px;
}

.tbm__banner-title {
  font-size: 20px;
  font-weight: 700;
}

.tbm__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 14px 18px;
  overflow: hidden;
}

.tbm__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tbm__section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--tbm-shadow);
}

.tbm__section-icon {
  margin-left: 5px;
  height: 22px;
  image-rendering: pixelated;
}

.tbm__section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--tbm-text);
}

.tbm__stop {
  // The same inset-border trick the reddit panel uses on its meme image: light
  // on bottom-right, shadow on top-left, so the box reads as recessed into the
  // grey face rather than floating on it.
  padding: 8px 10px;
  border-width: 2px;
  border-style: solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
  background: var(--tbm-face);
}

.tbm__stop-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-style: italic;
  color: var(--tbm-muted);
}

.tbm__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--tbm-white);
}

.tbm__cell {
  padding: 4px 8px;
  font-size: 17px;

  &--muted {
    font-style: italic;
    color: var(--tbm-muted);
  }

  &--destination {
    text-align: left;
  }

  &--time {
    width: 90px;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}

.tbm__row--imminent .tbm__cell--time {
  color: var(--tbm-warn);
}

.tbm__badge {
  margin-left: 8px;
  padding: 0 4px;
  border: 1px solid var(--tbm-shadow);
  font-size: 11px;
  color: var(--tbm-muted);
  text-transform: uppercase;
}

.tbm__source {
  margin-top: auto;
  align-self: flex-end;
  font-size: 12px;
  font-style: italic;
  color: var(--tbm-muted);
}

.tbm__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tbm__empty-line {
  font-size: 22px;
  color: var(--tbm-muted);
}

.tbm__empty-why {
  font-size: 15px;
  color: var(--tbm-warn);
}

// Status bar, matching the CROUS panel's footer layout: sunken cells with the
// same 3D border reversed (shadow on top-left reads as a groove, not a bump).
.tbm__statusbar {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  padding: 3px 6px;
  border-top: 1px solid var(--tbm-shadow);
  background: var(--tbm-face);
  font-size: 12px;
}

.tbm__status-cell {
  padding: 2px 8px;
  border-width: 1px;
  border-style: solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
}

.tbm__status-progress {
  display: flex;
  flex: 1;
  gap: 1px;
  padding: 2px 6px;
  border-width: 1px;
  border-style: solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
}

.tbm__status-block {
  flex: 1;
  background: var(--tbm-blue-light);
}
</style>
