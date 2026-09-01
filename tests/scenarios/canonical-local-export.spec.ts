import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import JSZip from 'jszip'

function readPngDimensions(buffer: Buffer) {
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  }
}

function percentile(values: readonly number[], ratio: number) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}

async function compareSegmentsInBrowser(
  page: Page,
  preview: Buffer,
  segments: readonly Buffer[],
  plan: readonly { height: number; y: number }[],
) {
  return page.evaluate(async ({ plan, previewBase64, segmentBase64 }) => {
    const decode = async (base64: string) => {
      const response = await fetch(`data:image/png;base64,${base64}`)
      return createImageBitmap(await response.blob())
    }
    const previewImage = await decode(previewBase64)
    const segmentImages = await Promise.all(segmentBase64.map(decode))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    let maxChannelDelta = 0
    let totalChannelDelta = 0
    let sampleCount = 0

    const readPixels = (image: ImageBitmap, sourceY: number, height: number) => {
      canvas.width = image.width
      canvas.height = height
      context.clearRect(0, 0, image.width, height)
      context.drawImage(image, 0, sourceY, image.width, height, 0, 0, image.width, height)
      return context.getImageData(0, 0, image.width, height).data
    }
    const compareRows = (actual: Uint8ClampedArray, expected: Uint8ClampedArray) => {
      for (let offset = 0; offset < actual.length; offset += 4) {
        for (let channel = 0; channel < 4; channel += 1) {
          const delta = Math.abs(actual[offset + channel] - expected[offset + channel])
          maxChannelDelta = Math.max(maxChannelDelta, delta)
          totalChannelDelta += delta
        }
        sampleCount += 1
      }
    }

    for (let index = 0; index < plan.length; index += 1) {
      const segment = segmentImages[index]
      const descriptor = plan[index]
      if (!segment || !descriptor) {
        throw new Error(`Missing segment ${index}`)
      }
      compareRows(
        readPixels(segment, 0, segment.height),
        readPixels(previewImage, descriptor.y, descriptor.height),
      )
    }

    previewImage.close()
    segmentImages.forEach(image => image.close())
    return { maxChannelDelta, meanChannelDelta: totalChannelDelta / (sampleCount * 4) }
  }, {
    plan,
    previewBase64: preview.toString('base64'),
    segmentBase64: segments.map(segment => segment.toString('base64')),
  })
}

async function comparePngsInBrowser(page: Page, preview: Buffer, exported: Buffer) {
  return page.evaluate(async ({ previewBase64, exportedBase64 }) => {
    const decode = async (base64: string) => {
      const response = await fetch(`data:image/png;base64,${base64}`)
      return createImageBitmap(await response.blob())
    }
    const previewImage = await decode(previewBase64)
    const exportedImage = await decode(exportedBase64)
    const previewWidth = previewImage.width
    const previewHeight = previewImage.height
    const exportedWidth = exportedImage.width
    const exportedHeight = exportedImage.height

    const width = Math.max(previewWidth, exportedWidth)
    const height = Math.max(previewHeight, exportedHeight)
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
    const diffCanvas = document.createElement('canvas')
    diffCanvas.width = width
    diffCanvas.height = height
    const diffContext = diffCanvas.getContext('2d')!
    const diffImage = diffContext.createImageData(width, height)
    let materialPixels = 0
    let noisyPixels = 0
    let maxChannelDelta = 0
    let totalChannelDelta = 0

    for (let offset = 0; offset < previewPixels.length; offset += 4) {
      let pixelDelta = 0
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(previewPixels[offset + channel] - exportedPixels[offset + channel])
        pixelDelta = Math.max(pixelDelta, delta)
        maxChannelDelta = Math.max(maxChannelDelta, delta)
        totalChannelDelta += delta
      }

      if (pixelDelta > 8) {
        noisyPixels += 1
      }
      if (pixelDelta > 32) {
        materialPixels += 1
      }

      diffImage.data[offset] = 255
      diffImage.data[offset + 1] = Math.max(0, 96 - pixelDelta)
      diffImage.data[offset + 2] = Math.max(0, 96 - pixelDelta)
      diffImage.data[offset + 3] = pixelDelta > 8 ? Math.min(255, 64 + pixelDelta * 2) : 0
    }

    diffContext.putImageData(diffImage, 0, 0)
    const diffBlob = await new Promise<Blob>((resolve, reject) => {
      diffCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to encode diff')), 'image/png')
    })
    const diffBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result).split(',')[1]))
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsDataURL(diffBlob)
    })
    const pixelCount = width * height

    previewImage.close()
    exportedImage.close()

    return {
      diffBase64,
      exportedHeight,
      exportedWidth,
      materialPixelRatio: materialPixels / pixelCount,
      maxChannelDelta,
      meanChannelDelta: totalChannelDelta / (pixelCount * 4),
      noisyPixelRatio: noisyPixels / pixelCount,
      previewHeight,
      previewWidth,
    }
  }, {
    exportedBase64: exported.toString('base64'),
    previewBase64: preview.toString('base64'),
  })
}

