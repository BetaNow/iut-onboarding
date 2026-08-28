<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { loggedIn, fetch: refreshSession } = useUserSession()

// Someone who still holds a session should not be looking at a login form.
watchEffect(() => {
  if (loggedIn.value) {
    navigateTo('/admin')
  }
})

const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  if (pending.value) {
    return
  }

  pending.value = true
  error.value = ''

  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password: password.value },
    })

    await refreshSession()
    await navigateTo('/admin')
  }
  catch (cause) {
    // The server's own wording, so a missing ADMIN_PASSWORD reads as "non
    // configurée" rather than as a wrong password.
    const status = (cause as { statusMessage?: string }).statusMessage
    error.value = status || 'Connexion impossible.'
    password.value = ''
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="login">
    <form
      class="card"
      @submit.prevent="submit"
    >
      <h1 class="card__title">
        Connexion
      </h1>
      <p class="card__hint">
        Cette console règle ce que les écrans affichent.
      </p>

      <label
        class="field"
        for="admin-password"
      >
        <span class="field__label">Mot de passe</span>
        <input
          id="admin-password"
          v-model="password"
          type="password"
          class="field__input"
          autocomplete="current-password"
          required
          :disabled="pending"
        >
      </label>

      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        class="submit"
        :disabled="pending || !password"
      >
        {{ pending ? 'Vérification...' : 'Se connecter' }}
      </button>
    </form>
  </div>
</template>

<style scoped lang="scss">
.login {
  display: flex;
  justify-content: center;
  padding-top: 3rem;
}

.card {
  width: 100%;
  max-width: 22rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.6rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);

  &__title {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: -.01em;
  }

  &__hint {
    margin-top: -.6rem;
    font-size: .85rem;
    color: var(--admin-text-dim);
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: .4rem;

  &__label {
    font-size: .85rem;
    color: var(--admin-text-dim);
  }

  &__input {
    padding: .65rem .75rem;
    font: inherit;
    color: var(--admin-text);
    background: var(--admin-sunken);
    border: 1px solid var(--admin-border-strong);
    border-radius: calc(var(--admin-radius) - 4px);

    &:focus-visible {
      outline: 2px solid var(--admin-accent);
      outline-offset: 1px;
    }
  }
}

.error {
  padding: .55rem .7rem;
  font-size: .85rem;
  color: var(--admin-danger);
  background: rgb(200 55 45 / 7%);
  border-radius: calc(var(--admin-radius) - 4px);
}

.submit {
  padding: .7rem 1rem;
  font: inherit;
  font-weight: 500;
  color: #fff;
  background: var(--admin-accent);
  border: 0;
  border-radius: calc(var(--admin-radius) - 4px);
  cursor: pointer;

  &:disabled {
    opacity: .5;
    cursor: default;
  }
}
</style>
