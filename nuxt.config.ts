// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    'nuxt-security',
    'nuxt-auth-utils',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],
  devtools: {
    enabled: true,
  },
  compatibilityDate: '2025-07-15',
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