test.describe('Canonical Renderer local export contract', () => {
  test('renders the controlled multilingual fixture through the production renderer', async ({ page }) => {
    await page.goto('/scenario/canonical-local-export')

    const preview = page.getByTestId('canonical-preview')
    const root = preview.locator('[data-oneimg-render-root]')

    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root).toHaveAttribute('data-pagination-state', 'ready')
    await expect(root).toHaveAttribute('data-snapshot-id', 'canonical-wysiwyg-fixture-v1')
    await expect(root).toHaveAttribute('data-style-pack', 'oneimg-foundation@3')
    await expect(root.getByRole('heading', { name: '所见即所得' })).toBeVisible()
    await expect(root.getByText('Canonical preview, local PNG.')).toBeVisible()
    await expect(root.locator('section')).toHaveCount(5)
    await expect(root.locator('.oneimg-unknown-block')).toContainText('类型 timeline')
    await expect(root.locator('.oneimg-unknown-fallback')).toContainText('保留内容')

    const fixtureImage = root.getByRole('img', { name: '蓝色山峰与橙色日光' })
    await expect(fixtureImage).toBeVisible()
    await expect(fixtureImage).toHaveJSProperty('complete', true)
    await expect(fixtureImage).toHaveJSProperty('naturalWidth', 904)
    await expect(root.locator('[data-layout="grid"]')).toHaveCSS('display', 'grid')
    await expect(root.locator('[data-layout="flex"]')).toHaveCSS('display', 'flex')
    await expect(root.locator('[data-surface="rounded"]')).toHaveCSS('border-radius', '24px')

    const geometry = await root.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const shadow = getComputedStyle(element.querySelector('[data-surface="rounded"]')!)

      return {
        fontFamily: style.fontFamily,
        height: rect.height,
        shadow: shadow.boxShadow,
        width: rect.width,
      }
    })

    expect(geometry.fontFamily).toContain('OneIMG Noto Sans SC')
    expect(geometry.width).toBe(640)
    expect(geometry.height).toBeGreaterThan(800)
    expect(geometry.shadow).not.toBe('none')

    const readiness = JSON.parse(await page.getByTestId('render-ready-diagnostics').textContent() ?? '{}') as {
      fontFallbackIds: string[]
      overflow: { horizontal: boolean; vertical: boolean }
      pagination: { final: boolean; pageCount: number }
      stableFrames: number
    }
    expect(readiness).toMatchObject({
      fontFallbackIds: [],
      overflow: { horizontal: false, vertical: false },
      pagination: { final: true, pageCount: 1 },
      stableFrames: 2,
    })
  })

  test('downloads a local PNG that is faithful to the visible preview', async ({ page }, testInfo) => {
    await page.goto('/scenario/canonical-local-export')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.locator('img')).toHaveJSProperty('naturalWidth', 904)
    await expect(root.getByRole('heading', { name: '所见即所得' })).toHaveCSS('font-size', '48px')
    const previewPng = await root.screenshot({ animations: 'disabled' })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the downloaded PNG path')
    }
    const exportedPng = await readFile(downloadPath)

    expect(download.suggestedFilename()).toBe('oneimg-canonical-wysiwyg-fixture-v1.png')
    expect(exportedPng.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

    const diagnosticNode = page.getByTestId('export-diagnostics')
    await expect(diagnosticNode).toBeVisible()
    const diagnostics = JSON.parse(await diagnosticNode.textContent() ?? '{}') as {
      adapterId: string
      previewFingerprint: string
      exportFingerprint: string
      snapshotId: string
      source: string
      embeddedImageCount: number
      geometry: Array<{
        id: string
        x: number
        y: number
        width: number
        height: number
      }>
      renderReadyMs: number
      rasterizeMs: number
      totalMs: number
      svgDataUrlBytes: number
      peakMemoryBytes: number | null
      memorySource: 'performance.memory' | 'unavailable'
    }
    expect(diagnostics).toMatchObject({
      adapterId: 'local-svg-foreign-object@1',
      snapshotId: 'canonical-wysiwyg-fixture-v1',
      source: 'canonical-svg-foreign-object',
    })
    expect(diagnostics.exportFingerprint).toBe(diagnostics.previewFingerprint)
    expect(diagnostics.embeddedImageCount).toBe(1)

    const previewGeometry = await root.evaluate((element) => {
      const rootRect = element.getBoundingClientRect()
      return Array.from(element.querySelectorAll<HTMLElement>('[data-block-id], [data-resource-id]'))
        .map((block) => {
          const rect = block.getBoundingClientRect()
          return {
            height: rect.height,
            id: block.dataset.blockId ?? block.dataset.resourceId ?? '',
            width: rect.width,
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
          }
        })
    })
    expect(diagnostics.geometry.map(geometry => geometry.id)).toEqual(previewGeometry.map(geometry => geometry.id))
    for (let index = 0; index < previewGeometry.length; index += 1) {
      const geometry = previewGeometry[index]
      const exportedGeometry = diagnostics.geometry[index]
      expect(Math.abs(exportedGeometry.x - geometry.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.y - geometry.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.width - geometry.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.height - geometry.height)).toBeLessThanOrEqual(1)
    }

    const repeatedDiagnostics = [] as Array<typeof diagnostics>
    const exportButton = page.getByRole('button', { name: '导出本地 PNG' })
    for (let repeat = 0; repeat < 3; repeat += 1) {
      const previousDiagnostics = await diagnosticNode.textContent()
      await expect(exportButton).toBeEnabled()
      const repeatedDownloadPromise = page.waitForEvent('download')
      await exportButton.click()
      const repeatedDownload = await repeatedDownloadPromise
      await repeatedDownload.path()
      await expect.poll(async () => diagnosticNode.textContent()).not.toBe(previousDiagnostics)
      repeatedDiagnostics.push(JSON.parse(await diagnosticNode.textContent() ?? '{}') as typeof diagnostics)
    }

    const comparison = await comparePngsInBrowser(page, previewPng, exportedPng)
    await testInfo.attach('canonical-preview.png', { body: previewPng, contentType: 'image/png' })
    await testInfo.attach('canonical-local-export.png', { body: exportedPng, contentType: 'image/png' })
    await testInfo.attach('canonical-pixel-diff.png', {
      body: Buffer.from(comparison.diffBase64, 'base64'),
      contentType: 'image/png',
    })
    await testInfo.attach('canonical-conformance.json', {
      body: Buffer.from(JSON.stringify({
        benchmark: {
          cold: diagnostics,
          repeated: repeatedDiagnostics,
        },
        comparison,
        diagnostics,
      }, null, 2)),
      contentType: 'application/json',
    })

    expect(comparison.exportedWidth).toBe(comparison.previewWidth)
    expect(comparison.exportedHeight).toBe(comparison.previewHeight)
    expect(comparison.previewWidth).toBe(640)
    expect(comparison.materialPixelRatio).toBeLessThanOrEqual(0.05)
    expect(comparison.meanChannelDelta).toBeLessThanOrEqual(4)
    expect(diagnostics.svgDataUrlBytes).toBeLessThanOrEqual(512 * 1024)
    expect(diagnostics.memorySource).toMatch(/^(performance\.memory|unavailable)$/)
    expect(repeatedDiagnostics).toHaveLength(3)
    expect(repeatedDiagnostics.every(repeated => (
      repeated.snapshotId === diagnostics.snapshotId
      && repeated.exportFingerprint === diagnostics.exportFingerprint
      && Number.isFinite(repeated.totalMs)
      && repeated.totalMs > 0
      && repeated.svgDataUrlBytes <= 512 * 1024
    ))).toBe(true)
  })

  test('runs the production Export Engine against the full WYSIWYG fixture', async ({ page }) => {
    await page.goto('/scenario/export-engine-wysiwyg')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root).toHaveAttribute('data-snapshot-id', 'canonical-wysiwyg-fixture-v1')
    await expect(root).toHaveAttribute('data-style-pack', 'oneimg-foundation@3')
    await expect(root.getByRole('heading', { name: '所见即所得' })).toBeVisible()
    await expect(root.getByText('Canonical preview, local PNG.')).toBeVisible()
    await expect(root.locator('section')).toHaveCount(5)
    await expect(root.locator('.oneimg-unknown-block')).toContainText('类型 timeline')
    await expect(root.locator('.oneimg-unknown-fallback')).toContainText('保留内容')
    await expect(root.getByRole('img', { name: '蓝色山峰与橙色日光' })).toHaveJSProperty('naturalWidth', 904)
    await expect(root.locator('[data-layout="grid"]')).toHaveCSS('display', 'grid')
    await expect(root.locator('[data-layout="flex"]')).toHaveCSS('display', 'flex')
    await expect(root.locator('[data-surface="rounded"]')).toHaveCSS('border-radius', '24px')
    const previewPng = await root.screenshot({ animations: 'disabled' })
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the Export Engine PNG path')
    }
    const exportedPng = await readFile(downloadPath)
    expect(download.suggestedFilename()).toBe('oneimg-canonical-wysiwyg-fixture-v1.png')

    const diagnostics = JSON.parse(await page.getByTestId('export-diagnostics').textContent() ?? '{}') as {
      adapterId: string
      embeddedImageCount: number
      exportFingerprint: string
      geometry: Array<{ height: number; id: string; width: number; x: number; y: number }>
      previewFingerprint: string
      snapshotId: string
      source: string
    }
    expect(diagnostics).toMatchObject({
      adapterId: 'local-svg-foreign-object@1',
      embeddedImageCount: 1,
      snapshotId: 'canonical-wysiwyg-fixture-v1',
      source: 'canonical-svg-foreign-object',
    })
    expect(diagnostics.exportFingerprint).toBe(diagnostics.previewFingerprint)

    const previewGeometry = await root.evaluate((element) => {
      const rootRect = element.getBoundingClientRect()
      return Array.from(element.querySelectorAll<HTMLElement>('[data-block-id], [data-resource-id]'))
        .map((block) => {
          const rect = block.getBoundingClientRect()
          return {
            height: rect.height,
            id: block.dataset.blockId ?? block.dataset.resourceId ?? '',
            width: rect.width,
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
          }
        })
    })
    expect(diagnostics.geometry.map(geometry => geometry.id)).toEqual(previewGeometry.map(geometry => geometry.id))
    for (let index = 0; index < previewGeometry.length; index += 1) {
      const geometry = previewGeometry[index]
      const exportedGeometry = diagnostics.geometry[index]
      expect(Math.abs(exportedGeometry.x - geometry.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.y - geometry.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.width - geometry.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(exportedGeometry.height - geometry.height)).toBeLessThanOrEqual(1)
    }

    const comparison = await comparePngsInBrowser(page, previewPng, exportedPng)
    expect(comparison.exportedWidth).toBe(comparison.previewWidth)
    expect(comparison.exportedHeight).toBe(comparison.previewHeight)
    expect(comparison.previewWidth).toBe(640)
    // The structural assertions above are release-blocking; this calibrated
    // pixel allowance covers Chromium's text/shadow antialiasing differences.
    expect(comparison.materialPixelRatio).toBeLessThanOrEqual(0.05)
    expect(comparison.meanChannelDelta).toBeLessThanOrEqual(4)
    await expect(page.getByTestId('export-status')).toHaveText('已完成')
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
  })

  test('keeps protected template blocks intact when a long page is segmented', async ({ page }) => {
    await page.goto('/scenario/export-engine-long')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    const plan = JSON.parse(await page.getByTestId('export-plan').textContent() ?? '{}') as {
      slices: Array<{
        boundary: { kind: string }
        height: number
        y: number
      }>
    }
    expect(plan.slices.length).toBeGreaterThan(1)
    expect(plan.slices.some(slice => slice.boundary.kind === 'heading')).toBe(true)

    const keepTogetherRanges = await root.locator('[data-keep-together="true"]').evaluateAll((elements) => {
      const rootElement = elements[0]?.closest<HTMLElement>('[data-oneimg-render-root]')
      if (!rootElement) {
        return []
      }
      const rootRect = rootElement.getBoundingClientRect()
      return elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          end: rect.bottom - rootRect.top,
          start: rect.top - rootRect.top,
        }
      }).filter(range => range.end > range.start)
    })
    expect(keepTogetherRanges.length).toBeGreaterThan(0)
    for (const slice of plan.slices.slice(0, -1)) {
      const cutY = slice.y + slice.height
      expect(keepTogetherRanges.some(range => cutY > range.start && cutY < range.end)).toBe(false)
    }
  })

  test('runs the segmented Page path through the production Export Engine', async ({ page }) => {
    await page.goto('/scenario/export-engine-long')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.locator('img')).toHaveCount(20)

    const exportPlan = JSON.parse(await page.getByTestId('export-plan').textContent() ?? '{}') as {
      pageCount: number
      slices: Array<{
        boundary: { kind: string }
        height: number
        index: number
        y: number
      }>
      sliceCount: number
    }
    expect(exportPlan.pageCount).toBe(1)
    expect(exportPlan.sliceCount).toBeGreaterThan(1)
    expect(exportPlan.slices.some(slice => ['block', 'heading', 'keep-together', 'section'].includes(slice.boundary.kind))).toBe(true)
    expect(exportPlan.slices).toHaveLength(exportPlan.sliceCount)
    for (let index = 1; index < exportPlan.slices.length; index += 1) {
      const previous = exportPlan.slices[index - 1]
      const current = exportPlan.slices[index]
      expect(current.y).toBe(previous.y + previous.height)
    }

    const previewPng = await root.screenshot({ animations: 'disabled' })
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the segmented Export Engine path')
    }
    const exportedZip = await JSZip.loadAsync(await readFile(downloadPath))
    expect(download.suggestedFilename()).toBe('oneimg-canonical-long-resource-fixture-v1.zip')
    const diagnostics = JSON.parse(await page.getByTestId('export-diagnostics').textContent() ?? '{}') as {
      format: string
      packagingChunkCount: number
      segmentCount: number
      segmented: boolean
      segmentPlan: Array<{
        height: number
        semanticSlice: {
          boundary: { kind: string }
          height: number
          index: number
          y: number
        }
        y: number
      }>
    }
    const entries = Object.keys(exportedZip.files).filter(name => name.endsWith('.png')).sort()
    expect(diagnostics).toMatchObject({ format: 'zip', segmented: true })
    expect(diagnostics.packagingChunkCount).toBeGreaterThan(1)
    expect(diagnostics.segmentCount).toBeGreaterThan(1)
    expect(entries).toHaveLength(diagnostics.segmentCount)
    expect(entries).toEqual(entries.map((_entry, index) => `oneimg-slice-${String(index + 1).padStart(3, '0')}.png`))
    expect(diagnostics.segmentPlan).toHaveLength(diagnostics.segmentCount)
    expect(diagnostics.segmentPlan.map(segment => segment.semanticSlice)).toEqual(exportPlan.slices)
    for (let index = 1; index < diagnostics.segmentPlan.length; index += 1) {
      const previous = diagnostics.segmentPlan[index - 1]
      const current = diagnostics.segmentPlan[index]
      expect(current.y).toBe(previous.y + previous.height)
    }
    const rootHeight = await root.evaluate(element => element.getBoundingClientRect().height)
    const lastSegment = diagnostics.segmentPlan.at(-1)
    expect(lastSegment).toBeDefined()
    expect(lastSegment!.y + lastSegment!.height).toBe(Math.ceil(rootHeight))
    const segmentBuffers = await Promise.all(entries.map(async (name) => {
      const entry = exportedZip.file(name)
      if (!entry) {
        throw new Error(`Missing ZIP entry ${name}`)
      }
      return Buffer.from(await entry.async('nodebuffer'))
    }))
    expect(segmentBuffers.map(readPngDimensions)).toEqual(diagnostics.segmentPlan.map(segment => ({
      height: segment.height,
      width: 640,
    })))
    const segmentComparison = await compareSegmentsInBrowser(
      page,
      previewPng,
      segmentBuffers,
      diagnostics.segmentPlan,
    )
    expect(segmentComparison.meanChannelDelta).toBeLessThanOrEqual(12)

    const sliceDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载 Slice 1' }).click()
    const sliceDownload = await sliceDownloadPromise
    const sliceDownloadPath = await sliceDownload.path()
    if (!sliceDownloadPath) {
      throw new Error('Playwright did not expose the individual Slice download path')
    }
    expect(sliceDownload.suggestedFilename()).toBe('oneimg-slice-001.png')
    expect((await readFile(sliceDownloadPath)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    await expect(page.getByTestId('export-status')).toHaveText('已完成')
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
  })

  test('cancels after ZIP packaging emits a chunk and preserves the next export', async ({ page }) => {
    await page.goto('/scenario/export-engine-long?cancelAfterPackagingChunk=1')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')

    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    await expect(page.getByTestId('export-status')).toHaveText('已取消', { timeout: 15_000 })
    await expect(page.getByTestId('export-diagnostics')).toHaveCount(0)
    await expect(page.getByTestId('export-slices')).toHaveCount(0)
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)

    const retryDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const retryDownload = await retryDownloadPromise
    await retryDownload.path()
    await expect(page.getByTestId('export-status')).toHaveText('已完成', { timeout: 15_000 })
    await expect(page.getByTestId('export-slices')).toBeVisible()
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
  })

  test('keeps a fractional Canonical geometry plan stable at 2×', async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
      HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
        const rect = originalGetBoundingClientRect.call(this)
        if (!this.matches('[data-oneimg-render-root]')) {
          return rect
        }
        return DOMRect.fromRect({
          height: rect.height + 0.25,
          width: rect.width + 0.25,
          x: rect.x,
          y: rect.y,
        })
      }
    })
    await page.goto('/scenario/export-engine-wysiwyg?scale=2')

    const root = page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the fractional-geometry export path')
    }
    expect(readPngDimensions(await readFile(downloadPath)).width).toBe(1281)
    await expect(page.getByTestId('export-status')).toHaveText('已完成')
  })
})

