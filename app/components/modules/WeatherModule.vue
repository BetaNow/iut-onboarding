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
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation_probability?: number[]
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
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    timezone: 'Europe/Paris',
    forecast_days: 3,
  },
}) as { data: Ref<OpenMeteoResponse | undefined>, error: Ref }

const { data, error } = _weatherFetch

const current = computed(() => data.value?.current)
const daily = computed(() => data.value?.daily)
const hourly = computed(() => data.value?.hourly)

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
  0: '/windows98-icons/png/weather/sun/sunny.png',
  1: '/windows98-icons/png/weather/sun/sun_cloud.png',
  2: '/windows98-icons/png/weather/sun/cloud.png',
  3: '/windows98-icons/png/weather/sun/cloud.png',

  61: '/windows98-icons/png/weather/rain/light_rain.png',
  63: '/windows98-icons/png/weather/sun/rain.png',
  65: '/windows98-icons/png/weather/sun/rain.png',
  80: '/windows98-icons/png/weather/rain/light_rain.png',
  81: '/windows98-icons/png/weather/sun/rain.png',
  82: '/windows98-icons/png/weather/sun/rain.png',

  71: '/windows98-icons/png/weather/snow/snow.png',
  73: '/windows98-icons/png/weather/snow/snow.png',
  75: '/windows98-icons/png/weather/snow/snow.png',

  45: '/windows98-icons/png/weather/mist/mist.png',
  48: '/windows98-icons/png/weather/mist/mist.png',
  95: '/img/weather/thunder.png',
  96: '/img/weather/thunder_rain.png',
  99: '/img/weather/thunder_rain.png',
}

function labelFor(code?: number) {
  if (code == null) return 'Conditions inconnues'
  return weatherLabels[code] ?? 'Conditions inconnues'
}

function iconFor(code?: number) {
  if (code == null) return '/windows98-icons/png/weather/sun/sunny.png'
  return WEATHER_ICON_MAP[code] ?? '/windows98-icons/png/weather/sun/sunny.png'
}

