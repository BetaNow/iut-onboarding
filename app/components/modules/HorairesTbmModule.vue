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
    <Win98ModuleBanner
      :icon="TRANSPORT_ICONS.bus"
      title="Prochains passages TBM"
    />

    <Win98ModuleStatus
      v-if="error"
      tone="warn"
      line="Service indisponible"
      :detail="error.statusMessage ?? error.message"
    />

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
                  class="tbm__row"
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

    <Win98ModuleStatus
      v-else-if="rawData"
      tone="warn"
      line="Réponse horaires invalide"
      detail="L’API TBM n’a pas renvoyé de liste de passages."
    />

    <Win98ModuleStatus
      v-else
      line="Chargement..."
    />
  </div>
</template>

<style scoped lang="scss">
.tbm {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--w98-white);
  color: var(--w98-text);
  font-family: var(--w98-ui-font), sans-serif;
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
  gap: 8px;
}

.tbm__section-title {
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
}

.tbm__section-icon {
  width: auto;
  height: 26px;
  image-rendering: pixelated;
}

.tbm__stop {
  padding: 8px 10px;
  margin-bottom: 9px;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

.tbm__stop-name {
  margin: 0 0 6px;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
  font-style: italic;
}

.tbm__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--w98-white);
}

.tbm__cell {
  padding: 6px 10px;
  font-size: var(--w98-ui-size);

  &--muted {
    color: var(--w98-text-dim);
    font-style: italic;
  }

  &--destination {
    overflow: hidden;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &--time {
    width: 110px;
    font-size: var(--w98-ui-size-lg);
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}

// The Explorer "selected row" treatment, repurposed: a passage due in the
// next 2 minutes gets the same full blue highlight a selected file gets,
// instead of just colouring its numerals. Red stays reserved for genuine
// error/disruption states across every module.
.tbm__row--imminent {
  background: var(--w98-select);

  .tbm__cell {
    color: var(--w98-white);
  }
}

.tbm__badge {
  margin-left: 8px;
  padding: 0 4px;
  border: 1px solid var(--w98-shadow);
  color: inherit;
  font-size: var(--w98-ui-size-sm);
  text-transform: uppercase;
}

/* Le composant enfant gère entièrement son contenu et son design.
   Le parent ne définit que son placement dans la mise en page. */
.tbm__network {
  margin-top: 30px;
  width: 100%;
  min-width: 0;
}

@media (max-width: 820px) {
  .tbm__passages {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
