<script setup lang="ts">
import { Department } from '#shared/types/department'
import type { AdminScreen } from '~/types/admin'

const props = defineProps<{ screens: AdminScreen[] }>()
const emit = defineEmits<{ changed: [] }>()

const DEPARTMENT_LABELS: Record<Department, string> = {
  [Department.INFO]: 'Info',
  [Department.SGM]: 'SGM',
  [Department.BOTH]: 'Commun',
}

// Ticks on its own so "il y a 12 s" keeps counting between polls, rather than
// freezing at whatever the last request happened to return.
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval>

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => clearInterval(clock))

const pending = ref<number | null>(null)
const error = ref('')

const rows = computed(() => props.screens.map((screen) => {
  const seen = screen.lastSeenAt ? new Date(screen.lastSeenAt) : null

  return {
    ...screen,
    seenLabel: relativeSince(seen, now.value),
    online: Boolean(seen) && now.value - seen!.getTime() < SCREEN_ONLINE_WINDOW_MS,
  }
}))

async function toggle(screen: AdminScreen, isActive: boolean) {
  pending.value = screen.id
  error.value = ''

  try {
    await $fetch(`/api/admin/screens/${screen.id}`, { method: 'PATCH', body: { isActive } })
    emit('changed')
  }
  catch (cause) {
    error.value = (cause as { statusMessage?: string }).statusMessage || 'Modification impossible.'
  }
  finally {
    pending.value = null
  }
}
</script>

<template>
  <section class="screens">
    <header class="screens__head">
      <h2 class="screens__title">
        Écrans
      </h2>
      <span class="screens__count">{{ rows.filter(row => row.online).length }} / {{ rows.length }} en ligne</span>
    </header>

    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>

    <ul class="list">
      <li
        v-for="screen in rows"
        :key="screen.id"
        class="screen"
        :class="{ 'screen--off': !screen.isActive }"
      >
        <span
          class="screen__dot"
          :class="screen.online ? 'screen__dot--on' : 'screen__dot--offline'"
          :title="screen.online ? 'En ligne' : 'Hors ligne'"
        />

        <div class="screen__identity">
          <span class="screen__name">{{ screen.name }}</span>
          <span class="screen__meta admin-mono">/{{ screen.slug }}</span>
        </div>

        <span class="screen__badge">{{ DEPARTMENT_LABELS[screen.department] }}</span>

        <span class="screen__seen">{{ screen.seenLabel }}</span>

        <label class="screen__toggle">
          <input
            type="checkbox"
            :checked="screen.isActive"
            :disabled="pending === screen.id"
            :aria-label="`Activer l'écran ${screen.name}`"
            @change="toggle(screen, ($event.target as HTMLInputElement).checked)"
          >
          <span class="screen__track" />
        </label>
      </li>

      <li
        v-if="!rows.length"
        class="list__empty"
      >
        Aucun écran enregistré.
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.screens {
  display: flex;
  flex-direction: column;
  gap: .8rem;
  padding: 1.2rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: .8rem;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
  }

  &__count {
    font-size: .8rem;
    color: var(--admin-text-dim);
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  list-style: none;

  &__empty {
    padding: 1.2rem;
    font-size: .88rem;
    text-align: center;
    color: var(--admin-text-dim);
  }
}

.screen {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem .7rem;
  background: var(--admin-sunken);
  border: 1px solid var(--admin-border);
  border-radius: 8px;

  &--off {
    opacity: .6;
  }

  &__dot {
    flex: 0 0 auto;
    width: 9px;
    height: 9px;
    border-radius: 50%;

    &--on {
      background: var(--admin-online);
      box-shadow: 0 0 0 3px rgb(46 158 91 / 15%);
    }

    &--offline {
      background: var(--admin-offline);
    }
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: .1rem;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: .92rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    font-size: .76rem;
    color: var(--admin-text-dim);
  }

  &__badge {
    padding: .15rem .5rem;
    font-size: .74rem;
    color: var(--admin-text-dim);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: 999px;
  }

  &__seen {
    min-width: 6.5rem;
    font-size: .8rem;
    text-align: right;
    color: var(--admin-text-dim);
  }

  &__toggle {
    position: relative;
    flex: 0 0 auto;
    width: 2.4rem;
    height: 1.35rem;

    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      margin: 0;
      cursor: pointer;
    }
  }

  &__track {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--admin-offline);
    border-radius: 999px;
    transition: background .15s ease;
    pointer-events: none;

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: calc(1.35rem - 6px);
      height: calc(1.35rem - 6px);
      background: #fff;
      border-radius: 50%;
      transition: transform .15s ease;
    }
  }

  input:checked + &__track {
    background: var(--admin-accent);

    &::after {
      transform: translateX(calc(2.4rem - 1.35rem));
    }
  }

  input:focus-visible + &__track {
    outline: 2px solid var(--admin-accent);
    outline-offset: 2px;
  }
}

.error {
  padding: .55rem .7rem;
  font-size: .85rem;
  color: var(--admin-danger);
  background: rgb(200 55 45 / 7%);
  border-radius: 6px;
}
</style>
