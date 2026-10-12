import type { CardRecord, ReviewEntry, Word } from '../types'
import { DEFAULT_SETTINGS, type Settings, type VocabDB } from './db'
import { ensureSeed } from './seed'

export const BACKUP_FORMAT = 'ielts-vocab-backup'

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: 1
  exportedAt: string
  settings: Settings
  /** Custom words in full; for built-in words only learner fields. */
  words: Word[]
  userMeta: { id: string; starred: boolean; notes: string }[]
  cards: CardRecord[]
  reviews: ReviewEntry[]
}

export async function exportBackup(d: VocabDB): Promise<Backup> {
  const [settings, words, cards, reviews] = await Promise.all([
    d.settings.get('app'),
    d.words.toArray(),
    d.cards.toArray(),
    d.reviews.toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    words: words.filter((w) => w.custom),
    userMeta: words.filter((w) => !w.custom && (w.starred || w.notes)).map((w) => ({ id: w.id, starred: w.starred, notes: w.notes })),
    cards,
    reviews: reviews.map(({ id: _id, ...r }) => r),
  }
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup
  return !!b && b.format === BACKUP_FORMAT && Array.isArray(b.cards) && Array.isArray(b.reviews) && Array.isArray(b.words)
}

/** Replace all learner data with the backup's contents. */
export async function importBackup(d: VocabDB, data: unknown): Promise<{ cards: number; words: number }> {
  if (!isBackup(data)) throw new Error('invalid-backup')
  await d.transaction('rw', [d.words, d.cards, d.reviews, d.settings, d.meta], async () => {
    await Promise.all([d.cards.clear(), d.reviews.clear(), d.settings.clear(), d.meta.clear()])
    await d.words.filter((w) => w.custom).delete()
    await d.words.toCollection().modify({ starred: false, notes: '' })
    await d.settings.put({ ...DEFAULT_SETTINGS, ...data.settings, id: 'app' })
    await d.words.bulkPut(data.words.map((w) => ({ ...w, custom: true })))
    await d.cards.bulkPut(data.cards)
    await d.reviews.bulkAdd(data.reviews.map(({ id: _id, ...r }) => r))
  })
  await ensureSeed(d)
  await d.transaction('rw', d.words, async () => {
    for (const m of data.userMeta ?? []) await d.words.update(m.id, { starred: m.starred, notes: m.notes })
  })
  return { cards: data.cards.length, words: data.words.length }
}

/** Wipe progress but keep the word list (and custom words). */
export async function resetProgress(d: VocabDB) {
  await d.transaction('rw', d.cards, d.reviews, async () => {
    await d.cards.clear()
    await d.reviews.clear()
  })
}
