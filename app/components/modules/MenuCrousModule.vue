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

    <div
      v-else-if="days.length"
      class="menu-crous__body"
    >
      <div class="menu-crous__days">
        <section
          v-for="day in days"
          :key="`${day.date}-${day.service}`"
          class="menu-crous__day-card"
        >
          <header class="menu-crous__day-header">
            <div>
              <span class="menu-crous__day-label">
                {{ day.label }}
              </span>
              <span class="menu-crous__day-date">
                {{ day.date }}
              </span>
            </div>

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
  </div>
</template>

<style scoped lang="scss">
.menu-crous {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: transparent;
  color: var(--w98-text);
  font-family: var(--w98-ui-font), sans-serif;
}

.menu-crous__chrome {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: linear-gradient(90deg, #000080, #1084d0);
  box-shadow: var(--w98-groove);
  height: 10%;
}

.menu-crous__icon {
  width: 50px;
  height: 50px;
  image-rendering: pixelated;
}

.menu-crous__title {
  font-size: var(--w98-ui-size);
  font-weight: 700;
  color: white;
}

.menu-crous__toolbar {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  padding: 2px 8px;

  span {
    font-size: var(--w98-ui-size);
    color: var(--w98-text-dim);
  }
}

.menu-crous__body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
}

.menu-crous__body--empty {
  align-items: center;
  justify-content: center;
}

.menu-crous__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

.menu-crous__restaurant {
  margin: 0;
  font-weight: 700;
  color: var(--w98-text);
}

.menu-crous__city {
  margin: 0;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
}

.menu-crous__hint {
  margin: 0;
  color: var(--w98-text-dim);
  font-size: 11px;
}

.menu-crous__days {
  display: flex;
  flex-direction: column;
  width: 60%;
  max-width: 720px;
  margin: 0 auto;
  gap: 10px;
}

.menu-crous__day-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--w98-shadow);
  box-shadow: var(--w98-sunken);
}

.menu-crous__day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--w98-face);
  box-shadow: var(--w98-groove);
  font-size: var(--w98-ui-size);
}

.menu-crous__day-label {
  font-size: 18px;
  font-weight: 700;
  color: var(--w98-text);
}

.menu-crous__day-date {
  margin-left: 10px;
  color: var(--w98-text-dim);
  font-size: 14px;
}

.menu-crous__service {
  color: black;
  font-size: 20px;
  font-style: italic;
  margin-right: 5px;
}

.menu-crous__day-body {
  padding: 8px 8px 10px;
  border: 1px solid var(--w98-shadow);
}

.menu-crous__columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.menu-crous__column {
  padding: 6px 8px;
}

.menu-crous__column-title {
  margin: 0 0 4px;
  color: black;
  font-size: 25px;
  font-weight: 700;
}

.menu-crous__list {
  margin: 0;
  padding-left: 14px;
  font-size: var(--w98-ui-size);
  color: var(--w98-text);

  li {
    padding: 3px 0;
    margin-bottom: 2px;
  }
}

.menu-crous__empty-line {
  margin: 0;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
}

.menu-crous__empty-why {
  margin: 0;
  color: #b00000;
  font-size: 12px;
}

.menu-crous__status {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  padding: 3px 8px;
  box-shadow: var(--w98-groove);
  font-size: var(--w98-ui-size);
  color: var(--w98-text-dim);
}

@media (max-width: 900px) {
  .menu-crous__days {
    width: 100%;
  }

  .menu-crous__columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .menu-crous__day-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .menu-crous__day-date {
    margin-left: 0;
  }
}
</style>
