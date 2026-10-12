import { editDistance, fold, isAnswerCorrect, isNearMiss, letterHint, shuffle, slug, splitExample } from './text'

describe('text helpers', () => {
  it('folds Vietnamese diacritics for search', () => {
    expect(fold('Giảm nhẹ, ĐƯỜNG')).toBe('giam nhe, duong')
  })
  it('accepts answers regardless of case, hyphens and extra spaces', () => {
    expect(isAnswerCorrect('  Carbon   Footprint ', ['carbon footprint'])).toBe(true)
    expect(isAnswerCorrect('well-being', ['well being'])).toBe(true)
    expect(isAnswerCorrect('wellbeing', ['well-being'])).toBe(false)
    expect(isAnswerCorrect('', ['x'])).toBe(false)
  })
  it('detects near misses but not exact or far answers', () => {
    expect(isNearMiss('enviroment', 'environment')).toBe(true)
    expect(isNearMiss('environment', 'environment')).toBe(false)
    expect(isNearMiss('cat', 'environment')).toBe(false)
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })
  it('splits an example around the target form', () => {
    expect(splitExample('We must mitigate risks.', 'mitigate')).toEqual(['We must ', 'mitigate', ' risks.'])
    expect(splitExample('abc', 'x')).toBeNull()
  })
  it('builds letter hints per word', () => {
    expect(letterHint('carbon footprint')).toBe('c_____ f________')
  })
  it('shuffles without losing items', () => {
    const a = [1, 2, 3, 4, 5]
    expect(shuffle(a).sort()).toEqual(a)
  })
  it('slugs words', () => {
    expect(slug("Children's well-being")).toBe('children-s-well-being')
  })
})
