import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Layers, BookOpenText } from 'lucide-react'
import { db, updateSettings } from '../db/db'
import { computeStats, getNewWords, newRemainingToday } from '../db/actions'
import { useI18n } from '../i18n'
import { navigate, useSettings } from '../state'
import { Button, Panel, ProgressBar } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import { formatInterval } from '../lib/srs'
import { addDays } from '../lib/date'

function greeting(d: ReturnType<typeof useI18n>['d'], now: Date) {
  const h = now.getHours()
  return h < 12 ? d.today.greetingMorning : h < 18 ? d.today.greetingAfternoon : d.today.greetingEvening
}

export function TodayPage({ tick }: { tick: number }) {
  const { d, f, lang } = useI18n()
  const settings = useSettings()
  const stats = useLiveQuery(() => computeStats(db), [tick])
  // New words actually available today: daily limit, limited to the chosen topics.
  const newInfo = useLiveQuery(async () => {
    const quota = await newRemainingToday(db, settings)
    const [avail, any] = await Promise.all([getNewWords(db, settings, quota), getNewWords(db, settings, 1)])
    return { remaining: avail.length, allDone: any.length === 0 }
  }, [settings.dailyNew, settings.topics.join(), tick])
  const nextDue = useLiveQuery(() => db.cards.orderBy('due').first(), [tick])
  if (!stats || !newInfo) return <p className="text-muted">{d.common.loading}</p>

  const now = new Date()
  const dateLabel = now.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const learned = stats.total - stats.byStatus.new
  const { remaining, allDone: allNewDone } = newInfo

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-[15px] text-muted first-letter:uppercase">{dateLabel}</p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-semibold tracking-tight sm:text-[36px]">{greeting(d, now)}</h1>
      </header>

      {!settings.onboarded && (
        <Panel className="border-accent/30 bg-accent-soft/50 p-5 sm:p-6" data-testid="onboarding">
          <h2 className="font-display text-lg font-semibold">{d.today.onboardTitle}</h2>
          <ol className="mt-3 flex flex-col gap-2.5 text-[15px] leading-relaxed">
            {[d.today.onboard1, d.today.onboard2, d.today.onboard3].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Button variant="primary" className="mt-4" onClick={() => updateSettings({ onboarded: true })}>
            {d.today.onboardCta}
          </Button>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-muted">
            <Layers size={18} />
            <h2 className="text-[15px] font-medium">{d.today.dueTitle}</h2>
          </div>
          <p className="mt-3 font-display text-5xl font-semibold tracking-tight tabular-nums" data-testid="due-count">
            {stats.dueNow}
          </p>
          <p className="mt-2 flex-1 text-[15px] text-muted">
            {stats.dueNow > 0
              ? d.today.dueBody
              : nextDue
                ? f(d.today.nextDue, { t: f(d.word.inTime, { t: formatInterval(nextDue.due - Date.now()) }) })
                : d.today.noneScheduled}
          </p>
          <Button variant={stats.dueNow > 0 ? 'primary' : 'secondary'} size="lg" className="mt-5 w-full" disabled={stats.dueNow === 0} onClick={() => navigate('review')}>
            {stats.dueNow > 0 ? d.today.startReview : d.today.allCaughtUp}
          </Button>
        </Panel>

        <Panel className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-muted">
            <BookOpenText size={18} />
            <h2 className="text-[15px] font-medium">{d.today.newTitle}</h2>
          </div>
          <p className="mt-3 font-display text-5xl font-semibold tracking-tight tabular-nums" data-testid="new-count">
            {allNewDone ? 0 : remaining}
          </p>
          <div className="mt-2 flex-1">
            {allNewDone ? (
              <p className="text-[15px] text-muted">{d.learn.allLearnedBody}</p>
            ) : remaining > 0 ? (
              <>
                <p className="text-[15px] text-muted">{f(d.today.newBody, { n: remaining, total: settings.dailyNew })}</p>
                <ProgressBar className="mt-3" value={Math.max(0, settings.dailyNew - remaining) / settings.dailyNew} label={d.today.newTitle} />
              </>
            ) : (
              <p className="text-[15px] text-muted">{d.today.newDone}</p>
            )}
          </div>
          {remaining > 0 && !allNewDone ? (
            <Button variant={stats.dueNow > 0 ? 'secondary' : 'primary'} size="lg" className="mt-5 w-full" onClick={() => navigate('learn')}>
              {d.today.startLearning}
            </Button>
          ) : (
            <Button size="lg" className="mt-5 w-full" disabled={allNewDone} onClick={() => navigate('learn', { extra: '5' })}>
              {d.today.learnMore}
            </Button>
          )}
        </Panel>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {[
          { label: d.today.streak, value: stats.streak, icon: <Flame size={16} className={stats.streak > 0 ? 'text-hard' : ''} /> },
          { label: d.today.learned, value: learned },
          { label: d.today.mastered, value: stats.byStatus.mastered },
          { label: d.today.accuracy, value: stats.accuracy === null ? '–' : `${Math.round(stats.accuracy * 100)}%` },
        ].map((s) => (
          <div key={s.label} className="bg-surface px-5 py-4">
            <dt className="flex items-center gap-1.5 text-sm text-muted">
              {s.icon}
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Panel className="min-w-0 p-5 sm:p-6">
          <h2 className="font-semibold">{d.today.activity}</h2>
          <p className="mb-4 text-sm text-muted">{d.today.activityHint}</p>
          <Heatmap activity={stats.activity} />
        </Panel>
        <Panel className="p-5 sm:p-6">
          <h2 className="font-semibold">{d.today.forecast}</h2>
          <p className="mb-4 text-sm text-muted">{d.today.forecastHint}</p>
          <Forecast values={stats.forecast} />
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">{d.today.topicProgress}</h2>
        <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {stats.topics.map((t) => (
            <li key={t.topic}>
              <a href={`#/words?topic=${t.topic}`} className="group block">
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[15px]">
                  <span className="truncate group-hover:text-accent">{d.topics[t.topic as keyof typeof d.topics] ?? t.topic}</span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {t.learned}/{t.total}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: `${(t.learned / t.total) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${(t.mastered / t.total) * 100}%` }} />
                </div>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function Forecast({ values }: { values: number[] }) {
  const { d, lang } = useI18n()
  const max = Math.max(1, ...values)
  return (
    <ul className="flex flex-col gap-2">
      {values.map((v, i) => {
        const label =
          i === 0 ? d.today.todayLabel : i === 1 ? d.today.tomorrow : addDays(new Date(), i).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'short' })
        return (
          <li key={i} className="grid grid-cols-[76px_1fr_32px] items-center gap-2 text-sm">
            <span className="truncate text-muted first-letter:uppercase">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-sunken">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums">{v}</span>
          </li>
        )
      })}
    </ul>
  )
}
