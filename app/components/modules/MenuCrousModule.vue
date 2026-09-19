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
    <Win98ModuleBanner
      icon="/img/logo-crous.png"
      icon-alt="Crous logo"
      title="Menu CROUS – (S)pace' Campus"
    />

    <Win98ModuleStatus
      v-if="error"
      tone="warn"
      line="Le menu du CROUS n’a pas pu être chargé."
      :detail="reason"
    />

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

    <Win98ModuleStatus
      v-else
      line="Chargement du menu du CROUS…"
    />
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

.menu-crous__body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
}

.menu-crous__days {
  display: flex;
  flex-direction: column;
  width: 60%;
  max-width: 720px;
  margin: 0 auto;
  gap: 10px;
}

// Same recipe as the TBM stop cards: a raised tile on the face, holding a
// sunken white document well. One bevel language for "a card of content"
// across every module.
.menu-crous__day-card {
  display: flex;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

.menu-crous__day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 6px 10px;
  box-shadow: var(--w98-groove);
}

.menu-crous__day-label {
  font-size: var(--w98-ui-size);
  font-weight: 700;
  color: var(--w98-text);
}

.menu-crous__day-date {
  margin-left: 10px;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
}

.menu-crous__service {
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-style: italic;
  margin-right: 5px;
}

.menu-crous__day-body {
  padding: 8px 8px 10px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
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
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
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
