<script setup lang="ts">
type OpenMeteoResponse = {
  current?: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
    is_day: number
  }
  daily?: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    sunrise: string[]
    sunset: string[]
    uv_index_max: number[]
  }
}

const props = withDefaults(defineProps<{
  city?: string
  latitude?: number
  longitude?: number
}>(), {
  city: 'Bordeaux',
  latitude: 44.8378,
  longitude: -0.5792,
})

const _weatherFetch = useLazyFetch('https://api.open-meteo.com/v1/forecast', {
  query: {
    latitude: props.latitude,
    longitude: props.longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'Europe/Paris',
    // A static screen with no scroll: fewer, bigger rows over 7 cramped ones.
    forecast_days: 5,
  },
}) as { data: Ref<OpenMeteoResponse | undefined>, error: Ref }

const { data, error } = _weatherFetch

const current = computed(() => data.value?.current)
const daily = computed(() => data.value?.daily)

// The hero's property-sheet grid always reads today's row of the daily arrays.
const today = computed(() => {
  if (!daily.value) return undefined

  return {
    max: daily.value.temperature_2m_max[0],
    min: daily.value.temperature_2m_min[0],
    precip: daily.value.precipitation_probability_max[0],
    sunrise: daily.value.sunrise?.[0],
    sunset: daily.value.sunset?.[0],
    uv: daily.value.uv_index_max?.[0],
  }
})

const reason = computed(() => {
  const body = error.value?.data as { statusMessage?: string } | undefined

  return body?.statusMessage ?? error.value?.statusMessage ?? error.value?.message
})

const weatherLabels: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Peu nuageux',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine faible',
  53: 'Bruine modérée',
  55: 'Bruine forte',
  61: 'Pluie faible',
  63: 'Pluie modérée',
  65: 'Pluie forte',
  71: 'Neige faible',
  73: 'Neige modérée',
  75: 'Neige forte',
  80: 'Averses faibles',
  81: 'Averses modérées',
  82: 'Averses fortes',
  95: 'Orage',
  96: 'Orage avec grêle',
  99: 'Orage violent',
}

const WEATHER_ICON_MAP: Record<number, string> = {
  0: '/windows98-icons/png/weather/sunny.png',
  1: '/windows98-icons/png/weather/sun_cloud.png',
  2: '/windows98-icons/png/weather/sun_heavy_cloud.png',
  3: '/windows98-icons/png/weather/cloud.png',

  45: '/windows98-icons/png/weather/mist.png',
  48: '/windows98-icons/png/weather/iced_mist.png',

  51: '/windows98-icons/png/weather/light_rain.png',
  53: '/windows98-icons/png/weather/rain.png',
  55: '/windows98-icons/png/weather/heavy_rain.png',
  61: '/windows98-icons/png/weather/light_rain.png',
  63: '/windows98-icons/png/weather/rain.png',
  65: '/windows98-icons/png/weather/heavy_rain.png',
  80: '/windows98-icons/png/weather/sun_light_rain.png',
  81: '/windows98-icons/png/weather/sun_rain.png',
  82: '/windows98-icons/png/weather/sun_heavy_rain.png',

  71: '/windows98-icons/png/weather/light_snow.png',
  73: '/windows98-icons/png/weather/snow.png',
  75: '/windows98-icons/png/weather/heavy_snow.png',

  95: '/windows98-icons/png/weather/storm.png',
  96: '/windows98-icons/png/weather/light_storm.png',
  99: '/windows98-icons/png/weather/heavy_storm.png',
}

function labelFor(code?: number) {
  if (code == null) return 'Conditions inconnues'
  return weatherLabels[code] ?? 'Conditions inconnues'
}

function iconFor(code?: number) {
  if (code == null) return '/windows98-icons/png/weather/sunny.png'
  return WEATHER_ICON_MAP[code] ?? '/windows98-icons/png/weather/sunny.png'
}

function dayLabel(date: string, index: number) {
  if (index === 0) return 'Aujourd’hui'
  if (index === 1) return 'Demain'

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
  }).format(new Date(`${date}T12:00:00`))
}

