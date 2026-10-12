import { Star, Volume2 } from 'lucide-react'
import type { Word } from '../types'
import { useI18n } from '../i18n'
import { useSpeak } from '../state'
import { splitExample } from '../lib/text'
import { cx, Tag } from './ui'

export function SpeakButton({ text, className, size = 18, label }: { text: string; className?: string; size?: number; label?: string }) {
  const speak = useSpeak()
  const { d } = useI18n()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label={label ?? `${d.common.listen}: ${text}`}
      title={d.common.listen}
      className={cx('inline-flex items-center justify-center rounded-full text-accent transition-colors hover:bg-accent-soft', className ?? 'size-9')}
    >
      <Volume2 size={size} />
    </button>
  )
}

export function StarButton({ starred, onToggle }: { starred: boolean; onToggle: () => void }) {
  const { d } = useI18n()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={starred}
      aria-label={starred ? d.common.unstar : d.common.star}
      title={starred ? d.common.unstar : d.common.star}
      className={cx('inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-sunken', starred ? 'text-hard' : 'text-muted')}
    >
      <Star size={18} fill={starred ? 'currentColor' : 'none'} />
    </button>
  )
}

/** Headword with the highlighter mark, IPA and part of speech. */
export function Headword({ word, size = 'lg', sweep }: { word: Word; size?: 'md' | 'lg' | 'xl'; sweep?: boolean }) {
  const { d } = useI18n()
  const cls = { md: 'text-2xl', lg: 'text-[34px] sm:text-4xl', xl: 'text-[40px] sm:text-[52px]' }[size]
  return (
    <div>
      <h2 className={cx('font-display leading-[1.1] font-semibold tracking-tight break-words', cls)}>
        <span className={cx('marker', sweep && 'marker-sweep')}>{word.word}</span>
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
        {word.ipa && <span className="font-sans">{word.ipa}</span>}
        <span className="italic">{d.pos[word.pos] ?? word.pos}</span>
        <Tag>{word.level}</Tag>
      </div>
    </div>
  )
}

export function Example({ word, hideVi }: { word: Word; hideVi?: boolean }) {
  if (!word.example) return null
  const parts = splitExample(word.example, word.exampleForm)
  return (
    <div className="border-l-[3px] border-marker pl-4">
      <p className="text-[16px] leading-relaxed">
        {parts ? (
          <>
            {parts[0]}
            <strong className="font-semibold">{parts[1]}</strong>
            {parts[2]}
          </>
        ) : (
          word.example
        )}
      </p>
      {!hideVi && word.exampleVi && <p className="mt-1 text-[15px] leading-relaxed text-muted">{word.exampleVi}</p>}
    </div>
  )
}

/** Meanings, example, collocations and synonyms — the "back" of a card. */
export function WordDetails({ word, showNotes = true }: { word: Word; showNotes?: boolean }) {
  const { d } = useI18n()
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xl leading-snug font-semibold" lang="vi">
          {word.meaningVi}
        </p>
        {word.meaningEn && <p className="mt-1 text-[15px] leading-relaxed text-muted">{word.meaningEn}</p>}
      </div>
      <Example word={word} />
      {(word.collocations.length > 0 || word.synonyms.length > 0) && (
        <dl className="grid gap-4 sm:grid-cols-2">
          {word.collocations.length > 0 && (
            <div>
              <dt className="mb-1.5 text-sm font-medium text-muted">{d.word.collocations}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {word.collocations.map((c) => (
                  <span key={c} className="rounded-lg bg-sunken px-2 py-1 text-sm">
                    {c}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {word.synonyms.length > 0 && (
            <div>
              <dt className="mb-1.5 text-sm font-medium text-muted">{d.word.synonyms}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {word.synonyms.map((c) => (
                  <span key={c} className="rounded-lg border border-line px-2 py-1 text-sm">
                    {c}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
      {showNotes && word.notes && (
        <div className="rounded-xl bg-sunken px-4 py-3 text-[15px]">
          <span className="mb-0.5 block text-sm font-medium text-muted">{d.word.notes}</span>
          <span className="whitespace-pre-wrap">{word.notes}</span>
        </div>
      )}
    </div>
  )
}
