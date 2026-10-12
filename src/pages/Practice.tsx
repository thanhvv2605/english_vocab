import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy, X } from 'lucide-react'
import { db } from '../db/db'
import { logQuizAnswer, setStarred } from '../db/actions'
import type { Word } from '../types'
import { TOPICS } from '../types'
import { useI18n } from '../i18n'
import { navigate, useUi } from '../state'
import { buildQuiz, QUIZ_KINDS, type Question, type QuizKind } from '../lib/quiz'
import { Button, cx, Field, PageHeader, Panel, ProgressBar, Segmented, Select } from '../components/ui'
import { QuestionView } from '../components/QuestionView'
import { Example } from '../components/WordView'
import { speechSupported } from '../lib/speech'

type Source = 'learned' | 'starred' | 'weak' | 'all' | 'topic'
type Mode = QuizKind | 'mixed'
/** Listening needs speech synthesis; drop it where the browser has none. */
const KINDS: readonly QuizKind[] = QUIZ_KINDS.filter((k) => k !== 'listen' || speechSupported())
const MODES: Mode[] = ['mixed', ...KINDS]

interface Result {
  q: Question
  correct: boolean
  given: string
}

export function PracticePage() {
  const { d, f } = useI18n()
  const { toast } = useUi()
  const [source, setSource] = useState<Source>('learned')
  const [topic, setTopic] = useState<string>('notebook')
  const [mode, setMode] = useState<Mode>('mixed')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [idx, setIdx] = useState(0)
  const [starredDone, setStarredDone] = useState(false)

  const data = useLiveQuery(async () => {
    const [words, cards, quizWrong] = await Promise.all([
      db.words.toArray(),
      db.cards.toArray(),
      db.reviews.where('mode').equals('quiz').filter((r) => r.rating === 1).toArray(),
    ])
    return { words, cards, quizWrong }
  })

  const sourceWords = useMemo((): Word[] => {
    if (!data) return []
    const learned = new Set(data.cards.map((c) => c.wordId))
    switch (source) {
      case 'learned':
        return data.words.filter((w) => learned.has(w.id))
      case 'starred':
        return data.words.filter((w) => w.starred)
      case 'weak': {
        const weak = new Set([
          ...data.cards.filter((c) => c.lapses > 0 || c.difficulty >= 7).map((c) => c.wordId),
          ...data.quizWrong.map((r) => r.wordId),
        ])
        return data.words.filter((w) => weak.has(w.id))
      }
      case 'topic':
        return data.words.filter((w) => w.topic === topic)
      default:
        return data.words
    }
  }, [data, source, topic])

  const start = (words = sourceWords) => {
    if (!data) return
    const kinds: readonly QuizKind[] = mode === 'mixed' ? KINDS : [mode]
    setQuestions(buildQuiz(words, data.words, kinds, count))
    setResults([])
    setIdx(0)
    setStarredDone(false)
  }

  const retrySame = () => {
    if (!questions || !data) return
    const wrong = results.filter((r) => !r.correct).map((r) => r.q.word)
    const kinds: readonly QuizKind[] = mode === 'mixed' ? KINDS : [mode]
    setQuestions(buildQuiz(wrong.length ? wrong : questions.map((q) => q.word), data.words, kinds, count))
    setResults([])
    setIdx(0)
    setStarredDone(false)
  }

  if (!data) return <p className="text-muted">{d.common.loading}</p>

  // Quiz running
  if (questions && idx < questions.length) {
    const q = questions[idx]
    const score = results.filter((r) => r.correct).length
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h1 className="font-display text-xl font-semibold">{d.practice.modes[mode]}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted tabular-nums" data-testid="quiz-progress">
              {idx + 1}/{questions.length} · ✓ {score}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setQuestions(null)} aria-label={d.common.close}>
              <X size={16} />
            </Button>
          </div>
        </div>
        <ProgressBar className="mb-6" value={idx / questions.length} label={d.practice.title} />
        <Panel className="p-6 sm:p-8">
          <QuestionView
            key={idx}
            q={q}
            onAnswer={(a) => {
              logQuizAnswer(db, q.word.id, a.correct)
              setResults((r) => [...r, { q, correct: a.correct, given: a.given }])
            }}
            onNext={() => setIdx((i) => i + 1)}
          />
        </Panel>
      </div>
    )
  }

  // Results
  if (questions) {
    const score = results.filter((r) => r.correct).length
    const wrong = results.filter((r) => !r.correct)
    const pct = Math.round((score / Math.max(1, results.length)) * 100)
    return (
      <div className="mx-auto max-w-2xl">
        <Panel className="flex flex-col items-center p-8 text-center">
          <Trophy size={36} className={pct >= 80 ? 'text-hard' : 'text-muted'} />
          <h1 className="mt-3 font-display text-2xl font-semibold">{d.practice.resultTitle}</h1>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums" data-testid="score">
            {pct}%
          </p>
          <p className="mt-1 text-muted">{f(d.practice.score, { a: score, b: results.length })}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={retrySame}>
              {d.practice.sameAgain}
            </Button>
            <Button onClick={() => setQuestions(null)}>{d.practice.newQuiz}</Button>
            <Button variant="ghost" onClick={() => navigate('today')}>
              {d.common.backHome}
            </Button>
          </div>
        </Panel>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">{d.practice.mistakes}</h2>
            {wrong.length > 0 && (
              <Button
                size="sm"
                disabled={starredDone}
                onClick={async () => {
                  await setStarred(db, wrong.map((r) => r.q.word.id), true)
                  setStarredDone(true)
                  toast(d.practice.starred)
                }}
              >
                {starredDone ? d.practice.starred : d.practice.starMistakes}
              </Button>
            )}
          </div>
          {wrong.length === 0 ? (
            <p className="text-muted">{d.practice.noMistakes}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {wrong.map((r, i) => (
                <li key={i}>
                  <Panel className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-xl font-semibold">{r.q.word.word}</span>
                      <span className="text-muted">{r.q.word.ipa}</span>
                      <span lang="vi">{r.q.word.meaningVi}</span>
                    </div>
                    {r.given && (
                      <p className="mt-1 text-sm text-again">
                        {d.practice.yourAnswer}: <span className="line-through">{r.given}</span>
                      </p>
                    )}
                    <div className="mt-3">
                      <Example word={r.q.word} />
                    </div>
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )
  }

  // Setup
  const enough = sourceWords.length >= 4
  const sources: { value: Source; label: string }[] = [
    { value: 'learned', label: d.practice.srcLearned },
    { value: 'weak', label: d.practice.srcWeak },
    { value: 'starred', label: d.practice.srcStarred },
    { value: 'topic', label: d.practice.srcTopic },
    { value: 'all', label: d.practice.srcAll },
  ]

  return (
    <div>
      <PageHeader title={d.practice.title} sub={d.practice.intro} />
      <Panel className="flex flex-col gap-6 p-5 sm:p-6">
        <Field label={d.practice.source}>
          <div className="flex flex-col gap-3">
            <Segmented label={d.practice.source} value={source} options={sources} onChange={setSource} />
            {source === 'topic' && (
              <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={d.practice.chooseTopic} className="sm:max-w-xs">
                {[...TOPICS, 'custom'].map((t) => (
                  <option key={t} value={t}>
                    {d.topics[t as keyof typeof d.topics]}
                  </option>
                ))}
              </Select>
            )}
            <p className="text-sm text-muted" data-testid="available">
              {f(d.practice.available, { n: sourceWords.length })}
            </p>
          </div>
        </Field>

        <Field label={d.practice.mode}>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cx(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  mode === m ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-muted/50',
                )}
              >
                <span className={cx('block font-medium', mode === m && 'text-accent')}>{d.practice.modes[m]}</span>
                <span className="block text-sm text-muted">{d.practice.modeHints[m]}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label={d.practice.count}>
          <Segmented
            label={d.practice.count}
            value={String(count)}
            options={['10', '20', '30'].map((v) => ({ value: v, label: v }))}
            onChange={(v) => setCount(Number(v))}
          />
        </Field>

        {!enough && <p className="rounded-xl bg-again-soft px-4 py-3 text-[15px] text-again">{d.practice.notEnough}</p>}
        <div>
          <Button variant="primary" size="lg" disabled={!enough} onClick={() => start()}>
            {d.practice.start}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
