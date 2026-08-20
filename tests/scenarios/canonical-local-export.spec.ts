import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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
    await expect(root).toHaveAttribute('data-snapshot-id', 'canonical-wysiwyg-fixture-v1')
    await expect(root).toHaveAttribute('data-style-pack', 'oneimg-foundation@1')
    await expect(root.getByRole('heading', { name: '所见即所得' })).toBeVisible()
    await expect(root.getByText('Canonical preview, local PNG.')).toBeVisible()
    await expect(root.locator('section')).toHaveCount(4)

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
})
