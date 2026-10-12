import { useEffect, useMemo, useRef, useState } from 'react'
import { BookCheck, PartyPopper } from 'lucide-react'
import { db } from '../db/db'
import { getNewWords, learnWord, markKnown, newRemainingToday, toggleStar } from '../db/actions'
import type { Word } from '../types'
import { useI18n } from '../i18n'
import { navigate, useRoute, useSettings, useSpeak } from '../state'
import { makeQuestion, type Question } from '../lib/quiz'
import { Rating } from '../lib/srs'
import { useKeys } from '../lib/useKeys'
import { Button, Empty, Kbd, PageHeader, Panel, ProgressBar } from '../components/ui'
import { Headword, SpeakButton, StarButton, WordDetails } from '../components/WordView'
import { QuestionView } from '../components/QuestionView'

const BATCH = 5

type Phase = { name: 'loading' } | { name: 'empty'; allDone: boolean } | { name: 'intro'; index: number } | { name: 'check' } | { name: 'done' }

interface CheckItem {
  q: Question
  key: number
}

export function LearnPage() {
  const { d, f } = useI18n()
  const settings = useSettings()
  const { query } = useRoute()
  const speak = useSpeak()
  const [batch, setBatch] = useState<Word[]>([])
  const [phase, setPhase] = useState<Phase>({ name: 'loading' })
  const [queue, setQueue] = useState<CheckItem[]>([])
  const [known, setKnown] = useState<string[]>([])
  const [round, setRound] = useState(0)
  const errors = useRef(new Map<string, number>())
  const passed = useRef(new Map<string, number>())
  const pool = useRef<Word[]>([])
  const keySeq = useRef(0)
  const extra = query.get('extra') === '5'

  // Load a batch (on mount and for each "learn next batch").
  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = await db.settings.get('app')
      const cfg = { ...settings, ...s }
      const remaining = extra ? BATCH : await newRemainingToday(db, cfg)
      const words = await getNewWords(db, cfg, Math.min(BATCH, remaining))
      pool.current = await db.words.toArray()
      if (!alive) return
      errors.current.clear()
      passed.current.clear()
      setKnown([])
      setBatch(words)
      if (words.length) setPhase({ name: 'intro', index: 0 })
      else {
        const anyNew = (await getNewWords(db, cfg, 1)).length > 0
        if (alive) setPhase({ name: 'empty', allDone: !anyNew })
      }
    })()
    return () => {
      alive = false
    }
  }, [round, extra]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = phase.name === 'intro' ? batch[phase.index] : undefined

  useEffect(() => {
    if (current && settings.autoplay) speak(current.word)
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toCheck = useMemo(() => batch.filter((w) => !known.includes(w.id)), [batch, known])

  const startCheck = (words: Word[]) => {
    if (!words.length) return setPhase({ name: 'done' })
    // Two checks per word: recognise the meaning, then produce the spelling.
    const first = words.map((w) => ({ q: makeQuestion('mc-en-vi', w, pool.current), key: keySeq.current++ }))
    setQueue(first)
    setPhase({ name: 'check' })
  }

  const nextIntro = () => {
    if (phase.name !== 'intro') return
    if (phase.index + 1 < batch.length) setPhase({ name: 'intro', index: phase.index + 1 })
    else startCheck(toCheck)
  }

  const skipping = useRef(false)
  const skipKnown = async () => {
    if (!current || skipping.current) return
    skipping.current = true
    try {
      await doSkipKnown(current)
    } finally {
      skipping.current = false
    }
  }

  const doSkipKnown = async (current: Word) => {
    await markKnown(db, current.id)
    const nextKnown = [...known, current.id]
    setKnown(nextKnown)
    if (phase.name === 'intro' && phase.index + 1 < batch.length) setPhase({ name: 'intro', index: phase.index + 1 })
    else startCheck(batch.filter((w) => !nextKnown.includes(w.id)))
  }

  const busy = useRef(false)
  const onCheckNext = async (correct: boolean) => {
    if (busy.current || !queue.length) return
    busy.current = true
    try {
      await advanceCheck(correct)
    } finally {
      busy.current = false
    }
  }

  const advanceCheck = async (correct: boolean) => {
    const [head, ...rest] = queue
    const w = head.q.word
    let next = rest
    if (!correct) {
      errors.current.set(w.id, (errors.current.get(w.id) ?? 0) + 1)
      // Ask the same thing again later in this session.
      next = [...rest, { q: makeQuestion(head.q.kind, w, pool.current), key: keySeq.current++ }]
    } else {
      const stage = (passed.current.get(w.id) ?? 0) + 1
      passed.current.set(w.id, stage)
      if (stage === 1) {
        next = [...rest, { q: makeQuestion('spell', w, pool.current), key: keySeq.current++ }]
      } else {
        const errs = errors.current.get(w.id) ?? 0
        const grade = errs === 0 ? Rating.Good : errs === 1 ? Rating.Hard : Rating.Again
        await learnWord(db, w.id, grade)
      }
    }
    setQueue(next)
    if (!next.length) setPhase({ name: 'done' })
  }

  useKeys({
    Space: () => phase.name === 'intro' && nextIntro(),
    Enter: () => phase.name === 'intro' && nextIntro(),
    k: () => phase.name === 'intro' && skipKnown(),
    p: () => current && speak(current.word),
  })

  if (phase.name === 'loading') return <p className="text-muted">{d.common.loading}</p>

  if (phase.name === 'empty') {
    return (
      <>
        <PageHeader title={d.learn.title} />
        <Empty icon={<BookCheck size={36} />} title={d.learn.noneTitle} body={phase.allDone ? d.learn.allLearnedBody : d.learn.noneBody}>
          <Button variant="primary" onClick={() => navigate('review')}>
            {d.nav.review}
          </Button>
          {!phase.allDone && <Button onClick={() => (extra ? setRound((r) => r + 1) : navigate('learn', { extra: '5' }))}>{d.today.learnMore}</Button>}
          <Button variant="ghost" onClick={() => navigate('today')}>
            {d.common.backHome}
          </Button>
        </Empty>
      </>
    )
  }

  if (phase.name === 'done') {
    const n = batch.length - known.length
    return (
      <>
        <PageHeader title={d.learn.title} />
        <Empty icon={<PartyPopper size={36} />} title={d.learn.doneTitle} body={n > 0 ? f(d.learn.doneBody, { n }) : undefined}>
          <Button variant="primary" onClick={() => navigate('review')}>
            {d.learn.reviewNow}
          </Button>
          <Button onClick={() => setRound((r) => r + 1)}>{d.learn.learnNext}</Button>
          <Button variant="ghost" onClick={() => navigate('today')}>
            {d.common.backHome}
          </Button>
        </Empty>
      </>
    )
  }

  const total = batch.length
  const done = phase.name === 'intro' ? phase.index : total
  const checkTotal = toCheck.length * 2
  const checkDone = [...passed.current.values()].reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold">{phase.name === 'intro' ? d.learn.title : d.learn.checkTitle}</h1>
        <span className="text-sm text-muted tabular-nums">
          {phase.name === 'intro' ? f(d.learn.progress, { a: done + 1, b: total }) : `${checkDone}/${checkTotal}`}
        </span>
      </div>
      <ProgressBar
        className="mb-6"
        value={phase.name === 'intro' ? done / total : 0.5 + (checkTotal ? checkDone / checkTotal / 2 : 0)}
        label={d.learn.title}
      />

      {phase.name === 'intro' && current && (
        <Panel className="p-6 sm:p-8" data-testid="intro-card">
          <div className="mb-6 flex items-start justify-between gap-3">
            <Headword word={current} size="xl" sweep key={current.id} />
            <div className="flex shrink-0 items-center gap-1">
              <StarButton starred={current.starred} onToggle={async () => {
                await toggleStar(db, current.id)
                setBatch((b) => b.map((w) => (w.id === current.id ? { ...w, starred: !w.starred } : w)))
              }} />
              <SpeakButton text={current.word} className="size-11 bg-accent-soft" size={20} />
            </div>
          </div>
          <WordDetails word={current} />
          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={skipKnown} title={d.learn.knowHint}>
              {d.learn.know} <Kbd>K</Kbd>
            </Button>
            <Button variant="primary" size="lg" onClick={nextIntro}>
              {phase.index + 1 < total ? d.learn.gotIt : d.learn.checkTitle} <Kbd>Space</Kbd>
            </Button>
          </div>
        </Panel>
      )}

      {phase.name === 'check' && queue[0] && (
        <Panel className="p-6 sm:p-8">
          <QuestionView
            key={queue[0].key}
            q={queue[0].q}
            promptLabel={queue[0].q.kind === 'spell' ? d.learn.typeWord : d.learn.pickMeaning}
            onNext={(a) => onCheckNext(a.correct)}
          />
        </Panel>
      )}
    </div>
  )
}
