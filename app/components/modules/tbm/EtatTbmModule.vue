<script setup lang="ts">
import type {
  TbmNetworkLevel,
  TbmNetworkStatus,
} from '#shared/types/tbm-network'

interface StatusAsset {
  icon: string
  label: string
  description: string
}

/*
 * Toute la correspondance entre un état provenant de l’API et une icône
 * de ton interface est centralisée ici.
 *
 * Les images doivent être placées dans :
 * public/windows98-icons/png/status/
 */
const STATUS_ASSETS: Record<TbmNetworkLevel, StatusAsset> = {
  normal: {
    icon: '/windows98-icons/png/status/normal.png',
    label: 'Service normal',
    description: 'Le service circule normalement.',
  },
  info: {
    icon: '/windows98-icons/png/status/info.png',
    label: 'Information',
    description: 'Une information est disponible pour cette ligne.',
  },
  warning: {
    icon: '/windows98-icons/png/status/warning.png',
    label: 'Circulation ralentie',
    description: 'Des retards ou ralentissements sont possibles.',
  },
  disruption: {
    icon: '/windows98-icons/png/status/disruption.png',
    label: 'Service perturbé',
    description: 'Le service est fortement perturbé ou interrompu.',
  },
}

const {
  data: networkData,
  error,
  refresh,
} = useLazyFetch<TbmNetworkStatus>('/api/etat-reseau-tbm')

let refreshTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  refreshTimer = setInterval(() => {
    refresh()
  }, 20_000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const getStatusAsset = (level: TbmNetworkLevel): StatusAsset => {
  return STATUS_ASSETS[level]
}
</script>

<template>
  <section
    class="tbm-network"
    aria-labelledby="tbm-network-title"
  >
    <div class="tbm-network__titlebar">
      <h2
        id="tbm-network-title"
        class="tbm-network__title"
      >
        État du réseau et perturbations
      </h2>
    </div>

    <div
      v-if="error"
      class="tbm-network__error"
    >
      État du réseau indisponible.
    </div>

    <div
      v-else-if="networkData"
      class="tbm-network__content"
    >
      <div class="tbm-network__summary">
        <p class="tbm-network__heading">
          ÉTAT DU RÉSEAU
        </p>

        <div class="tbm-network__services">
          <div
            v-for="service in networkData.services"
            :key="service.id"
            class="tbm-network__service"
          >
            <span class="tbm-network__service-label">
              {{ service.label }}
            </span>

            <img
              :src="getStatusAsset(service.level).icon"
              :alt="`${service.label} : ${getStatusAsset(service.level).label}`"
              :title="`${service.label} : ${getStatusAsset(service.level).description}`"
              class="tbm-network__status-icon"
            >
          </div>
        </div>
      </div>

      <div class="tbm-network__incidents">
        <p class="tbm-network__heading">
          INFORMATIONS EN COURS
        </p>

        <p
          v-if="networkData.incidents.length === 0"
          class="tbm-network__none"
        >
          Aucune perturbation signalée.
        </p>

        <ul
          v-else
          class="tbm-network__incident-list"
        >
          <li
            v-for="incident in networkData.incidents"
            :key="incident.id"
            class="tbm-network__incident"
            :class="`tbm-network__incident--${incident.level}`"
          >
            <img
              :src="getStatusAsset(incident.level).icon"
              :alt="getStatusAsset(incident.level).label"
              class="tbm-network__incident-icon"
            >

            <p class="tbm-network__incident-text">
              <strong>{{ incident.line }}</strong>
              — {{ incident.message }}
            </p>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-else
      class="tbm-network__loading"
    >
      Chargement de l’état du réseau...
    </div>
  </section>
</template>

<style scoped lang="scss">
.tbm-network {
  --tbm-face: var(--w98-face, #c0c0c0);
  --tbm-shadow: var(--w98-shadow, #808080);
  --tbm-dark-shadow: var(--w98-dark-shadow, #404040);
  --tbm-white: var(--w98-white, #fff);
  --tbm-blue: #0a246a;
  --tbm-muted: #555;
  --tbm-warn: #b00000;

  min-width: 0;
  border: 2px solid;
  border-color: var(--tbm-white) var(--tbm-dark-shadow) var(--tbm-dark-shadow) var(--tbm-white);
  background: var(--tbm-face);
  color: #000;
  font-family: var(--w98-ui-font), sans-serif;
}

.tbm-network__titlebar {
  padding-top: 12px;
  padding-left: 10px;
  color: var(--tbm-white);
}

.tbm-network__title {
  color: #0a0a0a;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.tbm-network__content {
  display: grid;
  grid-template-columns: minmax(180px, 0.75fr) minmax(0, 2fr);
  gap: 10px;
  padding: 8px;
}

.tbm-network__summary,
.tbm-network__incidents {
  min-width: 0;
  padding: 7px 9px;
  border: 2px solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
  background: var(--tbm-white);
}

.tbm-network__heading {
  margin: 0 0 8px;
  color: var(--tbm-muted);
  font-size: 12px;
  font-weight: 700;
}

.tbm-network__services {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.tbm-network__service {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 22px;
}

.tbm-network__service-label {
  min-width: 42px;
  font-size: 15px;
  font-weight: 700;
}

.tbm-network__status-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  image-rendering: pixelated;
}

.tbm-network__updated {
  margin: 9px 0 0;
  padding-top: 5px;
  border-top: 1px solid var(--tbm-face);
  color: var(--tbm-muted);
  font-size: 11px;
  font-style: italic;
}

.tbm-network__incident-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.tbm-network__incident {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 4px 5px;
  border: 1px solid transparent;
}

.tbm-network__incident-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  object-fit: contain;
  image-rendering: pixelated;
}

.tbm-network__incident-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.25;
}

.tbm-network__none {
  margin: 0;
  padding: 5px;
  color: #087308;
  font-size: 13px;
}

.tbm-network__loading,
.tbm-network__error {
  padding: 12px;
  border: 2px solid;
  border-color: var(--tbm-shadow) var(--tbm-white) var(--tbm-white) var(--tbm-shadow);
  background: var(--tbm-white);
  color: var(--tbm-muted);
  font-size: 13px;
}

.tbm-network__error {
  color: var(--tbm-warn);
}

@media (max-width: 820px) {
  .tbm-network__content {
    grid-template-columns: 1fr;
  }
}
</style>
