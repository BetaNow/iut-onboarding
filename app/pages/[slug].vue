<script setup lang="ts">
import type { Department } from '#shared/types/department'
import type { RuntimeModule, ScreenConfigResponse } from '~/types/display'
import type { Win98Task, Win98ToolbarButton } from '~/types/win98'
import { MODULE_COMPONENTS } from '~/utils/modules'

const ICON = '/windows98-icons/png'

// No colours here: the season owns the palette, so a department is told apart
// by its logo, window titles and paths. The name is not in this table: it is
// the screen's own, and comes from the database with the rest of its row.
const BRANDING: Record<Department, { logo: string | null, path: string, logoFile: string | null }> = {
  info: {
    logo: '/img/logo-info.png',
    path: 'C:\\IUT\\Info\\Accueil',
    logoFile: 'logo-info.bmp',
  },
  sgm: {
    logo: '/img/logo-sgm.png',
    path: 'C:\\IUT\\SGM\\Accueil',
    logoFile: 'logo-sgm.bmp',
  },
  // A shared screen has no logo of its own yet, so it runs without the Paint
  // window rather than borrowing a department's.
  both: {
    logo: null,
    path: 'C:\\IUT\\Accueil',
    logoFile: null,
  },
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const { data, error, refresh } = await useFetch<ScreenConfigResponse>(
  () => `/api/screens/${slug.value}/config`,
  { server: false },
)

// The last configuration that actually arrived. Held separately from the request
// so a failed refresh leaves the panel playing what it had: a stale rotation
// beats a corridor screen going blank on one dropped request.
const config = ref<ScreenConfigResponse | null>(null)

watch(data, (value) => {
  if (value) {
    config.value = value
  }
}, { immediate: true })

const unknownScreen = computed(() => Boolean(error.value) && !config.value)

// The heartbeat both keeps `lastSeenAt` fresh and tells us when to refetch.
const { isActive } = useScreenHeartbeat(slug, refresh)

const branding = computed(() => config.value ? BRANDING[config.value.screen.department] : null)

const season = useSeason()

const now = ref(new Date())
let clockInterval: ReturnType<typeof setInterval>

onMounted(() => {
  now.value = new Date()
  clockInterval = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
})

const pad = (value: number) => String(value).padStart(2, '0')
const hoursMinutes = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`)
const seconds = computed(() => pad(now.value.getSeconds()))

// Desktop shortcuts. The column is jittered on x so it reads as a desktop
// somebody uses rather than a generated grid.
const desktopIcons = [
  { label: 'Poste de travail', icon: `${ICON}/computer_explorer-4.png`, x: 28, y: 26 },
  { label: 'Planning 1re année', icon: `${ICON}/calendar-0.png`, x: 36, y: 152 },
  { label: 'Planning 2e & 3e', icon: `${ICON}/directory_business_calendar-2.png`, x: 22, y: 278 },
  { label: 'Memes', icon: `${ICON}/directory_open_file_mydocs-4.png`, x: 40, y: 404 },
  { label: 'Infos & RU', icon: `${ICON}/notepad-2.png`, x: 26, y: 530 },
  { label: 'Intranet IUT', icon: `${ICON}/world-2.png`, x: 34, y: 656 },
  { label: 'Corbeille', icon: `${ICON}/recycle_bin_empty-4.png`, x: 24, y: 800 },
]

const explorerToolbar: Win98ToolbarButton[] = [
  { label: 'Dossiers', icon: `${ICON}/directory_closed-1.png` },
  { label: 'Rechercher', icon: `${ICON}/search_file_2-1.png` },
  { label: 'Historique', icon: `${ICON}/history-1.png` },
  { label: 'Actualiser', icon: `${ICON}/overlay_refresh-1.png` },
]

// The rotation as the database describes it, paired with the components only the
// client has. A configured module with no component is dropped rather than left
// to stall the cycle.
const runtimeModules = computed<RuntimeModule[]>(() =>
  (config.value?.modules ?? []).flatMap((module) => {
    const component = MODULE_COMPONENTS[module.moduleId]

    // `markRaw`, or the rotation's reactivity would walk the component's own
    // internals every time the list changes: pure overhead, and Vue warns.
    return component ? [{ ...module, component: markRaw(component) }] : []
  }),
)

const { current, index, progress, generation, applied } = useModuleRotation(runtimeModules)

// A module receives exactly what it declared in the catalogue, plus the
// department if it asked for one.
const moduleProps = computed(() => {
  const module = current.value

  if (!module) {
    return {}
  }

  return module.usesDepartment
    ? { ...module.settings, department: config.value?.screen.department }
    : { ...module.settings }
})

// Derived from the running rotation, so a module enabled in the admin gets its
// button here and lights up on its turn with nothing on this page to update.
const tasks = computed<Win98Task[]>(() => {
  if (unknownScreen.value) {
    return [{ label: 'Erreur', icon: `${ICON}/msg_error-2.png`, active: true }]
  }

  if (!isActive.value) {
    return [{ label: 'Veille', icon: `${ICON}/computer_explorer-4.png`, active: true }]
  }

  return applied.value.map((module, position) => ({
    label: module.label,
    icon: module.icon,
    active: position === index.value,
  }))
})

const tray = [
  `${ICON}/network_normal_two_pcs-1.png`,
  `${ICON}/loudspeaker_rays-1.png`,
]
</script>

<template>
  <!-- The stage measures the viewport and runs a live clock, so it only renders
       in the browser. -->
  <ClientOnly>
    <template #fallback>
      <div class="boot" />
    </template>

    <Win98Desktop :season="season">
      <template #icons>
        <Win98DesktopIcon
          v-for="item in desktopIcons"
          :key="item.label"
          :icon="item.icon"
          :label="item.label"
          :x="item.x"
          :y="item.y"
        />
      </template>

      <template v-if="config && isActive">
        <!-- Paint: the department logo, clipping the top of the icon column. -->
        <Win98Window
          v-if="branding?.logo"
          :title="`${branding.logoFile} - Paint`"
          :icon="`${ICON}/paint_file-0.png`"
          :x="152"
          :y="30"
          :width="560"
          :height="270"
          :z="2"
          :menus="['Fichier', 'Édition', 'Affichage', 'Image', '?']"
          :status="['IUT de Bordeaux', '1920 x 1080 px']"
          :well="false"
        >
          <Win98ImageFrame
            :src="branding.logo"
            :alt="config.screen.name"
            surface="#fff"
            roll
          />
        </Win98Window>

        <!-- Date/Time Properties, read-only. -->
        <Win98Window
          title="Propriétés de Date/Heure"
          :icon="`${ICON}/time_and_date-1.png`"
          :x="1440"
          :y="44"
          :width="420"
          :height="430"
          :z="2"
          dialog
          :well="false"
        >
          <Win98DateTime :now="now" />
        </Win98Window>

        <!-- The right column, under the Date/Heure sheet and behind every other
             window: a pile of message boxes, scaled down so six of them read as
             one gag rather than as six windows fighting the main one. Wide
             enough to hold its line of text, which is what sends the far end of
             the staircase behind the main window. -->
        <Win98ErrorStack
          title="Bug.exe"
          message="L'action ne peut pas aboutir : ça marche sur ma machine."
          :buttons="['Basculer vers...', 'Réessayer', 'Annuler']"
          :x="1450"
          :y="750"
          :width="680"
          :height="205"
          :scale="0.66"
          :count="6"
          :z="1"
        />

        <!-- Main window. Chrome only: drop the page content into the slot. -->
        <Win98Window
          :title="config.screen.name"
          :icon="`${ICON}/directory_open_file_mydocs-2.png`"
          :x="250"
          :y="240"
          :width="1176"
          :height="746"
          :z="6"
          :menus="['Fichier', 'Édition', 'Affichage', 'Aller à', 'Favoris', 'Outils', '?']"
          :toolbar="explorerToolbar"
          :address="branding?.path"
          :status="['Prêt', `Actualisé à ${hoursMinutes}:${seconds}`, 'Poste local']"
          :progress="current ? progress : null"
        >
          <!-- The running module. Keyed on the rotation's generation, so it is
               re-mounted (and its data re-fetched) every time round. -->
          <component
            :is="current.component"
            v-if="current"
            :key="generation"
            v-bind="moduleProps"
          />

          <div
            v-else
            class="fault"
          >
            <img
              :src="`${ICON}/msg_information-0.png`"
              alt=""
              width="32"
              height="32"
            >
            <div>
              <p class="fault__title">
                Aucun module configuré
              </p>
              <p class="fault__detail">
                Cet écran n'a rien à afficher pour l'instant.
              </p>
            </div>
          </div>
        </Win98Window>
      </template>

      <!-- Turned off from the admin: the panel stays up, but shows nothing. -->
      <Win98Window
        v-else-if="config && !isActive"
        title="Écran en veille"
        :icon="`${ICON}/computer_explorer-4.png`"
        :x="660"
        :y="420"
        :width="600"
        :height="240"
        :z="6"
        :well="false"
      >
        <div class="fault">
          <img
            :src="`${ICON}/msg_information-0.png`"
            alt=""
            width="32"
            height="32"
          >
          <div>
            <p class="fault__title">
              {{ config.screen.name }} est désactivé
            </p>
            <p class="fault__detail">
              Réactivez cet écran depuis le panneau d'administration.
            </p>
          </div>
        </div>
      </Win98Window>

      <!-- Unknown screen: a plain Win98 error box. -->
      <Win98Window
        v-else-if="unknownScreen"
        title="Erreur"
        :icon="`${ICON}/msg_error-2.png`"
        :x="660"
        :y="420"
        :width="600"
        :height="240"
        :z="6"
        :well="false"
      >
        <div class="fault">
          <img
            :src="`${ICON}/msg_error-0.png`"
            alt=""
            width="32"
            height="32"
          >
          <div>
            <p class="fault__title">
              Écran introuvable
            </p>
            <p class="fault__detail">
              Le chemin C:\IUT\{{ slug }} n'existe pas sur ce poste.
            </p>
          </div>
        </div>
      </Win98Window>

      <template #taskbar>
        <Win98Taskbar
          :tasks="tasks"
          :tray="tray"
          :time="hoursMinutes"
        />
      </template>
    </Win98Desktop>
  </ClientOnly>
</template>

<style scoped lang="scss">
.boot {
  position: fixed;
  inset: 0;
  background: #000;
}

.fault {
  display: flex;
  height: 100%;
  align-items: center;
  gap: 18px;
  padding: 0 22px;

  img {
    flex: 0 0 auto;
    image-rendering: pixelated;
  }

  &__title {
    margin-bottom: 6px;
    font-size: 19px;
    font-weight: 700;
  }

  &__detail {
    font-size: 15px;
    color: var(--w98-text-dim);
  }
}
</style>
