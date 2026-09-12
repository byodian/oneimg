import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { type Page, expect, test } from '@playwright/test'

async function fillLongDocument(page: Page) {
  const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
  await root.locator('[contenteditable="true"]').evaluate((element) => {
    const data = new DataTransfer()
    data.setData('text/plain', '导出清晰长图')
    data.setData('text/html', Array.from({ length: 55 }, (_, index) => `<p>第 ${index + 1} 段：文字清晰，图片完整。</p>`).join(''))
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: data }))
  })
  await expect(root).toHaveAttribute('data-render-ready', 'true')
  return root
}

async function downloadFile(page: Page, buttonName: string) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: buttonName, exact: true }).click()
  const download = await pending
  const path = await download.path()
  if (!path) {
    throw new Error('Expected a downloaded file')
  }
  return { bytes: await readFile(path), filename: download.suggestedFilename() }
}

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('keeps 2× and 3× as whole PNGs and changes to ZIP only with the slice switch', async ({ page }) => {
  await page.goto('/studio')
  const root = await fillLongDocument(page)
  const height = await root.evaluate(element => element.getBoundingClientRect().height)
  expect(height).toBeGreaterThan(2048)
  expect(height).toBeLessThan(2800)
  const toggle = page.getByRole('switch', { name: '分片导出' })
  await expect(toggle).not.toBeChecked()

  for (const scale of [2, 3]) {
    await page.getByLabel('输出倍率').selectOption(String(scale))
    await expect(page.getByTestId('studio-slice-boundaries')).toHaveCount(0)
    const whole = await downloadFile(page, '导出 PNG')
    expect(whole.filename).toMatch(/\.png$/)
    expect(pngSize(whole.bytes)).toEqual({ width: 640 * scale, height: Math.ceil(height * scale) })
    await expect(page.getByTestId('studio-export-slices')).toHaveCount(0)
  }

  await toggle.check()
  await expect(page.getByTestId('studio-slice-boundaries')).toBeVisible()
  const sliced = await downloadFile(page, '导出分片 ZIP')
  expect(sliced.filename).toMatch(/\.zip$/)
  const zip = await JSZip.loadAsync(sliced.bytes)
  const files = Object.values(zip.files).filter(file => file.name.endsWith('.png'))
  expect(files.length).toBeGreaterThan(1)
  const dimensions = await Promise.all(files.map(async file => pngSize(await file.async('nodebuffer'))))
  expect(dimensions.every(size => size.width === 1920)).toBe(true)
  expect(dimensions.reduce((total, size) => total + size.height, 0)).toBe(Math.ceil(height * 3))
  const first = await downloadFile(page, '下载第 1 张')
  expect(first.bytes).toEqual(await zip.file('oneimg-slice-001.png')!.async('nodebuffer'))

  await toggle.uncheck()
  await expect(page.getByTestId('studio-export-slices')).toHaveCount(0)
  await expect(page.getByTestId('studio-slice-boundaries')).toHaveCount(0)
  const restored = await downloadFile(page, '导出 PNG')
  expect(restored.filename).toMatch(/\.png$/)
  expect(pngSize(restored.bytes)).toEqual({ width: 1920, height: Math.ceil(height * 3) })
  await expect(page.getByTestId('studio-export-plan')).toContainText('"cacheReuse":"hit"')
})

test('explains oversized whole images and enables export only after an explicit slice choice', async ({ page }) => {
  await page.goto('/studio')
  const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
  await root.locator('[contenteditable="true"]').fill(Array.from({ length: 150 }, (_, i) => `第 ${i + 1} 行完整保留`).join('\n'))
  await root.locator('[contenteditable="true"]').press('Escape')
  await expect(root).toHaveAttribute('data-render-ready', 'true')
  await page.getByLabel('输出倍率').selectOption('3')
  await expect(page.getByRole('switch', { name: '分片导出' })).not.toBeChecked()
  await expect(page.getByTestId('studio-export-panel')).toContainText('整图尺寸过大，请降低倍率或开启分片导出。')
  await expect(page.getByRole('button', { name: '导出 PNG', exact: true })).toBeDisabled()
  await expect(page.getByTestId('studio-slice-boundaries')).toHaveCount(0)
  await page.getByRole('switch', { name: '分片导出' }).check()
  await expect(page.getByRole('button', { name: '导出分片 ZIP' })).toBeEnabled()
})

