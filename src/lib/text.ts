/** Lowercase, strip Vietnamese/Latin diacritics, collapse spaces — for search. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalise a typed English answer: case, curly quotes, hyphens, extra spaces. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[-‐‑–—]/g, ' ')
    .replace(/[.,!?;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isAnswerCorrect(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input)
  if (!n) return false
  return accepted.some((a) => normalizeAnswer(a) === n)
}

/** Levenshtein distance — used to tell "almost right" (a typo) apart from wrong. */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[n]
}

export function isNearMiss(input: string, target: string): boolean {
  const a = normalizeAnswer(input)
  const b = normalizeAnswer(target)
  if (!a || a === b) return false
  return editDistance(a, b) <= (b.length > 6 ? 2 : 1)
}

/** Split an example around the target form so the UI can blank or highlight it. */
export function splitExample(example: string, form: string): [string, string, string] | null {
  const i = example.indexOf(form)
  if (i < 0) return null
  return [example.slice(0, i), form, example.slice(i + form.length)]
}

/** "e______t" style hint keeping the first letter and spaces. */
export function letterHint(word: string): string {
  return word
    .split(' ')
    .map((part) => (part.length <= 1 ? part : part[0] + '_'.repeat(part.length - 1)))
    .join(' ')
}

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function slug(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
