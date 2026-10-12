import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from './ui'
import { useI18n } from '../i18n'

/** Open modal count, so nested dialogs don't unlock page scrolling early. */
let openCount = 0

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  side,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Slide in from the right instead of centring (detail drawers). */
  side?: boolean
}) {
  const { d } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      // Only the topmost dialog reacts when dialogs are stacked.
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== ref.current) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key === 'Tab' && ref.current) {
        const items = ref.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    // Respect an element React already auto-focused; otherwise focus the first field.
    if (!ref.current?.contains(document.activeElement)) {
      // Drawers only show content; don't pop up the on-screen keyboard.
      const field = side ? null : ref.current?.querySelector<HTMLElement>('input, textarea')
      ;(field ?? ref.current)?.focus()
    }
    openCount++
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (--openCount === 0) document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, side])

  if (!open) return null
  return (
    <div className={cx('fixed inset-0 z-50 flex bg-[#0b0f1d]/45 backdrop-blur-[2px]', side ? 'justify-end' : 'items-end justify-center p-0 sm:items-center sm:p-4')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'flex max-h-[100dvh] w-full flex-col bg-surface shadow-2xl outline-none',
          side ? 'h-full max-w-xl border-l border-line' : cx('max-h-[92dvh] rounded-t-2xl sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md'),
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="truncate font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={d.common.close} className="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
