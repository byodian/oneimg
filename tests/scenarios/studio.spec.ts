import { readFile } from 'node:fs/promises'
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

interface StudioExportPlan {
  readonly cacheReuse: 'hit' | 'miss' | 'unknown'
  readonly canRun: boolean
  readonly outputFormat: 'png'
  readonly outputScale: 1 | 2
  readonly route: string
}

interface StudioExportResult {
  readonly fromCache: boolean
  readonly format: 'png' | 'zip'
  readonly snapshotId: string
}

async function readStudioState(page: Page) {
  return JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}') as StudioState
}

async function dispatchPaste(
  locator: ReturnType<Page['locator']>,
  payload: { readonly html?: string; readonly text: string },
) {
  await locator.evaluate((element, value) => {
    const data = new DataTransfer()
    data.setData('text/plain', value.text)
    if (value.html !== undefined) {
      data.setData('text/html', value.html)
    }
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      clipboardData: data,
    }))
  }, payload)
}

async function readWheelScroll(page: Page, scroller: ReturnType<Page['locator']>) {
  await scroller.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.scrollTop = 0
    }
  })
  await scroller.hover()
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(50)
  return scroller.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      return { after: 0, clientHeight: 0, scrollHeight: 0 }
    }
    return {
      after: element.scrollTop,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }
  })
}

async function readStudioEditorWidths(page: Page) {
  return page.getByTestId('studio-editor').evaluate(element => ({
    editorWidth: element.getBoundingClientRect().width,
    rootWidth: element.querySelector<HTMLElement>('[data-oneimg-render-root]')?.getBoundingClientRect().width ?? 0,
  }))
}

