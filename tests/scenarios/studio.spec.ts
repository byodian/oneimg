import { type Page, expect, test } from '@playwright/test'

interface StudioState {
  readonly documentId: string
  readonly durableRevision: number
  readonly meaningful: boolean
  readonly recentCount: number
  readonly restored: boolean
  readonly revision: number
  readonly status: string
}

async function readStudioState(page: Page) {
  return JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}') as StudioState
}

test.describe('General Long Image Studio slice', () => {
  test('opens an editable starter, commits meaningful content, and restores it', async ({ page }) => {
    await page.goto('/studio')

    const editorSurface = page.getByTestId('studio-editor')
    const root = editorSurface.locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')

    await expect(editorSurface).toBeVisible()
    await expect(root).toHaveAttribute('data-render-mode', 'edit')
    await expect(editor).toBeVisible()
    await expect(editor).toBeFocused()
    await expect(page.getByTestId('studio-starter-hint')).toContainText('开始输入')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeVisible()
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeDisabled()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 0,
      meaningful: false,
      recentCount: 0,
      restored: false,
      revision: 1,
    })

    await editor.fill('这是我的第一段有意义内容。')
    await editor.press('Escape')

    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 2,
      meaningful: true,
      recentCount: 1,
      revision: 2,
      status: '已保存',
    })
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.getByText('这是我的第一段有意义内容。')).toBeVisible()
    const exportButton = page.getByRole('button', { name: '导出本地文件' })
    await expect(exportButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('oneimg-general-long-image-r2.png')

    const documentId = (await readStudioState(page)).documentId
    await page.reload()

    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot).toHaveAttribute('data-render-mode', 'edit')
    await expect(restoredRoot).toHaveAttribute('data-render-ready', 'true')
    await expect(restoredRoot.getByText('这是我的第一段有意义内容。')).toBeVisible()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId,
      durableRevision: 2,
      meaningful: true,
      recentCount: 1,
      restored: true,
      revision: 2,
    })
  })

  test('clean preview hides editor chrome without changing the canonical root', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')

    await page.getByRole('button', { name: '清爽预览' }).click()

    await expect(page.getByTestId('studio-editor-chrome')).toBeHidden()
    await expect(page.getByTestId('studio-header')).toBeHidden()
    await expect(page.getByTestId('studio-clean-preview-chrome')).toBeVisible()
    await expect(root).toHaveAttribute('data-render-mode', 'preview')
    await expect(root).toHaveAttribute('data-document-id', /document:studio:/)
    await expect(page.getByRole('button', { name: '返回编辑' })).toBeVisible()
  })

  test('preserves a competing writer as a Conflict Draft', async ({ context, page }) => {
    await page.goto('/studio')

    const editor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await editor.fill('主分支的第一版内容。')
    await editor.press('Escape')
    await expect(page.getByTestId('studio-status')).toHaveText('已保存')

    const competingPage = await context.newPage()
    await competingPage.goto('/studio')
    const competingEditor = competingPage.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await expect(competingEditor).toContainText('主分支的第一版内容。')

    await editor.fill('主分支的第二版内容。')
    await editor.press('Escape')
    await expect(page.getByTestId('studio-status')).toHaveText('已保存')

    await competingEditor.fill('竞争分支的内容。')
    await competingEditor.press('Escape')

    await expect(competingPage.getByTestId('studio-conflict-notice')).toBeVisible()
    await expect(competingPage.getByTestId('studio-conflict-notice')).toContainText('冲突草稿')
    await expect(page.getByText('主分支的第二版内容。')).toBeVisible()

    await competingPage.getByRole('button', { name: '查看冲突草稿' }).click()
    await expect(competingPage.getByTestId('studio-conflict-preview')).toBeVisible()
    await expect(competingPage.getByText('竞争分支的内容。')).toBeVisible()
    await expect(competingPage.getByTestId('studio-editor').locator('[contenteditable="true"]')).toHaveCount(0)
    await competingPage.getByRole('button', { name: '返回当前 Draft' }).click()

    await competingPage.getByRole('button', { name: '恢复已提交版本' }).click()
    await expect(competingPage.getByText('主分支的第二版内容。')).toBeVisible()
    await competingPage.close()
  })
})
