<script setup lang="ts">
// The body of the Win98 "Date/Time Properties" dialog: month calendar left,
// analog clock right, time zone underneath. Read-only, so the month dropdown,
// spinners and OK / Cancel / Apply are left out.
const props = defineProps<{
  now: Date
}>()

const pad = (value: number) => String(value).padStart(2, '0')

const monthLabel = computed(() => {
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(props.now)
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const yearLabel = computed(() => String(props.now.getFullYear()))

const timeLabel = computed(() =>
  `${pad(props.now.getHours())}:${pad(props.now.getMinutes())}:${pad(props.now.getSeconds())}`,
)

const timeZoneLabel = computed(() =>
  new Intl.DateTimeFormat('fr-FR', { timeZoneName: 'long' })
    .formatToParts(props.now)
    .find(part => part.type === 'timeZoneName')?.value ?? '-',
)

// French weeks start on Monday; JS getDay() starts on Sunday.
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const weeks = computed(() => {
  const year = props.now.getFullYear()
  const month = props.now.getMonth()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const length = new Date(year, month + 1, 0).getDate()

  // Always 6 rows so the dialog never changes height between months.
  const cells: (number | null)[] = Array.from({ length: 42 }, (_, index) => {
    const day = index - lead + 1
    return day >= 1 && day <= length ? day : null
  })

  return Array.from({ length: 6 }, (_, row) => cells.slice(row * 7, row * 7 + 7))
})

const today = computed(() => props.now.getDate())

// 60 marks around the face; the twelve hour positions get a square.
const ticks = Array.from({ length: 60 }, (_, index) => {
  const angle = (index * 6 - 90) * (Math.PI / 180)
  return {
    index,
    hour: index % 5 === 0,
    x: 100 + Math.cos(angle) * 84,
    y: 100 + Math.sin(angle) * 84,
  }
})

const hourAngle = computed(() => (props.now.getHours() % 12) * 30 + props.now.getMinutes() * 0.5)
const minuteAngle = computed(() => props.now.getMinutes() * 6 + props.now.getSeconds() * 0.1)
const secondAngle = computed(() => props.now.getSeconds() * 6)
</script>

<template>
  <div class="dt">
    <div class="dt__panes">
      <Win98GroupBox
        label="Date"
        class="dt__date"
      >
        <div class="dt__fields">
          <span class="dt__field dt__field--month">{{ monthLabel }}</span>
          <span class="dt__field dt__field--year">{{ yearLabel }}</span>
        </div>

        <div class="dt__calendar">
          <div class="dt__row dt__row--head">
            <span
              v-for="day in WEEKDAYS"
              :key="day"
              class="dt__cell dt__cell--head"
            >{{ day }}</span>
          </div>
          <div
            v-for="(week, index) in weeks"
            :key="index"
            class="dt__row"
          >
            <span
              v-for="(day, dayIndex) in week"
              :key="dayIndex"
              class="dt__cell"
              :class="{ 'dt__cell--today': day === today }"
            >{{ day ?? '' }}</span>
          </div>
        </div>
      </Win98GroupBox>

      <Win98GroupBox
        label="Heure"
        class="dt__time"
      >
        <svg
          class="dt__face"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <template v-for="tick in ticks">
            <rect
              v-if="tick.hour"
              :key="`h${tick.index}`"
              :x="tick.x - 4"
              :y="tick.y - 4"
              width="8"
              height="8"
              fill="#0e7c86"
              stroke="#0a0a0a"
              stroke-width="1"
            />
            <circle
              v-else
              :key="`m${tick.index}`"
              :cx="tick.x"
              :cy="tick.y"
              r="1.6"
              fill="#ffffff"
            />
          </template>

          <polygon
            points="100,54 108,88 100,112 92,88"
            fill="#ffffff"
            stroke="#606060"
            stroke-width="1.5"
            stroke-linejoin="miter"
            :transform="`rotate(${hourAngle} 100 100)`"
          />
          <polygon
            points="100,30 106,86 100,114 94,86"
            fill="#ffffff"
            stroke="#606060"
            stroke-width="1.5"
            stroke-linejoin="miter"
            :transform="`rotate(${minuteAngle} 100 100)`"
          />
          <line
            x1="100"
            y1="108"
            x2="100"
            y2="26"
            stroke="#0a0a0a"
            stroke-width="1.5"
            :transform="`rotate(${secondAngle} 100 100)`"
          />
        </svg>

        <span class="dt__field dt__field--clock">{{ timeLabel }}</span>
      </Win98GroupBox>
    </div>

    <p class="dt__zone">
      Fuseau horaire actuel : {{ timeZoneLabel }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.dt {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 12px;
  padding: 4px 2px 0;

  &__panes {
    display: flex;
    min-height: 0;
    flex: 1;
    gap: 12px;
  }

  &__date {
    flex: 0 0 auto;
  }

  &__time {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;

    :deep(.w98-group__body) {
      justify-content: center;
    }
  }

  // Read-only stand-ins for the dialog's text fields: the sunken well, without
  // the arrow or spinner that would make them look editable.
  &__field {
    display: flex;
    height: 34px;
    align-items: center;
    padding: 0 10px;
    background: #fff;
    box-shadow: var(--w98-groove);
    font-size: var(--w98-ui-size);
    white-space: nowrap;

    &--month {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      line-height: 34px;
    }

    &--year {
      flex: 0 0 64px;
    }

    &--clock {
      flex: 0 0 auto;
      align-self: center;
      margin-top: 12px;
      font-family: var(--w98-mono-font);
      font-variant-numeric: tabular-nums;
    }
  }

  &__fields {
    display: flex;
    gap: 8px;
  }

  &__calendar {
    margin-top: 10px;
    padding: 4px;
    background: #fff;
    box-shadow: var(--w98-groove);
  }

  &__row {
    display: flex;

    &--head {
      margin-bottom: 2px;
      border-bottom: 1px solid var(--w98-shadow);
    }
  }

  &__cell {
    display: flex;
    width: 28px;
    height: 28px;
    align-items: center;
    justify-content: center;
    font-size: var(--w98-ui-size);
    line-height: 1;

    &--head {
      font-weight: 700;
    }

    &--today {
      background: var(--w98-select);
      color: #fff;
    }
  }

  &__face {
    display: block;
    width: 100%;
    max-width: 140px;
    margin: 0 auto;
    aspect-ratio: 1;
  }

  &__zone {
    flex: 0 0 auto;
    font-size: var(--w98-ui-size);
    line-height: 1.25;
    text-wrap: pretty;
  }
}
</style>
