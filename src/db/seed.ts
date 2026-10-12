import seedWords from '../data/words.json'
import type { SeedWord, Word } from '../types'
import { slug } from '../lib/text'
import type { VocabDB } from './db'

export const SEED: SeedWord[] = seedWords as SeedWord[]

export function seedId(word: string): string {
  return `s:${slug(word)}`
}

/** Fingerprint so a changed word list re-syncs on next launch. */
function seedVersion(): string {
  let h = 0
  const s = JSON.stringify(SEED)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return `${SEED.length}:${h}`
}

/**
 * Insert or refresh built-in words. Content fields come from the seed;
 * the learner's own fields (starred, notes) are preserved.
 */
export async function ensureSeed(d: VocabDB): Promise<void> {
  const version = seedVersion()
  const cur = await d.meta.get('seedVersion')
  if (cur?.value === version) return
  await d.transaction('rw', d.words, d.meta, async () => {
    const ids = SEED.map((w) => seedId(w.word))
    const existing = await d.words.bulkGet(ids)
    const now = Date.now()
    const rows: Word[] = SEED.map((w, i) => {
      const old = existing[i]
      return {
        ...w,
        id: ids[i],
        custom: false,
        starred: old?.starred ?? false,
        notes: old?.notes ?? '',
        createdAt: old?.createdAt ?? now + i,
      }
    })
    await d.words.bulkPut(rows)
    await d.meta.put({ key: 'seedVersion', value: version })
  })
}
