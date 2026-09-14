import { type Page, expect, test } from '@playwright/test'
import {
  createDocumentSession,
  createMediaGroupBlock,
  createMediaItem,
  createRichTextBlock,
  createUntouchedDocumentRevision,
  deserializeDocumentRevision,
  serializeDocumentRevision,
} from '../../src/features/document-core'
import { createSocialShareConversion } from '../../src/features/social-share'
import { createSocialFilenamePrefix } from '../../src/features/social-share/output'

function source() {
  const session = createDocumentSession(createUntouchedDocumentRevision({ documentId: 'source' }))
  const blocks = [
    createRichTextBlock('heading', { type: 'doc', children: [{ type: 'paragraph', text: '旅行记忆' }] }),
    createMediaGroupBlock({
      id: 'photos',
      caption: '一路向北',
      items: [
        createMediaItem({ id: 'first', assetId: 'photo-red', caption: '第一天', alternativeText: '红色山峰' }),
        createMediaItem({ id: 'second', assetId: 'photo-blue', caption: '第二天', alternativeText: '蓝色海岸' }),
      ],
    }),
  ]
  blocks.forEach((block, index) => {
    session.commit({ type: 'insert-block', block, index, pageId: 'source:page-1' })
  })
  return session.getRevision()
}

test('converts a share set into independent same-format pages without changing authored order or the source', () => {
  const original = source()
  const before = JSON.stringify(original)
  const converted = createSocialShareConversion(original, { mode: 'set', format: 'portrait-4-5', documentId: 'copy' })
  expect(converted.id).toBe('copy')
  expect(converted.revision).toBe(1)
  expect(deserializeDocumentRevision(serializeDocumentRevision(converted))).toEqual(converted)
  expect(converted.pages).toHaveLength(2)
  expect(converted.pages.map(page => page.format)).toEqual([
    { kind: 'bounded', preset: 'portrait-4-5', width: 640, height: 800 },
    { kind: 'bounded', preset: 'portrait-4-5', width: 640, height: 800 },
  ])
  const items = converted.pages.flatMap(page => page.blocks.flatMap(block => block.kind === 'media-group' ? block.items : []))
  expect(items.map(item => [item.id, item.assetId, item.caption, item.alternativeText])).toEqual([
    ['first', 'photo-red', '第一天', '红色山峰'], ['second', 'photo-blue', '第二天', '蓝色海岸'],
  ])
  expect(converted.pages[0]!.blocks[0]!.id).toBe('heading')
  expect(JSON.stringify(original)).toBe(before)
})

test('composes one page and previews a new ratio as another independent conversion', () => {
  const composed = createSocialShareConversion(source(), { mode: 'together', format: 'square', documentId: 'square-copy' })
  expect(composed.pages).toHaveLength(1)
  expect(composed.pages[0]!.blocks).toHaveLength(2)
  const story = createSocialShareConversion(composed, { mode: 'set', format: 'story-9-16', documentId: 'story-copy' })
  expect(story.pages).toHaveLength(2)
  expect(story.pages[0]!.format).toEqual({ kind: 'bounded', preset: 'story-9-16', width: 630, height: 1120 })
  expect(composed.pages[0]!.format).toEqual({ kind: 'bounded', preset: 'square', width: 640, height: 640 })
})

async function importPhotoFiles(page: Page, count = 2) {
  await page.getByTestId('studio-asset-input').evaluate(async (element, count) => {
    const transfer = new DataTransfer()
    const colors = Array.from({ length: count }, (_, index) => index % 2 === 0 ? '#e33b47' : '#287cce')
    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index]!
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 60
      const context = canvas.getContext('2d')!
      context.fillStyle = color
      context.fillRect(0, 0, 80, 60)
      context.fillStyle = '#162130'
      context.fillRect(0, 0, 15, 60)
      context.fillStyle = '#ffffff'
      context.fillRect(65, 0, 15, 60)
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'))
      transfer.items.add(new File([blob], `private-photo-${index}.png`, { type: 'image/png' }))
    }
    const input = element as HTMLInputElement
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, count)
}

async function addPhotos(page: Page) {
  await importPhotoFiles(page)
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveCount(2)
  await expect(page.getByTestId('studio-document-state')).toContainText('已保存')
  await page.getByLabel('图片说明 1', { exact: true }).fill('第一天 · 山与海')
  await page.getByLabel('替代文字 1', { exact: true }).fill('两侧明暗条纹的红色照片')
  await page.getByRole('button', { name: '保存图片文本' }).first().click()
  await expect(page.getByTestId('studio-editor').locator('[data-media-caption]')).toContainText('第一天 · 山与海')
  await expect(page.getByTestId('studio-document-state')).toContainText('已保存')
}

