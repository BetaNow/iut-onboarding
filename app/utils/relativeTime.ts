// How long a panel may stay quiet before the admin calls it offline: three
// missed heartbeats, so one dropped request is not an alarm.
export const SCREEN_ONLINE_WINDOW_MS = 90_000

/** Coarse French "last seen", accurate enough to read at a glance. */
export function relativeSince(seen: Date | null, now: number): string {
  if (!seen) {
    return 'jamais vu'
  }

  const seconds = Math.floor(Math.max(0, now - seen.getTime()) / 1000)

  if (seconds < 10) {
    return 'à l\'instant'
  }

  if (seconds < 60) {
    return `il y a ${seconds} s`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `il y a ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `il y a ${hours} h`
  }

  return `il y a ${Math.floor(hours / 24)} j`
}
