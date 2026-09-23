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
  pending,
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

// One day shown in full detail, the rest condensed below: stacking every
// fetched day at full detail is what used to overflow a static, no-scroll
// screen once a real menu (a dozen-plus items across categories) landed.
const heroDay = computed(() => days.value[0])
const upcomingDays = computed(() => days.value.slice(1))

const CATEGORY_ORDER = ['Entrée', 'Plat', 'Dessert'] as const
const CATEGORY_LABELS: Record<string, string> = {
  Entrée: 'Entrées',
  Plat: 'Plats',
  Dessert: 'Desserts',
}

const heroGroups = computed(() => {
  const day = heroDay.value
  if (!day) return []

  return CATEGORY_ORDER.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    items: day.items.filter(item => item.category === category),
  }))
})

// The 3 columns share one row grid sized by whichever category has the most
// dishes, rather than each column dividing its own height by its own item
// count — otherwise a 4-item column and a 6-item column end up with visibly
// different row heights side by side.
const heroRowCount = computed(() =>
  Math.max(1, ...heroGroups.value.map(group => group.items.length)),
)

function serviceLabel(service: string) {
  const normalized = service.toLowerCase()
  if (normalized === 'midi') return 'Déjeuner'
  if (normalized === 'soir') return 'Dîner'
  return service
}

function dayMeta(day: CrousMenuDay) {
  const date = new Date(`${day.date}T12:00:00`)
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
  }).format(date)

  return `${formatted} · ${serviceLabel(day.service)}`
}

function mainDishesPreview(day: CrousMenuDay) {
  const plats = day.items
    .filter(item => item.category === 'Plat')
    .map(item => item.name)

  return plats.length ? plats.join(' · ') : 'Menu à venir'
}
</script>

<template>
  <div class="menu-crous">
    <Win98ModuleBanner
      icon="/img/logo-crous.png"
      icon-alt="Crous logo"
      title="Menu CROUS – (S)pace' Campus"
    />

    <Win98ModuleStatus
      v-if="pending"
      line="Chargement du menu du CROUS…"
    />

    <Win98ModuleStatus
      v-else-if="error"
      tone="warn"
      line="Le menu du CROUS n’a pas pu être chargé."
      :detail="reason"
    />

    <div
      v-else-if="heroDay"
      class="menu-crous__content"
    >
      <section class="menu-crous__hero">
        <header class="menu-crous__hero-head">
          <span class="menu-crous__hero-day">{{ heroDay.label }}</span>
          <span class="menu-crous__hero-meta">{{ dayMeta(heroDay) }}</span>
        </header>

        <div class="menu-crous__columns">
          <div
            v-for="group in heroGroups"
            :key="group.category"
            class="menu-crous__column"
          >
            <p class="menu-crous__column-title">
              {{ group.label }}
            </p>

            <div
              class="menu-crous__column-list"
              :style="{ gridTemplateRows: `repeat(${heroRowCount}, minmax(0, 1fr))` }"
            >
              <p
                v-for="item in group.items"
                :key="item.name"
                class="menu-crous__column-item"
              >
                {{ item.name }}
              </p>

              <p
                v-if="!group.items.length"
                class="menu-crous__column-empty"
              >
                —
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="upcomingDays.length"
        class="menu-crous__upcoming"
      >
        <header class="menu-crous__upcoming-heading">
          À suivre
        </header>

        <div class="menu-crous__upcoming-list">
          <article
            v-for="day in upcomingDays"
            :key="`${day.date}-${day.service}`"
            class="menu-crous__upcoming-row"
          >
            <div class="menu-crous__upcoming-text">
              <span class="menu-crous__upcoming-label">{{ day.label }}</span>
              <span class="menu-crous__upcoming-desc">{{ dayMeta(day) }}</span>
            </div>

            <span class="menu-crous__upcoming-preview">{{ mainDishesPreview(day) }}</span>
          </article>
        </div>
      </section>
    </div>

    <Win98ModuleStatus
      v-else
      line="Aucun menu disponible pour le moment."
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

// Same recipe as WeatherModule/HorairesTbmModule: a static, non-interactive
// screen with no scroll, so everything below sits inside this box and shares
// whatever vertical space is available instead of growing past it.
.menu-crous__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
  background: var(--w98-face);
}

// The hero day: a raised tile on the face holding a sunken white document
// well, same shell as every other module's cards.
.menu-crous__hero {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

// Win98's own selection colour, used as the "highlighted" title band, same
// as the weather hero header.
.menu-crous__hero-head {
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--w98-select);
}

.menu-crous__hero-day {
  color: var(--w98-white);
  font-size: var(--w98-ui-size-lg);
  font-weight: 700;
  text-decoration: underline;
}

.menu-crous__hero-meta {
  color: var(--w98-white);
  font-size: var(--w98-ui-size);
}

// Flex rather than grid: each column takes an equal 1/3 share of whichever
// axis is the main one, so the layout can't overflow whether columns sit
// side by side or (narrow screens) stack — no auto-sized row to overflow.
.menu-crous__columns {
  display: flex;
  min-height: 0;
  flex: 1;
  gap: 12px;
  padding: 10px 12px;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.menu-crous__column {
  display: flex;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
}

.menu-crous__column-title {
  flex: 0 0 auto;
  margin: 0 0 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--w98-face-alt);
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-transform: uppercase;
}

// A Win98 list view, but every column shares the same row grid (sized in the
// template from the busiest category) instead of each dividing its own
// height by its own item count — that's what keeps a 4-item column and a
// 6-item column reading as evenly spaced rather than differently cramped.
.menu-crous__column-list {
  display: grid;
  min-height: 0;
  flex: 1;
}

// Single line + ellipsis rather than a multi-line clamp: at this font size
// the shared row grid only has room for one line per dish, and a clean "…"
// beats silently losing a wrapped second line to the row's overflow clip.
.menu-crous__column-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  align-items: center;
  margin: 0;
  padding: 4px 0;
  border-bottom: 1px solid var(--w98-face-alt);
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;

  &:last-child {
    border-bottom: 0;
  }
}

.menu-crous__column-empty {
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  margin: 0;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size);
  font-style: italic;
}

// The other fetched days, condensed to one line each so a 2nd/3rd day never
// costs as much room as the hero's full detail.
.menu-crous__upcoming {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  background: var(--w98-face);
  box-shadow: var(--w98-raised);
}

.menu-crous__upcoming-heading {
  padding: 6px 10px;
  color: var(--w98-text);
  font-size: var(--w98-ui-size-sm);
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: var(--w98-groove);
}

.menu-crous__upcoming-list {
  display: flex;
  flex-direction: column;
  background: var(--w98-white);
  box-shadow: var(--w98-sunken);
}

.menu-crous__upcoming-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--w98-face-alt);

  &:last-child {
    border-bottom: 0;
  }
}

.menu-crous__upcoming-text {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: baseline;
  gap: 8px;
}

.menu-crous__upcoming-label {
  color: var(--w98-text);
  font-size: var(--w98-ui-size);
  font-weight: 700;
  text-transform: capitalize;
}

.menu-crous__upcoming-desc {
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  white-space: nowrap;
}

.menu-crous__upcoming-preview {
  overflow: hidden;
  min-width: 0;
  flex: 1 1 auto;
  color: var(--w98-text-dim);
  font-size: var(--w98-ui-size-sm);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .menu-crous__columns {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .menu-crous__hero-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .menu-crous__upcoming-preview {
    display: none;
  }
}
</style>