function relativeLuminance(color: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (match === null) {
    throw new Error(`Expected a six-digit hex color, received ${color}`)
  }
  const channels = [0, 2, 4].map(offset => Number.parseInt(match[1]!.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map(channel => channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
}

function contrastRatio(left: string, right: string) {
  const leftLuminance = relativeLuminance(left)
  const rightLuminance = relativeLuminance(right)
  return (Math.max(leftLuminance, rightLuminance) + 0.05) / (Math.min(leftLuminance, rightLuminance) + 0.05)
}

function readPngDimensions(buffer: Buffer) {
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  }
}

async function comparePngToPreview(page: Page, preview: Buffer, exported: Buffer) {
  return page.evaluate(async ({ exportedBase64, previewBase64 }) => {
    const decode = async (base64: string) => {
      const response = await fetch(`data:image/png;base64,${base64}`)
      return createImageBitmap(await response.blob())
    }
    const previewImage = await decode(previewBase64)
    const exportedImage = await decode(exportedBase64)
    const width = Math.max(previewImage.width, exportedImage.width)
    const height = Math.max(previewImage.height, exportedImage.height)
    const readPixels = (image: ImageBitmap) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, width, height).data
    }
    const previewPixels = readPixels(previewImage)
    const exportedPixels = readPixels(exportedImage)
    let materialPixels = 0
    let totalChannelDelta = 0
    for (let offset = 0; offset < previewPixels.length; offset += 4) {
      let pixelDelta = 0
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(previewPixels[offset + channel]! - exportedPixels[offset + channel]!)
        pixelDelta = Math.max(pixelDelta, delta)
        totalChannelDelta += delta
      }
      if (pixelDelta > 32) {
        materialPixels += 1
      }
    }
    const result = {
      exportedHeight: exportedImage.height,
      exportedWidth: exportedImage.width,
      materialPixelRatio: materialPixels / (width * height),
      meanChannelDelta: totalChannelDelta / (width * height * 4),
      previewHeight: previewImage.height,
      previewWidth: previewImage.width,
    }
    previewImage.close()
    exportedImage.close()
    return result
  }, {
    exportedBase64: exported.toString('base64'),
    previewBase64: preview.toString('base64'),
  })
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
    await exportButton.click()
    await expect(page.getByTestId('studio-export-panel')).toBeVisible()
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
    const plan = JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as StudioExportPlan
    expect(plan).toMatchObject({
      cacheReuse: 'miss',
      canRun: true,
      outputFormat: 'png',
      outputScale: 1,
      route: 'local-eligible',
    })
    const previewPng = await root.screenshot({ animations: 'disabled' })
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出 PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('oneimg-general-long-image-r2.png')
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the Studio PNG path')
    }
    const exportedPng = await readFile(downloadPath)
    const dimensions = readPngDimensions(exportedPng)
    expect(dimensions.width).toBe(640)
    expect(dimensions.height).toBeGreaterThan(0)
    const comparison = await comparePngToPreview(page, previewPng, exportedPng)
    expect(comparison.exportedWidth).toBe(comparison.previewWidth)
    expect(comparison.exportedHeight).toBe(comparison.previewHeight)
    expect(comparison.materialPixelRatio).toBeLessThanOrEqual(0.05)
    expect(comparison.meanChannelDelta).toBeLessThanOrEqual(4)
    const exportResult = JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult
    expect(exportResult).toMatchObject({
      fromCache: false,
      format: 'png',
      snapshotId: expect.stringContaining('r2'),
    })

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

  test('blocks local export when the capability probe times out', async ({ page }) => {
    await page.addInitScript(() => {
      class HangingImage extends EventTarget {
        naturalHeight = 0
        naturalWidth = 0
        decoding = ''
        private source = ''

        get src() {
          return this.source
        }

        set src(value: string) {
          this.source = value
          // Deliberately leave the probe image without load or error.
        }

        decode() {
          return new Promise<void>(() => undefined)
        }
      }

      Object.defineProperty(window, 'Image', {
        configurable: true,
        value: HangingImage,
      })
    })
    await page.goto('/studio')

    await expect(page.getByTestId('preflight-panel')).toContainText('本地 SVG foreignObject 探测超时', { timeout: 10_000 })
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeDisabled()
    await expect(page.getByTestId('preflight-panel')).not.toContainText('应用兼容呈现')
  })

  test('plans output options without rasterizing and reuses a normal-page raster', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('导出计划只在显式运行后创建 Raster。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })

    await page.getByRole('button', { name: '导出本地文件' }).click()
    const panel = page.getByTestId('studio-export-panel')
    await expect(panel).toBeVisible()
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)

    await panel.getByLabel('输出倍率').selectOption('2')
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as StudioExportPlan).toMatchObject({
      cacheReuse: 'miss',
      outputScale: 2,
    })
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)

    const highResolutionDownloadPromise = page.waitForEvent('download')
    await panel.getByRole('button', { name: '导出 PNG' }).click()
    const highResolutionDownload = await highResolutionDownloadPromise
    const highResolutionPath = await highResolutionDownload.path()
    if (!highResolutionPath) {
      throw new Error('Playwright did not expose the high-resolution Studio PNG path')
    }
    expect(readPngDimensions(await readFile(highResolutionPath)).width).toBe(1280)
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult).toMatchObject({ fromCache: false })

    await panel.getByLabel('输出倍率').selectOption('1')

    const firstDownloadPromise = page.waitForEvent('download')
    await panel.getByRole('button', { name: '导出 PNG' }).click()
    await (await firstDownloadPromise).path()
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult).toMatchObject({ fromCache: false })

    const secondDownloadPromise = page.waitForEvent('download')
    await panel.getByRole('button', { name: '导出 PNG' }).click()
    await (await secondDownloadPromise).path()
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult).toMatchObject({ fromCache: true })
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
  })

  test('shows semantic Slice boundaries and downloads an individual Slice for long content', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    const sections = Array.from({ length: 90 }, (_, index) => (
      `<h2>第 ${index + 1} 节</h2><p>这是一段用于验证连续长图语义切片的内容，保持同一份 Canonical composition。</p>`
    )).join('')
    await dispatchPaste(editor, { html: `<div>${sections}</div>`, text: '' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    await expect(root).toHaveAttribute('data-render-ready', 'true')

    await page.getByRole('button', { name: '导出本地文件' }).click()
    await expect(page.getByTestId('studio-slice-boundaries')).toBeVisible()
    await expect(page.getByTestId('studio-slice-boundaries')).toContainText('预计输出')
    const plan = JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as {
      pages: Array<{
        semanticSlices: Array<{
          boundary: { kind: string }
          height: number
          y: number
        }>
      }>
    }
    const slices = plan.pages[0]?.semanticSlices ?? []
    expect(slices.length).toBeGreaterThan(1)
    expect(slices.some(slice => slice.boundary.kind === 'heading')).toBe(true)
    for (let index = 1; index < slices.length; index += 1) {
      const previous = slices[index - 1]!
      const current = slices[index]!
      expect(current.y).toBe(previous.y + previous.height)
    }

    const bundleDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出 PNG' }).click()
    const bundleDownload = await bundleDownloadPromise
    expect(bundleDownload.suggestedFilename()).toMatch(/\.zip$/)
    await expect(page.getByTestId('studio-export-slices')).toBeVisible()

    const sliceDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载 Slice 1' }).click()
    const sliceDownload = await sliceDownloadPromise
    expect(sliceDownload.suggestedFilename()).toBe('oneimg-slice-001.png')
    const slicePath = await sliceDownload.path()
    if (!slicePath) {
      throw new Error('Playwright did not expose the individual Studio Slice path')
    }
    expect((await readFile(slicePath)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

    await editor.fill('导出完成后编辑的内容不能继续显示旧 Slice。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    await expect(page.getByTestId('studio-export-slices')).toHaveCount(0)
  })

  test('exports a multi-slice plan at 2× without invalidating its composition', async ({ page }) => {
    const consoleMessages: string[] = []
    page.on('console', message => consoleMessages.push(message.text()))
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    const sections = Array.from({ length: 90 }, (_, index) => (
      `<h2>第 ${index + 1} 节</h2><p>这是一段用于验证高倍率连续长图语义切片的内容，保持同一份 Canonical composition。</p>`
    )).join('')
    await dispatchPaste(editor, { html: `<div>${sections}</div>`, text: '' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    await expect(root).toHaveAttribute('data-render-ready', 'true')

    await page.getByRole('button', { name: '导出本地文件' }).click()
    const panel = page.getByTestId('studio-export-panel')
    await expect(panel).toBeVisible()
    await panel.getByLabel('输出倍率').selectOption('2')
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as StudioExportPlan).toMatchObject({
      canRun: true,
      outputScale: 2,
    })

    const plan = JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as {
      pages: Array<{ semanticSlices: unknown[] }>
    }
    expect(plan.pages[0]?.semanticSlices.length).toBeGreaterThan(1)

    const downloadPromise = page.waitForEvent('download')
    await panel.getByRole('button', { name: '导出 PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.zip$/)
    await expect(page.getByTestId('studio-export-job-status')).toHaveText('已完成')
    await expect(page.getByTestId('studio-export-job-error')).toHaveCount(0)
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult).toMatchObject({
      fromCache: false,
      format: 'zip',
    })
    await panel.getByLabel('输出倍率').selectOption('1')
    await expect(page.getByTestId('studio-export-slices')).toHaveCount(0)
    await panel.getByLabel('输出倍率').selectOption('2')
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-plan').textContent() ?? '{}') as StudioExportPlan).toMatchObject({
      outputScale: 2,
    })
    expect(consoleMessages.filter(message => message.includes('Maximum update depth exceeded'))).toHaveLength(0)

    const repeatedDownloadPromise = page.waitForEvent('download')
    await panel.getByRole('button', { name: '导出 PNG' }).click()
    const repeatedDownload = await repeatedDownloadPromise
    expect(repeatedDownload.suggestedFilename()).toMatch(/\.zip$/)
    await expect(page.getByTestId('studio-export-job-status')).toHaveText('已完成')
    await expect(page.getByTestId('studio-export-job-error')).toHaveCount(0)
    await expect.poll(async () => JSON.parse(await page.getByTestId('studio-export-result').textContent() ?? '{}') as StudioExportResult).toMatchObject({
      fromCache: true,
      format: 'zip',
    })
  })

  test('marks an artifact from an older revision and offers a current re-export', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('第一版导出内容。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, status: '已保存' })
    await page.getByRole('button', { name: '导出本地文件' }).click()
    const firstDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出 PNG' }).click()
    await (await firstDownloadPromise).path()

    await editor.fill('第二版内容不应改变已经完成的导出。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, status: '已保存' })
    await expect(page.getByTestId('studio-export-receipt')).toContainText('基于较早版本')
    await expect(page.getByRole('button', { name: '重新导出当前版本' })).toBeVisible()
  })

  test('captures the latest draft when explicit run starts after a plan was shown', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('面板先展示计划的版本。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, status: '已保存' })

    await page.getByRole('button', { name: '导出本地文件' }).click()
    await expect(page.getByTestId('studio-export-plan')).toContainText('"snapshotId":"general-long-image:')

    await editor.fill('运行前最后一次编辑应进入新的 Export Snapshot。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, status: '已保存' })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出 PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('oneimg-general-long-image-r3.png')
    await expect(page.getByTestId('studio-export-result')).toContainText('"documentRevision":3')
    await expect(page.getByTestId('studio-export-result')).toContainText('"snapshotId":"general-long-image:')
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

  test('fills the Studio editor width in edit and clean preview modes', async ({ page }) => {
    await page.goto('/studio')

    const editWidths = await readStudioEditorWidths(page)
    expect(editWidths.rootWidth).toBeGreaterThan(0)
    expect(Math.abs(editWidths.editorWidth - editWidths.rootWidth)).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: '清爽预览' }).click()
    await expect(page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')).toHaveAttribute('data-render-mode', 'preview')

    const previewWidths = await readStudioEditorWidths(page)
    expect(previewWidths.rootWidth).toBeGreaterThan(0)
    expect(Math.abs(previewWidths.editorWidth - previewWidths.rootWidth)).toBeLessThanOrEqual(1)
  })

  test('restores a presentation override made before the first meaningful content', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await page.getByRole('button', { name: '分区卡片' }).click()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      meaningful: false,
      recentCount: 0,
      status: '已保存',
    })
    await expect(root).toHaveAttribute('data-template-family', 'section-cards')

    await page.reload()

    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot).toHaveAttribute('data-template-family', 'section-cards')
    await expect.poll(() => readStudioState(page)).toMatchObject({
      meaningful: false,
      recentCount: 0,
      restored: true,
    })
  })

  test('offers real presentation previews and preserves explicit choices across edits', async ({ page }) => {
    await page.goto('/studio')

    const editorSurface = page.getByTestId('studio-editor')
    const root = editorSurface.locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('用于验证模板选择的真实内容。\n第二段内容保持顺序。')
    await editor.press('Escape')

    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    await expect(root).toHaveAttribute('data-local-capability', 'certified')
    await expect(root).toHaveAttribute('data-template-family', 'clear-reading')
    await expect(root).toHaveAttribute('data-theme-id', 'clear-paper')
    await expect(root).toHaveAttribute('data-density', 'standard')
    await expect(root).toHaveAttribute('data-page-format', 'long-image')
    const defaultMetrics = await root.evaluate((element) => {
      const section = element.querySelector<HTMLElement>('.oneimg-rich-text-section')
      return {
        backgroundColor: getComputedStyle(element).backgroundColor,
        sectionMarginLeft: section === null ? '' : getComputedStyle(section).marginLeft,
        sectionPaddingTop: section === null ? '' : getComputedStyle(section).paddingTop,
      }
    })

    const recommendations = page.getByTestId('studio-template-recommendations')
    await expect(recommendations.locator('[data-template-preview]')).toHaveCount(3)
    await expect(recommendations.locator('[data-template-preview]').first().locator('[data-oneimg-render-root]')).toContainText('用于验证模板选择的真实内容。')

    const blockIdsBefore = await root.locator('[data-block-id]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-id'))
    ))
    await page.getByRole('button', { name: '分区卡片' }).click()
    await expect(root).toHaveAttribute('data-template-family', 'section-cards')
    await expect.poll(async () => root.evaluate(element => (
      getComputedStyle(element.querySelector<HTMLElement>('.oneimg-rich-text-section')!).marginLeft
    ))).toBe('24px')

    const catalog = page.getByTestId('studio-presentation-catalog')
    await catalog.locator('summary').click()
    await expect(page.getByRole('button', { name: '摘要简报' })).toBeVisible()
    await expect(catalog.locator('fieldset').nth(3).getByRole('button')).toHaveCount(7)
    await page.getByRole('button', { name: '潮汐' }).click()
    await expect(root).toHaveAttribute('data-theme-id', 'tide')
    const tideBackgroundColor = await root.evaluate(element => getComputedStyle(element).backgroundColor)
    expect(tideBackgroundColor).not.toBe(defaultMetrics.backgroundColor)
    await page.getByRole('button', { name: '紧凑' }).click()
    await expect(root).toHaveAttribute('data-density', 'compact')
    const compactPaddingTop = await root.evaluate(element => (
      getComputedStyle(element.querySelector<HTMLElement>('.oneimg-rich-text-section')!).paddingTop
    ))
    expect(compactPaddingTop).not.toBe(defaultMetrics.sectionPaddingTop)
    await expect(catalog.getByRole('button', { name: '方形 1:1' })).toBeDisabled()
    await expect(catalog.getByText('需后续分页适配')).toHaveCount(6)
    await expect(root).toHaveAttribute('data-page-format', 'long-image')
    await expect(root).toHaveAttribute('data-page-format-kind', 'continuous')

    const blockIdsAfterPresentation = await root.locator('[data-block-id]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-id'))
    ))
    expect(blockIdsAfterPresentation).toEqual(blockIdsBefore)
    await expect(root).toContainText('用于验证模板选择的真实内容。')
    await expect(root).toContainText('第二段内容保持顺序。')

    await editor.fill('编辑后的内容仍保留显式呈现选择。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    await expect(root).toHaveAttribute('data-template-family', 'section-cards')
    await expect(root).toHaveAttribute('data-theme-id', 'tide')
    await expect(root).toHaveAttribute('data-density', 'compact')
    await expect(root).toHaveAttribute('data-page-format', 'long-image')

    await page.reload()
    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot).toHaveAttribute('data-template-family', 'section-cards')
    await expect(restoredRoot).toHaveAttribute('data-theme-id', 'tide')
    await expect(restoredRoot).toHaveAttribute('data-density', 'compact')
    await expect(restoredRoot).toHaveAttribute('data-page-format', 'long-image')
    await expect(restoredRoot).toHaveAttribute('data-local-capability', 'certified')
    await expect(restoredRoot).toContainText('编辑后的内容仍保留显式呈现选择。')
  })

  test('keeps all built-in theme tokens above the certified contrast threshold', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const catalog = page.getByTestId('studio-presentation-catalog')
    await catalog.locator('summary').click()
    for (const themeLabel of ['清晰纸张', '潮汐', '柚金', '松影', '石墨', '夜航']) {
      await page.getByRole('button', { name: themeLabel }).click()
      await expect(root).toHaveAttribute('data-local-capability', 'certified')
      const colors = await root.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          accent: style.getPropertyValue('--oneimg-accent'),
          background: style.getPropertyValue('--oneimg-background'),
          foreground: style.getPropertyValue('--oneimg-foreground'),
          muted: style.getPropertyValue('--oneimg-muted'),
          surface: style.getPropertyValue('--oneimg-surface'),
        }
      })
      expect(contrastRatio(colors.accent, colors.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.accent, colors.muted)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.accent, colors.surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.foreground, colors.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('keeps the canonical reference viewport stable when the app viewport changes', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('参考视口固定后，这一段文字在不同窗口宽度下应保持相同换行和几何尺寸。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })

    const readGeometry = () => root.evaluate((element) => {
      const rootRect = element.getBoundingClientRect()
      const paragraph = element.querySelector<HTMLElement>('[data-node-type="paragraph"]')
      const paragraphRect = paragraph?.getBoundingClientRect()
      return {
        paragraphHeight: paragraphRect?.height ?? 0,
        paragraphWidth: paragraphRect?.width ?? 0,
        rootHeight: rootRect.height,
        rootWidth: rootRect.width,
      }
    })

    const wideGeometry = await readGeometry()
    await page.setViewportSize({ height: 800, width: 560 })
    const narrowGeometry = await readGeometry()
    await page.setViewportSize({ height: 1100, width: 1440 })
    const restoredGeometry = await readGeometry()

    expect(narrowGeometry.rootWidth).toBe(wideGeometry.rootWidth)
    expect(narrowGeometry.paragraphWidth).toBe(wideGeometry.paragraphWidth)
    expect(narrowGeometry.paragraphHeight).toBe(wideGeometry.paragraphHeight)
    expect(restoredGeometry.rootWidth).toBe(wideGeometry.rootWidth)
    expect(restoredGeometry.paragraphHeight).toBe(wideGeometry.paragraphHeight)
  })

  test('scrolls long content in edit and clean preview modes', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    const longText = Array.from({ length: 20 }, (_, index) => `第 ${index + 1} 段需要在长页面中保持可见。`).join('\n\n')

    await editor.fill(longText)
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })

    const scroller = page.getByTestId('studio-scroll-container')
    const editScroll = await readWheelScroll(page, scroller)
    expect(editScroll.scrollHeight).toBeGreaterThan(editScroll.clientHeight)
    expect(editScroll.after).toBeGreaterThan(0)

    await page.getByRole('button', { name: '清爽预览' }).click()
    await expect(root).toHaveAttribute('data-render-mode', 'preview')

    const previewScroll = await readWheelScroll(page, scroller)
    expect(previewScroll.scrollHeight).toBeGreaterThan(previewScroll.clientHeight)
    expect(previewScroll.after).toBeGreaterThan(0)
  })

  test('pastes semantic content locally as ordered safe blocks and undoes it once', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await dispatchPaste(editor, {
      html: `
        <h1 class="foreign-title" style="position: fixed; font-family: EvilFont">粘贴标题</h1>
        <p>第一段 <a href="https://example.com" onclick="alert('no')">安全链接</a></p>
        <ul><li>普通列表</li></ul>
        <blockquote>引用内容</blockquote>
        <pre><code>const answer = 42;</code></pre>
        <table style="width: 800px"><thead><tr><th>项目</th><th>值</th></tr></thead><tbody><tr><td>一个</td><td>两个</td></tr></tbody></table>
        <ul><li><input type="checkbox" checked>已完成</li><li><input type="checkbox">待处理</li></ul>
        <script>恶意脚本不应进入文档</script>
      `,
      text: '粘贴标题\n第一段 安全链接\n普通列表\n引用内容\nconst answer = 42;\n项目\t值\n一个\t两个\n- [x] 已完成\n- [ ] 待处理',
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({
      durableRevision: 2,
      meaningful: true,
      revision: 2,
      status: '已保存',
    })
    await expect(root.locator('[data-block-kind="rich-text"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"]')).toHaveCount(1)
    const semanticBlockKinds = await root.locator('[data-block-kind]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-kind'))
    ))
    expect(semanticBlockKinds).toEqual(['rich-text', 'data-table', 'checklist'])
    await expect(root.locator('[data-node-type="heading"]')).toHaveText('粘贴标题')
    await expect(root.locator('[data-node-type="bullet-list"]')).toContainText('普通列表')
    await expect(root.locator('[data-node-type="blockquote"]')).toContainText('引用内容')
    await expect(root.locator('[data-node-type="code-block"]')).toContainText('const answer = 42;')
    await expect(root.locator('a[href="https://example.com"]')).toHaveText('安全链接')
    await expect(root.locator('[data-block-kind="checklist"]')).toContainText('已完成')
    await expect(root.locator('[data-block-kind="checklist"]')).toContainText('待处理')
    await expect(root.locator('[data-block-kind="checklist"] input').first()).toBeDisabled()

    const renderedMarkup = await root.innerHTML()
    expect(renderedMarkup).not.toContain('EvilFont')
    expect(renderedMarkup).not.toContain('foreign-title')
    expect(renderedMarkup).not.toContain('恶意脚本不应进入文档')
    const ownedCss = await page.getByTestId('studio-editor').locator('style[data-oneimg-owned-style]').textContent()
    expect(ownedCss).not.toContain('EvilFont')
    expect(ownedCss).not.toContain('position: fixed')

    await editor.focus()
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2 })
    await expect(root.locator('[data-node-type="bullet-list"]')).toContainText('普通列表')

    const undo = page.getByRole('button', { name: '撤销' })
    const redo = page.getByRole('button', { name: '重做' })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, meaningful: false })
    await expect(root.locator('[data-block-kind]')).toHaveCount(0)

    await expect(redo).toBeEnabled()
    await redo.click()
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 4, meaningful: true })
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
  })

  test('parses Markdown and plain text without executing or retaining foreign presentation', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await dispatchPaste(editor, {
      text: `# Markdown 标题

Setext 标题
===

含有 **加粗**、\`内联代码\` 和 [安全链接](https://example.com)。
    const indented = true
- 普通列表一
- 普通列表二
1. 有序列表一
2. 有序列表二
> Markdown 引用
\`\`\`ts
const pasted = true
\`\`\`
| 名称 | 值 |
| --- | --- |
| 一 | 二 |
- [x] 已完成
- [ ] 待处理`,
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, meaningful: true, status: '已保存' })
    await expect(root.locator('[data-block-kind="rich-text"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"]')).toHaveCount(1)
    await expect(root.locator('[data-node-type="heading"]')).toHaveCount(2)
    await expect(root.locator('[data-node-type="heading"]').first()).toHaveText('Markdown 标题')
    await expect(root.locator('[data-node-type="heading"]').nth(1)).toHaveText('Setext 标题')
    await expect(root.locator('[data-node-type="ordered-list"]')).toContainText('有序列表二')
    await expect(root.locator('[data-node-type="code-block"]')).toHaveCount(2)
    await expect(root.locator('[data-node-type="code-block"]').first()).toContainText('const indented = true')
    await expect(root.locator('[data-node-type="code-block"]').last()).toContainText('const pasted = true')
    await expect(root.locator('strong')).toHaveText('加粗')
    await expect(root.locator('code').filter({ hasText: '内联代码' })).toHaveText('内联代码')
    await expect(root.locator('a[href="https://example.com"]')).toHaveText('安全链接')

    await page.reload()
    const restoredRoot = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(restoredRoot.locator('[data-block-kind="data-table"]')).toHaveCount(1)
    await expect(restoredRoot.locator('[data-block-kind="checklist"]')).toContainText('待处理')

    const plainEditor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await dispatchPaste(plainEditor, {
      html: '<div class="untrusted" style="position: absolute; width: 900px" onclick="steal()">普通文本 <a href="javascript:alert(1)">危险链接</a></div>',
      text: '普通文本 危险链接',
    })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, meaningful: true, status: '已保存' })
    await expect(restoredRoot.locator('[data-block-kind="rich-text"]')).toHaveCount(2)
    const pastedRichText = restoredRoot.locator('[data-block-kind="rich-text"]').last()
    await expect(pastedRichText.locator('a')).toHaveCount(0)
    const richTextContents = await restoredRoot.locator('[data-block-kind="rich-text"]').allTextContents()
    expect(richTextContents.at(-1)).toContain('普通文本 危险链接')
    const renderedMarkup = await pastedRichText.innerHTML()
    expect(renderedMarkup).not.toContain('untrusted')
    expect(renderedMarkup).not.toContain('position')
    expect(renderedMarkup).not.toContain('javascript:')
  })

  test('inserts a later paste after the active semantic block', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await dispatchPaste(root.locator('[contenteditable="true"]'), { text: '第一段粘贴内容' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, status: '已保存' })

    const firstBlockEditor = root.locator('[data-block-kind="rich-text"] [contenteditable="true"]').first()
    await dispatchPaste(firstBlockEditor, { text: '第二段粘贴内容' })
    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 3, status: '已保存' })
    await expect(root.locator('[data-block-kind]')).toHaveCount(2)

    const blockKinds = await root.locator('[data-block-kind]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-block-kind'))
    ))
    expect(blockKinds).toEqual(['rich-text', 'rich-text'])
    const contents = await root.locator('[data-block-kind="rich-text"]').allTextContents()
    expect(contents).toEqual(['第一段粘贴内容', '第二段粘贴内容'])
  })

  test('recognizes tab-separated tables and explicit checklists in plain clipboard text', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await dispatchPaste(root.locator('[contenteditable="true"]'), {
      text: '普通文本第一行 https://plain.example\n普通文本第二行\n\n项目\t值\n一个\t两个\n- [ ] 待处理',
    })

    await expect.poll(() => readStudioState(page)).toMatchObject({ revision: 2, meaningful: true, status: '已保存' })
    await expect(root.locator('[data-block-kind]')).toHaveCount(3)
    await expect(root.locator('[data-block-kind="data-table"] th')).toHaveText(['项目', '值'])
    await expect(root.locator('[data-block-kind="data-table"] td')).toHaveText(['一个', '两个'])
    await expect(root.locator('[data-block-kind="checklist"] input')).toHaveCount(1)
    await expect(root.locator('[data-block-kind="checklist"] input')).not.toBeChecked()
    await expect(root.locator('a[href="https://plain.example"]')).toHaveText('https://plain.example')
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
    await expect(page.getByTestId('studio-editor').getByText('主分支的第二版内容。')).toBeVisible()

    await competingPage.getByRole('button', { name: '查看冲突草稿' }).click()
    await expect(competingPage.getByTestId('studio-conflict-preview')).toBeVisible()
    await expect(competingPage.getByTestId('studio-editor').getByText('竞争分支的内容。')).toBeVisible()
    await expect(competingPage.getByTestId('studio-editor').locator('[contenteditable="true"]')).toHaveCount(0)
    await competingPage.getByRole('button', { name: '返回当前 Draft' }).click()

    await competingPage.getByRole('button', { name: '恢复已提交版本' }).click()
    await expect(competingPage.getByTestId('studio-editor').getByText('主分支的第二版内容。')).toBeVisible()
    await competingPage.close()
  })
})
