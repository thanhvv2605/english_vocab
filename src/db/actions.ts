import type { CardRecord, ReviewMode, Topic, Word, WordStatus } from '../types'
import { TOPICS } from '../types'
import { addDays, computeStreak, dayKey, DAY_MS, startOfDay } from '../lib/date'
import { newCardRecord, rate, Rating, statusOf, type Grade } from '../lib/srs'
import { slug } from '../lib/text'
import { getSettings, type Settings, type VocabDB } from './db'

/** Words never studied, in learning order (chosen topics first, then list order). */
export async function getNewWords(d: VocabDB, settings: Settings, limit: number): Promise<Word[]> {
  if (limit <= 0) return []
  const learned = new Set((await d.cards.toCollection().primaryKeys()) as string[])
  const all = await d.words.orderBy('createdAt').toArray()
  const order = settings.topics.length ? settings.topics : [...TOPICS, 'custom']
  const rank = (t: string) => {
    const i = order.indexOf(t)
    return i < 0 ? Number.POSITIVE_INFINITY : i
  }
  return all
    .filter((w) => !learned.has(w.id) && rank(w.topic) !== Number.POSITIVE_INFINITY)
    .sort((a, b) => rank(a.topic) - rank(b.topic) || a.createdAt - b.createdAt)
    .slice(0, limit)
}

export async function learnedTodayCount(d: VocabDB, now = new Date()): Promise<number> {
  return d.cards.where('learnedAt').aboveOrEqual(startOfDay(now)).filter((c) => !c.known).count()
}

export async function newRemainingToday(d: VocabDB, settings: Settings, now = new Date()): Promise<number> {
  return Math.max(0, settings.dailyNew - (await learnedTodayCount(d, now)))
}

export async function getDueCards(d: VocabDB, now = new Date()): Promise<CardRecord[]> {
  return d.cards.where('due').belowOrEqual(now.getTime()).sortBy('due')
}

async function log(d: VocabDB, wordId: string, rating: number, mode: ReviewMode, now: Date) {
  await d.reviews.add({ wordId, rating, mode, at: now.getTime(), day: dayKey(now) })
}

/** Rate a card that already exists (review session). */
export async function reviewCard(d: VocabDB, wordId: string, grade: Grade, now = new Date()): Promise<CardRecord> {
  const { retention } = await getSettings(d)
  return d.transaction('rw', d.cards, d.reviews, async () => {
    const cur = await d.cards.get(wordId)
    if (!cur) throw new Error(`No card for ${wordId}`)
    const next = rate(cur, grade, now, retention)
    await d.cards.put(next)
    await log(d, wordId, grade, 'review', now)
    return next
  })
}

/** First rating of a new word, after the learn session's checks. */
export async function learnWord(d: VocabDB, wordId: string, grade: Grade, now = new Date()): Promise<CardRecord> {
  const { retention } = await getSettings(d)
  return d.transaction('rw', d.cards, d.reviews, async () => {
    const existing = await d.cards.get(wordId)
    const base = existing ?? newCardRecord(wordId, now)
    const next = rate(base, grade, now, retention)
    await d.cards.put(next)
    await log(d, wordId, grade, 'learn', now)
    return next
  })
}

/** "I already know this" — scheduled as Easy so it comes back much later. */
export async function markKnown(d: VocabDB, wordId: string, now = new Date()) {
  const card = await learnWord(d, wordId, Rating.Easy, now)
  await d.cards.update(wordId, { known: true })
  return { ...card, known: true }
}

export async function logQuizAnswer(d: VocabDB, wordId: string, correct: boolean, now = new Date()) {
  await log(d, wordId, correct ? Rating.Good : Rating.Again, 'quiz', now)
}

export async function resetWord(d: VocabDB, wordId: string) {
  await d.cards.delete(wordId)
}

export async function toggleStar(d: VocabDB, wordId: string) {
  const w = await d.words.get(wordId)
  if (w) await d.words.update(wordId, { starred: !w.starred })
}

export async function setStarred(d: VocabDB, ids: string[], starred: boolean) {
  await d.transaction('rw', d.words, async () => {
    for (const id of ids) await d.words.update(id, { starred })
  })
}

export type WordInput = Pick<Word, 'word' | 'meaningVi'> & Partial<Omit<Word, 'id' | 'custom' | 'createdAt'>>

