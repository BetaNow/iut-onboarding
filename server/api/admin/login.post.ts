import { createHash, timingSafeEqual } from 'node:crypto'

// Both sides are hashed before comparing so the buffers match in length.
// timingSafeEqual throws on a length mismatch, which would leak the password
// length through the difference between a 401 and a 500.
const digest = (value: string) => createHash('sha256').update(value).digest()

export default defineEventHandler(async (event) => {
  const { adminPassword } = useRuntimeConfig(event)

  if (!adminPassword) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Administration non configurée.',
    })
  }

  const body = await readBody<{ password?: unknown }>(event)
  const password = body?.password

  if (typeof password !== 'string' || !timingSafeEqual(digest(password), digest(adminPassword))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Mot de passe incorrect.',
    })
  }

  await setUserSession(event, {
    user: { admin: true },
    loggedInAt: Date.now(),
  })

  return { ok: true }
})
