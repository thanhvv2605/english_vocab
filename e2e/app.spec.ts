import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { countStore, learnBatch, makeAllDue, open } from './helpers'

const TOTAL = JSON.parse(readFileSync(new URL('../src/data/words.json', import.meta.url), 'utf8')).length

test('first visit shows onboarding, 10 new words and no errors', async ({ page }) => {
  const errors = await open(page)
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await expect(page.getByTestId('new-count')).toHaveText('10')
  await expect(page.getByTestId('due-count')).toHaveText('0')
  await page.getByRole('button', { name: 'Đã hiểu' }).click()
  await expect(page.getByTestId('onboarding')).toHaveCount(0)
  for (const r of ['learn', 'review', 'practice', 'words', 'settings']) {
    await page.goto(`/#/${r}`)
    await expect(page.locator('main h1, main h2').first()).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('switching the interface language updates every label', async ({ page }) => {
  await open(page, '#/settings')
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.locator('aside nav')).toContainText('Practice')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.reload()
  await expect(page.locator('aside nav')).toContainText('Word')
  await page.getByRole('radio', { name: 'Tiếng Việt' }).click()
  await expect(page.locator('aside nav')).toContainText('Luyện tập')
})

test('dark theme applies and persists', async ({ page }) => {
  await open(page, '#/settings')
  await page.getByRole('radio', { name: 'Tối' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('learn a batch, then review it with FSRS ratings and undo', async ({ page }) => {
  await open(page)
  const words = await learnBatch(page)
  await expect(page.getByRole('heading', { name: 'Làm tốt lắm!' })).toBeVisible()
  expect(await countStore(page, 'cards')).toBe(5)

  await page.goto('/')
  await expect(page.getByTestId('new-count')).toHaveText('5')

  await makeAllDue(page)
  await page.goto('/#/review')
  await page.reload()
  await expect(page.getByTestId('remaining')).toHaveText('Còn 5')
  await expect(page.getByTestId('due-badge')).toHaveText('5')
  // Front shows the word but not the meaning.
  const front = await page.getByTestId('review-card').locator('h2').innerText()
  expect(words).toContain(front.trim())
  await page.keyboard.press('Space')
  await expect(page.getByRole('group')).toBeVisible()
  await page.keyboard.press('4')
  await expect(page.getByTestId('remaining')).toHaveText('Còn 4')
  await page.getByRole('button', { name: /Hoàn tác/ }).click()
  await expect(page.getByTestId('remaining')).toHaveText('Còn 5')
  await expect(page.getByRole('group')).toBeVisible()
  // "Easy" graduates each card out of the short-term queue.
  for (let i = 0; i < 5; i++) {
    if (i > 0) await page.keyboard.press('Space')
    await expect(page.getByRole('group')).toBeVisible()
    await page.keyboard.press('4')
    if (i < 4) await expect(page.getByTestId('remaining')).toHaveText(`Còn ${4 - i}`)
  }
  await expect(page.getByRole('heading', { name: 'Hoàn thành buổi ôn tập' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Độ chính xác 100%')
  expect(await countStore(page, 'reviews')).toBe(5 + 5)
})

test('"I already know this" skips the word without using the daily quota', async ({ page }) => {
  await open(page, '#/learn')
  await expect(page.getByTestId('intro-card')).toBeVisible()
  await page.keyboard.press('k')
  await expect(page.getByText('Từ 2/5')).toBeVisible()
  await page.goto('/')
  await expect(page.getByTestId('new-count')).toHaveText('10')
  expect(await countStore(page, 'cards')).toBe(1)
})

test('practice quiz: right and wrong answers, results and starring mistakes', async ({ page }) => {
  await open(page, '#/practice')
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled()
  await page.getByRole('radio', { name: 'Tất cả các từ' }).click()
  await expect(page.getByTestId('available')).toHaveText(`Có ${TOTAL} từ`)
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  let right = 0
  for (let i = 0; i < 10; i++) {
    const q = page.getByTestId('question')
    await expect(q).toBeVisible()
    const kind = await q.getAttribute('data-kind')
    if (kind?.startsWith('mc')) {
      await q.locator('button[data-correct]').click()
      right++
    } else {
      await q.getByRole('textbox').fill('qqqq')
      await q.getByRole('textbox').press('Enter')
    }
    await expect(page.getByTestId('feedback')).toBeVisible()
    await page.keyboard.press('Enter')
  }
  await expect(page.getByTestId('score')).toHaveText(`${right * 10}%`)
  if (right < 10) {
    await page.getByRole('button', { name: 'Đánh dấu sao các từ này' }).click()
    await page.goto('/#/words')
    await page.getByRole('button', { name: 'Có dấu sao' }).click()
    await expect(page.getByTestId('result-count')).toHaveText(`${10 - right} từ`)
  }
})

test('word bank: search, add, edit, import and delete custom words', async ({ page }) => {
  await open(page, '#/words')
  await expect(page.getByTestId('result-count')).toHaveText(`${TOTAL} từ`)
  await page.getByRole('searchbox').fill('bien doi khi hau')
  await expect(page.getByTestId('word-row').first()).toBeVisible()

  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Thêm từ' }).click()
  await page.getByLabel('Từ hoặc cụm từ *').fill('serendipity')
  await page.getByLabel('Nghĩa tiếng Việt *').fill('sự tình cờ')
  await page.getByLabel('Câu ví dụ', { exact: true }).fill('Meeting her there was pure serendipity.')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã thêm "serendipity"')).toBeVisible()

  // Duplicate is rejected.
  await page.getByRole('button', { name: 'Thêm từ' }).click()
  await page.getByLabel('Từ hoặc cụm từ *').fill('Serendipity')
  await page.getByLabel('Nghĩa tiếng Việt *').fill('x')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('đã có trong kho từ')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('searchbox').fill('serendipity')
  await page.getByTestId('word-row').first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sửa' }).click()
  await page.getByLabel('Nghĩa tiếng Việt *').fill('sự tình cờ may mắn')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'serendipity' })
  await expect(drawer).toContainText('sự tình cờ may mắn')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await drawer.getByRole('button', { name: 'Xoá' }).click()
  await page.getByRole('dialog', { name: 'IELTS Vocab' }).getByRole('button', { name: 'Xoá' }).click()
  await expect(page.getByText('Đã xoá')).toBeVisible()
  await expect(page.getByTestId('result-count')).toHaveText('0 từ')

  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Nhập danh sách' }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('thrive | phát triển mạnh\nflourish; nở rộ\nsignificant | trùng')
  await expect(page.getByTestId('import-preview')).toContainText('Sẵn sàng nhập 2 từ')
  await page.getByRole('button', { name: 'Nhập 2 từ' }).click()
  await page.getByRole('combobox', { name: 'Chủ đề' }).selectOption('custom')
  await expect(page.getByTestId('result-count')).toHaveText('2 từ')
})

test('backup export → reset → restore brings progress back', async ({ page }) => {
  await open(page)
  await learnBatch(page)
  await page.goto('/#/settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Xuất bản sao lưu' }).click()])
  const file = await download.path()

  await page.getByRole('button', { name: 'Xoá toàn bộ tiến độ' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xoá toàn bộ tiến độ' }).click()
  await expect(page.getByText('Đã xoá tiến độ')).toBeVisible()
  expect(await countStore(page, 'cards')).toBe(0)

  await page.getByTestId('backup-input').setInputFiles(file!)
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục từ bản sao lưu' }).click()
  await expect(page.getByText('Đã khôi phục: 5 từ đã học')).toBeVisible()
  expect(await countStore(page, 'cards')).toBe(5)
})

test('Escape closes only the topmost dialog', async ({ page }) => {
  await open(page, '#/words')
  await page.getByRole('button', { name: 'Thêm từ' }).click()
  await page.getByLabel('Từ hoặc cụm từ *').fill('serendipity')
  await page.getByLabel('Nghĩa tiếng Việt *').fill('sự tình cờ')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await page.getByRole('searchbox').fill('serendipity')
  await page.getByTestId('word-row').first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sửa' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'serendipity' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('clicking "I already know this" then pressing Space does not skip another word', async ({ page }) => {
  await open(page, '#/learn')
  await page.getByRole('button', { name: /Tôi biết từ này rồi/ }).click()
  await expect(page.getByText('Từ 2/5')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByText('Từ 3/5')).toBeVisible()
  expect(await countStore(page, 'cards')).toBe(1)
})

test('Space on the "come back shortly" screen does not rate hidden cards', async ({ page }) => {
  await open(page)
  await learnBatch(page)
  await makeAllDue(page)
  await page.goto('/#/review')
  await page.reload()
  // Forget every card: each one goes back to short-term learning.
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId('remaining')).toHaveText('Còn 5')
    await expect(page.getByRole('button', { name: /Xem đáp án/ })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('group')).toBeVisible()
    await page.keyboard.press('1')
  }
  await expect(page.getByRole('button', { name: 'Tiếp tục khi sẵn sàng' })).toBeVisible()
  const before = await countStore(page, 'reviews')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  for (const k of ['Space', 'Space', '3', 'Enter', '4']) await page.keyboard.press(k)
  expect(await countStore(page, 'reviews')).toBe(before)
  await page.getByRole('button', { name: 'Tiếp tục khi sẵn sàng' }).click()
  await expect(page.getByTestId('review-card')).toBeVisible()
})

test('notes are saved when the word panel is closed with Escape', async ({ page }) => {
  await open(page, '#/words')
  await page.getByTestId('word-row').first().click()
  await page.getByLabel('Ghi chú của tôi').fill('mẹo: sig-NIF-icant')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByTestId('word-row').first().click()
  await expect(page.getByLabel('Ghi chú của tôi')).toHaveValue('mẹo: sig-NIF-icant')
})
