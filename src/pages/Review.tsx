import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleCheckBig, Coffee, Undo2 } from 'lucide-react'
import { db } from '../db/db'
import { getDueCards, toggleStar } from '../db/actions'
import type { CardRecord, Word } from '../types'
import { useI18n } from '../i18n'
import { navigate, useSettings, useSpeak } from '../state'
import { formatInterval, previewIntervals, rate, Rating, type Grade } from '../lib/srs'
import { dayKey } from '../lib/date'
import { useKeys } from '../lib/useKeys'
import { Button, cx, Empty, Kbd, Panel, ProgressBar } from '../components/ui'
import { Headword, SpeakButton, StarButton, WordDetails } from '../components/WordView'

/** Cards due within this window are shown again in the same session (learning steps). */
const LEARN_AHEAD_MS = 20 * 60_000

interface Item {
  card: CardRecord
  word: Word
  reverse: boolean
}

interface UndoState {
  item: Item
  queue: Item[]
  reviewId: number
  wasCorrect: boolean
}

const GRADES: { grade: Grade; key: string; label: 'again' | 'hard' | 'good' | 'easy'; cls: string }[] = [
  { grade: Rating.Again, key: '1', label: 'again', cls: 'text-again border-again/40 hover:bg-again-soft' },
  { grade: Rating.Hard, key: '2', label: 'hard', cls: 'text-hard border-hard/40 hover:bg-hard/10' },
  { grade: Rating.Good, key: '3', label: 'good', cls: 'text-good border-good/40 hover:bg-good-soft' },
  { grade: Rating.Easy, key: '4', label: 'easy', cls: 'text-easy border-easy/40 hover:bg-easy/10' },
]

