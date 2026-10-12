import { createContext, useContext, type ReactNode } from 'react'
import { en, type Dict } from './en'
import { vi } from './vi'
import type { Lang } from '../db/db'

export const dictionaries: Record<Lang, Dict> = { en, vi }

type Vars = Record<string, string | number>

/** Replace {name} placeholders. */
export function format(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

interface I18n {
  lang: Lang
  d: Dict
  f: typeof format
}

const Ctx = createContext<I18n>({ lang: 'vi', d: vi, f: format })

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={{ lang, d: dictionaries[lang], f: format }}>{children}</Ctx.Provider>
}

export function useI18n() {
  return useContext(Ctx)
}
