// If you want to fetch today to test tap this command:
// http://localhost:3000/_nitro/tasks/crous-fetch-today
export default defineTask({
  meta: {
    name: 'crous:fetch-today',
    description: 'Récupère le menu CROUS du jour (ou le prochain jour ouvert)',
  },
  async run() {
    await $fetch('http://localhost:3000/api/menu-crous/fetch?offsetDays=0')
    return { result: 'ok' }
  },
})
