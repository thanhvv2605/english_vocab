import type { ReactNode } from 'react'
import { BookOpenText, Dumbbell, Home, Layers, Library, Settings as Cog } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useI18n } from '../i18n'
import { navigate, type Route } from '../state'
import { cx } from './ui'

const ITEMS: { route: Route; icon: typeof Home }[] = [
  { route: 'today', icon: Home },
  { route: 'learn', icon: BookOpenText },
  { route: 'review', icon: Layers },
  { route: 'practice', icon: Dumbbell },
  { route: 'words', icon: Library },
]

function useDueCount(tick: number) {
  // Re-runs when cards change, and on every minute tick as cards become due.
  return useLiveQuery(() => db.cards.where('due').belowOrEqual(Date.now()).count(), [tick], 0) ?? 0
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="size-8" />
      <span className="font-display text-[19px] font-semibold tracking-tight">IELTS Vocab</span>
    </span>
  )
}

export function Layout({ route, children, tick }: { route: Route; children: ReactNode; tick: number }) {
  const { d } = useI18n()
  const due = useDueCount(tick)
  const link = (r: Route) => `#/${r === 'today' ? '' : r}`

  return (
    <div className="min-h-dvh md:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <a href="#/" className="mb-7 px-3">
          <Logo />
        </a>
        <nav className="flex flex-col gap-0.5" aria-label={d.nav.main}>
          {[...ITEMS, { route: 'settings' as Route, icon: Cog }].map(({ route: r, icon: Icon }) => (
            <a
              key={r}
              href={link(r)}
              aria-current={route === r ? 'page' : undefined}
              className={cx(
                'flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                route === r ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-sunken hover:text-ink',
              )}
            >
              <Icon size={19} strokeWidth={2} />
              <span className="flex-1">{d.nav[r]}</span>
              {r === 'review' && due > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink" data-testid="due-badge">
                  {due}
                </span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
        <a href="#/">
          <Logo />
        </a>
        <button
          type="button"
          onClick={() => navigate('settings')}
          aria-label={d.nav.settings}
          className={cx('rounded-lg p-2', route === 'settings' ? 'text-accent' : 'text-muted')}
        >
          <Cog size={20} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-16">{children}</main>

      {/* Mobile tab bar */}
      <nav
        aria-label={d.nav.main}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {ITEMS.map(({ route: r, icon: Icon }) => (
          <a
            key={r}
            href={link(r)}
            aria-current={route === r ? 'page' : undefined}
            className={cx('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', route === r ? 'text-accent' : 'text-muted')}
          >
            <Icon size={21} />
            <span className="max-w-full truncate px-1">{d.nav[r]}</span>
            {r === 'review' && due > 0 && (
              <span className="absolute top-2 left-1/2 ml-2 rounded-full bg-accent px-1.5 text-[10px] leading-4 font-semibold text-accent-ink">{due}</span>
            )}
          </a>
        ))}
      </nav>
    </div>
  )
}
