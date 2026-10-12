import Dexie, { type EntityTable } from 'dexie'
import type { CardRecord, ReviewEntry, Word } from '../types'

export type Lang = 'vi' | 'en'
export type Theme = 'system' | 'light' | 'dark'
export type CardDirection = 'en-vi' | 'vi-en' | 'mixed'
export type Accent = 'en-GB' | 'en-US'

export interface Settings {
  id: 'app'
  lang: Lang
  theme: Theme
  dailyNew: number
  retention: number
  direction: CardDirection
  autoplay: boolean
  accent: Accent
  voiceURI: string
  rate: number
  /** Topics to draw new words from; empty means all, in default order. */
  topics: string[]
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  lang: 'vi',
  theme: 'system',
  dailyNew: 10,
  retention: 0.9,
  direction: 'en-vi',
  autoplay: true,
  accent: 'en-GB',
  voiceURI: '',
  rate: 0.9,
  topics: [],
  onboarded: false,
}

export interface Meta {
  key: string
  value: string
}

export class VocabDB extends Dexie {
  words!: EntityTable<Word, 'id'>
  cards!: EntityTable<CardRecord, 'wordId'>
  reviews!: EntityTable<ReviewEntry, 'id'>
  settings!: EntityTable<Settings, 'id'>
  meta!: EntityTable<Meta, 'key'>

  constructor(name = 'ielts-vocab') {
    super(name)
    this.version(1).stores({
      words: 'id, word, topic, level, createdAt',
      cards: 'wordId, due, state, learnedAt',
      reviews: '++id, wordId, day, at, mode',
      settings: 'id',
      meta: 'key',
    })
  }
}

export const db = new VocabDB()

export async function getSettings(d: VocabDB = db): Promise<Settings> {
  const s = await d.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function updateSettings(patch: Partial<Settings>, d: VocabDB = db): Promise<void> {
  const cur = await getSettings(d)
  await d.settings.put({ ...cur, ...patch, id: 'app' })
}