test.describe('Long-page Resource Resolver lifecycle contract', () => {
  test('renders twenty aspect-ratio images as bounded segments and audits cleanup', async ({ page }, testInfo) => {
    await page.goto('/scenario/canonical-long-export')

    const preview = page.getByTestId('canonical-preview')
    const root = preview.locator('[data-oneimg-render-root]')
    await expect(root).toHaveAttribute('data-render-ready', 'true')
    await expect(root.locator('img')).toHaveCount(20)

    const dimensions = await root.locator('img').evaluateAll(images => images.map(image => ({
      height: (image as HTMLImageElement).naturalHeight,
      width: (image as HTMLImageElement).naturalWidth,
    })))
    expect(new Set(dimensions.map(({ width, height }) => `${width}x${height}`)).size).toBe(20)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出本地 PNG' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Playwright did not expose the segmented export path')
    }
    const exportedZip = await JSZip.loadAsync(await readFile(downloadPath))
    expect(download.suggestedFilename()).toBe('oneimg-canonical-long-resource-fixture-v1.zip')
    expect((await readFile(downloadPath)).subarray(0, 2)).toEqual(Buffer.from([80, 75]))
    await expect(page.getByTestId('export-diagnostics')).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => {
      const audit = JSON.parse(await page.getByTestId('resource-audit').textContent() ?? '{}') as {
        activeObjectUrls: number
        activeSessions: number
        createdObjectUrls: number
        revokedObjectUrls: number
      }
      return [audit.activeSessions, audit.activeObjectUrls, audit.createdObjectUrls, audit.revokedObjectUrls]
    }).toEqual([1, 23, 46, 23])

    const diagnostics = JSON.parse(await page.getByTestId('export-diagnostics').textContent() ?? '{}') as {
      cleanupAudit: {
        arrayBuffersReceived: number
        arrayBuffersReleased: number
        cancelLatencyMs: number | null
        canvasCreated: number
        canvasDisposed: number
        imageBitmapsCreated: number
        imageBitmapsClosed: number
        requested: number
        temporaryCacheEntriesCreated: number
        temporaryCacheEntriesRetained: number
        temporaryCacheEntriesReleased: number
        temporaryObjectUrlsRevoked: number
        workerObjectUrlRevoked: boolean
        workerTerminated: boolean
      }
      embeddedImageCount: number
      format: string
      longTaskCount: number
      longTaskMs: number
      memorySource: 'performance.memory' | 'unavailable'
      peakMemoryBytes: number | null
      peakEstimatedRasterBytes: number
      resourceCount: number
      segmentBleed: number
      segmentCount: number
      segmentPlan: Array<{
        captureHeight: number
        captureY: number
        height: number
        index: number
        trimTop: number
        y: number
      }>
      segmented: boolean
      totalMs: number
      workerAvailable: boolean
      workerFallbackCount: number
      workerUsed: boolean
    }
    const progressHistory = JSON.parse(await page.getByTestId('export-progress-history').textContent() ?? '[]') as Array<{
      completed: number
      stage: string
      total: number
    }>
    const packagingProgress = progressHistory.filter(progress => progress.stage === 'packaging')
    const distinctPackagingProgress = packagingProgress.filter((progress, index) => (
      index === 0 || progress.completed !== packagingProgress[index - 1]?.completed
    ))

    expect(diagnostics).toMatchObject({
      embeddedImageCount: 20,
      format: 'zip',
      resourceCount: 23,
      segmented: true,
      workerAvailable: true,
    })
    expect(packagingProgress.length).toBeGreaterThan(1)
    expect(distinctPackagingProgress[0]).toMatchObject({ completed: 0, total: 100 })
    expect(distinctPackagingProgress.at(-1)).toMatchObject({ completed: 100, total: 100 })
    for (let index = 1; index < distinctPackagingProgress.length; index += 1) {
      const previous = distinctPackagingProgress[index - 1]!
      const current = distinctPackagingProgress[index]!
      expect(current.completed).toBeGreaterThanOrEqual(previous.completed)
      expect(current.completed === 100 || current.completed - previous.completed >= 5).toBe(true)
    }
    expect(diagnostics.segmentCount).toBeGreaterThan(1)
    expect(diagnostics.cleanupAudit.requested).toBeGreaterThan(0)
    expect(diagnostics.segmentBleed).toBe(80)
    expect(diagnostics.segmentPlan).toHaveLength(diagnostics.segmentCount)
    expect(diagnostics.segmentPlan[0]).toMatchObject({ index: 0, y: 0 })
    for (let index = 1; index < diagnostics.segmentPlan.length; index += 1) {
      const previous = diagnostics.segmentPlan[index - 1]
      const current = diagnostics.segmentPlan[index]
      expect(current.index).toBe(index)
      expect(current.y).toBe(previous.y + previous.height)
    }
    const rootHeight = await root.evaluate(element => element.getBoundingClientRect().height)
    const lastSegment = diagnostics.segmentPlan.at(-1)
    expect(lastSegment).toBeDefined()
    expect(lastSegment!.y + lastSegment!.height).toBe(Math.ceil(rootHeight))
    for (const segment of diagnostics.segmentPlan) {
      expect(segment.captureY).toBe(Math.max(0, segment.y - diagnostics.segmentBleed))
      expect(segment.captureY + segment.captureHeight).toBe(Math.min(
        Math.ceil(rootHeight),
        segment.y + segment.height + diagnostics.segmentBleed,
      ))
      expect(segment.trimTop).toBe(segment.y - segment.captureY)
    }
    const zipEntries = Object.keys(exportedZip.files).filter(name => name.endsWith('.png')).sort()
    expect(zipEntries).toHaveLength(diagnostics.segmentCount)
    const segmentBuffers = await Promise.all(zipEntries.map(async (name) => {
      const entry = exportedZip.file(name)
      if (!entry) {
        throw new Error(`Missing ZIP entry ${name}`)
      }
      return Buffer.from(await entry.async('nodebuffer'))
    }))
    const segmentDimensions = segmentBuffers.map(readPngDimensions)
    expect(segmentDimensions).toEqual(diagnostics.segmentPlan.map(segment => ({
      height: segment.height,
      width: 640,
    })))
    const segmentComparison = await compareSegmentsInBrowser(
      page,
      await root.screenshot({ animations: 'disabled' }),
      segmentBuffers,
      diagnostics.segmentPlan,
    )
    expect(segmentComparison.meanChannelDelta).toBeLessThanOrEqual(12)
    expect(diagnostics.cleanupAudit).toMatchObject({
      workerObjectUrlRevoked: true,
      workerTerminated: true,
    })
    expect(diagnostics.cleanupAudit.canvasDisposed).toBe(diagnostics.cleanupAudit.canvasCreated)
    expect(diagnostics.cleanupAudit.imageBitmapsClosed).toBe(diagnostics.cleanupAudit.imageBitmapsCreated)
    expect(diagnostics.cleanupAudit.arrayBuffersReleased).toBe(diagnostics.cleanupAudit.arrayBuffersReceived)
    expect(diagnostics.cleanupAudit.temporaryCacheEntriesReleased + diagnostics.cleanupAudit.temporaryCacheEntriesRetained)
      .toBe(diagnostics.cleanupAudit.temporaryCacheEntriesCreated)
    expect(diagnostics.cleanupAudit.temporaryCacheEntriesRetained).toBe(diagnostics.segmentCount)
    await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)

    const timingSamples = [diagnostics]
    const exportButton = page.getByRole('button', { name: '导出本地 PNG' })
    for (let repeat = 0; repeat < 4; repeat += 1) {
      const previous = await page.getByTestId('export-diagnostics').textContent()
      const repeatedDownloadPromise = page.waitForEvent('download')
      await exportButton.click()
      const repeatedDownload = await repeatedDownloadPromise
      await repeatedDownload.path()
      await expect.poll(async () => page.getByTestId('export-diagnostics').textContent()).not.toBe(previous)
      timingSamples.push(JSON.parse(await page.getByTestId('export-diagnostics').textContent() ?? '{}') as typeof diagnostics)
    }
    const sortedTotalMs = timingSamples.map(sample => sample.totalMs).sort((left, right) => left - right)
    await testInfo.attach('oneimg-long-resource-baseline.json', {
      body: Buffer.from(JSON.stringify({
        fixture: { imageCount: 20, resourceCount: diagnostics.resourceCount, segmentCount: diagnostics.segmentCount },
        cleanup: diagnostics.cleanupAudit,
        longTask: timingSamples.map(sample => ({ count: sample.longTaskCount, totalMs: sample.longTaskMs })),
        memory: timingSamples.map(sample => ({
          estimatedRasterBytes: sample.peakEstimatedRasterBytes,
          heapBytes: sample.peakMemoryBytes,
          source: sample.memorySource,
        })),
        timingMs: {
          p50: percentile(sortedTotalMs, 0.5),
          p95: percentile(sortedTotalMs, 0.95),
          samples: sortedTotalMs,
        },
      }, null, 2)),
      contentType: 'application/json',
    })

    await page.getByRole('button', { name: '释放预览资源' }).click()
    await expect(root).toHaveCount(0)
    const resolverAudit = JSON.parse(await page.getByTestId('resource-audit').textContent() ?? '{}') as {
      activeObjectUrls: number
      activeSessions: number
      createdObjectUrls: number
      revokedObjectUrls: number
    }
    expect(resolverAudit.activeSessions).toBe(0)
    expect(resolverAudit.activeObjectUrls).toBe(0)
    expect(resolverAudit.revokedObjectUrls).toBe(resolverAudit.createdObjectUrls)
  })

  test('cancels a segmented export before a late completion can publish it', async ({ page }, testInfo) => {
    await page.goto('/scenario/canonical-long-export')

    const cancelAudits: Array<{
      cancelLatencyMs: number
      cleanupAudit: {
        arrayBuffersReceived: number
        arrayBuffersReleased: number
        cancelLatencyMs: number | null
        canvasCreated: number
        canvasDisposed: number
        imageBitmapsCreated: number
        imageBitmapsClosed: number
        temporaryCacheEntriesCreated: number
        temporaryCacheEntriesRetained: number
        temporaryCacheEntriesReleased: number
        workerObjectUrlRevoked: boolean
        workerTerminated: boolean
      }
    }> = []
    for (let repeat = 0; repeat < 3; repeat += 1) {
      const exportButton = page.getByRole('button', { name: '导出本地 PNG' })
      await expect(exportButton).toBeEnabled()
      await exportButton.click()
      const cancelButton = page.getByRole('button', { name: '取消导出' })
      await expect(cancelButton).toBeVisible()
      await cancelButton.click()

      await expect(page.getByTestId('export-status')).toHaveText('已取消')
      await expect(page.getByTestId('export-diagnostics')).toHaveCount(0)
      await expect.poll(async () => {
        const text = await page.getByTestId('export-audit').textContent()
        return JSON.parse(text ?? '{}').stage
      }).toBe('cleanup')

      const audit = JSON.parse(await page.getByTestId('export-audit').textContent() ?? '{}') as {
        cleanupAudit: {
          arrayBuffersReceived: number
          arrayBuffersReleased: number
          cancelLatencyMs: number | null
          canvasCreated: number
          canvasDisposed: number
          imageBitmapsCreated: number
          imageBitmapsClosed: number
          temporaryCacheEntriesCreated: number
          temporaryCacheEntriesRetained: number
          temporaryCacheEntriesReleased: number
          workerObjectUrlRevoked: boolean
          workerTerminated: boolean
        }
        stage: string
      }
      expect(audit.stage).toBe('cleanup')
      expect(audit.cleanupAudit.workerTerminated).toBe(true)
      expect(audit.cleanupAudit.workerObjectUrlRevoked).toBe(true)
      expect(audit.cleanupAudit.canvasDisposed).toBe(audit.cleanupAudit.canvasCreated)
      expect(audit.cleanupAudit.imageBitmapsClosed).toBe(audit.cleanupAudit.imageBitmapsCreated)
      expect(audit.cleanupAudit.arrayBuffersReleased).toBe(audit.cleanupAudit.arrayBuffersReceived)
      expect(audit.cleanupAudit.temporaryCacheEntriesReleased + audit.cleanupAudit.temporaryCacheEntriesRetained)
        .toBe(audit.cleanupAudit.temporaryCacheEntriesCreated)
      expect(audit.cleanupAudit.temporaryCacheEntriesRetained).toBe(0)
      await expect(page.locator('[data-oneimg-inert-render-session]')).toHaveCount(0)
      expect(audit.cleanupAudit.cancelLatencyMs).not.toBeNull()
      expect(audit.cleanupAudit.cancelLatencyMs!).toBeLessThan(500)
      cancelAudits.push({
        cancelLatencyMs: audit.cleanupAudit.cancelLatencyMs!,
        cleanupAudit: audit.cleanupAudit,
      })
    }

    const cancelLatencySamples = cancelAudits.map(audit => audit.cancelLatencyMs)
    await testInfo.attach('oneimg-cancel-baseline.json', {
      body: Buffer.from(JSON.stringify({
        cleanup: cancelAudits.map(audit => audit.cleanupAudit),
        cancelLatencyMs: {
          p50: percentile(cancelLatencySamples, 0.5),
          p95: percentile(cancelLatencySamples, 0.95),
          samples: cancelLatencySamples,
        },
      }, null, 2)),
      contentType: 'application/json',
    })

    await page.getByRole('button', { name: '释放预览资源' }).click()
    await expect(page.getByTestId('resource-audit')).toContainText('"activeSessions":0')
  })

  test('cancels at every export stage checkpoint and balances each session', async ({ page }, testInfo) => {
    const stages = ['render-ready', 'serializing', 'encoding', 'packaging'] as const
    const stageAudits: Array<{
      cancelLatencyMs: number | null
      cleanupAudit: {
        arrayBuffersReceived: number
        arrayBuffersReleased: number
        canvasCreated: number
        canvasDisposed: number
        imageBitmapsCreated: number
        imageBitmapsClosed: number
        temporaryCacheEntriesCreated: number
        temporaryCacheEntriesRetained: number
        temporaryCacheEntriesReleased: number
        workerObjectUrlRevoked: boolean
        workerTerminated: boolean
      }
      stage: string
    }> = []

    for (const stage of stages) {
      await page.goto(`/scenario/canonical-long-export?cancelStage=${stage}`)
      await expect(page.getByTestId('canonical-preview').locator('[data-oneimg-render-root]'))
        .toHaveAttribute('data-render-ready', 'true')

      await page.getByRole('button', { name: '导出本地 PNG' }).click()
      await expect.poll(async () => {
        const audit = JSON.parse(await page.getByTestId('export-audit').textContent() ?? '{}') as { stage?: string }
        return audit.stage
      }, { timeout: 15_000 }).toBe(stage)

      await page.getByRole('button', { name: '取消导出' }).click()
      await expect(page.getByTestId('export-status')).toHaveText('已取消')
      await expect(page.getByTestId('export-diagnostics')).toHaveCount(0)
      await expect.poll(async () => {
        const audit = JSON.parse(await page.getByTestId('export-audit').textContent() ?? '{}') as { stage?: string }
        return audit.stage
      }).toBe('cleanup')

      const audit = JSON.parse(await page.getByTestId('export-audit').textContent() ?? '{}') as {
        cleanupAudit: {
          arrayBuffersReceived: number
          arrayBuffersReleased: number
          cancelLatencyMs: number | null
          canvasCreated: number
          canvasDisposed: number
          imageBitmapsCreated: number
          imageBitmapsClosed: number
          temporaryCacheEntriesCreated: number
          temporaryCacheEntriesRetained: number
          temporaryCacheEntriesReleased: number
          workerObjectUrlRevoked: boolean
          workerTerminated: boolean
        }
        stage: string
      }
      expect(audit.stage).toBe('cleanup')
      expect(audit.cleanupAudit.workerObjectUrlRevoked).toBe(true)
      expect(audit.cleanupAudit.workerTerminated).toBe(true)
      expect(audit.cleanupAudit.canvasDisposed).toBe(audit.cleanupAudit.canvasCreated)
      expect(audit.cleanupAudit.imageBitmapsClosed).toBe(audit.cleanupAudit.imageBitmapsCreated)
      expect(audit.cleanupAudit.arrayBuffersReleased).toBe(audit.cleanupAudit.arrayBuffersReceived)
      expect(audit.cleanupAudit.temporaryCacheEntriesReleased)
        .toBe(audit.cleanupAudit.temporaryCacheEntriesCreated - audit.cleanupAudit.temporaryCacheEntriesRetained)
      expect(audit.cleanupAudit.temporaryCacheEntriesRetained).toBe(0)
      expect(audit.cleanupAudit.cancelLatencyMs).not.toBeNull()
      expect(audit.cleanupAudit.cancelLatencyMs!).toBeLessThan(500)
      await expect.poll(async () => {
        const resourceAudit = JSON.parse(await page.getByTestId('resource-audit').textContent() ?? '{}') as {
          activeObjectUrls: number
          activeSessions: number
          createdObjectUrls: number
          revokedObjectUrls: number
        }
        return [
          resourceAudit.activeSessions,
          resourceAudit.activeObjectUrls,
          resourceAudit.createdObjectUrls,
          resourceAudit.revokedObjectUrls,
        ]
      }).toEqual([1, 23, 46, 23])

      stageAudits.push({
        cancelLatencyMs: audit.cleanupAudit.cancelLatencyMs,
        cleanupAudit: audit.cleanupAudit,
        stage,
      })
    }

    await testInfo.attach('oneimg-stage-cancel-baseline.json', {
      body: Buffer.from(JSON.stringify({
        stages: stageAudits,
        cancelLatencyMs: stageAudits.map(audit => ({
          stage: audit.stage,
          value: audit.cancelLatencyMs,
        })),
      }, null, 2)),
      contentType: 'application/json',
    })

    await page.getByRole('button', { name: '释放预览资源' }).click()
    await expect(page.getByTestId('resource-audit')).toContainText('"activeSessions":0')
  })
})

test('cancels Resource Resolver work and revokes every late Blob URL', async ({ page }) => {
  await page.route('**/scenario/slow-resource.svg', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 1_000))
    await route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="904" height="680"><rect width="904" height="680" fill="#263b6b"/></svg>',
      contentType: 'image/svg+xml',
      status: 200,
    })
  })
  await page.goto('/scenario/resource-resolver-lifecycle')

  await expect(page.getByRole('button', { name: '取消资源解析' })).toBeEnabled()
  await page.getByRole('button', { name: '取消资源解析' }).click()
  await expect(page.getByTestId('resolver-status')).toHaveText('已取消')
  await expect.poll(async () => page.getByTestId('resource-audit').textContent()).toContain('"activeSessions":0')

  const audit = JSON.parse(await page.getByTestId('resource-audit').textContent() ?? '{}') as {
    activeObjectUrls: number
    activeSessions: number
    createdObjectUrls: number
    revokedObjectUrls: number
  }
  expect(audit.activeSessions).toBe(0)
  expect(audit.activeObjectUrls).toBe(0)
  expect(audit.revokedObjectUrls).toBe(audit.createdObjectUrls)
})
