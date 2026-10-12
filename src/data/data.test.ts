import words from './words.json'
import { en } from '../i18n/en'
import { vi } from '../i18n/vi'
import { LEVELS, POS, TOPICS } from '../types'

describe('word list', () => {
  it('has hundreds of complete entries across all topics', () => {
    expect(words.length).toBeGreaterThan(600)
    expect(new Set(words.map((w) => w.topic))).toEqual(new Set(TOPICS))
  })
  it('every entry is complete and consistent', () => {
    for (const w of words) {
      expect(w.word && w.ipa && w.meaningVi && w.meaningEn && w.example && w.exampleVi, w.word).toBeTruthy()
      expect(w.example.includes(w.exampleForm), w.word).toBe(true)
      expect((POS as readonly string[]).includes(w.pos), w.word).toBe(true)
      expect((LEVELS as readonly string[]).includes(w.level), w.word).toBe(true)
      expect(w.ipa.startsWith('/') && w.ipa.endsWith('/'), w.word).toBe(true)
    }
  })
  it('has no duplicate headwords', () => {
    const keys = words.map((w) => w.word.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('i18n', () => {
  const flat = (o: object, p = ''): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v] as [string, string]] : flat(v, `${p}${k}.`)))
  it('Vietnamese and English have the same keys and the same placeholders', () => {
    const a = new Map(flat(en))
    const b = new Map(flat(vi))
    expect([...b.keys()].sort()).toEqual([...a.keys()].sort())
    for (const [k, v] of a) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join()
      expect(ph(b.get(k)!), k).toBe(ph(v))
      expect(b.get(k)!.trim(), k).not.toBe('')
    }
  })
})
