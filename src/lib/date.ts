export const DAY_MS = 86_400_000

/** Local calendar day key, e.g. "2026-10-08". */
export function dayKey(d: Date | number = new Date()): string {
  const x = new Date(d)
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function startOfDay(d: Date | number = new Date()): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function endOfDay(d: Date | number = new Date()): number {
  return startOfDay(d) + DAY_MS - 1
}

export function addDays(d: Date | number, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Consecutive days with activity, ending today (or yesterday if today has none yet). */
export function computeStreak(activeDays: Set<string>, now: Date = new Date()): number {
  let cursor = new Date(now)
  if (!activeDays.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (activeDays.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}
