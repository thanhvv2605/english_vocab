export const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'phrasal verb', 'preposition', 'conjunction'] as const
export type Pos = (typeof POS)[number]
export const LEVELS = ['B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

export const TOPICS = [
  'notebook', 'academic', 'trends', 'environment', 'education', 'technology', 'health',
  'work', 'economy', 'society', 'crime', 'government', 'media',
  'science', 'urban', 'travel', 'family',
] as const
export type SeedTopic = (typeof TOPICS)[number]
/** Custom words may use any topic id; 'custom' is the default. */
export type Topic = SeedTopic | 'custom'

export interface SeedWord {
  word: string
  ipa: string
  pos: Pos
  meaningEn: string
  meaningVi: string
  example: string
  exampleVi: string
  exampleForm: string
  collocations: string[]
  synonyms: string[]
  level: Level
  topic: SeedTopic
}

export interface Word extends Omit<SeedWord, 'topic'> {
  id: string
  topic: Topic
  custom: boolean
  starred: boolean
  notes: string
  createdAt: number
}

/** FSRS scheduling state, stored per learned word. Dates are epoch ms. */
export interface CardRecord {
  wordId: string
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: number | null
  learnedAt: number
  /** Marked "already known" — doesn't count toward the daily new-word limit. */
  known?: boolean
}

export type ReviewMode = 'learn' | 'review' | 'quiz'

export interface ReviewEntry {
  id?: number
  wordId: string
  /** FSRS rating 1–4 for learn/review; for quiz 1 = wrong, 3 = right. */
  rating: number
  mode: ReviewMode
  at: number
  day: string
}

export type WordStatus = 'new' | 'learning' | 'review' | 'mastered'
