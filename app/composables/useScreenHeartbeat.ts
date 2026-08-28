/** How often a panel checks in. The admin calls a screen offline after three misses. */
const HEARTBEAT_INTERVAL = 30_000

// Keeps a panel's lastSeenAt fresh and tells it when its configuration has moved
// on. One request does both: the ping the admin needs to show a screen as alive
// is also the cheapest poll for whether anything changed.
export function useScreenHeartbeat(slug: MaybeRefOrGetter<string>, onConfigChanged: () => void) {
  const isActive = ref(true)
  const reachable = ref(true)

  let knownVersion: string | null = null
  let timer: ReturnType<typeof setInterval>

  async function ping() {
    try {
      const result = await $fetch<{ version: string, isActive: boolean }>(
        `/api/screens/${toValue(slug)}/heartbeat`,
        { method: 'POST' },
      )

      reachable.value = true
      isActive.value = result.isActive

      // The first ping only records where we are; it is not a change.
      if (knownVersion !== null && result.version !== knownVersion) {
        onConfigChanged()
      }

      knownVersion = result.version
    }
    catch {
      // A missed ping is not worth acting on: the panel keeps playing whatever
      // it already has, and the next tick will either recover or not.
      reachable.value = false
    }
  }

  onMounted(() => {
    ping()
    timer = setInterval(ping, HEARTBEAT_INTERVAL)
  })

  onUnmounted(() => clearInterval(timer))

  return { isActive, reachable }
}
