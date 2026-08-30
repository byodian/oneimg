import { readFile } from 'node:fs/promises'
import { type Page, expect, test } from '@playwright/test'

interface StudioDocumentState {
  readonly meaningful: boolean
  readonly revision: number
}

function readPngDimensions(buffer: Buffer) {
  if (buffer.subarray(0, 8).compare(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) !== 0) {
    throw new Error('Expected a PNG download')
  }
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  }
}

async function importGeneratedImage(
  page: Page,
  options: { readonly fileName: string; readonly mimeType: 'image/jpeg' | 'image/png'; readonly corrupt?: boolean },
  inputTestId = 'studio-asset-input',
) {
  const input = page.getByTestId(inputTestId)
  await expect(input).toBeAttached()
  await page.evaluate(async ({ fileName, inputTestId, mimeType, corrupt }) => {
    const input = document.querySelector<HTMLInputElement>(`[data-testid="${inputTestId}"]`)
    if (input === null) {
      throw new Error('Studio asset input is not mounted')
    }

    let bytes: Blob
    if (corrupt) {
      bytes = new Blob([new Uint8Array([0, 1, 2, 3, 4, 5])], { type: mimeType })
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 4
      const context = canvas.getContext('2d')!
      context.fillStyle = '#e84a5f'
      context.fillRect(0, 0, 4, 4)
      context.fillStyle = '#2a6fdb'
      context.fillRect(4, 0, 4, 4)
      bytes = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob === null ? reject(new Error('Unable to create image fixture')) : resolve(blob), mimeType)
      })
    }

    const file = new File([bytes], fileName, { type: mimeType })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { ...options, inputTestId })
}

async function readStudioState(page: Page) {
  return JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}') as StudioDocumentState
}

test.describe('Studio media import', () => {
  test('imports, edits, and blocks export for an unresolved local image', async ({ page }) => {
    await page.goto('/studio')
    await expect(page.getByTestId('studio-asset-input')).toBeAttached()

    await importGeneratedImage(page, { fileName: 'studio-photo.png', mimeType: 'image/png' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, revision: 2 })

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toBeVisible()
    await expect(root).not.toContainText('studio-photo.png')

    await page.getByLabel('Caption 1').fill('一张蓝红相间的图片')
    await page.getByLabel('Alternative Text 1').fill('蓝红色块测试图')
    await page.getByRole('button', { name: '保存图片文本' }).click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3 })
    await expect(root.locator('figcaption')).toHaveText('一张蓝红相间的图片')
    await expect(root.locator('[data-media-item-id="media-item-1"] img')).toHaveAttribute('alt', '蓝红色块测试图')

    await page.getByRole('button', { name: '调整图片 1' }).click()
    await page.getByLabel('焦点横向').fill('0.8')
    await page.getByRole('button', { name: '取消调整' }).click()
    expect((await readStudioState(page)).revision).toBe(3)

    await page.getByRole('button', { name: '调整图片 1' }).click()
    await page.getByLabel('焦点横向').fill('0.8')
    await page.getByRole('button', { name: '完成调整' }).click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 4 })
    await expect(root.locator('[data-media-item-id="media-item-1"] img')).toHaveAttribute('data-focal-point', '0.8,0.5')

    await page.getByRole('button', { name: '导出本地文件' }).click()
    const exportPanel = page.getByTestId('studio-export-panel')
    await expect(exportPanel.getByTestId('studio-export-plan-status')).toHaveText('可以显式运行')
    const downloadPromise = page.waitForEvent('download')
    await exportPanel.getByRole('button', { name: '导出 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (downloadPath === null) {
      throw new Error('Playwright did not expose the Studio PNG path')
    }
    expect(readPngDimensions(await readFile(downloadPath))).toMatchObject({ width: 640 })
    await exportPanel.getByRole('button', { name: '关闭导出面板' }).click()

    await importGeneratedImage(page, { corrupt: true, fileName: 'studio-broken.jpg', mimeType: 'image/jpeg' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 5 })
    await expect(root.locator('[data-media-item-id="media-item-2"]')).toHaveAttribute('data-media-status', 'unresolved')
    await expect(page.getByTestId('preflight-panel')).toContainText('重新链接资源')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeDisabled()

    await importGeneratedImage(page, { fileName: 'studio-relinked.png', mimeType: 'image/png' }, 'studio-relink-input-2')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 6 })
    await expect(root.locator('[data-media-item-id="media-item-2"]')).toHaveAttribute('data-media-status', 'ready')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeEnabled()
  })
})