test('previews a share conversion, preserves the original, and exports the selected canonical page', async ({ page }) => {
  await page.goto('/studio')
  await addPhotos(page)
  const original = JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}')
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '成组分享', exact: true }).click()
  await expect(dialog.getByRole('navigation', { name: '分享页' }).getByRole('button')).toHaveCount(2)
  await dialog.getByLabel('分享画幅').selectOption('portrait-4-5')
  await expect(dialog.getByRole('button', { name: '保存分享副本' })).toBeEnabled()
  await expect(page.getByTestId('studio-document-state')).toContainText(original.documentId)
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await expect(dialog.getByRole('button', { name: '保存分享副本' })).toHaveCount(0)
  await expect(page.getByTestId('studio-document-state')).not.toContainText(original.documentId)
  await dialog.getByRole('navigation', { name: '分享页' }).getByRole('button', { name: '第 2 页' }).click()
  await dialog.getByRole('button', { name: '生成第 2 页预览' }).click()
  await expect(dialog.getByTestId('social-encoded-preview')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '下载第 2 页' })).toBeEnabled()
  const pending = page.waitForEvent('download')
  await dialog.getByRole('button', { name: '下载第 2 页' }).click()
  const download = await pending
  expect(download.suggestedFilename()).toMatch(/^oneimg-\d{4}-\d{2}-\d{2}-page-002\.png$/)
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile((await download.path())!)
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([640, 800])
  const previewBytes = await dialog.getByTestId('social-encoded-preview').evaluate(async image => Array.from(new Uint8Array(await (await fetch((image as HTMLImageElement).src)).arrayBuffer())))
  expect(bytes).toEqual(Buffer.from(previewBytes))
  await page.reload()
  await expect(page.getByRole('navigation', { name: '当前文档页' }).getByRole('button')).toHaveCount(2)
  await page.getByRole('navigation', { name: '当前文档页' }).getByRole('button', { name: '第 2 页' }).click()
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveCount(1)
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveAttribute('data-media-item-id', 'media-item-2')
})

for (const [format, width, height] of [['square', 640, 640], ['portrait-4-5', 640, 800], ['story-9-16', 630, 1120]] as const) {
  test(`keeps a composed ${format} preview and PNG at the same geometry`, async ({ page }, testInfo) => {
    await page.goto('/studio')
    await addPhotos(page)
    await page.getByRole('button', { name: '制作分享页', exact: true }).click()
    const dialog = page.getByTestId('social-share-dialog')
    await dialog.getByLabel('分享画幅').selectOption(format)
    await dialog.getByRole('button', { name: '保存分享副本' }).click()
    await dialog.getByRole('button', { name: '生成第 1 页预览' }).click()
    await expect(dialog.getByRole('button', { name: '下载第 1 页' })).toBeEnabled()
    const final = dialog.getByTestId('social-encoded-preview')
    expect(await final.evaluate(image => [(image as HTMLImageElement).naturalWidth, (image as HTMLImageElement).naturalHeight])).toEqual([width, height])
    const root = dialog.locator('[data-oneimg-render-root]').first()
    const geometry = await root.evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }))
    expect(geometry).toEqual({ width, height })
    await expect(root.locator('[data-media-item-id]')).toHaveCount(2)
    const screenshot = Array.from(await root.screenshot({ animations: 'disabled' }))
    const delta = await final.evaluate(async (image, reference) => {
      const preview = await createImageBitmap(new Blob([new Uint8Array(reference)], { type: 'image/png' }))
      const output = await createImageBitmap(await (await fetch((image as HTMLImageElement).src)).blob())
      const canvas = new OffscreenCanvas(preview.width, preview.height)
      const context = canvas.getContext('2d')!
      context.drawImage(preview, 0, 0)
      const expected = context.getImageData(0, 0, canvas.width, canvas.height).data
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(output, 0, 0, canvas.width, canvas.height)
      const actual = context.getImageData(0, 0, canvas.width, canvas.height).data
      let difference = 0
      for (let index = 0; index < expected.length; index += 1) {
        difference += Math.abs(expected[index]! - actual[index]!)
      }
      preview.close()
      output.close()
      canvas.width = 0
      canvas.height = 0
      return difference / expected.length
    }, screenshot)
    expect(delta).toBeLessThan(5)
    await page.screenshot({ path: testInfo.outputPath(`${format}-share.png`), animations: 'disabled' })
  })
}