function timeLabel(iso?: string) {
  if (!iso) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
</script>

<template>
  <div class="weather98">
    <Win98ModuleBanner
      :icon="iconFor(current?.weather_code)"
      :title="`Météo - ${city}`"
    />

    <Win98ModuleStatus
      v-if="error"
      tone="warn"
      line="La météo n’a pas pu être chargée."
      :detail="reason"
    />

    <div
      v-else-if="current"
      class="weather98__content"
    >
      <section class="weather98__hero">
        <header class="weather98__hero-head">
          <div class="weather98__hero-place">
            <p class="weather98__hero-city">
              {{ city }}
            </p>
            <p class="weather98__hero-condition">
              {{ labelFor(current.weather_code) }}
            </p>
          </div>

          <div class="weather98__hero-icon">
            <img
              :src="iconFor(current.weather_code)"
              alt="Icône météo"
            >
          </div>
        </header>

        <div class="weather98__hero-body">
          <div class="weather98__stat">
            <span class="weather98__stat-label">Actuel</span>
            <strong class="weather98__stat-value weather98__stat-value--accent">{{ Math.round(current.temperature_2m) }} °C</strong>
          </div>

          <div
            v-if="today?.uv != null"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Indice UV</span>
            <strong class="weather98__stat-value">{{ today.uv.toFixed(1) }}</strong>
          </div>

          <div
            v-if="today"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Max</span>
            <strong class="weather98__stat-value">{{ Math.round(today.max ?? 0) }} °C</strong>
          </div>

          <div class="weather98__stat">
            <span class="weather98__stat-label">Vent</span>
            <strong class="weather98__stat-value">{{ Math.round(current.wind_speed_10m) }} km/h</strong>
          </div>

          <div
            v-if="today"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Min</span>
            <strong class="weather98__stat-value">{{ Math.round(today.min ?? 0) }} °C</strong>
          </div>

          <div
            v-if="today?.precip != null"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Précipitations</span>
            <strong class="weather98__stat-value">{{ today.precip }} %</strong>
          </div>

          <div
            v-if="today?.sunrise"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Lever</span>
            <strong class="weather98__stat-value">{{ timeLabel(today.sunrise) }}</strong>
          </div>

          <div
            v-if="today?.sunset"
            class="weather98__stat"
          >
            <span class="weather98__stat-label">Coucher</span>
            <strong class="weather98__stat-value">{{ timeLabel(today.sunset) }}</strong>
          </div>
        </div>
      </section>

      <section
        v-if="daily"
        class="weather98__forecast"
      >
        <header class="weather98__forecast-heading">
          Prévisions sur {{ daily.time.length }} jours
        </header>

        <div class="weather98__forecast-list">
          <article
            v-for="(date, index) in daily.time"
            :key="date"
            class="weather98__forecast-row"
          >
            <div class="weather98__forecast-day">
              <img
                :src="iconFor(daily.weather_code[index])"
                alt=""
                class="weather98__forecast-icon"
              >

              <div class="weather98__forecast-text">
                <span class="weather98__forecast-label">{{ dayLabel(date, index) }}</span>
                <span class="weather98__forecast-desc">{{ labelFor(daily.weather_code[index]) }}</span>
              </div>
            </div>

            <div class="weather98__forecast-figures">
              <span class="weather98__forecast-max">{{ Math.round(daily.temperature_2m_max[index] ?? 0) }}°</span>
              <span class="weather98__forecast-min">{{ Math.round(daily.temperature_2m_min[index] ?? 0) }}°</span>
              <span class="weather98__forecast-rain">{{ daily.precipitation_probability_max[index] }} %</span>
            </div>
          </article>
        </div>
      </section>
    </div>

    <Win98ModuleStatus
      v-else
      line="Chargement de la météo…"
    />
  </div>
</template>

<style scoped lang="scss">
.weather98 {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--w98-face);
  color: var(--w98-text);
  font-family: var(--w98-ui-font), sans-serif;
}

// A static, non-interactive screen: everything below must sit inside this
// box with no scroll, so the forecast list below grows to fill whatever is
// left rather than carrying a fixed row height.
.weather98__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
  background: var(--w98-face);
}

// Same recipe as the TBM/Crous cards: a raised tile on the face holding a
// sunken document well, so every module reads as one system.
.weather98__hero {
  display: flex;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

// Win98's own selection colour (the blue you get from marquee-selecting
// text or an icon), used here as the "highlighted" title band the mock uses.
.weather98__hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--w98-select);
}

.weather98__hero-city {
  margin: 0;
  color: var(--w98-white);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-decoration: underline;
}

.weather98__hero-condition {
  margin: 4px 0 0;
  color: var(--w98-white);
  font-size: var(--w98-ui-size);
  font-weight: 700;
}

.weather98__hero-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);

  img {
    width: auto;
    height: 48px;
    image-rendering: pixelated;
  }
}

.weather98__hero-body {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 18px;
  padding: 10px 12px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.weather98__stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid var(--w98-face-alt);
}

.weather98__stat-label {
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
}

.weather98__stat-value {
  font-size: var(--w98-ui-size);
  font-weight: 700;
  white-space: nowrap;

  &--accent {
    color: var(--w98-accent);
  }
}

// Fills whatever vertical space the hero doesn't take.
.weather98__forecast {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

.weather98__forecast-heading {
  padding: 6px 10px;
  color: var(--w98-text);
  font-size: var(--w98-ui-size-sm);
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: var(--w98-groove);
}

// A Win98 list view: sunken well, thin row separators, no card-per-item.
// A static screen never scrolls, so every row is an equal flex share of the
// well instead of a fixed height — the list always fits exactly, whatever
// forecast_days ends up being.
.weather98__forecast-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.weather98__forecast-row {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border-bottom: 1px solid var(--w98-face-alt);

  &:last-child {
    border-bottom: 0;
  }
}

.weather98__forecast-day {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.weather98__forecast-icon {
  width: auto;
  height: 26px;
  flex: 0 0 auto;
  image-rendering: pixelated;
}

// Day and condition share one baseline line rather than stacking — half the
// row height of a two-line block, which is what keeps five rows scroll-free.
.weather98__forecast-text {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.weather98__forecast-label {
  flex: 0 0 auto;
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-transform: capitalize;
}

.weather98__forecast-desc {
  overflow: hidden;
  min-width: 0;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather98__forecast-figures {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  gap: 12px;
}

.weather98__forecast-max {
  min-width: 34px;
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-align: right;
}

.weather98__forecast-min {
  min-width: 34px;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
  text-align: right;
}

.weather98__forecast-rain {
  min-width: 44px;
  color: var(--w98-accent);
  font-size: var(--w98-ui-size-sm);
  text-align: right;
}

@media (max-width: 800px) {
  .weather98__hero-body {
    grid-template-columns: 1fr;
  }

  .weather98__forecast-desc {
    display: none;
  }
}
</style>