export function makeCustomWord(input: WordInput, now = Date.now()): Word {
  const word = input.word.trim()
  const example = input.example?.trim() ?? ''
  const form = input.exampleForm?.trim() || (example.toLowerCase().includes(word.toLowerCase())
    ? example.substr(example.toLowerCase().indexOf(word.toLowerCase()), word.length)
    : '')
  return {
    id: `c:${slug(word)}-${now.toString(36)}`,
    word,
    ipa: input.ipa?.trim() ?? '',
    pos: input.pos ?? 'noun',
    meaningEn: input.meaningEn?.trim() ?? '',
    meaningVi: input.meaningVi.trim(),
    example,
    exampleVi: input.exampleVi?.trim() ?? '',
    exampleForm: form,
    collocations: input.collocations ?? [],
    synonyms: input.synonyms ?? [],
    level: input.level ?? 'B2',
    topic: (input.topic as Topic) ?? 'custom',
    custom: true,
    starred: input.starred ?? false,
    notes: input.notes ?? '',
    createdAt: now,
  }
}

export async function addCustomWord(d: VocabDB, input: WordInput): Promise<Word> {
  const w = makeCustomWord(input)
  await d.words.add(w)
  return w
}

export async function updateWord(d: VocabDB, id: string, patch: Partial<Word>) {
  const { id: _ignored, custom: _c, ...rest } = patch
  void _ignored
  void _c
  await d.words.update(id, rest)
}

export async function deleteWord(d: VocabDB, id: string) {
  await d.transaction('rw', d.words, d.cards, d.reviews, async () => {
    await d.words.delete(id)
    await d.cards.delete(id)
    await d.reviews.where('wordId').equals(id).delete()
  })
}

/** Parse pasted lines: "word<TAB or ; or |>meaning vi[<sep>example]". */
export function parseImportLines(text: string): WordInput[] {
  const out: WordInput[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : line.includes(';') ? ';' : ' - '
    const parts = line.split(sep).map((p) => p.trim())
    if (parts.length < 2 || !parts[0] || !parts[1]) continue
    out.push({ word: parts[0], meaningVi: parts[1], example: parts[2] ?? '', exampleVi: parts[3] ?? '' })
  }
  return out
}

export interface Stats {
  total: number
  byStatus: Record<WordStatus, number>
  dueNow: number
  dueToday: number
  streak: number
  reviewsToday: number
  learnedToday: number
  /** Reviews per day for the heatmap, keyed by day. */
  activity: Map<string, number>
  /** Cards due on each of the next 7 days (index 0 = today). */
  forecast: number[]
  topics: { topic: string; total: number; learned: number; mastered: number }[]
  accuracy: number | null
}

export async function computeStats(d: VocabDB, now = new Date()): Promise<Stats> {
  const [words, cards, reviews] = await Promise.all([d.words.toArray(), d.cards.toArray(), d.reviews.toArray()])
  const cardMap = new Map(cards.map((c) => [c.wordId, c]))
  const byStatus: Record<WordStatus, number> = { new: 0, learning: 0, review: 0, mastered: 0 }
  const topicMap = new Map<string, { topic: string; total: number; learned: number; mastered: number }>()
  for (const w of words) {
    const s = statusOf(cardMap.get(w.id))
    byStatus[s]++
    const t = topicMap.get(w.topic) ?? { topic: w.topic, total: 0, learned: 0, mastered: 0 }
    t.total++
    if (s !== 'new') t.learned++
    if (s === 'mastered') t.mastered++
    topicMap.set(w.topic, t)
  }
  const activity = new Map<string, number>()
  for (const r of reviews) activity.set(r.day, (activity.get(r.day) ?? 0) + 1)
  const today = dayKey(now)
  const t0 = startOfDay(now)
  const forecast = Array.from({ length: 7 }, () => 0)
  let dueNow = 0
  for (const c of cards) {
    if (c.due <= now.getTime()) dueNow++
    const idx = c.due < t0 ? 0 : Math.floor((c.due - t0) / DAY_MS)
    if (idx < 7) forecast[idx]++
  }
  const recent = reviews.filter((r) => r.mode !== 'learn' && r.at >= addDays(now, -30).getTime())
  const accuracy = recent.length ? recent.filter((r) => r.rating >= Rating.Hard).length / recent.length : null
  const order: string[] = [...TOPICS, 'custom']
  return {
    total: words.length,
    byStatus,
    dueNow,
    dueToday: forecast[0],
    streak: computeStreak(new Set(activity.keys()), now),
    reviewsToday: activity.get(today) ?? 0,
    learnedToday: cards.filter((c) => c.learnedAt >= t0 && !c.known).length,
    activity,
    forecast,
    topics: [...topicMap.values()].sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic)),
    accuracy,
  }
}
