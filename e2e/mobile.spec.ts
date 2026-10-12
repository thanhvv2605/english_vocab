import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('mobile: tab bar navigation and no horizontal scrolling', async ({ page }) => {
  await open(page)
  const tabs = page.getByRole('navigation', { name: 'Menu chính' }).last()
  await expect(tabs).toBeVisible()
  for (const [label, hash] of [
    ['Học từ mới', '#/learn'],
    ['Ôn tập', '#/review'],
    ['Luyện tập', '#/practice'],
    ['Kho từ', '#/words'],
    ['Hôm nay', '#/'],
  ]) {
    await tabs.getByText(label).click()
    await expect(page).toHaveURL(new RegExp(`${hash.replace('/', '\\/')}$`))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, label).toBeLessThanOrEqual(0)
  }
  await page.getByRole('button', { name: 'Cài đặt' }).click()
  await expect(page.getByRole('heading', { name: 'Cài đặt', exact: true })).toBeVisible()
})