export function ReviewPage() {
  const { d, f } = useI18n()
  const settings = useSettings()
  const speak = useSpeak()
  const [queue, setQueue] = useState<Item[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState({ count: 0, correct: 0 })
  const [undo, setUndo] = useState<UndoState | null>(null)
  const [busy, setBusy] = useState(false)
  const [ahead, setAhead] = useState(false)
  const total = useRef(0)
  const keepRevealed = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = { ...settings, ...(await db.settings.get('app')) }
      const cards = await getDueCards(db)
      const words = await db.words.bulkGet(cards.map((c) => c.wordId))
      const items: Item[] = []
      cards.forEach((card, i) => {
        const word = words[i]
        if (word) items.push({ card, word, reverse: s.direction === 'vi-en' || (s.direction === 'mixed' && Math.random() < 0.5) })
      })
      total.current = items.length
      if (alive) setQueue(items)
    })()
    return () => {
      alive = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue?.[0]
  const [, forceRender] = useState(0)
  // Only short-term cards left and none due yet → "come back shortly" screen.
  const waiting = !!current && !ahead && current.card.due > Date.now()

  useEffect(() => {
    if (!waiting || !current) return
    const id = window.setTimeout(() => forceRender((n) => n + 1), Math.max(500, current.card.due - Date.now() + 200))
    return () => window.clearTimeout(id)
  }, [waiting, current])

  useEffect(() => {
    // After an undo the restored card stays face up so it can be re-rated.
    if (keepRevealed.current) {
      keepRevealed.current = false
      return
    }
    setRevealed(false)
    if (current && !current.reverse && settings.autoplay) speak(current.word.word)
  }, [current?.card.wordId, current?.card.reps, current?.card.due]) // eslint-disable-line react-hooks/exhaustive-deps

  const intervals = useMemo(
    () => (current ? previewIntervals(current.card, new Date(), settings.retention) : null),
    [current, settings.retention],
  )

  const reveal = () => {
    if (!current || revealed || waiting) return
    setRevealed(true)
    if (current.reverse && settings.autoplay) speak(current.word.word)
  }

  const answer = async (grade: Grade) => {
    if (!current || !revealed || !queue || busy || waiting) return
    setBusy(true)
    try {
      const now = new Date()
      const next = rate(current.card, grade, now, settings.retention)
      let reviewId = 0
      await db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.put(next)
        reviewId = (await db.reviews.add({ wordId: current.card.wordId, rating: grade, mode: 'review', at: now.getTime(), day: dayKey(now) })) as number
      })
      const rest = queue.slice(1)
      // Short-term steps come back later in this session, ordered by due time.
      if (next.due - now.getTime() <= LEARN_AHEAD_MS) {
        rest.push({ ...current, card: next })
        rest.sort((a, b) => a.card.due - b.card.due)
      }
      const correct = grade !== Rating.Again
      setUndo({ item: current, queue, reviewId, wasCorrect: correct })
      setDone((s) => ({ count: s.count + 1, correct: s.correct + (correct ? 1 : 0) }))
      setRevealed(false)
      setQueue(rest)
    } finally {
      setBusy(false)
    }
  }

  const doUndo = async () => {
    if (!undo || busy) return
    setBusy(true)
    try {
      await db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.put(undo.item.card)
        await db.reviews.delete(undo.reviewId)
      })
      setDone((s) => ({ count: s.count - 1, correct: s.correct - (undo.wasCorrect ? 1 : 0) }))
      keepRevealed.current = true
      setQueue(undo.queue)
      setUndo(null)
      setRevealed(true)
    } finally {
      setBusy(false)
    }
  }

  useKeys({
    Space: () => (revealed ? answer(Rating.Good) : reveal()),
    Enter: () => (revealed ? answer(Rating.Good) : reveal()),
    '1': () => answer(Rating.Again),
    '2': () => answer(Rating.Hard),
    '3': () => answer(Rating.Good),
    '4': () => answer(Rating.Easy),
    z: () => doUndo(),
    p: () => current && speak(current.word.word),
  })

  if (!queue) return <p className="text-muted">{d.common.loading}</p>

  if (!current) {
    if (done.count === 0) {
      return (
        <Empty icon={<Coffee size={36} />} title={d.review.emptyTitle} body={d.review.emptyBody}>
          <Button variant="primary" onClick={() => navigate('learn')}>
            {d.today.startLearning}
          </Button>
          <Button onClick={() => navigate('practice')}>{d.nav.practice}</Button>
        </Empty>
      )
    }
    return (
      <Empty
        icon={<CircleCheckBig size={36} className="text-good" />}
        title={d.review.doneTitle}
        body={f(d.review.doneBody, { n: done.count, p: Math.round((done.correct / done.count) * 100) })}
      >
        <Button variant="primary" onClick={() => navigate('today')}>
          {d.common.backHome}
        </Button>
        <Button onClick={() => navigate('practice')}>{d.nav.practice}</Button>
        {undo && (
          <Button variant="ghost" onClick={doUndo}>
            <Undo2 size={16} /> {d.review.undo}
          </Button>
        )}
      </Empty>
    )
  }

  const w = current.word
  const remaining = new Set(queue.map((i) => i.card.wordId)).size

  if (waiting) {
    return (
      <Empty icon={<Coffee size={36} />} title={d.review.doneTitle} body={f(d.review.laterBody, { n: remaining })}>
        <Button variant="primary" onClick={() => setAhead(true)}>
          {d.review.waitMore}
        </Button>
        <Button variant="ghost" onClick={() => navigate('today')}>
          {d.common.backHome}
        </Button>
      </Empty>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold">{d.review.title}</h1>
        <div className="flex items-center gap-2">
          {undo && (
            <Button variant="ghost" size="sm" onClick={doUndo} title={`${d.review.undo} (Z)`}>
              <Undo2 size={15} /> {d.review.undo}
            </Button>
          )}
          <span className="text-sm text-muted tabular-nums" data-testid="remaining">
            {f(d.review.remaining, { n: remaining })}
          </span>
        </div>
      </div>
      <ProgressBar className="mb-6" value={total.current ? 1 - remaining / Math.max(total.current, remaining) : 0} label={d.review.title} />

      <Panel className="p-6 sm:p-8" data-testid="review-card">
        <div className="flex items-start justify-between gap-3">
          {current.reverse && !revealed ? (
            <div>
              <p className="mb-2 text-[15px] text-muted">{d.review.frontReverse}</p>
              <p className="font-display text-[28px] leading-snug font-semibold sm:text-[32px]" lang="vi">
                {w.meaningVi}
              </p>
              <p className="mt-2 text-[15px] text-muted italic">{d.pos[w.pos]}</p>
            </div>
          ) : (
            <div>
              {!revealed && <p className="mb-2 text-[15px] text-muted">{d.review.front}</p>}
              <Headword word={w} size="xl" sweep={revealed} key={`${w.id}-${revealed}`} />
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {revealed && <StarButton starred={w.starred} onToggle={async () => {
              await toggleStar(db, w.id)
              setQueue((q) => q && q.map((i) => (i.word.id === w.id ? { ...i, word: { ...i.word, starred: !i.word.starred } } : i)))
            }} />}
            {(!current.reverse || revealed) && <SpeakButton text={w.word} className="size-11 bg-accent-soft" size={20} />}
          </div>
        </div>

        {revealed ? (
          <div className="mt-7 border-t border-line pt-6">
            <WordDetails word={w} />
          </div>
        ) : (
          <p className="mt-10 text-[15px] text-muted">{d.review.tapToReveal}</p>
        )}
      </Panel>

      <div className="sticky bottom-16 z-20 -mx-4 mt-3 border-t border-line bg-paper/95 px-4 pt-3 pb-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-3 md:bottom-4">
        {revealed && intervals ? (
          <div>
            <p className="mb-2 text-center text-sm text-muted">{d.review.howWell}</p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label={d.review.howWell}>
              {GRADES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  disabled={busy}
                  onClick={() => answer(g.grade)}
                  className={cx('flex flex-col items-center gap-0.5 rounded-xl border bg-surface px-1 py-2.5 transition-colors', g.cls)}
                >
                  <span className="text-[15px] font-semibold">{d.review[g.label]}</span>
                  <span className="text-xs text-muted tabular-nums">{formatInterval(intervals[g.grade])}</span>
                  <span className="hidden sm:block">
                    <Kbd>{g.key}</Kbd>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Button variant="primary" size="lg" className="w-full" onClick={reveal}>
            {d.common.showAnswer} <span className="hidden sm:inline-flex"><Kbd>Space</Kbd></span>
          </Button>
        )}
      </div>
    </div>
  )
}
