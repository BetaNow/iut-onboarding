export default defineTask({
  meta: {
    name: 'crous:fetch-tomorrow',
    description: 'Récupère le menu CROUS de demain (ou le prochain jour ouvert)',
  },
  async run() {
    await $fetch('http://localhost:3000/api/menu-crous/fetch?offsetDays=1')
    return { result: 'ok' }
  },
})
