// Merges data/topics/*.json into src/data/words.json after validating every entry.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const topicsDir = join(root, 'data/topics')
// 'notebook' (the learner's own notes) comes first: it is learned first and wins duplicates.
const ORDER = ['notebook', 'academic', 'trends', 'environment', 'education', 'technology', 'health', 'work', 'economy',
  'society', 'crime', 'government', 'media', 'science', 'urban', 'travel', 'family']
const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'phrasal verb', 'preposition', 'conjunction'])
const LEVELS = new Set(['B1', 'B2', 'C1', 'C2'])
const STRING_FIELDS = ['word', 'ipa', 'pos', 'meaningEn', 'meaningVi', 'example', 'exampleVi', 'exampleForm', 'level']

const errors = []
const seen = new Map()
const out = []
const files = readdirSync(topicsDir).filter((f) => f.endsWith('.json'))
files.sort((a, b) => ORDER.indexOf(a.replace('.json', '')) - ORDER.indexOf(b.replace('.json', '')))

for (const file of files) {
  const topic = file.replace('.json', '')
  if (!ORDER.includes(topic)) { errors.push(`${file}: unknown topic`); continue }
  let list
  try { list = JSON.parse(readFileSync(join(topicsDir, file), 'utf8')) } catch (e) { errors.push(`${file}: ${e.message}`); continue }
  list.forEach((w, i) => {
    const at = `${file}[${i}] ${w?.word ?? '?'}`
    for (const k of STRING_FIELDS) if (typeof w[k] !== 'string' || !w[k].trim()) errors.push(`${at}: missing ${k}`)
    for (const k of ['collocations', 'synonyms']) if (!Array.isArray(w[k])) errors.push(`${at}: ${k} not array`)
    if (!POS.has(w.pos)) errors.push(`${at}: bad pos ${w.pos}`)
    if (!LEVELS.has(w.level)) errors.push(`${at}: bad level ${w.level}`)
    if (typeof w.example === 'string' && !w.example.includes(w.exampleForm)) errors.push(`${at}: exampleForm not in example`)
    const key = String(w.word).trim().toLowerCase()
    if (seen.has(key)) { console.warn(`skip duplicate "${key}" in ${topic} (already in ${seen.get(key)})`); return }
    seen.set(key, topic)
    out.push({
      word: w.word.trim(), ipa: w.ipa.trim(), pos: w.pos, meaningEn: w.meaningEn.trim(), meaningVi: w.meaningVi.trim(),
      example: w.example.trim(), exampleVi: w.exampleVi.trim(), exampleForm: w.exampleForm,
      collocations: w.collocations, synonyms: w.synonyms, level: w.level, topic,
    })
  })
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
mkdirSync(join(root, 'src/data'), { recursive: true })
writeFileSync(join(root, 'src/data/words.json'), JSON.stringify(out))
console.log(`words.json: ${out.length} words from ${files.length} topics`)
