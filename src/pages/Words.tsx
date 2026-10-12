import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileUp, Plus, Search, Star } from 'lucide-react'
import { db } from '../db/db'
import { addCustomWord, deleteWord, parseImportLines, resetWord, toggleStar, updateWord, type WordInput } from '../db/actions'
import type { CardRecord, Word, WordStatus } from '../types'
import { LEVELS, POS, TOPICS } from '../types'
import { useI18n } from '../i18n'
import { useRoute, useUi } from '../state'
import { formatInterval, statusOf } from '../lib/srs'
import { fold } from '../lib/text'
import { Button, cx, Field, Input, PageHeader, Panel, Select, Textarea } from '../components/ui'
import { Modal } from '../components/Modal'
import { Headword, SpeakButton, StarButton, WordDetails } from '../components/WordView'

const PAGE = 60
const STATUS_DOT: Record<WordStatus, string> = {
  new: 'bg-line',
  learning: 'bg-hard',
  review: 'bg-accent',
  mastered: 'bg-good',
}

export function WordsPage() {
  const { d, f } = useI18n()
  const { query } = useRoute()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState(query.get('topic') ?? '')
  const [status, setStatus] = useState<WordStatus | ''>('')
  const [starred, setStarredFilter] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Word | 'new' | null>(null)
  const [importing, setImporting] = useState(false)

  const data = useLiveQuery(async () => {
    const [words, cards] = await Promise.all([db.words.orderBy('createdAt').toArray(), db.cards.toArray()])
    return { words, cards: new Map(cards.map((c) => [c.wordId, c])) }
  })

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = fold(q)
    return data.words.filter((w) => {
      if (topic && w.topic !== topic) return false
      if (starred && !w.starred) return false
      if (status && statusOf(data.cards.get(w.id)) !== status) return false
      if (needle && !fold(w.word).includes(needle) && !fold(w.meaningVi).includes(needle)) return false
      return true
    })
  }, [data, q, topic, status, starred])

  if (!data) return <p className="text-muted">{d.common.loading}</p>
  const open = openId ? data.words.find((w) => w.id === openId) : undefined
  const hasFilters = q || topic || status || starred

  return (
    <div>
      <PageHeader
        title={d.words.title}
        sub={f(d.words.count, { n: data.words.length })}
        actions={
          <>
            <Button onClick={() => setImporting(true)}>
              <FileUp size={16} /> {d.words.import}
            </Button>
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> {d.words.add}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-64">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            placeholder={d.words.search}
            aria-label={d.words.search}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={d.word.topic} className="sm:w-48">
            <option value="">{d.words.allTopics}</option>
            {[...TOPICS, 'custom'].map((t) => (
              <option key={t} value={t}>
                {d.topics[t as keyof typeof d.topics]}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as WordStatus | '')} aria-label={d.words.allStatus} className="sm:w-40">
            <option value="">{d.words.allStatus}</option>
            {(['new', 'learning', 'review', 'mastered'] as const).map((s) => (
              <option key={s} value={s}>
                {d.status[s]}
              </option>
            ))}
          </Select>
        </div>
        <Button aria-pressed={starred} onClick={() => setStarredFilter((s) => !s)} className={cx(starred && 'border-hard text-hard')}>
          <Star size={16} fill={starred ? 'currentColor' : 'none'} /> {d.words.starredOnly}
        </Button>
      </div>

      <p className="mb-2 text-sm text-muted" data-testid="result-count">
        {f(d.words.count, { n: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <Panel className="px-6 py-12 text-center">
          <p className="text-muted">{d.words.empty}</p>
          {hasFilters && (
            <Button
              className="mt-4"
              onClick={() => {
                setQ('')
                setTopic('')
                setStatus('')
                setStarredFilter(false)
              }}
            >
              {d.words.clearFilters}
            </Button>
          )}
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.slice(0, limit).map((w) => {
              const st = statusOf(data.cards.get(w.id))
              return (
                <li key={w.id} className="flex items-center gap-2 pr-2 hover:bg-sunken/50">
                  <button type="button" onClick={() => setOpenId(w.id)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left" data-testid="word-row">
                    <span className={cx('size-2 shrink-0 rounded-full', STATUS_DOT[st])} title={d.status[st]} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-[17px] font-semibold">{w.word}</span>
                        <span className="text-sm text-muted">{w.ipa}</span>
                      </span>
                      <span className="block truncate text-[15px] text-muted" lang="vi">
                        {w.meaningVi}
                      </span>
                    </span>
                  </button>
                  <SpeakButton text={w.word} />
                  <StarButton starred={w.starred} onToggle={() => toggleStar(db, w.id)} />
                </li>
              )
            })}
          </ul>
          {filtered.length > limit && (
            <div className="border-t border-line p-3 text-center">
              <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE * 2)}>
                + {Math.min(PAGE * 2, filtered.length - limit)}
              </Button>
            </div>
          )}
        </Panel>
      )}

      {open && (
        <WordDrawer
          word={open}
          card={data.cards.get(open.id)}
          onClose={() => setOpenId(null)}
          onEdit={() => setEditing(open)}
        />
      )}
      {editing && <WordForm initial={editing === 'new' ? null : editing} existing={data.words} onClose={() => setEditing(null)} />}
      {importing && <ImportModal existing={data.words} onClose={() => setImporting(false)} />}
    </div>
  )
}

