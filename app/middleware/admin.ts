// Keeps the browser off the admin pages when there is no session. Presentation
// only: the endpoints are closed by server/middleware/adminGuard.ts.
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/admin/login')
  }
})
