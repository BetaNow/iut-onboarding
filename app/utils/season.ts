export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const

// Meteorological seasons: spring 1 March, summer 1 June, autumn 1 September,
// winter 1 December. Every boundary is the first of a month, so the month alone
// decides. Uses the panel's local time, like the on-screen clock.
export function seasonForDate(date: Date): Season {
  const month = date.getMonth() + 1

  if (month >= 3 && month <= 5) {
    return 'spring'
  }
  if (month >= 6 && month <= 8) {
    return 'summer'
  }
  if (month >= 9 && month <= 11) {
    return 'autumn'
  }
  return 'winter'
}

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as readonly string[]).includes(value)
}
