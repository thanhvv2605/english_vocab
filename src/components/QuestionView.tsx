import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Lightbulb, Volume2, X } from 'lucide-react'
import type { Question } from '../lib/quiz'
import { isAnswerCorrect, isNearMiss, letterHint, splitExample } from '../lib/text'
import { useI18n } from '../i18n'
import { useSettings, useSpeak } from '../state'
import { useKeys } from '../lib/useKeys'
import { Button, cx, Input, Kbd } from './ui'
import { Headword, SpeakButton } from './WordView'

export interface Answer {
  correct: boolean
  given: string
}

/**
 * One question, answered then confirmed. `onNext` fires when the learner moves
 * on, so feedback stays on screen as long as they need.
 */
export function QuestionView({ q, onAnswer, onNext, promptLabel }: { q: Question; onAnswer?: (a: Answer) => void; onNext: (a: Answer) => void; promptLabel?: string }) {
  const { d } = useI18n()
  const settings = useSettings()
  const speak = useSpeak()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [hint, setHint] = useState(false)
  const [almost, setAlmost] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  // Guard: a double click or Enter+click must not advance twice.
  const advanced = useRef(false)
  const next = (a: Answer) => {
    if (advanced.current) return
    advanced.current = true
    onNext(a)
  }
  const w = q.word
  const isMc = q.kind === 'mc-en-vi' || q.kind === 'mc-vi-en'

  useEffect(() => {
    if (q.kind === 'listen' || (q.kind === 'mc-en-vi' && settings.autoplay)) speak(w.word)
    if (!isMc) inputRef.current?.focus()
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (answer) nextRef.current?.focus()
  }, [answer])

  const finish = (a: Answer) => {
    setAnswer(a)
    onAnswer?.(a)
    if (q.kind !== 'mc-en-vi' && q.kind !== 'listen' && settings.autoplay) speak(w.word)
  }

  const choose = (id: string) => {
    if (answer) return
    setPicked(id)
    finish({ correct: id === w.id, given: q.options.find((o) => o.id === id)?.word ?? '' })
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (answer || !typed.trim()) return
    if (isAnswerCorrect(typed, q.accepted)) return finish({ correct: true, given: typed })
    // One free retry for a near-miss typo.
    if (!almost && q.accepted.some((a) => isNearMiss(typed, a))) {
      setAlmost(true)
      inputRef.current?.select()
      return
    }
    finish({ correct: false, given: typed })
  }

  useKeys(
    {
      '1': () => isMc && q.options[0] && choose(q.options[0].id),
      '2': () => isMc && q.options[1] && choose(q.options[1].id),
      '3': () => isMc && q.options[2] && choose(q.options[2].id),
      '4': () => isMc && q.options[3] && choose(q.options[3].id),
      Enter: () => answer && next(answer),
      Space: () => answer && next(answer),
    },
  )

  const blankParts = q.kind === 'blank' ? splitExample(w.example, w.exampleForm) : null

  return (
    <div className="flex flex-col gap-5" data-testid="question" data-kind={q.kind}>
      {/* Prompt */}
      <div>
        <p className="mb-3 text-[15px] text-muted">
          {promptLabel ??
            {
              'mc-en-vi': d.practice.qWhatMeans,
              'mc-vi-en': d.practice.qWhichWord,
              spell: d.practice.qSpell,
              listen: d.practice.qListen,
              blank: d.practice.qBlank,
            }[q.kind]}
        </p>
        {q.kind === 'mc-en-vi' && (
          <div className="flex items-start justify-between gap-3">
            <Headword word={w} size="lg" />
            <SpeakButton text={w.word} className="size-11 shrink-0 bg-accent-soft" size={20} />
          </div>
        )}
        {(q.kind === 'mc-vi-en' || q.kind === 'spell') && (
          <div>
            <p className="font-display text-[26px] leading-snug font-semibold sm:text-3xl" lang="vi">
              {w.meaningVi}
            </p>
            <p className="mt-1.5 text-[15px] text-muted">
              <span className="italic">{d.pos[w.pos]}</span>
              {w.meaningEn && <> — {w.meaningEn}</>}
            </p>
          </div>
        )}
        {q.kind === 'listen' && (
          <button
            type="button"
            onClick={() => speak(w.word)}
            className="flex items-center gap-3 rounded-2xl bg-accent-soft px-5 py-4 text-accent transition-colors hover:brightness-105"
          >
            <Volume2 size={26} />
            <span className="font-medium">{d.practice.playAgain}</span>
          </button>
        )}
        {q.kind === 'blank' && blankParts && (
          <div>
            <p className="text-xl leading-relaxed sm:text-[22px]">
              {blankParts[0]}
              {answer ? (
                <span className={cx('marker font-semibold', !answer.correct && 'text-again')}>{blankParts[1]}</span>
              ) : (
                <span className="mx-0.5 inline-block min-w-24 border-b-2 border-ink/60 align-baseline">&nbsp;</span>
              )}
              {blankParts[2]}
            </p>
            {w.exampleVi && <p className="mt-2 text-[15px] text-muted">{w.exampleVi}</p>}
          </div>
        )}
      </div>

      {/* Answer area */}
      {isMc ? (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const isAnswer = o.id === w.id
            const state = !answer ? 'idle' : isAnswer ? 'right' : o.id === picked ? 'wrong' : 'dim'
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => choose(o.id)}
                  disabled={!!answer}
                  data-correct={isAnswer || undefined}
                  className={cx(
                    'flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[16px] transition-colors',
                    state === 'idle' && 'border-line bg-surface hover:border-accent hover:bg-accent-soft/40',
                    state === 'right' && 'border-good bg-good-soft',
                    state === 'wrong' && 'border-again bg-again-soft',
                    state === 'dim' && 'border-line bg-surface opacity-55',
                  )}
                >
                  <Kbd>{i + 1}</Kbd>
                  <span className="flex-1" lang={q.kind === 'mc-en-vi' ? 'vi' : 'en'}>
                    {q.kind === 'mc-en-vi' ? o.meaningVi : o.word}
                  </span>
                  {state === 'right' && <Check size={18} className="text-good" />}
                  {state === 'wrong' && <X size={18} className="text-again" />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
              }}
              disabled={!!answer}
              placeholder={d.practice.placeholder}
              aria-label={d.practice.yourAnswer}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={cx('h-12 text-lg', answer && (answer.correct ? 'border-good bg-good-soft' : 'border-again bg-again-soft'))}
            />
            {!answer && (
              <Button type="submit" variant="primary" size="lg" disabled={!typed.trim()}>
                {d.common.check}
              </Button>
            )}
          </div>
          {!answer && (
            <div className="flex min-h-8 flex-wrap items-center gap-3 text-[15px]">
              {almost ? (
                <span className="text-hard" role="status">
                  {d.learn.almost} <span className="font-medium">{letterHint(w.word)}</span>
                </span>
              ) : hint ? (
                <span className="font-medium tracking-[0.15em] text-muted" data-testid="hint">
                  {letterHint(q.kind === 'blank' ? w.exampleForm : w.word)}
                </span>
              ) : (
                <button type="button" onClick={() => setHint(true)} className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
                  <Lightbulb size={16} /> {d.practice.hint}
                </button>
              )}
            </div>
          )}
        </form>
      )}

      {/* Feedback */}
      {answer && (
        <div
          role="status"
          className={cx('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', answer.correct ? 'border-good/40 bg-good-soft' : 'border-again/40 bg-again-soft')}
          data-testid="feedback"
          data-correct={answer.correct}
        >
          <div className="min-w-0 flex-1">
            <p className={cx('font-semibold', answer.correct ? 'text-good' : 'text-again')}>{answer.correct ? d.learn.correct : d.learn.wrong}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px]">
              <span className="font-display text-lg font-semibold">{w.word}</span>
              {w.ipa && <span className="text-muted">{w.ipa}</span>}
              <span className="text-muted">·</span>
              <span lang="vi">{w.meaningVi}</span>
            </p>
          </div>
          <Button ref={nextRef} variant="primary" onClick={() => next(answer)} className="sm:w-auto">
            {d.common.continue} <Kbd>Enter</Kbd>
          </Button>
        </div>
      )}
    </div>
  )
}
