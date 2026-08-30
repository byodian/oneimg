import { type Page, expect, test } from '@playwright/test'

interface AssetPipelineResult {
  readonly assetCount: number
  readonly assetStatuses: readonly string[]
  readonly canExport: boolean
  readonly document: string
  readonly originalMimeTypes: readonly string[]
  readonly renderSourceDimensions: readonly { readonly height: number; readonly width: number }[]
  readonly renderSourceExifOrientations: readonly number[]
  readonly renderSourceMimeTypes: readonly string[]
  readonly renderSourceOrientations: readonly string[]
  readonly transactionCount: number
  readonly unresolvedAssetIds: readonly string[]
}

type GeneratedImageOptions = {
  readonly exifOrientation?: 6
  readonly fileName: string
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  readonly corrupt?: boolean
}

async function importGeneratedImages(page: Page, options: readonly GeneratedImageOptions[]) {
  const input = page.getByTestId('studio-asset-input')
  await expect(input).toBeAttached()
  await page.evaluate(async (imageOptions) => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="studio-asset-input"]')
    if (input === null) {
      throw new Error('Asset input is not mounted')
    }

    const files = await Promise.all(imageOptions.map(async ({ exifOrientation, fileName, mimeType, corrupt }) => {
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

      if (exifOrientation !== undefined) {
        const source = new Uint8Array(await bytes.arrayBuffer())
        const exifPayload = new Uint8Array([
          0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
          0x4d, 0x4d, 0x00, 0x2a,
          0x00, 0x00, 0x00, 0x08,
          0x00, 0x01,
          0x01, 0x12, 0x00, 0x03,
          0x00, 0x00, 0x00, 0x01,
          0x00, exifOrientation, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00,
        ])
        const exifSegment = new Uint8Array(exifPayload.length + 4)
        exifSegment.set([0xff, 0xe1, 0x00, exifPayload.length + 2], 0)
        exifSegment.set(exifPayload, 4)
        const oriented = new Uint8Array(source.length + exifSegment.length)
        oriented.set(source.slice(0, 2), 0)
        oriented.set(exifSegment, 2)
        oriented.set(source.slice(2), exifSegment.length + 2)
        bytes = new Blob([oriented], { type: mimeType })
      }

      return new File([bytes], fileName, { type: mimeType })
    }))
    const transfer = new DataTransfer()
    for (const file of files) {
      transfer.items.add(file)
    }
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, options)
}

async function importGeneratedImage(page: Page, options: GeneratedImageOptions) {
  await importGeneratedImages(page, [options])
}

async function readResult(page: Page) {
  return JSON.parse(await page.getByTestId('asset-pipeline-result').textContent() ?? '{}') as AssetPipelineResult
}

test.describe('Asset Pipeline and MediaGroup contract', () => {
  test('normalizes local images, preserves intent transactions, and blocks unresolved export', async ({ page }) => {
    await page.goto('/scenario/asset-pipeline')

    await importGeneratedImages(page, [
      { fileName: 'red-blue.jpg', mimeType: 'image/jpeg' },
      { fileName: 'red-blue.png', mimeType: 'image/png' },
      { fileName: 'red-blue.webp', mimeType: 'image/webp' },
    ])

    await expect.poll(() => readResult(page)).toMatchObject({
      assetCount: 3,
      assetStatuses: ['ready', 'ready', 'ready'],
      canExport: true,
      originalMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      renderSourceMimeTypes: ['image/png', 'image/png', 'image/png'],
      renderSourceOrientations: ['top-left', 'top-left', 'top-left'],
      transactionCount: 1,
    })

    const initialResult = await readResult(page)
    expect(initialResult.document).not.toContain('data:')
    expect(initialResult.document).not.toContain('blob:')
    expect(initialResult.document).not.toContain('red-blue.jpg')

    await expect(page.getByTestId('media-item-1')).toBeVisible()
    await expect(page.getByTestId('media-item-1').getByText('red-blue.jpg')).toHaveCount(0)
    await page.getByRole('button', { name: '调整图片 1' }).click()
    await expect(page.getByTestId('studio-media-adjustment')).toBeVisible()
    await page.getByLabel('焦点横向').fill('0.8')
    await page.getByLabel('焦点横向').press('Escape')
    await expect(page.getByTestId('studio-media-adjustment')).toHaveCount(0)
    expect((await readResult(page)).transactionCount).toBe(initialResult.transactionCount)

    await page.getByRole('button', { name: '调整图片 1' }).click()
    await page.getByLabel('焦点横向').fill('0.8')
    await page.getByLabel('缩放意图').fill('1.4')
    await page.getByRole('button', { name: '完成调整' }).click()
    await expect.poll(() => readResult(page)).toMatchObject({ transactionCount: 2 })
    await expect(page.getByTestId('media-item-1').locator('img')).toHaveAttribute('data-focal-point', '0.8,0.5')

    await importGeneratedImage(page, { corrupt: true, fileName: 'broken.jpg', mimeType: 'image/jpeg' })
    await expect.poll(() => readResult(page)).toMatchObject({
      assetCount: 4,
      assetStatuses: ['ready', 'ready', 'ready', 'unresolved'],
      canExport: false,
      unresolvedAssetIds: [expect.any(String)],
      transactionCount: 3,
    })
    await expect(page.getByTestId('media-item-4')).toHaveAttribute('data-media-status', 'unresolved')
    await expect(page.getByTestId('asset-preflight')).toContainText('重新链接资源')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeDisabled()
  })

  test('normalizes EXIF orientation into the shared Render Source coordinate space', async ({ page }) => {
    await page.goto('/scenario/asset-pipeline')
    await importGeneratedImage(page, {
      exifOrientation: 6,
      fileName: 'rotated.jpg',
      mimeType: 'image/jpeg',
    })

    await expect.poll(() => readResult(page)).toMatchObject({
      assetCount: 1,
      assetStatuses: ['ready'],
      canExport: true,
      renderSourceDimensions: [{ height: 8, width: 4 }],
      renderSourceExifOrientations: [6],
      renderSourceOrientations: ['top-left'],
    })
    await expect(page.getByTestId('media-item-1').locator('img')).toHaveJSProperty('naturalWidth', 4)
    await expect(page.getByTestId('media-item-1').locator('img')).toHaveJSProperty('naturalHeight', 8)
  })
})
