import { formatInterval, newCardRecord, previewIntervals, rate, Rating, State, statusOf } from './srs'

describe('srs', () => {
  const now = new Date('2026-01-01T09:00:00')

  it('new card rated Good enters learning with a short step', () => {
    const c = rate(newCardRecord('w', now), Rating.Good, now)
    expect(c.state).toBe(State.Learning)
    expect(c.due - now.getTime()).toBeLessThanOrEqual(10 * 60_000)
    expect(statusOf(c)).toBe('learning')
  })

  it('Easy on a new card graduates straight to review', () => {
    const c = rate(newCardRecord('w', now), Rating.Easy, now)
    expect(c.state).toBe(State.Review)
    expect(c.due - now.getTime()).toBeGreaterThan(86_400_000)
  })

  it('intervals grow with successive Good reviews and preview is ordered', () => {
    let c = rate(newCardRecord('w', now), Rating.Good, now)
    let t = new Date(c.due)
    c = rate(c, Rating.Good, t)
    const first = c.due - t.getTime()
    t = new Date(c.due)
    c = rate(c, Rating.Good, t)
    expect(c.due - t.getTime()).toBeGreaterThan(first)
    const p = previewIntervals(c, new Date(c.due))
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard])
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good])
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy])
  })

  it('forgetting a review card counts a lapse', () => {
    let c = rate(newCardRecord('w', now), Rating.Easy, now)
    c = rate(c, Rating.Again, new Date(c.due))
    expect(c.lapses).toBe(1)
    expect(c.state).toBe(State.Relearning)
  })

  it('statusOf distinguishes new and mastered', () => {
    expect(statusOf(undefined)).toBe('new')
    const c = { ...rate(newCardRecord('w', now), Rating.Easy, now), stability: 40 }
    expect(statusOf(c)).toBe('mastered')
  })

  it('formats intervals compactly', () => {
    expect(formatInterval(30_000)).toBe('1m')
    expect(formatInterval(10 * 60_000)).toBe('10m')
    expect(formatInterval(3 * 3600_000)).toBe('3h')
    expect(formatInterval(4 * 86_400_000)).toBe('4d')
    expect(formatInterval(62 * 86_400_000)).toBe('2mo')
    expect(formatInterval(548 * 86_400_000)).toBe('1.5y')
  })
})