for (const format of ['jpeg', 'webp'] as const) {
  test(`previews real ${format} bytes and reuses them in the ordered Bundle and current-page share`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.assign(window, { shareAudit: [], clipboardAudit: [] })
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: (data: ShareData) => Boolean(data.files?.length) })
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          Reflect.set(window, 'shareAudit', await Promise.all(data.files!.map(async file => ({ name: file.name, type: file.type, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) }))))
        },
      })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async (items: ClipboardItem[]) => {
            Reflect.set(window, 'clipboardAudit', Array.from(new Uint8Array(await (await items[0]!.getType('image/png')).arrayBuffer())))
          },
        },
      })
    })
    await page.goto('/studio')
    await addPhotos(page)
    await page.getByRole('button', { name: '制作分享页', exact: true }).click()
    const dialog = page.getByTestId('social-share-dialog')
    await dialog.getByRole('button', { name: '成组分享', exact: true }).click()
    await dialog.getByRole('button', { name: '保存分享副本' }).click()
    await dialog.getByRole('navigation', { name: '分享页' }).getByRole('button', { name: '第 2 页' }).click()
    await dialog.getByLabel('分享图片格式').selectOption(format)
    await dialog.getByLabel('分享编码质量').fill('55')
    await dialog.getByRole('button', { name: '生成第 2 页预览' }).click()
    await expect(dialog.getByRole('button', { name: '下载第 2 页' })).toBeEnabled()
    const bytes = await dialog.getByTestId('social-encoded-preview').evaluate(async image => Array.from(new Uint8Array(await (await fetch((image as HTMLImageElement).src)).arrayBuffer())))
    await dialog.getByRole('button', { name: '复制第 2 页' }).click()
    await expect(dialog.getByRole('status')).toContainText('已复制第 2 页')
    const clipboard = Buffer.from(await page.evaluate(() => Reflect.get(window, 'clipboardAudit')))
    expect(clipboard.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    await dialog.getByRole('button', { name: '系统分享第 2 页' }).click()
    await expect(dialog.getByRole('status')).toContainText('已打开系统分享')
    const audit = await page.evaluate(() => Reflect.get(window, 'shareAudit'))
    expect(audit).toEqual([{ name: expect.stringMatching(/^oneimg-\d{4}-\d{2}-\d{2}-page-002\.(jpg|webp)$/), type: `image/${format}`, bytes }])
    const downloadPending = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '下载全部 2 页 ZIP' }).click()
    const download = await downloadPending
    const { readFile } = await import('node:fs/promises')
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await readFile((await download.path())!))
    const currentName = audit[0].name as string
    expect(Object.keys(zip.files)).toEqual([currentName.replace('-002.', '-001.'), currentName])
    expect(await zip.file(currentName)!.async('nodebuffer')).toEqual(Buffer.from(bytes))
    expect(Buffer.from(bytes).includes(Buffer.from('Exif'))).toBe(false)
    expect(Buffer.from(bytes).includes(Buffer.from('private-photo'))).toBe(false)
    // A changed quality may not download stale bytes under the new settings.
    await dialog.getByLabel('分享编码质量').fill('80')
    await expect(dialog.getByRole('button', { name: '下载第 2 页' })).toBeDisabled()
  })
}

test('cancels a conversion without modifying the source and keeps download when sharing is unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  })
  await page.goto('/studio')
  await addPhotos(page)
  const before = await page.getByTestId('studio-document-state').textContent()
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '成组分享', exact: true }).click()
  await expect(dialog.getByRole('button', { name: /复制|系统分享/ })).toHaveCount(0)
  await expect(dialog.getByText('此浏览器不支持复制图片，请下载当前页。')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.getByTestId('studio-document-state').textContent()).toBe(before)
})

test('keeps the share flow usable on a narrow touch viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  await page.getByRole('navigation', { name: 'Studio 工作区' }).getByRole('button', { name: '配置' }).click()
  await addPhotos(page)
  await page.getByRole('navigation', { name: 'Studio 工作区' }).getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '成组分享', exact: true }).click()
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await dialog.getByRole('button', { name: '生成第 1 页预览' }).click()
  await expect(dialog.getByRole('button', { name: '下载第 1 页' })).toBeEnabled()
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  const primary = dialog.getByRole('button', { name: '生成第 1 页预览' })
  expect(await primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgb(255, 255, 255)')
  await page.screenshot({ path: testInfo.outputPath('social-mobile.png'), animations: 'disabled' })
})

