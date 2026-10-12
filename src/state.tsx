import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, getSettings, updateSettings, type Settings } from './db/db'
import { speak as speakRaw } from './lib/speech'
import { Modal } from './components/Modal'
import { Button } from './components/ui'
import { useI18n } from './i18n'

export const ROUTES = ['today', 'learn', 'review', 'practice', 'words', 'settings'] as const
export type Route = (typeof ROUTES)[number]

function readRoute(): { route: Route; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, qs] = raw.split('?')
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : 'today'
  return { route, query: new URLSearchParams(qs ?? '') }
}

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash)
  return useMemo(() => readRoute(), [hash]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function navigate(route: Route, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  window.location.hash = `#/${route === 'today' ? '' : route}${qs}`
  window.scrollTo({ top: 0 })
}

/** Last known settings; preloaded at startup so no screen ever sees defaults. */
let cachedSettings: Settings = DEFAULT_SETTINGS

export async function preloadSettings() {
  cachedSettings = await getSettings(db)
}

export function useSettings(): Settings {
  const s = useLiveQuery(() => getSettings(db), [], cachedSettings) ?? cachedSettings
  cachedSettings = s
  return s
}

export { updateSettings }

export function useSpeak() {
  const s = useSettings()
  return useCallback((text: string) => speakRaw(text, { accent: s.accent, voiceURI: s.voiceURI, rate: s.rate }), [s.accent, s.voiceURI, s.rate])
}

interface UiCtx {
  toast: (msg: string) => void
  confirm: (msg: string, opts?: { danger?: boolean; ok?: string }) => Promise<boolean>
}

const Ui = createContext<UiCtx>({ toast: () => {}, confirm: async () => false })

export function UiProvider({ children }: { children: ReactNode }) {
  const { d } = useI18n()
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)
  const timer = useRef<number>(0)
  const [ask, setAsk] = useState<{ text: string; danger?: boolean; ok?: string; resolve: (v: boolean) => void } | null>(null)

  const toast = useCallback((text: string) => {
    window.clearTimeout(timer.current)
    setMsg({ text, key: Date.now() })
    timer.current = window.setTimeout(() => setMsg(null), 2800)
  }, [])

  const confirm = useCallback(
    (text: string, opts?: { danger?: boolean; ok?: string }) => new Promise<boolean>((resolve) => setAsk({ text, ...opts, resolve })),
    [],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const answer = (v: boolean) => {
    ask?.resolve(v)
    setAsk(null)
  }

  return (
    <Ui.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6">
        {msg && (
          <div key={msg.key} role="status" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-lg">
            {msg.text}
          </div>
        )}
      </div>
      <Modal
        open={!!ask}
        onClose={() => answer(false)}
        title={d.appName}
        footer={
          <>
            <Button onClick={() => answer(false)}>{d.common.cancel}</Button>
            <Button variant={ask?.danger ? 'danger' : 'primary'} onClick={() => answer(true)} autoFocus>
              {ask?.ok ?? d.common.continue}
            </Button>
          </>
        }
      >
        <p className="text-[15px] leading-relaxed">{ask?.text}</p>
      </Modal>
    </Ui.Provider>
  )
}

export function useUi() {
  return useContext(Ui)
}
