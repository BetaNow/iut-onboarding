// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-security', 'nuxt-auth-utils', '@vite-pwa/nuxt', '@nuxt/eslint', '@nuxt/fonts'],
  devtools: {
    enabled: true,
  },
  css: ['~/styles/main.scss'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? 'mysql://onboarding:onboarding@127.0.0.1:3306/iut_onboarding',
    dailyMemeTimezone: process.env.DAILY_MEME_TIMEZONE ?? 'Europe/Paris',
    memeApiUrl: process.env.MEME_API_URL,
    // Deliberately no fallback: an unset password closes the admin rather than
    // opening it with a value an attacker could read off this file.
    adminPassword: process.env.ADMIN_PASSWORD ?? '',
    session: {
      // `password` is part of nuxt-auth-utils' session config type, so it has to
      // be named here even though the module reads it from NUXT_SESSION_PASSWORD.
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  routeRules: {
    // A single shared password is exactly the shape that brute-forces well, so
    // the login route gets a far tighter budget than the site-wide limiter.
    '/api/admin/login': {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 300_000,
        },
        // The XSS validator rejects any body with HTML-ish characters, so
        // `> & ( ) ; = !` in a password turn a correct login into a 400. Nothing
        // here is rendered, only hashed and compared.
        xssValidator: false,
      },
    },
  },
  experimental: {
    appManifest: false,
  },
  compatibilityDate: '2025-07-15',
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