test('cancels encoding, terminates its worker, and preserves the saved share draft', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      private timer?: number
      postMessage(message: unknown, transfer: Transferable[] | StructuredSerializeOptions = []) {
        if (message && typeof message === 'object' && 'png' in message && message.png instanceof Blob && message.png.size > 500) {
          this.timer = window.setTimeout(() => Reflect.apply(NativeWorker.prototype.postMessage, this, [message, transfer]), 20_000)
          Reflect.set(window, 'shareEncodingStarted', true)
        } else {
          Reflect.apply(NativeWorker.prototype.postMessage, this, [message, transfer])
        }
      }

      terminate() {
        if (this.timer !== undefined) {
          window.clearTimeout(this.timer)
          Reflect.set(window, 'shareEncodingTerminated', true)
        }
        super.terminate()
      }
    }
  })
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await expect.poll(async () => JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}')).toMatchObject({ recentCount: 2, status: '已保存' })
  const saved = await page.getByTestId('studio-document-state').textContent()
  await dialog.getByLabel('分享图片格式').selectOption('jpeg')
  await dialog.getByRole('button', { name: '生成第 1 页预览' }).click()
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'shareEncodingStarted'))).toBe(true)
  await dialog.getByRole('button', { name: '取消生成' }).click()
  await expect(dialog.getByRole('status')).toContainText('已取消')
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'shareEncodingTerminated'))).toBe(true)
  await expect(dialog.getByTestId('social-encoded-preview')).toHaveCount(0)
  expect(await page.getByTestId('studio-document-state').textContent()).toBe(saved)
})

test('keeps the browser capability failure blocking in the share workflow', async ({ page }) => {
  await page.addInitScript(() => {
    class HangingImage extends EventTarget {
      naturalHeight = 0
      naturalWidth = 0
      decoding = ''
      src = ''
      decode() {
        return new Promise<void>(() => undefined)
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: HangingImage })
  })
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await expect(dialog.getByRole('alert')).toContainText('当前浏览器暂不支持图片导出', { timeout: 10_000 })
  await expect(dialog.getByRole('button', { name: '保存分享副本' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '生成第 1 页预览' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '下载全部 1 页 ZIP' })).toBeDisabled()
})

test('paginates media additions and commits cross-page moves and page breaks as individual undoable intentions', () => {
  const session = createDocumentSession(createSocialShareConversion(source(), { mode: 'together', format: 'square', documentId: 'paged' }))
  const original = session.getRevision()
  const imported = Array.from({ length: 10 }, (_, index) => createMediaItem({ id: `extra-${index}`, assetId: `asset-${index}` }))
  const addition = session.commit({ type: 'append-media-items', pageId: original.pages[0]!.id, items: imported })
  expect(addition.status).toBe('committed')
  const added = session.getRevision()
  const ids = (revision: typeof added) => revision.pages.flatMap(page => page.blocks.flatMap(block => block.kind === 'media-group' ? block.items.map(item => item.id) : []))
  expect(added.pages).toHaveLength(2)
  expect(added.pages.map(page => page.blocks.reduce((count, block) => count + (block.kind === 'media-group' ? block.items.length : 0), 0))).toEqual([9, 3])
  const reformatted = createSocialShareConversion(added, { mode: 'set', format: 'story-9-16', documentId: 'reformatted' })
  expect(reformatted.pages.map(page => page.blocks)).toEqual(added.pages.map(page => page.blocks))
  expect(ids(added)).toEqual(['first', 'second', ...imported.map(item => item.id)])
  const move = session.commit({ type: 'transfer-media-item', blockId: 'photos', itemId: 'second', targetPageId: added.pages[1]!.id })
  expect(move.status).toBe('committed')
  expect(session.getRevision().pages[1]!.blocks.flatMap(block => block.kind === 'media-group' ? block.items.map(item => item.id) : [])).toEqual(['extra-7', 'extra-8', 'extra-9', 'second'])
  session.undo()
  expect(session.getRevision().pages).toEqual(added.pages)
  session.redo()
  const beforeSplit = session.getRevision()
  const split = session.commit({ type: 'split-media-page', blockId: 'photos', itemId: 'extra-2' })
  expect(split.status).toBe('committed')
  expect(session.getRevision().pages).toHaveLength(3)
  expect(ids(session.getRevision())).toEqual(ids(beforeSplit))
  expect(deserializeDocumentRevision(serializeDocumentRevision(session.getRevision()))).toEqual(session.getRevision())
  session.undo()
  expect(session.getRevision().pages).toEqual(beforeSplit.pages)
  expect(original.pages).toHaveLength(1)
})

