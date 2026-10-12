import { VocabDB, getSettings, updateSettings } from './db'
import { ensureSeed, SEED, seedId } from './seed'
import {
  addCustomWord, computeStats, deleteWord, getDueCards, getNewWords, learnedTodayCount, learnWord,
  makeCustomWord, markKnown, newRemainingToday, parseImportLines, reviewCard, toggleStar,
} from './actions'
import { exportBackup, importBackup, resetProgress } from './backup'
import { Rating } from '../lib/srs'

let n = 0
async function freshDb() {
  const d = new VocabDB(`test-${n++}`)
  await ensureSeed(d)
  return d
}

describe('seed', () => {
  it('loads every seed word once and keeps learner fields on re-seed', async () => {
    const d = await freshDb()
    expect(await d.words.count()).toBe(SEED.length)
    const id = seedId(SEED[0].word)
    await toggleStar(d, id)
    await d.words.update(id, { notes: 'mine' })
    await d.meta.delete('seedVersion')
    await ensureSeed(d)
    const w = await d.words.get(id)
    expect(w?.starred).toBe(true)
    expect(w?.notes).toBe('mine')
    expect(await d.words.count()).toBe(SEED.length)
  })

  it('seed ids are unique', () => {
    expect(new Set(SEED.map((w) => seedId(w.word))).size).toBe(SEED.length)
  })
})

describe('learning flow', () => {
  it('new words follow topic order and exclude learned ones', async () => {
    const d = await freshDb()
    const s = await getSettings(d)
    const first = await getNewWords(d, s, 3)
    expect(first).toHaveLength(3)
    expect(first.every((w) => w.topic === 'notebook')).toBe(true)
    await learnWord(d, first[0].id, Rating.Good)
    const next = await getNewWords(d, s, 3)
    expect(next.map((w) => w.id)).not.toContain(first[0].id)

    await updateSettings({ topics: ['travel', 'health'] }, d)
    const chosen = await getNewWords(d, await getSettings(d), 100)
    expect(chosen[0].topic).toBe('travel')
    expect(new Set(chosen.map((w) => w.topic))).toEqual(new Set(['travel', 'health']))
  })

  it('daily limit counts learned words but not "already known" ones', async () => {
    const d = await freshDb()
    const s = await getSettings(d)
    const [a, b] = await getNewWords(d, s, 2)
    await learnWord(d, a.id, Rating.Good)
    await markKnown(d, b.id)
    expect(await learnedTodayCount(d)).toBe(1)
    expect(await newRemainingToday(d, s)).toBe(s.dailyNew - 1)
  })

  it('learned cards become due and reviews update them', async () => {
    const d = await freshDb()
    const [w] = await getNewWords(d, await getSettings(d), 1)
    const t0 = new Date()
    await learnWord(d, w.id, Rating.Good, t0)
    const later = new Date(t0.getTime() + 15 * 60_000)
    const due = await getDueCards(d, later)
    expect(due.map((c) => c.wordId)).toEqual([w.id])
    const after = await reviewCard(d, w.id, Rating.Good, later)
    expect(after.due).toBeGreaterThan(later.getTime())
    expect(await d.reviews.count()).toBe(2)
  })

  it('computes stats: status counts, streak and forecast', async () => {
    const d = await freshDb()
    const words = await getNewWords(d, await getSettings(d), 3)
    for (const w of words) await learnWord(d, w.id, Rating.Good)
    const s = await computeStats(d)
    expect(s.byStatus.learning).toBe(3)
    expect(s.byStatus.new).toBe(SEED.length - 3)
    expect(s.streak).toBe(1)
    expect(s.learnedToday).toBe(3)
    expect(s.forecast[0]).toBe(3)
    expect(s.topics.find((t) => t.topic === 'notebook')?.learned).toBe(3)
  })
})

describe('custom words', () => {
  it('adds, finds the example form, and deletes with its progress', async () => {
    const d = await freshDb()
    const w = await addCustomWord(d, { word: 'Resilient', meaningVi: 'kiên cường', example: 'Children are remarkably resilient.' })
    expect(w.exampleForm).toBe('resilient')
    expect(w.custom).toBe(true)
    await learnWord(d, w.id, Rating.Good)
    await deleteWord(d, w.id)
    expect(await d.words.get(w.id)).toBeUndefined()
    expect(await d.cards.get(w.id)).toBeUndefined()
    expect(await d.reviews.where('wordId').equals(w.id).count()).toBe(0)
  })

  it('custom words without an example get an empty form', () => {
    expect(makeCustomWord({ word: 'x', meaningVi: 'y' }).exampleForm).toBe('')
  })

  it('parses import lines with several separators', () => {
    const r = parseImportLines('# comment\nresilient | kiên cường | Kids are resilient.\nthrive\tphát triển mạnh\nbad line\nflourish; nở rộ')
    expect(r.map((x) => x.word)).toEqual(['resilient', 'thrive', 'flourish'])
    expect(r[0].example).toBe('Kids are resilient.')
  })
})

describe('backup', () => {
  it('round-trips progress, custom words, stars and settings', async () => {
    const a = await freshDb()
    const [w] = await getNewWords(a, await getSettings(a), 1)
    await learnWord(a, w.id, Rating.Good)
    await toggleStar(a, w.id)
    await addCustomWord(a, { word: 'thrive', meaningVi: 'phát triển mạnh' })
    await updateSettings({ dailyNew: 20, lang: 'en' }, a)
    const backup = JSON.parse(JSON.stringify(await exportBackup(a)))

    const b = await freshDb()
    await toggleStar(b, seedId(SEED[5].word)) // should be cleared by restore
    const r = await importBackup(b, backup)
    expect(r.cards).toBe(1)
    expect((await b.words.get(w.id))?.starred).toBe(true)
    expect((await b.words.get(seedId(SEED[5].word)))?.starred).toBe(false)
    expect(await b.words.filter((x) => x.custom).count()).toBe(1)
    expect(await b.reviews.count()).toBe(1)
    const s = await getSettings(b)
    expect(s.dailyNew).toBe(20)
    expect(s.lang).toBe('en')
    expect(await b.words.count()).toBe(SEED.length + 1)
  })

  it('rejects files that are not backups', async () => {
    const d = await freshDb()
    await expect(importBackup(d, { hello: 1 })).rejects.toThrow()
  })

  it('reset clears progress but keeps words', async () => {
    const d = await freshDb()
    const [w] = await getNewWords(d, await getSettings(d), 1)
    await learnWord(d, w.id, Rating.Good)
    await resetProgress(d)
    expect(await d.cards.count()).toBe(0)
    expect(await d.reviews.count()).toBe(0)
    expect(await d.words.count()).toBe(SEED.length)
  })
})