function dayLabel(date: string, index: number) {
  if (index === 0) return 'Aujourd’hui'
  if (index === 1) return 'Demain'

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

const nextSixHours = computed(() => {
  if (!hourly.value) return []

  const now = new Date()

  const slots = hourly.value.time.map((timeString, index) => {
    const time = new Date(timeString)

    return {
      index,
      time,
      temperature: hourly.value!.temperature_2m[index],
      code: hourly.value!.weather_code[index],
      precip:
          hourly.value!.precipitation_probability ? hourly.value!.precipitation_probability[index] : undefined,
    }
  })

  return slots.filter(slot => slot.time >= now).slice(0, 6)
})

function hourLabel(time: Date, index: number) {
  if (index === 0) return 'Maintenant'

  return `${new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
  }).format(time)}h`
}
</script>

<template>
  <div class="weather98">
    <div class="weather98__chrome">
      <img
        class="weather98__icon"
        :src="iconFor(current?.weather_code)"
        alt=""
        width="32"
        height="32"
      >
      <span class="weather98__title">
        Météo - {{ city }}
      </span>
    </div>

    <div class="weather98__toolbar" />

    <div
      v-if="error"
      class="weather98__empty"
    >
      <p class="weather98__empty-line">
        La météo n’a pas pu être chargée.
      </p>
      <p class="weather98__empty-why">
        {{ reason }}
      </p>
    </div>

    <div
      v-else-if="current"
      class="weather98__content"
    >
      <section class="weather98__current">
        <div class="weather98__current-icon">
          <img
            :src="iconFor(current.weather_code)"
            alt="Icône météo"
          >
        </div>

        <div class="weather98__current-main">
          <p class="weather98__condition">
            {{ labelFor(current.weather_code) }}
          </p>
          <p class="weather98__temp">
            {{ Math.round(current.temperature_2m) }} °C
          </p>
          <p class="weather98__feels">
            Ressenti : {{ Math.round(current.apparent_temperature) }} °C
          </p>
        </div>

        <div class="weather98__current-stats">
          <div>
            <div>
              Vent
              <img
                src="/windows98-icons/png/weather/other/anemometer.png"
                alt="anemometer icon"
                class="weather98__hourly-icon"
              >
            </div>
            <strong>{{ Math.round(current.wind_speed_10m) }} km/h</strong>
          </div>
          <div>
            <div>
              Humidité
              <img
                src="/windows98-icons/png/weather/other/humidity.png"
                alt="humidity icon"
                class="weather98__hourly-icon"
              >
            </div>
            <strong>{{ current.relative_humidity_2m }} %</strong>
          </div>
        </div>
      </section>

      <section
        v-if="nextSixHours.length"
        class="weather98__hourly"
      >
        <article
          v-for="(slot, index) in nextSixHours"
          :key="slot.time.toISOString()"
          class="weather98__hourly-card"
        >
          <header class="weather98__hourly-header">
            {{ hourLabel(slot.time, index) }}
          </header>

          <div class="weather98__hourly-body">
            <img
              :src="iconFor(slot.code)"
              alt=""
              class="weather98__hourly-icon"
            >

            <div class="weather98__hourly-temp">
              {{ Math.round(slot.temperature ?? 0) }} °C
            </div>

            <small
              v-if="slot.precip != null"
              class="weather98__hourly-rain"
            >
              💧 {{ slot.precip }} %
            </small>
          </div>
        </article>
      </section>

      <section
        v-if="daily"
        class="weather98__forecast"
      >
        <article
          v-for="(date, index) in daily.time"
          :key="date"
          class="weather98__forecast-card"
        >
          <header class="weather98__forecast-header">
            {{ dayLabel(date, index) }}
          </header>

          <div class="weather98__forecast-body">
            <img
              :src="iconFor(daily.weather_code[index])"
              alt=""
              class="weather98__forecast-icon"
            >

            <div class="weather98__forecast-temps">
              <span class="weather98__forecast-min">
                {{ Math.round(daily.temperature_2m_min[index] ?? 0) }}°
              </span>
              <span class="weather98__forecast-max">
                {{ Math.round(daily.temperature_2m_max[index] ?? 0) }}°
              </span>
            </div>
            <div class="weather98__forecast-humidity">
              <img
                src="/windows98-icons/png/weather/other/humidity.png"
                alt="humidity icon"
                class="weather98__small-hourly-icon"
              >
              <small class="weather98__forecast-rain">

                {{ daily.precipitation_probability_max[index] }} %
              </small>
            </div>
          </div>
        </article>
      </section>
    </div>

    <div
      v-else
      class="weather98__empty"
    >
      <p class="weather98__empty-line">
        Chargement de la météo…
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.weather98 {
  --w98-page-bg: #ffffff;
  --w98-box-bg: #ece9d8;
  --w98-box-bg-alt: #f5f5f5;
  --w98-header-bg: #d4d0c8;
  --w98-shadow: #808080;
  --w98-dark-shadow: #404040;
  --w98-border-light: #c0c0c0;
  --w98-white: #ffffff;
  --w98-text: #000000;
  --w98-muted: #555555;
  --w98-warn: #b00000;
  --w98-accent: #0a246a;

  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--w98-page-bg);
  color: var(--w98-text);
  font-family: var(--w98-ui-font), serif;
}

.weather98__chrome {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
  height: 10%;
}

.weather98__icon {
  image-rendering: pixelated;
}

.weather98__title {
  font-weight: 700;
}

.weather98__toolbar {
  flex: 0 0 14px;
  background: var(--w98-page-bg);
  border-bottom: 1px solid #e0e0e0;
}

.weather98__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
  background: var(--w98-page-bg);
}