test('adds more than nine photos to a saved share document and persists manual page organization', async ({ page }) => {
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await expect(dialog.getByRole('button', { name: '生成第 1 页预览' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await importPhotoFiles(page, 10)
  const nav = page.getByRole('navigation', { name: '当前文档页' })
  const items = page.getByTestId('studio-editor').locator('[data-media-item-id]')
  await expect(nav.getByRole('button')).toHaveCount(2)
  await expect(items).toHaveCount(9)
  await expect(page.getByTestId('studio-document-state')).toContainText('已保存')
  await page.getByLabel('移动图片 2 到另一页').selectOption({ label: '第 2 页' })
  await expect(items).toHaveCount(8)
  await expect(page.getByLabel('图片说明 1', { exact: true })).toBeFocused()
  await expect(page.getByTestId('media-page-announcement')).toContainText('图片 2 已移到第 2 页')
  await page.getByLabel('从图片 4 开始分页').click()
  await expect(nav.getByRole('button')).toHaveCount(3)
  await expect(items).toHaveCount(3)
  await expect(page.getByLabel('图片说明 3', { exact: true })).toBeFocused()
  await expect(page.getByTestId('media-page-announcement')).toContainText('已从图片 4 开始分页')
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(nav.getByRole('button')).toHaveCount(2)
  await expect(items).toHaveCount(8)
  await page.getByRole('button', { name: '重做', exact: true }).click()
  await expect(nav.getByRole('button')).toHaveCount(3)
  await expect(page.getByTestId('studio-document-state')).toContainText('已保存')
  await page.reload()
  await expect(nav.getByRole('button')).toHaveCount(3)
  await nav.getByRole('button').nth(2).click()
  await expect(items).toHaveCount(4)
  await expect(items.last()).toHaveAttribute('data-media-item-id', 'media-item-2')
  await page.getByRole('button', { name: '调整分享版式和输出' }).click()
  await expect(dialog.getByRole('navigation', { name: '分享页' }).getByRole('button')).toHaveCount(3)
  await expect(dialog.getByRole('button', { name: '下载全部 3 页 ZIP' })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: '生成第 3 页预览' })).toBeEnabled()
})

test('normalizes an oriented JPEG and strips private source metadata from every share encoding', async ({ page }) => {
  await page.goto('/studio')
  await page.getByTestId('studio-asset-input').evaluate(async (element) => {
    const canvas = document.createElement('canvas')
    canvas.width = 80; canvas.height = 40
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ff0000'; context.fillRect(0, 0, 40, 40)
    context.fillStyle = '#0000ff'; context.fillRect(40, 0, 40, 40)
    const jpeg = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 1))
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 1, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0])
    const privateData = new TextEncoder().encode('GPS=31.2304,121.4737;Device=PrivatePhone;Owner=private-photo')
    const source = new Uint8Array(await jpeg.arrayBuffer())
    const marked = new Blob([source.slice(0, 2), new Uint8Array([255, 225, 0, exif.length + 2]), exif, new Uint8Array([255, 254, 0, privateData.length + 2]), privateData, source.slice(2)], { type: 'image/jpeg' })
    const transfer = new DataTransfer()
    transfer.items.add(new File([marked], 'private-photo-gps.jpg', { type: 'image/jpeg' }))
    const input = element as HTMLInputElement
    input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const photo = page.getByTestId('studio-editor').locator('[data-media-item-id] img')
  await expect(photo).toHaveCount(1)
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([40, 80])
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  for (const format of ['png', 'jpeg', 'webp']) {
    await dialog.getByLabel('分享图片格式').selectOption(format)
    await dialog.getByRole('button', { name: '生成第 1 页预览' }).click()
    await expect(dialog.getByRole('button', { name: '下载第 1 页' })).toBeEnabled()
    const result = await dialog.getByTestId('social-encoded-preview').evaluate(async (image: HTMLImageElement) => {
      const blob = await (await fetch(image.src)).blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0); bitmap.close()
      return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), top: Array.from(context.getImageData(320, 160, 1, 1).data), bottom: Array.from(context.getImageData(320, 480, 1, 1).data) }
    })
    const text = Buffer.from(result.bytes).toString('latin1')
    expect(text).not.toContain('Exif')
    expect(text).not.toContain('GPS=')
    expect(text).not.toContain('PrivatePhone')
    expect(text).not.toContain('private-photo')
    expect(result.top[0]).toBeGreaterThan(200)
    expect(result.top[2]).toBeLessThan(40)
    expect(result.bottom[2]).toBeGreaterThan(200)
    expect(result.bottom[0]).toBeLessThan(40)
  }
})