for (const width of [1280, 390]) {
  test(`keeps sidebar controls compact and hides internal export details at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/studio')
    const editor = page.getByTestId('studio-editor').locator('[contenteditable="true"]')
    await editor.fill('清晰导出\n模板、主题与内容在预览中保持一致。')
    await editor.press('Escape')
    if (width < 1024) {
      await page.getByRole('navigation', { name: 'Studio 工作区' }).getByRole('button', { name: '配置' }).click()
    }
    const presentation = page.getByTestId('studio-presentation-panel')
    await expect(presentation).toBeVisible()
    await expect(presentation.locator('[data-template-preview]')).toHaveCount(4)
    await expect(presentation.getByRole('button', { name: '摘要简报' })).toBeVisible()
    expect(await presentation.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    const labels = await presentation.locator('span.truncate').evaluateAll(elements => elements.map(element => ({
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    })))
    expect(labels.every(label => label.height <= label.lineHeight)).toBe(true)
    await page.getByRole('button', { name: '潮汐', exact: true }).click()
    await expect(page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')).toHaveAttribute('data-theme-id', 'tide')
    await expect(page.getByRole('button', { name: '导出本地文件' })).toBeEnabled()
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath(`studio-config-${width}.png`) })
    if (width < 1280) {
      await page.getByRole('navigation', { name: 'Studio 工作区' }).getByRole('button', { name: '导出', exact: true }).click()
      await expect(page.getByRole('navigation', { name: 'Studio 工作区' }).getByRole('button', { name: '导出', exact: true })).toHaveAttribute('aria-current', 'page')
      await expect(page.getByTestId('studio-editor')).toBeHidden()
      expect(await page.getByTestId('studio-editor').locator('[data-oneimg-render-root]').evaluate(element => element.getBoundingClientRect().width)).toBe(640)
    }
    await expect(page.getByTestId('studio-export-panel')).toBeVisible()
    await expect(page.getByLabel('输出倍率').locator('option')).toHaveCount(3)
    await page.getByLabel('输出倍率').selectOption('3')
    await expect(page.getByRole('button', { name: '导出 PNG', exact: true })).toBeEnabled()
    await expect(page.getByTestId('studio-export-panel')).not.toContainText('无法计算图片尺寸')
    const artifact = await downloadFile(page, '导出 PNG')
    expect(pngSize(artifact.bytes).width).toBe(1920)
    await expect(page.getByTestId('studio-export-job-status')).toHaveText('已下载')
    await expect(page.getByRole('button', { name: '导出 PNG', exact: true })).toBeEnabled()
    await expect(page.getByText('查看导出详情')).toHaveCount(0)
    await expect(page.getByTestId('studio-export-receipt')).toHaveCount(0)
    await expect(page.getByTestId('studio-export-plan')).toBeHidden()
    const visibleText = await page.locator('body').innerText()
    expect(visibleText).not.toMatch(/Export Plan|Local Certified|Semantic Slice|规范化图片源|导出已完成：当前版本/)
    const output = page.getByTestId('studio-output-sidebar')
    expect(await output.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    if (width < 1280) {
      expect(await output.evaluate(element => element.getBoundingClientRect().width)).toBe(width)
    }
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath(`studio-output-${width}.png`) })
    await page.getByRole('tab', { name: '便携副本' }).click()
    await expect(page.getByRole('button', { name: '保存 .oneimg 副本' })).toBeVisible()
    await expect(page.getByTestId('studio-package-controls')).toHaveCount(1)
  })
}
