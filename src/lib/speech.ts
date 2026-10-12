let cachedVoices: SpeechSynthesisVoice[] = []

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  const v = window.speechSynthesis.getVoices()
  if (v.length) cachedVoices = v
  return cachedVoices.filter((x) => x.lang.toLowerCase().startsWith('en'))
}

/** Voices load asynchronously in Chrome; resolve once they're available. */
export function onVoicesReady(cb: () => void): () => void {
  if (!speechSupported()) return () => {}
  const handler = () => cb()
  window.speechSynthesis.addEventListener?.('voiceschanged', handler)
  if (window.speechSynthesis.getVoices().length) cb()
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', handler)
}

export interface SpeakOptions {
  accent: string
  voiceURI?: string
  rate?: number
}

function pickVoice(opts: SpeakOptions): SpeechSynthesisVoice | undefined {
  const voices = listVoices()
  if (opts.voiceURI) {
    const exact = voices.find((v) => v.voiceURI === opts.voiceURI)
    if (exact) return exact
  }
  const sameAccent = voices.filter((v) => v.lang.replace('_', '-') === opts.accent)
  // Prefer higher quality local voices where the browser tells us.
  return sameAccent.find((v) => /premium|enhanced|natural/i.test(v.name)) ?? sameAccent.find((v) => v.localService) ?? sameAccent[0] ?? voices[0]
}

export function speak(text: string, opts: SpeakOptions): void {
  if (!speechSupported() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? opts.accent
  u.rate = opts.rate ?? 0.9
  synth.speak(u)
}
