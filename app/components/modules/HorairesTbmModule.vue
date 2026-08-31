<script setup lang="ts">
import type { TbmPassage, TbmStopConfig } from '~/types/siri'
import EtatTbmModule from '~/components/modules/tbm/EtatTbmModule.vue'

interface TbmStopResult extends TbmStopConfig {
  passages: TbmPassage[]
}

const TRANSPORT_ICONS = {
  bus: '/windows98-icons/png/transports/test-bus.png',
  tram: '/windows98-icons/png/transports/test-tram.png',
} as const

/*
 * Ce module ne récupère que les prochains passages.
 *
 * L’état du réseau est récupéré indépendamment par EtatTbmModule,
 * qui appelle /api/etat-reseau-tbm de son côté.
 */
interface HorairesTbmResponse {
  data?: TbmStopResult[]
  results?: TbmStopResult[]
}

/*
 * L'endpoint devrait idéalement renvoyer TbmStopResult[] directement.
 * On accepte également temporairement un éventuel enveloppement
 * { data: [...] } ou { results: [...] } pour éviter de perdre l'affichage.
 */
const {
  data: rawData,
  error,
  refresh,
} = useLazyFetch<TbmStopResult[] | HorairesTbmResponse>(
  '/api/horaires-tbm',
)

const stops = computed<TbmStopResult[]>(() => {
  const response = rawData.value

  if (Array.isArray(response)) {
    return response
  }

  if (response && Array.isArray(response.data)) {
    return response.data
  }

  if (response && Array.isArray(response.results)) {
    return response.results
  }

  return []
})

const hasValidStopsResponse = computed(() => {
  const response = rawData.value

  return Array.isArray(response)
    || (response !== null && typeof response === 'object' && Array.isArray(response.data))
    || (response !== null && typeof response === 'object' && Array.isArray(response.results))
})

const groups = computed(() => {
  const byLine = new Map<string, TbmStopResult[]>()

  for (const stop of stops.value) {
    const existing = byLine.get(stop.label) ?? []
    existing.push(stop)
    byLine.set(stop.label, existing)
  }

  return Array.from(byLine.entries()).map(([label, lineStops]) => ({
    label,
    type: lineStops[0]?.type ?? 'bus',
    stops: lineStops,
  }))
})

let refreshTimer: ReturnType<typeof setInterval> | undefined
const lastUpdated = ref(new Date())

onMounted(() => {
  refreshTimer = setInterval(() => {
    refresh()
    lastUpdated.value = new Date()
  }, 20_000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const isImminent = (minutes: number | null) => {
  return minutes !== null && minutes <= 2
}

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) {
    return '–'
  }

  if (minutes === 0) {
    return 'à quai'
  }

  return `${minutes} min`
}

const getTransportIcon = (type: string) => {
  return type === 'tram'
    ? TRANSPORT_ICONS.tram
    : TRANSPORT_ICONS.bus
}

const getTransportAlt = (type: string) => {
  return type === 'tram' ? 'Tram' : 'Bus'
}
</script>

<template>
  <div class="tbm">
    <div class="tbm__banner">
      <span
        class="tbm__banner-icon"
        aria-hidden="true"
      >
        <img
          :src="TRANSPORT_ICONS.bus"
          alt=""
          class="tbm__transport-icon"
        >
      </span>

      <span class="tbm__banner-title">
        Prochains passages TBM
      </span>
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
      v-else-if="hasValidStopsResponse"
      class="tbm__content"
    >
      <div class="tbm__passages">
        <section
          v-for="group in groups"
          :key="group.label"
          class="tbm__section"
        >
          <div class="tbm__section-title-container">
            <span class="tbm__section-title">
              {{ group.label }}
            </span>

            <img
              :src="getTransportIcon(group.type)"
              :alt="getTransportAlt(group.type)"
              class="tbm__section-icon"
            >
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
                    >
                      théorique
                    </span>
                  </td>

                  <td class="tbm__cell tbm__cell--time">
                    {{ formatMinutes(passage.minutes) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <EtatTbmModule class="tbm__network" />
    </div>

    <div
      v-else-if="rawData"
      class="tbm__empty"
    >
      <p class="tbm__empty-line">
        Réponse horaires invalide
      </p>

      <p class="tbm__empty-why">
        L’API TBM n’a pas renvoyé de liste de passages.
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
  </div>
</template>

<style scoped lang="scss">
.tbm {
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
  color: var(--tbm-text);
  font-family: var(--w98-ui-font), sans-serif;
}

.tbm__transport-icon {
  width: 60px;
  height: 40px;
  image-rendering: pixelated;
}

.tbm__banner {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: linear-gradient(90deg, #000080, #1084d0);
  color: var(--tbm-white);
  height: 10%;
}

.tbm__banner-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 20px;
}

.tbm__banner-separator {
  line-height: 1;
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
  gap: 12px;
  padding: 14px 18px;
  overflow-y: auto;
}

.tbm__passages {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 50px;
}

.tbm__section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.tbm__section-title-container {
  display: flex;
  align-items: center;
}

.tbm__section-title {
  color: var(--tbm-text);
  font-size: 20px;
  font-weight: 700;
}

.tbm__section-icon {
  width: auto;
  height: 30px;
  margin-left: 5px;
  image-rendering: pixelated;
}

.tbm__stop {
  padding: 8px 10px;
  margin-bottom: 9px;
  border: 2px solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
  background: var(--tbm-face);
}

.tbm__stop-name {
  margin: 0 0 6px;
  color: var(--tbm-muted);
  font-size: 15px;
  font-style: italic;
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
    color: var(--tbm-muted);
    font-style: italic;
  }

  &--destination {
    overflow: hidden;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
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
  color: var(--tbm-muted);
  font-size: 11px;
  text-transform: uppercase;
}

/* Le composant enfant gère entièrement son contenu et son design.
   Le parent ne définit que son placement dans la mise en page. */
.tbm__network {
  margin-top: 30px;
  width: 100%;
  min-width: 0;
}

.tbm__source {
  margin: 0;
  align-self: flex-end;
  color: var(--tbm-muted);
  font-size: 12px;
  font-style: italic;
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
  margin: 0;
  color: var(--tbm-muted);
  font-size: 22px;
}

.tbm__empty-why {
  max-width: 80%;
  margin: 0;
  color: var(--tbm-warn);
  font-size: 15px;
  text-align: center;
}

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
  border: 1px solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
  white-space: nowrap;
}

.tbm__status-progress {
  display: flex;
  flex: 1;
  gap: 1px;
  min-width: 30px;
  padding: 2px 6px;
  border: 1px solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
}

.tbm__status-block {
  flex: 1;
  background: var(--tbm-blue-light);
}

@media (max-width: 820px) {
  .tbm__passages {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .tbm__statusbar {
    gap: 3px;
  }

  .tbm__status-cell {
    padding: 2px 5px;
  }
}
</style>
