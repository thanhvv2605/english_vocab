import type { Word } from '../types'
import { fold, shuffle, splitExample } from './text'

export const QUIZ_KINDS = ['mc-en-vi', 'mc-vi-en', 'spell', 'listen', 'blank'] as const
export type QuizKind = (typeof QUIZ_KINDS)[number]

export interface Question {
  kind: QuizKind
  word: Word
  /** Four choices for multiple-choice kinds, including the answer. */
  options: Word[]
  /** Typed answers accepted for spell/listen/blank. */
  accepted: string[]
}

export function canAsk(kind: QuizKind, w: Word): boolean {
  if (kind === 'blank') return !!w.example && !!w.exampleForm && splitExample(w.example, w.exampleForm) !== null
  return true
}

/** Individual Vietnamese senses: "giảm nhẹ, làm dịu (tác hại)" → ["giam nhe", "lam diu"]. */
export function senses(meaningVi: string): string[] {
  return meaningVi
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/]/)
    .map((x) => fold(x))
    .filter(Boolean)
}

/** Two words are too close to be options in the same question. */
export function confusable(a: Word, b: Word): boolean {
  if (fold(a.word) === fold(b.word)) return true
  const syn = (w: Word) => w.synonyms.map(fold)
  if (syn(a).includes(fold(b.word)) || syn(b).includes(fold(a.word))) return true
  const sa = senses(a.meaningVi)
  const sb = new Set(senses(b.meaningVi))
  return sa.some((x) => sb.has(x))
}

/**
 * Pick 3 distractors: same part of speech and topic first, then same part of
 * speech, then anything. Options never share a meaning or are synonyms.
 */
export function pickDistractors(target: Word, pool: Word[], rand: () => number = Math.random): Word[] {
  const tiers = [
    pool.filter((w) => w.pos === target.pos && w.topic === target.topic),
    pool.filter((w) => w.pos === target.pos),
    pool,
  ]
  const out: Word[] = []
  for (const tier of tiers) {
    for (const w of shuffle(tier, rand)) {
      if (out.length === 3) return out
      if (w.id === target.id || [target, ...out].some((o) => confusable(o, w))) continue
      out.push(w)
    }
  }
  return out
}

export function makeQuestion(kind: QuizKind, word: Word, pool: Word[], rand: () => number = Math.random): Question {
  if (kind === 'mc-en-vi' || kind === 'mc-vi-en') {
    return { kind, word, options: shuffle([word, ...pickDistractors(word, pool, rand)], rand), accepted: [] }
  }
  const accepted = kind === 'blank' ? [word.exampleForm, word.word] : [word.word]
  return { kind, word, options: [], accepted }
}

/**
 * Build a quiz from `source` words. Kinds rotate so a mixed quiz varies;
 * a word that can't be asked one way falls back to multiple choice.
 */
export function buildQuiz(
  source: Word[],
  pool: Word[],
  kinds: readonly QuizKind[],
  count: number,
  rand: () => number = Math.random,
): Question[] {
  const words = shuffle(source, rand).slice(0, count)
  const ks = shuffle(kinds, rand)
  return words.map((w, i) => {
    let kind = ks[i % ks.length]
    if (!canAsk(kind, w)) kind = 'mc-en-vi'
    return makeQuestion(kind, w, pool, rand)
  })
}
