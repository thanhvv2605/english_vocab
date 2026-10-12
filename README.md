# IELTS Vocab

A **free, open-source** web app for memorising IELTS vocabulary with spaced repetition. It runs on your own computer: no account, no internet connection, no data collection. The interface is available in English and Vietnamese.

> This project is shared so everyone can learn together. If you find it useful, please give the repo a ⭐, contribute words, or report mistakes.

## Features

- **719 ready-made IELTS words** in 17 groups: academic vocabulary, charts & trends (Writing Task 1), environment, education, technology, health, work, economy, society, crime & law, government, media, science, cities & transport, travel, family, plus a **sample notebook** (see [Word list](#word-list)).
- Every word has **British IPA**, part of speech, CEFR level (B1–C2), Vietnamese meaning, English definition, an **IELTS-style example sentence** with translation, common collocations and synonyms.
- **FSRS spaced repetition**, the modern algorithm also used by Anki. It predicts when you are about to forget each word and schedules the review at the right time.
- **Learn new words in batches of 5**: study and listen to each word, then test yourself in two steps (pick the meaning, then type the word). Anything you get wrong comes back later in the same session.
- **Practice** with 5 question types: English → Vietnamese, Vietnamese → English, spelling, listen and type, and fill in the blank. Practice never changes your review schedule.
- **Word bank**: search with or without Vietnamese diacritics, filter by topic, status or star, write memory tips, add your own words or import a whole list.
- Pronunciation using your device's built-in voices (British or American), light and dark themes, works on phone and desktop, full keyboard shortcuts.

## Getting started

You need **[Node.js](https://nodejs.org) 20 or later** (the LTS version is recommended).

### 1. Get the code

```bash
git clone https://github.com/thanhvv2605/english_vocab.git
cd english_vocab
```

Without Git, click **Code → Download ZIP** on GitHub and unzip it.

### 2. Run the app

**macOS:** double-click `Mo IELTS Vocab.command`. The first run takes about a minute to install dependencies, then your browser opens http://localhost:5199. Keep the Terminal window open while you study.

> If macOS refuses to open the file because it is from an "unidentified developer", **right-click → Open** instead. If you downloaded the ZIP and the file does not run, open Terminal in the project folder and run `chmod +x "Mo IELTS Vocab.command"`.

**Windows, Linux, or from a terminal:**

```bash
npm install     # first time only
npm start       # builds and opens http://localhost:5199
```

Press `Ctrl + C` in the terminal to stop the app.

## How to study effectively

1. **Open the "Today" page every day.** Do your **Review** first, then **Learn** new words. Reviewing on time matters more than learning many new words.
2. When reviewing, try to recall the meaning *before* revealing the card, then rate yourself honestly:
   - **Forgot**: you could not recall it; the word comes back in a few minutes.
   - **Hard**: you recalled it, but with real difficulty.
   - **Good**: you recalled it after a moment's thought (the most common choice).
   - **Easy**: you recalled it instantly.
3. Start with **10 new words a day**. After 2–3 weeks your daily reviews settle at roughly 5–8 times the number of new words.
4. Once a week, use **Practice → Weak words** to strengthen the words you keep forgetting.
5. Write your own **memory tips** in each word's notes (in the Words page).

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` / `Enter` | Reveal card / continue |
| `1` `2` `3` `4` | Rate Forgot / Hard / Good / Easy, or pick a multiple-choice answer |
| `P` | Play pronunciation |
| `Z` | Undo the last rating |
| `K` | "I already know this" (when learning new words) |

## Your data and privacy

- All progress is stored in your browser on this computer (IndexedDB). The app **has no server and sends nothing anywhere**.
- Data is tied to the address **http://localhost:5199**. Always use this exact address and the same browser, or it will look as if your progress is gone.
- Use **Settings → Export backup** regularly, especially before clearing browser data or switching browsers or computers. Use **Restore from backup** to bring it back.

## Word list

The source vocabulary lives in `data/topics/`, one JSON file per topic, in the format described in [`data/SCHEMA.md`](data/SCHEMA.md).

- `notebook.json` (**My notebook**, 75 words) is the author's sample notebook. It is always learned first. Keep it, replace it with your own words, or set the file to `[]` if you only want to study by topic.
- The other 16 files are common IELTS topics with about 40 words each.

After editing the data, run `npm run data` (`npm start` also does this). The next time you open the app, new words are synced in while your existing progress, stars and notes are kept.

> The content was written and checked carefully, but mistakes are still possible. If you spot a wrong IPA, meaning or example, please [open an issue](../../issues) or send a pull request.

## Contributing

All contributions are welcome: new words, corrected meanings, translations, bug fixes and new features.

1. Fork the repo and create a branch.
2. Make your changes:
   - **Adding or editing words:** edit the files in `data/topics/` following `data/SCHEMA.md`. Run `npm run data` to validate; it reports missing fields, invalid parts of speech or levels, and any `exampleForm` that does not appear in its example sentence.
   - **Interface text:** `src/i18n/en.ts` is the source of truth; every new key needs a translation in `vi.ts`.
3. Run `npm test` (and `npm run test:e2e` if you changed the UI) before opening a pull request.

### Developer commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (port 5199, hot reload) |
| `npm start` | Production build, served on port 5199 |
| `npm test` | Unit tests (Vitest): FSRS, question generation, database, backup, word data, i18n |
| `npm run test:e2e` | End-to-end tests (Playwright) against a real build, on a separate port (4317) so your study data is never touched |
| `npm run typecheck` | TypeScript type check |
| `npm run data` | Validate and merge `data/topics/*.json` into `src/data/words.json` |

Before the first e2e run, install the Playwright browser: `npx playwright install chromium`.

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs). The Be Vietnam Pro and Bricolage Grotesque fonts are bundled, so the app works offline.

### Project structure

```
data/topics/        Source vocabulary by topic (JSON, see data/SCHEMA.md)
scripts/            build-data.mjs: validates and merges the data
src/db/             Database, learn/review actions, stats, backup
src/lib/            FSRS, question generation, text utilities, speech
src/i18n/           UI translations (en.ts is the source; vi.ts must have every key)
src/pages/          Today, Learn, Review, Practice, Words, Settings
e2e/                Playwright tests
```

## License

- **Code:** [MIT](LICENSE).
- **Vocabulary data** (`data/topics/`, `src/data/words.json`): [CC BY 4.0](data/LICENSE). You are free to reuse, adapt and share it, including commercially, as long as you credit this project.

## Acknowledgements

- [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) and [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) by Open Spaced Repetition.
- [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) and [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) fonts (SIL Open Font License).

IELTS is a registered trademark of the British Council, IDP: IELTS Australia and Cambridge University Press & Assessment. This project is not affiliated with or endorsed by these organisations.
