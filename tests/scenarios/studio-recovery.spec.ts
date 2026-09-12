import { expect, test } from '@playwright/test'

test.describe('Studio durable recovery', () => {
  test('offers a retry when the first durable commit fails', async ({ page }) => {
    await page.goto('/scenario/studio-recovery')

    const editor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await editor.fill('需要重试保存的内容。')
    await editor.press('Escape')

    await expect(page.getByTestId('studio-save-recovery')).toBeVisible()
    await expect(page.getByTestId('studio-status')).toHaveText('未保存，仍可继续编辑')

    await page.getByRole('button', { name: '重试保存' }).click()

    await expect(page.getByTestId('studio-status')).toHaveText('已保存')
    await expect(editor).toContainText('需要重试保存的内容。')
    await expect(page.getByTestId('studio-save-recovery')).toBeHidden()
  })

  test('can discard an unacknowledged revision and restore the durable baseline', async ({ page }) => {
    await page.goto('/scenario/studio-recovery')

    const editor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await editor.fill('不会成为 durable revision 的内容。')
    await editor.press('Escape')
    await expect(page.getByTestId('studio-save-recovery')).toBeVisible()

    await page.getByRole('button', { name: '恢复已保存内容' }).click()

    await expect(page.getByTestId('studio-starter-hint')).toBeVisible()
    await expect(editor).toHaveText('')
    await expect(page.getByTestId('studio-save-recovery')).toBeHidden()
  })
})
