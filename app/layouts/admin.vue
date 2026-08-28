<script setup lang="ts">
const { loggedIn, fetch: refreshSession } = useUserSession()

const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true

  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
    await refreshSession()
    await navigateTo('/admin/login')
  }
  finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="admin">
    <header class="bar">
      <div class="bar__brand">
        <span class="bar__title">Administration</span>
        <span class="bar__sub">Écrans d'accueil IUT</span>
      </div>

      <button
        v-if="loggedIn"
        type="button"
        class="bar__logout"
        :disabled="loggingOut"
        @click="logout"
      >
        {{ loggingOut ? 'Déconnexion...' : 'Déconnexion' }}
      </button>
    </header>

    <main class="shell">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);

  &__brand {
    display: flex;
    flex-direction: column;
    gap: .15rem;
  }

  &__title {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -.01em;
  }

  &__sub {
    font-size: .8rem;
    color: var(--admin-text-dim);
  }

  &__logout {
    padding: .5rem .9rem;
    font: inherit;
    font-size: .85rem;
    color: var(--admin-text);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: var(--admin-radius);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--admin-sunken);
    }

    &:disabled {
      opacity: .55;
      cursor: default;
    }
  }
}

.shell {
  max-width: 60rem;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
