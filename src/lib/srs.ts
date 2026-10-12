import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { CardRecord, WordStatus } from '../types'

export { Rating, State }
export type { Grade }

/** A card is "mastered" once FSRS expects to keep it for 3+ weeks. */
export const MASTERED_STABILITY_DAYS = 21

export function makeScheduler(retention = 0.9) {
  return fsrs({
    request_retention: retention,
    maximum_interval: 365 * 3,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  })
}

export function toCard(r: CardRecord): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.elapsed_days,
    scheduled_days: r.scheduled_days,
    learning_steps: r.learning_steps,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state as State,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  }
}

export function fromCard(wordId: string, c: Card, learnedAt: number): CardRecord {
  return {
    wordId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
    learnedAt,
  }
}

export function newCardRecord(wordId: string, now: Date): CardRecord {
  return fromCard(wordId, createEmptyCard(now), now.getTime())
}

/** Apply a rating; returns the updated card record. */
export function rate(record: CardRecord, grade: Grade, now: Date, retention = 0.9): CardRecord {
  const { card } = makeScheduler(retention).next(toCard(record), now, grade)
  return fromCard(record.wordId, card, record.learnedAt)
}

/** Next interval for each grade, for showing on the rating buttons. */
export function previewIntervals(record: CardRecord, now: Date, retention = 0.9): Record<Grade, number> {
  const preview = makeScheduler(retention).repeat(toCard(record), now)
  return {
    [Rating.Again]: preview[Rating.Again].card.due.getTime() - now.getTime(),
    [Rating.Hard]: preview[Rating.Hard].card.due.getTime() - now.getTime(),
    [Rating.Good]: preview[Rating.Good].card.due.getTime() - now.getTime(),
    [Rating.Easy]: preview[Rating.Easy].card.due.getTime() - now.getTime(),
  } as Record<Grade, number>
}

export function statusOf(record: CardRecord | undefined): WordStatus {
  if (!record) return 'new'
  if (record.state === State.Learning || record.state === State.Relearning || record.state === State.New) return 'learning'
  return record.stability >= MASTERED_STABILITY_DAYS ? 'mastered' : 'review'
}

/** Compact interval label, language-neutral: 1m, 10m, 3h, 4d, 2mo, 1.5y. */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 31) return `${d}d`
  const mo = Math.round(d / 30.4)
  if (mo < 12) return `${mo}mo`
  return `${Math.round((d / 365) * 10) / 10}y`
}
