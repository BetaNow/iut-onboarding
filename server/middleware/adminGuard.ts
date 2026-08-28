// The real gate on the admin. app/middleware/admin.ts only decides what the
// browser renders; anyone can call these routes directly. Guarding the whole
// prefix here closes a new admin endpoint the moment it is created.
const PUBLIC_ROUTES = new Set([
  '/api/admin/login',
  '/api/admin/logout',
])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/admin/') || PUBLIC_ROUTES.has(path)) {
    return
  }

  await requireUserSession(event)
})