function WordDrawer({ word, card, onClose, onEdit }: { word: Word; card?: CardRecord; onClose: () => void; onEdit: () => void }) {
  const { d, f } = useI18n()
  const { confirm, toast } = useUi()
  const [notes, setNotes] = useState(word.notes)
  const latest = useRef({ id: word.id, notes: word.notes, saved: word.notes })
  latest.current.notes = notes
  const saveNotes = () => {
    const l = latest.current
    if (l.notes !== l.saved) {
      l.saved = l.notes
      updateWord(db, l.id, { notes: l.notes })
    }
  }
  // Escape / backdrop close the drawer before the textarea blurs, so also save on unmount.
  useEffect(() => saveNotes, []) // eslint-disable-line react-hooks/exhaustive-deps
  const st = statusOf(card)
  const dueIn = card ? card.due - Date.now() : 0

  return (
    <Modal open onClose={onClose} title={word.word} side>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <Headword word={word} size="lg" />
          <div className="flex shrink-0 items-center gap-1">
            <StarButton starred={word.starred} onToggle={() => toggleStar(db, word.id)} />
            <SpeakButton text={word.word} className="size-11 bg-accent-soft" size={20} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            [d.word.topic, d.topics[word.topic as keyof typeof d.topics] ?? word.topic],
            [d.word.status, d.status[st]],
            [d.word.nextReview, card ? (dueIn <= 0 ? d.word.dueNow : f(d.word.inTime, { t: formatInterval(dueIn) })) : '–'],
            [d.word.lapses, card ? String(card.lapses) : '–'],
          ].map(([k, v], i) => (
            <div key={i} className="bg-surface px-3 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <WordDetails word={word} showNotes={false} />

        <Field label={d.word.notes} htmlFor="notes">
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            placeholder={d.word.notesPlaceholder}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          {word.custom && <Button onClick={onEdit}>{d.common.edit}</Button>}
          {card && (
            <Button
              onClick={async () => {
                if (await confirm(f(d.word.resetConfirm, { w: word.word }), { danger: true, ok: d.word.resetProgress })) {
                  await resetWord(db, word.id)
                  toast(d.words.saved)
                }
              }}
            >
              {d.word.resetProgress}
            </Button>
          )}
          {word.custom && (
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirm(f(d.word.deleteConfirm, { w: word.word }), { danger: true, ok: d.common.delete })) {
                  await deleteWord(db, word.id)
                  toast(d.words.deleted)
                  onClose()
                }
              }}
            >
              {d.common.delete}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

function WordForm({ initial, existing, onClose }: { initial: Word | null; existing: Word[]; onClose: () => void }) {
  const { d, f } = useI18n()
  const { toast } = useUi()
  const [v, setV] = useState({
    word: initial?.word ?? '',
    meaningVi: initial?.meaningVi ?? '',
    meaningEn: initial?.meaningEn ?? '',
    ipa: initial?.ipa ?? '',
    pos: initial?.pos ?? 'noun',
    level: initial?.level ?? 'B2',
    topic: initial?.topic ?? 'custom',
    example: initial?.example ?? '',
    exampleVi: initial?.exampleVi ?? '',
    collocations: initial?.collocations.join(', ') ?? '',
    synonyms: initial?.synonyms.join(', ') ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!v.word.trim() || !v.meaningVi.trim()) return setError(d.words.required)
    const dup = existing.find((w) => w.id !== initial?.id && w.word.toLowerCase() === v.word.trim().toLowerCase())
    if (dup) return setError(f(d.words.duplicate, { w: dup.word }))
    const input: WordInput = {
      ...v,
      pos: v.pos as Word['pos'],
      level: v.level as Word['level'],
      topic: v.topic as Word['topic'],
      collocations: list(v.collocations),
      synonyms: list(v.synonyms),
    }
    setSaving(true)
    if (initial) {
      const form = v.example.toLowerCase().includes(v.word.trim().toLowerCase())
        ? v.example.substr(v.example.toLowerCase().indexOf(v.word.trim().toLowerCase()), v.word.trim().length)
        : ''
      await updateWord(db, initial.id, { ...input, word: v.word.trim(), meaningVi: v.meaningVi.trim(), exampleForm: form })
      toast(d.words.saved)
    } else {
      await addCustomWord(db, input)
      toast(f(d.words.added, { w: v.word.trim() }))
    }
    onClose()
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial ? d.words.formTitleEdit : d.words.formTitleAdd}
      footer={
        <>
          <Button onClick={onClose}>{d.common.cancel}</Button>
          <Button variant="primary" type="submit" form="word-form" disabled={saving}>
            {d.common.save}
          </Button>
        </>
      }
    >
      <form id="word-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={`${d.words.fWord} *`} htmlFor="f-word">
          <Input id="f-word" value={v.word} onChange={set('word')} required autoFocus />
        </Field>
        <Field label={`${d.words.fMeaningVi} *`} htmlFor="f-vi">
          <Input id="f-vi" value={v.meaningVi} onChange={set('meaningVi')} required />
        </Field>
        <Field label={d.words.fIpa} htmlFor="f-ipa">
          <Input id="f-ipa" value={v.ipa} onChange={set('ipa')} placeholder="/rɪˈzɪliənt/" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={d.words.fPos} htmlFor="f-pos">
            <Select id="f-pos" value={v.pos} onChange={set('pos')}>
              {POS.map((p) => (
                <option key={p} value={p}>
                  {d.pos[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={d.words.fLevel} htmlFor="f-level">
            <Select id="f-level" value={v.level} onChange={set('level')}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={d.words.fMeaningEn} htmlFor="f-en">
            <Input id="f-en" value={v.meaningEn} onChange={set('meaningEn')} />
          </Field>
        </div>
        <Field label={d.words.fExample} htmlFor="f-ex">
          <Textarea id="f-ex" rows={2} value={v.example} onChange={set('example')} />
        </Field>
        <Field label={d.words.fExampleVi} htmlFor="f-exvi">
          <Textarea id="f-exvi" rows={2} value={v.exampleVi} onChange={set('exampleVi')} />
        </Field>
        <Field label={d.words.fCollocations} htmlFor="f-col">
          <Input id="f-col" value={v.collocations} onChange={set('collocations')} />
        </Field>
        <Field label={d.words.fSynonyms} htmlFor="f-syn">
          <Input id="f-syn" value={v.synonyms} onChange={set('synonyms')} />
        </Field>
        <Field label={d.words.fTopic} htmlFor="f-topic">
          <Select id="f-topic" value={v.topic} onChange={set('topic')}>
            {['custom', ...TOPICS].map((t) => (
              <option key={t} value={t}>
                {d.topics[t as keyof typeof d.topics]}
              </option>
            ))}
          </Select>
        </Field>
        {error && (
          <p className="text-[15px] text-again sm:col-span-2" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

function ImportModal({ existing, onClose }: { existing: Word[]; onClose: () => void }) {
  const { d, f } = useI18n()
  const { toast } = useUi()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const parsed = useMemo(() => parseImportLines(text), [text])
  const have = useMemo(() => new Set(existing.map((w) => w.word.toLowerCase())), [existing])
  const fresh = useMemo(() => {
    const seen = new Set<string>()
    return parsed.filter((p) => {
      const k = p.word.toLowerCase()
      if (have.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [parsed, have])
  const skipped = parsed.length - fresh.length

  const run = async () => {
    if (saving) return
    setSaving(true)
    for (const p of fresh) await addCustomWord(db, p)
    toast(f(d.words.imported, { n: fresh.length }))
    onClose()
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={d.words.importTitle}
      footer={
        <>
          <Button onClick={onClose}>{d.common.cancel}</Button>
          <Button variant="primary" disabled={!fresh.length || saving} onClick={run}>
            {f(d.words.importDo, { n: fresh.length })}
          </Button>
        </>
      }
    >
      <p className="mb-2 text-[15px] text-muted">{d.words.importHelp}</p>
      <pre className="mb-3 overflow-x-auto rounded-lg bg-sunken px-3 py-2 text-sm">{d.words.importExample}</pre>
      <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} aria-label={d.words.importTitle} className="font-mono text-sm" />
      <p className="mt-2 text-sm text-muted" data-testid="import-preview">
        {f(d.words.importPreview, { n: fresh.length })}
        {skipped > 0 && <> · {f(d.words.importSkipped, { n: skipped })}</>}
      </p>
    </Modal>
  )
}
