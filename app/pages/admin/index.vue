<script setup lang="ts">
import type { AdminConfigResponse, AdminScreen } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })

// Client-side only: the endpoints sit behind a session cookie, and there is
// nothing here worth server-rendering. Rendering the shell on the server while
// fetching on the client caused a hydration mismatch.
const { data: screens, refresh: refreshScreens } = await useFetch<AdminScreen[]>('/api/admin/screens', {
  server: false,
  default: () => [],
})

const { data: config, refresh: refreshConfig } = await useFetch<AdminConfigResponse>('/api/admin/config', {
  server: false,
})

// Keeps the online dots and last-seen honest without the operator reloading.
let poll: ReturnType<typeof setInterval>

onMounted(() => {
  poll = setInterval(() => refreshScreens(), 30_000)
})

onUnmounted(() => clearInterval(poll))
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <p class="loading">
        Chargement...
      </p>
    </template>

    <div class="page">
      <AdminScreenList
        :screens="screens ?? []"
        @changed="refreshScreens"
      />

      <AdminRotationEditor
        v-if="config"
        :catalogue="config.catalogue"
        :rows="config.rows"
        :limits="config.limits"
        @saved="refreshConfig"
      />

      <p
        v-else
        class="loading"
      >
        Chargement de la rotation...
      </p>
    </div>
  </ClientOnly>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.loading {
  padding: 2rem;
  font-size: .9rem;
  text-align: center;
  color: var(--admin-text-dim);
}
</style>
