# Seed word schema (data/topics/<topic-id>.json)

Each file is a JSON array of objects:

```json
{
  "word": "mitigate",
  "ipa": "/ˈmɪtɪɡeɪt/",
  "pos": "verb",
  "meaningEn": "to make something less harmful, serious or painful",
  "meaningVi": "giảm nhẹ, làm dịu bớt (tác hại, mức độ nghiêm trọng)",
  "example": "Governments must take urgent steps to mitigate the effects of climate change.",
  "exampleVi": "Các chính phủ phải có biện pháp khẩn cấp để giảm nhẹ tác động của biến đổi khí hậu.",
  "exampleForm": "mitigate",
  "collocations": ["mitigate the impact of", "mitigate risks"],
  "synonyms": ["alleviate", "reduce"],
  "level": "C1"
}
```

Rules
- `word`: lowercase headword (proper case only for acronyms). Multi-word phrases allowed ("carbon footprint").
- `ipa`: British (RP) IPA between slashes, as in Cambridge/Oxford dictionaries.
- `pos`: one of noun | verb | adjective | adverb | phrase | phrasal verb | preposition | conjunction.
- `meaningEn`: short learner-dictionary definition (<= 15 words).
- `meaningVi`: accurate, natural Vietnamese; 1–3 short senses separated by ", " — the sense matching the example first.
- `example`: one natural IELTS-style sentence (Writing/Speaking), 8–22 words.
- `exampleVi`: natural Vietnamese translation of the example.
- `exampleForm`: the EXACT substring of `example` that is the target word (may be inflected: "mitigated", "mitigating"). Case-sensitive, must appear in `example`.
- `collocations`: 2–3 common collocations; `synonyms`: 1–3 (may be empty array).
- `level`: B1 | B2 | C1 | C2 (CEFR estimate).
