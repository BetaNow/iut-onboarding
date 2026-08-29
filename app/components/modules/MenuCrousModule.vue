<script setup lang="ts">
type CrousMenuItem = {
  category: string
  name: string
}

type CrousMenuDay = {
  date: string
  label: string
  service: string
  items: CrousMenuItem[]
}

type CrousMenuResponse = {
  restaurantName: string
  restaurantCity: string
  days: CrousMenuDay[]
}

const {
  data,
  error,
} = useLazyFetch<CrousMenuResponse>('/api/menu-crous', {
  query: {
    daysAhead: 3,
  },
})

const restaurantName = computed(
  () => data.value?.restaurantName ?? '(S)pace\' Campus - Resto U\'',
)

const restaurantCity = computed(
  () => data.value?.restaurantCity ?? 'Pessac',
)
const days = computed(() => data.value?.days ?? [])

const reason = computed(() => {
  const body = error.value?.data as { statusMessage?: string } | undefined
  return body?.statusMessage ?? error.value?.statusMessage ?? error.value?.message
})
</script>

<template>
  <div class="menu-crous">
    <div class="menu-crous__chrome">
      <img
        class="menu-crous__icon"
        src="/img/logo-crous.png"
        alt="Crous logo"
        width="250"
        height="250"
      >
      <span class="menu-crous__title">
        Menu CROUS – (S)pace' Campus
      </span>
    </div>

    <!-- Contenu -->
    <div
      v-if="error"
      class="menu-crous__body menu-crous__body--empty"
    >
      <p class="menu-crous__empty-line">
        Le menu du CROUS n’a pas pu être chargé.
      </p>
      <p class="menu-crous__empty-why">
        {{ reason }}
      </p>
    </div>
    <!-- En‑tête restaurant -->
    <div
      v-else-if="days.length"
      class="menu-crous__body"
    >
      <div class="menu-crous__header">
        <div>
          <p class="menu-crous__restaurant">
            {{ restaurantName }}
          </p>
          <p class="menu-crous__city">
            {{ restaurantCity }}
          </p>
        </div>
      </div>

      <div class="menu-crous__days">
        <section
          v-for="day in days"
          :key="`${day.date}-${day.service}`"
          class="menu-crous__day-card"
        >
          <header class="menu-crous__day-header">
            <span class="menu-crous__day-label">
              {{ day.label }}
            </span>

            <span class="menu-crous__service">
              {{ day.service }}
            </span>
          </header>

          <div class="menu-crous__day-body">
            <div class="menu-crous__columns">
              <div class="menu-crous__column">
                <p class="menu-crous__column-title">
                  Entrées
                </p>

                <ul class="menu-crous__list">
                  <li
                    v-for="item in day.items.filter(item => item.category === 'Entrée')"
                    :key="item.name"
                  >
                    {{ item.name }}
                  </li>

                  <li v-if="!day.items.some(item => item.category === 'Entrée')">
                    —
                  </li>
                </ul>
              </div>

              <div class="menu-crous__column">
                <p class="menu-crous__column-title">
                  Plats
                </p>

                <ul class="menu-crous__list">
                  <li
                    v-for="item in day.items.filter(item => item.category === 'Plat')"
                    :key="item.name"
                  >
                    {{ item.name }}
                  </li>

                  <li v-if="!day.items.some(item => item.category === 'Plat')">
                    —
                  </li>
                </ul>
              </div>

              <div class="menu-crous__column">
                <p class="menu-crous__column-title">
                  Desserts
                </p>

                <ul class="menu-crous__list">
                  <li
                    v-for="item in day.items.filter(item => item.category === 'Dessert')"
                    :key="item.name"
                  >
                    {{ item.name }}
                  </li>

                  <li v-if="!day.items.some(item => item.category === 'Dessert')">
                    —
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-else
      class="menu-crous__body menu-crous__body--empty"
    >
      <p class="menu-crous__empty-line">
        Chargement du menu du CROUS…
      </p>
    </div>

    <!-- Barre de status -->
    <footer class="menu-crous__status">
      <span>Prêt</span>
      <span>Source : api.croustillant.menu</span>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.menu-crous {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: #c0c0c0;
  font-family: var(--w98-ui-font), sans-serif;
}

/* Barre de titre */
.menu-crous__chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
}

.menu-crous__icon {
  image-rendering: pixelated;
  width: 60px;
  height: 60px;
}

.menu-crous__title {
  font-weight: 700;
}

/* Barre de menus */
.menu-crous__toolbar {
  display: flex;
  gap: 12px;
  padding: 2px 8px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;

  span {
    font-size: 12px;
  }
}

/* Corps */
.menu-crous__body {
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-crous__body--empty {
  align-items: center;
  justify-content: center;
}

/* En-tête restaurant */
.menu-crous__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 6px 8px;
  background: #d4d0c8;
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-shadow) var(--w98-white) var(--w98-white) var(--w98-shadow);
}

.menu-crous__restaurant {
  margin: 0;
  font-weight: 700;
}

.menu-crous__city {
  margin: 0;
  font-size: 12px;
}

.menu-crous__hint {
  margin: 0;
  font-size: 11px;
  color: var(--w98-text-dim);
}

/* Cartes jours */
.menu-crous__days {
  display: flex;
  flex-direction: column;
  width: 50%;
  margin: 0 auto;
}

.menu-crous__day-card {
  background: #fff;
  border-width: 2px;
  border-style: solid;
  border-color: var(--w98-shadow) var(--w98-white) var(--w98-white) var(--w98-shadow);
  display: flex;
  flex-direction: column;
}

.menu-crous__day-header {
  display: flex;
  justify-content: space-between;
  padding: 5px 6px;
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  font-size: 12px;
}

.menu-crous__day-label {
  font-weight: 700;
  font-size: 25px;
}

.menu-crous__service {
  font-size: 20px;
  font-style: italic;
}

.menu-crous__day-body {
  padding: 6px 6px 8px;
}

.menu-crous__columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.menu-crous__column-title {
  margin: 0 0 2px;
  font-size: 20px;
  font-weight: 700;
}

.menu-crous__list {
  margin: 0;
  padding-left: 14px;
  font-size: 12px;

  li {
    margin-bottom: 2px;
    font-size: 16px;
    padding: 3px;
  }
}

/* États vides */
.menu-crous__empty-line {
  font-size: 18px;
}

.menu-crous__empty-why {
  font-size: 14px;
  color: #b00;
}

/* Status bar */
.menu-crous__status {
  display: flex;
  justify-content: space-between;
  padding: 2px 8px;
  background: #d4d0c8;
  border-top: 1px solid #ffffff;
  font-size: 11px;
}

@media (max-width: 900px) {
  .menu-crous__days {
    grid-template-columns: repeat(2, 1fr);
  }

  .menu-crous__columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .menu-crous__days {
    grid-template-columns: 1fr;
  }
}
</style>