// ---------------------------------------------------------------------------
// Bordure 2px à 4 couleurs, SANS blanc pur pour rester visible sur fond
// blanc. Sunken : sombre en haut/gauche, gris clair en bas/droite.
// ---------------------------------------------------------------------------
.weather98__current {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  padding: 12px;
  background: #fff;
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-dark-shadow) var(--w98-border-light) var(--w98-border-light) var(--w98-dark-shadow);
}

.weather98__current-icon img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.weather98__condition {
  margin: 0 0 4px;
  font-weight: 700;
}

.weather98__temp {
  margin: 0;
  color: var(--w98-accent);
  font-size: 28px;
  font-weight: 700;
}

.weather98__feels {
  margin: 4px 0 0;
  color: var(--w98-muted);
}

.weather98__current-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px solid var(--w98-shadow);
  text-align: right;

  span {
    font-size: 11px;
    color: var(--w98-muted);
  }

  strong {
    display: block;
    font-size: 15px;
  }

  span.weather98__small_condition {
    font-size: 14px;
  }
}

.weather98__hourly {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 2px;
}

// Raised : gris clair en haut/gauche, sombre en bas/droite.
.weather98__hourly-card {
  background: #fff;
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-border-light) var(--w98-shadow) var(--w98-shadow) var(--w98-border-light);
}

.weather98__hourly-header {
  padding: 3px 4px;
  background: var(--w98-header-bg);
  border-bottom: 1px solid var(--w98-shadow);
  color: var(--w98-text);
  text-align: center;
  font-size: 11px;
  font-weight: 700;
}

.weather98__hourly-body {
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 6px 2px 8px;
}

.weather98__hourly-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}

.weather98__small-hourly-icon {
  width: 18px;
  height: 18px;
  image-rendering: pixelated;
}

.weather98__hourly-temp {
  font-size: 13px;
  font-weight: 700;
}

.weather98__hourly-rain {
  color: var(--w98-accent);
  font-size: 10px;
}

.weather98__forecast {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.weather98__forecast-card {
  background: #fff;
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-dark-shadow) var(--w98-border-light) var(--w98-border-light) var(--w98-dark-shadow);
}

.weather98__forecast-header {
  padding: 3px 4px;
  background: var(--w98-header-bg);
  border-bottom: 1px solid var(--w98-shadow);
  text-align: center;
  font-weight: 700;
}

.weather98__forecast-body {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 8px 4px 10px;
}

.weather98__forecast-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.weather98__forecast-humidity {
  display: flex;
  align-items: center;
  gap: 4px;
}

.weather98__forecast-temps {
  display: flex;
  gap: 10px;
}

.weather98__forecast-min {
  color: var(--w98-muted);
  font-size: 12px;
}

.weather98__forecast-max {
  font-size: 14px;
  font-weight: 700;
}

.weather98__forecast-rain {
  color: var(--w98-muted);
  font-size: 11px;
  padding-left: 4px;
}

.weather98__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 14px 16px;
  padding: 20px;
  background: var(--w98-box-bg-alt);
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-border-light) var(--w98-shadow) var(--w98-shadow) var(--w98-border-light);
}

.weather98__empty-line {
  margin: 0;
  color: var(--w98-muted);
  font-size: 18px;
}

.weather98__empty-why {
  margin: 0;
  color: var(--w98-warn);
  font-size: 13px;
}

.weather98__status {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  padding: 3px 8px;
  background: var(--w98-header-bg);
  border-top: 1px solid var(--w98-white);
  font-size: 11px;
}

@media (max-width: 800px) {
  .weather98__current {
    grid-template-columns: auto 1fr;
  }

  .weather98__current-stats {
    grid-column: 1 / -1;
    padding-left: 0;
    margin-top: 6px;
    border-left: none;
    border-top: 1px solid var(--w98-shadow);
    padding-top: 8px;
    align-items: flex-start;
    text-align: left;
  }

  .weather98__hourly {
    grid-template-columns: repeat(3, 1fr);
  }

  .weather98__forecast {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
