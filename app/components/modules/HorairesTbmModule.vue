<script setup lang="ts">
import type { TbmPassage, TbmStopConfig } from '~/types/siri'
import EtatTbmModule from '~/components/modules/tbm/EtatTbmModule.vue'

interface TbmStopResult extends TbmStopConfig {
  passages: TbmPassage[]
}

const TRANSPORT_ICONS = {
  bus: '/windows98-icons/png/transports/bus.png',
  tram: '/windows98-icons/png/transports/tram.png',
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
      <div class="tbm__lines">
        <section
          v-for="group in groups"
          :key="group.label"
          class="tbm__line"
        >
          <header class="tbm__line-head">
            <span class="tbm__line-label">{{ group.label }}</span>

            <img
              :src="getTransportIcon(group.type)"
              :alt="getTransportAlt(group.type)"
              class="tbm__line-icon"
            >
          </header>

          <div class="tbm__line-list">
            <article
              v-for="stop in group.stops"
              :key="stop.ref"
              class="tbm__stop-row"
            >
              <div class="tbm__stop-direction">
                {{ stop.direction }}
              </div>

              <div
                v-if="stop.passages.length === 0"
                class="tbm__stop-empty"
              >
                Aucun passage prévu
              </div>

              <div
                v-else
                class="tbm__stop-passages"
              >
                <span
                  v-for="(passage, index) in stop.passages.slice(0, 2)"
                  :key="`${stop.ref}-${index}`"
                  class="tbm__passage"
                  :class="{ 'tbm__passage--imminent': isImminent(passage.minutes) }"
                >
                  <span class="tbm__passage-destination">
                    {{ passage.destination }}
                    <span
                      v-if="!passage.tempsReel"
                      class="tbm__badge"
                    >théo.</span>
                  </span>

                  <span class="tbm__passage-time">{{ formatMinutes(passage.minutes) }}</span>
                </span>
              </div>
            </article>
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

// Same recipe as WeatherModule: a static, non-interactive screen with no
// scroll, so everything below sits inside this box and shares whatever
// vertical space is available instead of growing past it.
.tbm__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  overflow: hidden;
  background: var(--w98-face);
}

.tbm__lines {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

// Same shell as the weather hero/forecast cards: a raised tile on the face
// holding a sunken document well, so every module reads as one system.
.tbm__line {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

// Win98's own selection colour, used as the "highlighted" title band, same
// as the weather hero header.
.tbm__line-head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: var(--w98-select);
}

.tbm__line-label {
  color: var(--w98-white);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-decoration: underline;
}

.tbm__line-icon {
  width: auto;
  height: 22px;
  flex: 0 0 auto;
  image-rendering: pixelated;
}

// A Win98 list view: sunken well, thin row separators, no card-per-stop.
// Rows share the well as equal flex parts so the list always fits exactly,
// whatever the number of stops turns out to be.
.tbm__line-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.tbm__stop-row {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 4px 10px;
  border-bottom: 1px solid var(--w98-face-alt);

  &:last-child {
    border-bottom: 0;
  }
}

.tbm__stop-direction {
  overflow: hidden;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  font-style: italic;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tbm__stop-empty {
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  font-style: italic;
}

.tbm__stop-passages {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.tbm__passage {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.tbm__passage-destination {
  overflow: hidden;
  min-width: 0;
  flex: 1 1 auto;
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tbm__passage-time {
  flex: 0 0 auto;
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

// The Explorer "selected row" treatment, repurposed: a passage due in the
// next 2 minutes gets the same full blue highlight a selected file gets,
// instead of just colouring its numerals. Red stays reserved for genuine
// error/disruption states across every module.
.tbm__passage--imminent {
  .tbm__passage-destination,
  .tbm__passage-time {
    padding: 1px 4px;
    background: var(--w98-select);
    color: var(--w98-white);
  }
}

.tbm__badge {
  margin-left: 6px;
  padding: 0 4px;
  border: 1px solid var(--w98-shadow);
  color: inherit;
  font-size: var(--w98-ui-size-sm);
  text-transform: uppercase;
}

/* Le composant enfant gère entièrement son contenu et son design.
   Le parent ne définit que son placement dans la mise en page. */
.tbm__network {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}

@media (max-width: 820px) {
  .tbm__lines {
    grid-template-columns: 1fr;
  }

  .tbm__stop-direction {
    display: none;
  }
}
</style>
