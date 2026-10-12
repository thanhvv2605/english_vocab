import { expect, type Page } from '@playwright/test'

export async function open(page: Page, hash = '') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`/${hash}`)
  await expect(page.locator('main')).toBeVisible()
  return errors
}

/** Move cards' due dates into the past so they're reviewable now. */
export async function makeAllDue(page: Page) {
  await page.evaluate(async () => {
    const req = indexedDB.open('ielts-vocab')
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)))
    await new Promise<void>((resolve) => {
      const tx = db.transaction('cards', 'readwrite')
      const st = tx.objectStore('cards')
      const g = st.getAll()
      g.onsuccess = () => g.result.forEach((c) => st.put({ ...c, due: Date.now() - 1000 }))
      tx.oncomplete = () => resolve()
    })
    db.close()
  })
}

export async function countStore(page: Page, store: string): Promise<number> {
  return page.evaluate(async (s) => {
    const req = indexedDB.open('ielts-vocab')
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)))
    const n: number = await new Promise((r) => {
      const c = db.transaction(s).objectStore(s).count()
      c.onsuccess = () => r(c.result)
    })
    db.close()
    return n
  }, store)
}

/** Learn one batch, answering every check correctly. Returns the words learned. */
export async function learnBatch(page: Page): Promise<string[]> {
  await page.goto('/#/learn')
  const words: string[] = []
  const card = page.getByTestId('intro-card')
  await expect(card).toBeVisible()
  for (let i = 0; i < 5; i++) {
    words.push((await card.locator('h2').first().innerText()).trim())
    await page.keyboard.press('Space')
  }
  for (let step = 0; step < 10; step++) {
    const q = page.getByTestId('question')
    await expect(q).toBeVisible()
    const kind = await q.getAttribute('data-kind')
    if (kind === 'mc-en-vi') {
      await q.locator('button[data-correct]').click()
    } else {
      // The spelling prompt shows the Vietnamese meaning; find which word it is.
      const meaning = (await q.locator('p[lang=vi]').innerText()).trim()
      const word = await page.evaluate(async (m) => {
        const req = indexedDB.open('ielts-vocab')
        const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)))
        const all: { word: string; meaningVi: string }[] = await new Promise((r) => {
          const g = db.transaction('words').objectStore('words').getAll()
          g.onsuccess = () => r(g.result)
        })
        db.close()
        return all.find((w) => w.meaningVi === m)!.word
      }, meaning)
      await q.getByRole('textbox').fill(word)
      await q.getByRole('textbox').press('Enter')
    }
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true')
    await page.getByTestId('feedback').getByRole('button').click()
    // Wait for the next question (or the done screen) before continuing.
    await expect(page.getByTestId('feedback')).toHaveCount(0)
  }
  return words
}
