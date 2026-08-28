import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'mysql',
  schema: './server/database/index.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://onboarding:onboarding@127.0.0.1:3306/iut_onboarding',
  },
})
