import words from '../data/words.json'
import type { Word } from '../types'
import { buildQuiz, canAsk, confusable, pickDistractors, QUIZ_KINDS, senses } from './quiz'

const pool: Word[] = (words as Omit<Word, 'id' | 'custom' | 'starred' | 'notes' | 'createdAt'>[]).map((w, i) => ({
  ...w,
  id: `s:${i}`,
  custom: false,
  starred: false,
  notes: '',
  createdAt: i,
}))

describe('quiz', () => {
  it('distractors are distinct, exclude the answer and prefer the same part of speech', () => {
    for (const target of pool) {
      const ds = pickDistractors(target, pool)
      expect(ds).toHaveLength(3)
      const all = [target, ...ds]
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(confusable(all[i], all[j])).toBe(false)
      expect(ds.some((w) => w.id === target.id)).toBe(false)
      // Same part of speech whenever the pool has enough of them.
      if (pool.filter((w) => w.pos === target.pos).length >= 8) expect(ds.every((w) => w.pos === target.pos)).toBe(true)
    }
  })

  it('splits Vietnamese senses and spots overlaps', () => {
    expect(senses('giảm nhẹ, làm dịu bớt (tác hại)')).toEqual(['giam nhe', 'lam diu bot'])
    const a = { ...pool[0], word: 'a', synonyms: [], meaningVi: 'đáng kể, quan trọng' }
    const b = { ...pool[1], word: 'b', synonyms: [], meaningVi: 'lớn, đáng kể' }
    expect(confusable(a, b)).toBe(true)
  })

  it('builds the requested number of questions with valid shapes', () => {
    const qs = buildQuiz(pool, pool, QUIZ_KINDS, 30)
    expect(qs).toHaveLength(30)
    for (const q of qs) {
      if (q.kind.startsWith('mc')) {
        expect(q.options).toHaveLength(4)
        expect(q.options.filter((o) => o.id === q.word.id)).toHaveLength(1)
      } else {
        expect(q.accepted.length).toBeGreaterThan(0)
      }
    }
  })

  it('falls back to multiple choice when a gap fill is impossible', () => {
    const w = { ...pool[0], example: '', exampleForm: '' }
    expect(canAsk('blank', w)).toBe(false)
    const [q] = buildQuiz([w], pool, ['blank'], 1)
    expect(q.kind).toBe('mc-en-vi')
  })

  it('never asks more questions than there are words', () => {
    expect(buildQuiz(pool.slice(0, 5), pool, QUIZ_KINDS, 20)).toHaveLength(5)
  })
})
