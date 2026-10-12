import { useI18n } from '../i18n'
import { addDays, dayKey } from '../lib/date'

const WEEKS = 20

function level(n: number) {
  if (n === 0) return 0
  if (n < 10) return 1
  if (n < 25) return 2
  if (n < 50) return 3
  return 4
}

const SHADES = ['bg-sunken', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent']

export function Heatmap({ activity }: { activity: Map<string, number> }) {
  const { d, f, lang } = useI18n()
  const today = new Date()
  // Columns are weeks starting Monday; the last column contains today.
  const offset = (today.getDay() + 6) % 7
  const start = addDays(today, -offset - (WEEKS - 1) * 7)
  const cols = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, dd) => {
      const date = addDays(start, w * 7 + dd)
      const key = dayKey(date)
      return { key, date, n: activity.get(key) ?? 0, future: date > today }
    }),
  )
  const locale = lang === 'vi' ? 'vi-VN' : 'en-GB'
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label={d.today.activityHint}>
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <span
                key={c.key}
                title={`${c.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}: ${f(d.today.reviewsCount, { n: c.n })}`}
                className={`size-3 rounded-[3px] sm:size-3.5 ${c.future ? 'opacity-0' : SHADES[level(c.n)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
        <span>{d.today.less}</span>
        {SHADES.map((s) => (
          <span key={s} className={`size-3 rounded-[3px] ${s}`} />
        ))}
        <span>{d.today.more}</span>
      </div>
    </div>
  )
}
