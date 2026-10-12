import { useEffect, useState } from 'react'
import { db } from './db/db'
import { ensureSeed } from './db/seed'
import { I18nProvider } from './i18n'
import { Layout } from './components/Layout'
import { preloadSettings, UiProvider, useRoute, useSettings } from './state'
import { TodayPage } from './pages/Today'
import { LearnPage } from './pages/Learn'
import { ReviewPage } from './pages/Review'
import { PracticePage } from './pages/Practice'
import { WordsPage } from './pages/Words'
import { SettingsPage } from './pages/Settings'

function useResolvedTheme(theme: string) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0f121b' : '#1B2340')
  }, [resolved])
}

/** Ticks every minute so time-based "due" counts stay fresh. */
function useMinuteTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    const onFocus = () => setTick((t) => t + 1)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  return tick
}

function Shell() {
  const settings = useSettings()
  const { route } = useRoute()
  const tick = useMinuteTick()
  useResolvedTheme(settings.theme)
  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  const page = {
    today: <TodayPage tick={tick} />,
    learn: <LearnPage />,
    review: <ReviewPage />,
    practice: <PracticePage />,
    words: <WordsPage />,
    settings: <SettingsPage />,
  }[route]

  return (
    <I18nProvider lang={settings.lang}>
      <UiProvider>
        <Layout route={route} tick={tick}>
          {/* key: remount the page when navigating so sessions start fresh */}
          <div key={route}>{page}</div>
        </Layout>
      </UiProvider>
    </I18nProvider>
  )
}

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ensureSeed(db)
      .then(preloadSettings)
      .then(() => alive && setReady(true))
      .catch((e: unknown) => alive && setError(String(e)))
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.().catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-[15px]">
        <h1 className="mb-2 font-display text-xl font-semibold">Không thể mở cơ sở dữ liệu / Could not open the database</h1>
        <p className="text-muted">{error}</p>
      </div>
    )
  }
  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">…</div>
  }
  return <Shell />
}
