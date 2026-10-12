import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Download, RotateCcw, Upload } from 'lucide-react'
import { db, type Settings } from '../db/db'
import { exportBackup, importBackup, resetProgress } from '../db/backup'
import { TOPICS } from '../types'
import { useI18n } from '../i18n'
import { updateSettings, useSettings, useSpeak, useUi } from '../state'
import { listVoices, onVoicesReady, speechSupported } from '../lib/speech'
import { dayKey } from '../lib/date'
import { Button, cx, Kbd, PageHeader, Panel, Segmented, Select, Toggle } from '../components/ui'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </Panel>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 max-w-md text-sm text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { d, f } = useI18n()
  const s = useSettings()
  const { toast, confirm } = useUi()
  const speak = useSpeak()
  const fileRef = useRef<HTMLInputElement>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices())
  useEffect(() => onVoicesReady(() => setVoices(listVoices())), [])

  const set = (patch: Partial<Settings>) => updateSettings(patch)

  const chosen = s.topics
  const toggleTopic = (t: string) => set({ topics: chosen.includes(t) ? chosen.filter((x) => x !== t) : [...chosen, t] })
  const move = (t: string, dir: -1 | 1) => {
    const i = chosen.indexOf(t)
    const j = i + dir
    if (i < 0 || j < 0 || j >= chosen.length) return
    const next = chosen.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ topics: next })
  }

  const doExport = async () => {
    const data = await exportBackup(db)
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ielts-vocab-backup-${dayKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(d.settings.exported)
  }

  const doImport = async (file: File) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      return toast(d.settings.invalidBackup)
    }
    if (!(await confirm(d.settings.importConfirm, { danger: true, ok: d.settings.importBackup }))) return
    try {
      const r = await importBackup(db, parsed)
      toast(f(d.settings.restored, { n: r.cards }))
    } catch {
      toast(d.settings.invalidBackup)
    }
  }

  const voicesForAccent = voices.filter((v) => v.lang.replace('_', '-') === s.accent)

  return (
    <div>
      <PageHeader title={d.settings.title} />
      <div className="flex flex-col gap-4">
        <Section title={d.settings.display}>
          <Row label={d.settings.language}>
            <Segmented
              label={d.settings.language}
              value={s.lang}
              options={[
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' },
              ]}
              onChange={(lang) => set({ lang })}
            />
          </Row>
          <Row label={d.settings.theme}>
            <Segmented
              label={d.settings.theme}
              value={s.theme}
              options={[
                { value: 'system', label: d.settings.themeSystem },
                { value: 'light', label: d.settings.themeLight },
                { value: 'dark', label: d.settings.themeDark },
              ]}
              onChange={(theme) => set({ theme })}
            />
          </Row>
        </Section>

        <Section title={d.settings.study}>
          <Row label={d.settings.dailyNew} hint={d.settings.dailyNewHint}>
            <Segmented
              label={d.settings.dailyNew}
              value={String(s.dailyNew)}
              options={['5', '10', '15', '20', '30'].map((v) => ({ value: v, label: v }))}
              onChange={(v) => set({ dailyNew: Number(v) })}
            />
          </Row>
          <Row label={d.settings.retention} hint={d.settings.retentionHint}>
            <Segmented
              label={d.settings.retention}
              value={String(s.retention)}
              options={['0.85', '0.9', '0.95'].map((v) => ({ value: v, label: `${Math.round(Number(v) * 100)}%` }))}
              onChange={(v) => set({ retention: Number(v) })}
            />
          </Row>
          <Row label={d.settings.direction}>
            <Segmented
              label={d.settings.direction}
              value={s.direction}
              options={[
                { value: 'en-vi', label: d.settings.dirEnVi },
                { value: 'vi-en', label: d.settings.dirViEn },
                { value: 'mixed', label: d.settings.dirMixed },
              ]}
              onChange={(direction) => set({ direction })}
            />
          </Row>
          <div>
            <p className="text-[15px] font-medium">{d.settings.topics}</p>
            <p className="mt-0.5 text-sm text-muted">{d.settings.topicsHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set({ topics: [] })}
                aria-pressed={chosen.length === 0}
                className={cx('rounded-full border px-3 py-1.5 text-sm', chosen.length === 0 ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-muted/50')}
              >
                {d.settings.selectAll}
              </button>
              {[...TOPICS, 'custom'].map((t) => {
                const i = chosen.indexOf(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    aria-pressed={i >= 0}
                    className={cx('rounded-full border px-3 py-1.5 text-sm', i >= 0 ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-muted/50')}
                  >
                    {i >= 0 && <span className="mr-1.5 font-semibold tabular-nums">{i + 1}</span>}
                    {d.topics[t as keyof typeof d.topics]}
                  </button>
                )
              })}
            </div>
            {chosen.length > 1 && (
              <ol className="mt-3 flex flex-col gap-1">
                {chosen.map((t, i) => (
                  <li key={t} className="flex items-center gap-2 rounded-lg bg-sunken px-3 py-1.5 text-sm">
                    <span className="w-5 text-muted tabular-nums">{i + 1}</span>
                    <span className="flex-1">{d.topics[t as keyof typeof d.topics] ?? t}</span>
                    <button type="button" aria-label={d.common.moveUp} disabled={i === 0} onClick={() => move(t, -1)} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30">
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" aria-label={d.common.moveDown} disabled={i === chosen.length - 1} onClick={() => move(t, 1)} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30">
                      <ArrowDown size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Section>

        <Section title={d.settings.audio}>
          {!speechSupported() && <p className="text-[15px] text-again">{d.settings.noSpeech}</p>}
          <Toggle label={d.settings.autoplay} checked={s.autoplay} onChange={(autoplay) => set({ autoplay })} />
          <Row label={d.settings.accent}>
            <Segmented
              label={d.settings.accent}
              value={s.accent}
              options={[
                { value: 'en-GB', label: d.settings.british },
                { value: 'en-US', label: d.settings.american },
              ]}
              onChange={(accent) => set({ accent, voiceURI: '' })}
            />
          </Row>
          <Row label={d.settings.voice}>
            <Select value={s.voiceURI} onChange={(e) => set({ voiceURI: e.target.value })} aria-label={d.settings.voice} className="w-full sm:w-64">
              <option value="">{d.settings.voiceAuto}</option>
              {voicesForAccent.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Row>
          <Row label={d.settings.speed}>
            <Segmented
              label={d.settings.speed}
              value={String(s.rate)}
              options={['0.7', '0.9', '1'].map((v) => ({ value: v, label: `${v}×` }))}
              onChange={(v) => set({ rate: Number(v) })}
            />
          </Row>
          <div>
            <Button onClick={() => speak('sustainable development')}>{d.settings.test}</Button>
          </div>
        </Section>

        <Section title={d.settings.data} hint={d.settings.dataHint}>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={doExport}>
              <Download size={16} /> {d.settings.export}
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> {d.settings.importBackup}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="backup-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) doImport(file)
              }}
            />
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirm(d.settings.resetConfirm, { danger: true, ok: d.settings.reset })) {
                  await resetProgress(db)
                  toast(d.settings.resetDone)
                }
              }}
            >
              <RotateCcw size={16} /> {d.settings.reset}
            </Button>
          </div>
        </Section>

        <Section title={d.settings.shortcuts}>
          <dl className="grid gap-2.5 text-[15px] sm:grid-cols-2">
            {[
              [['Space'], d.settings.scSpace],
              [['1', '2', '3', '4'], d.settings.scRate],
              [['1', '2', '3', '4'], d.settings.scChoice],
              [['P'], d.settings.scSpeak],
              [['Z'], d.review.undo],
              [['K'], d.learn.know],
            ].map(([keys, label], i) => (
              <div key={i} className="flex items-center gap-3">
                <dt className="flex w-24 shrink-0 gap-1">
                  {(keys as string[]).map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dt>
                <dd className="text-muted">{label as string}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">{d.settings.about}</p>
        </Section>
      </div>
    </div>
  )
}