test('blocks share output for an unresolved original instead of exporting its placeholder', async ({ page }) => {
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByTestId('studio-asset-input').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0, 1, 2, 3]) })
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveCount(3)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await expect(dialog.getByRole('alert').first()).toContainText('图片')
  await expect(dialog.getByRole('button', { name: '保存分享副本' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '生成第 1 页预览' })).toBeDisabled()
})

test('splits before a group first image when earlier content defines a real page boundary', () => {
  const converted = createSocialShareConversion(source(), { mode: 'together', format: 'square', documentId: 'first-split' })
  const session = createDocumentSession(converted)
  expect(session.commit({ type: 'split-media-page', blockId: 'photos', itemId: 'first' }).status).toBe('committed')
  expect(session.getRevision().pages).toHaveLength(2)
  expect(session.getRevision().pages[0]!.blocks).toEqual([converted.pages[0]!.blocks[0]])
  const second = session.getRevision().pages[1]!.blocks[0]!
  expect(second.kind === 'media-group' && second.caption).toBe('一路向北')
  session.undo()
  expect(session.getRevision().pages).toEqual(converted.pages)
})

test('uses a cleaned document name, date and a neutral sensitive default with explicit rename', () => {
  const date = new Date(2026, 8, 13, 12)
  expect(createSocialFilenamePrefix({ documentName: '旅行 / 记忆', date })).toBe('旅行---记忆-2026-09-13')
  expect(createSocialFilenamePrefix({ documentName: '私人地址', sensitive: true, date })).toBe('oneimg-2026-09-13')
  expect(createSocialFilenamePrefix({ documentName: '私人地址', sensitive: true, nameOverride: '我的相册', date })).toBe('我的相册-2026-09-13')
})

test('warns about an empty share page while allowing the meaningful document bundle', async ({ page }) => {
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '成组分享', exact: true }).click()
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await expect(dialog.getByRole('button', { name: '生成第 1 页预览' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await page.getByRole('navigation', { name: '当前文档页' }).getByRole('button').nth(1).click()
  await page.getByRole('button', { name: '删除图片 1', exact: true }).click()
  await expect(page.getByTestId('studio-document-state')).toContainText('已保存')
  await page.getByRole('button', { name: '调整分享版式和输出' }).click()
  await expect(dialog).toContainText('这一页没有内容')
  await expect(dialog.getByRole('button', { name: '下载全部 2 页 ZIP' })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: '生成第 2 页预览' })).toBeEnabled()
})

test('restores keyboard focus after unique image resources leave the current page', async ({ page }) => {
  await page.goto('/studio')
  await addPhotos(page)
  await page.getByRole('button', { name: '制作分享页', exact: true }).click()
  const dialog = page.getByTestId('social-share-dialog')
  await dialog.getByRole('button', { name: '保存分享副本' }).click()
  await expect(dialog.getByRole('button', { name: '生成第 1 页预览' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await page.evaluate(() => Reflect.set(window, 'announcementNode', document.querySelector('[data-testid="media-page-announcement"]')))
  await page.getByLabel('从图片 2 开始分页').click()
  await expect(page.getByRole('navigation', { name: '当前文档页' }).getByRole('button')).toHaveCount(2)
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveCount(1)
  await expect(page.getByLabel('图片说明 1', { exact: true })).toBeFocused()
  await expect(page.getByTestId('media-page-announcement')).toContainText('已从图片 2 开始分页')
  await page.getByRole('button', { name: '移到下一页', exact: true }).click()
  await expect(page.getByRole('navigation', { name: '当前文档页' }).getByRole('button')).toHaveCount(1)
  await expect(page.getByTestId('studio-editor').locator('[data-media-item-id]')).toHaveCount(2)
  await expect(page.getByLabel('图片说明 2', { exact: true })).toBeFocused()
  await expect(page.getByTestId('media-page-announcement')).toContainText('图片 1 已移到第 1 页')
  expect(await page.evaluate(() => Reflect.get(window, 'announcementNode') === document.querySelector('[data-testid="media-page-announcement"]'))).toBe(true)
})
