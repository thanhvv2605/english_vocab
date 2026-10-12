import { useEffect, useRef } from 'react'

/**
 * How the focused element got focus. Browsers disagree on `:focus-visible`
 * for clicked buttons, so track the last input type ourselves.
 */
let focusedByKeyboard = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => (focusedByKeyboard = false), true)
  window.addEventListener('keydown', (e) => e.key === 'Tab' && (focusedByKeyboard = true), true)
}

/**
 * Global keyboard shortcuts. Ignored while typing in a field (except keys
 * listed in `allowInInputs`) and while a dialog is open.
 */
export function useKeys(map: Record<string, (e: KeyboardEvent) => void>, allowInInputs: string[] = []) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (document.querySelector('[role="dialog"]')) return
      const t = e.target as HTMLElement
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable
      const key = e.key === ' ' ? 'Space' : e.key
      if (typing && !allowInInputs.includes(key)) return
      const fn = ref.current[key] ?? ref.current[key.toLowerCase()]
      if (fn) {
        // A button the learner tabbed to keeps Space/Enter. A button that is
        // focused only because it was clicked (e.g. star, "I know this")
        // must not swallow the shortcut and be clicked again.
        if ((key === 'Space' || key === 'Enter') && t.tagName === 'BUTTON' && focusedByKeyboard) return
        e.preventDefault()
        fn(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [allowInInputs.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
}
