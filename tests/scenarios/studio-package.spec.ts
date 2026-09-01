import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { type Page, expect, test } from '@playwright/test'

interface StudioState {
  readonly documentId: string
  readonly durableRevision: number
  readonly meaningful: boolean
  readonly revision: number
  readonly status: string
}

async function readStudioState(page: Page) {
  return JSON.parse(await page.getByTestId('studio-document-state').textContent() ?? '{}') as StudioState
}

async function rewriteManifest(
  packagePath: string,
  mutate: (manifest: Record<string, unknown>) => void,
) {
  const zip = await JSZip.loadAsync(await readFile(packagePath))
  const manifestFile = zip.file('manifest.json')
  if (manifestFile === null) {
    throw new Error('Package fixture is missing manifest.json')
  }
  const manifest = JSON.parse(await manifestFile.async('string')) as Record<string, unknown>
  mutate(manifest)
  zip.file('manifest.json', JSON.stringify(manifest))
  return zip.generateAsync({ compression: 'STORE', type: 'nodebuffer' })
}

async function importGeneratedImage(page: Page, corrupt = false) {
  await page.evaluate(async ({ corrupt: shouldCorrupt }) => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="studio-asset-input"]')
    if (input === null) {
      throw new Error('Studio asset input is not mounted')
    }
    const blob = shouldCorrupt
      ? new Blob([new Uint8Array([0, 1, 2, 3, 4, 5])], { type: 'image/png' })
      : await (async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 8
        canvas.height = 4
        const context = canvas.getContext('2d')!
        context.fillStyle = '#e84a5f'
        context.fillRect(0, 0, 4, 4)
        context.fillStyle = '#2a6fdb'
        context.fillRect(4, 0, 4, 4)
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(value => value === null ? reject(new Error('Unable to create image fixture')) : resolve(value), 'image/png')
        })
      })()
    const transfer = new DataTransfer()
    transfer.items.add(new File([blob], shouldCorrupt ? 'package-broken.png' : 'package-photo.png', { type: 'image/png' }))
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { corrupt })
}

async function corruptPersistedRenderSource(page: Page) {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('OneImgStudio')
      request.onerror = () => reject(request.error ?? new Error('Unable to open Studio database'))
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('package-imports', 'readwrite')
      const store = transaction.objectStore('package-imports')
      const request = store.getAll()
      request.onerror = () => reject(request.error ?? new Error('Unable to read Package imports'))
      request.onsuccess = () => {
        const record = request.result[0] as {
          assets: readonly Record<string, unknown>[]
        } | undefined
        if (record === undefined || record.assets.length === 0) {
          reject(new Error('Studio Package import has no persisted Assets'))
          return
        }
        store.put({
          ...record,
          assets: record.assets.map(asset => ({
            ...asset,
            renderSource: new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'image/png' }),
            renderSourceRevision: 'corrupt-render-source@1',
          })),
        })
      }
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to corrupt Package import'))
      transaction.oncomplete = () => resolve()
    })
    database.close()
  })
}

async function createLegacyStudioDatabase(page: Page) {
  await page.goto('/scenario/oneimg-package')
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('OneImgStudio', 3)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('documents', { keyPath: 'documentId' })
        const transactions = database.createObjectStore('transactions', { keyPath: 'id' })
        transactions.createIndex('by-document', 'documentId', { unique: false })
      }
      request.onerror = () => reject(request.error ?? new Error('Unable to create legacy Studio database'))
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
    })
  })
}

test.describe('OneIMG Package Studio flow', () => {
  test('upgrades a legacy database before loading package and asset records', async ({ page }) => {
    await createLegacyStudioDatabase(page)
    await page.goto('/studio')

    await expect(page.getByTestId('studio-editor')).toBeVisible()
    await expect(page.getByTestId('studio-error')).toHaveCount(0)
  })

  test('saves a committed Draft and imports it as an independent copy', async ({ page }) => {
    await page.goto('/studio')

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    const editor = root.locator('[contenteditable="true"]')
    await editor.fill('Package 导入不能覆盖当前 Draft。')
    await editor.press('Escape')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })

    const originalState = await readStudioState(page)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '保存 .oneimg 副本' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.oneimg$/)
    const packagePath = await download.path()
    if (packagePath === null) {
      throw new Error('Playwright did not expose the OneIMG Package path')
    }

    const zip = await JSZip.loadAsync(await readFile(packagePath))
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as {
      readonly documents: readonly [{ readonly id: string; readonly sourceDocumentId: string }]
      readonly formatVersion: number
      readonly packageId: string
    }
    expect(manifest.formatVersion).toBe(1)
    expect(manifest.packageId).toMatch(/^package-/)
    expect(manifest.documents).toHaveLength(1)
    expect(manifest.documents[0]!.sourceDocumentId).toBe(originalState.documentId)
    expect(manifest.documents[0]!.id).not.toBe(originalState.documentId)
    expect(Object.keys(zip.files).sort()).toEqual([
      `documents/${manifest.documents[0]!.id}.json`,
      'manifest.json',
    ])

    await page.getByTestId('studio-package-input').setInputFiles(packagePath)
    await expect(page.getByTestId('studio-import-report')).toContainText('已创建 Imported Draft')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    const importedState = await readStudioState(page)
    expect(importedState.documentId).not.toBe(originalState.documentId)
    await expect(root.getByText('Package 导入不能覆盖当前 Draft。')).toBeVisible()
    await expect(page.getByTestId('studio-import-report')).toContainText('不会覆盖当前 Draft')

    const reexportDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '保存 .oneimg 副本' }).click()
    const reexportDownload = await reexportDownloadPromise
    const reexportPath = await reexportDownload.path()
    if (reexportPath === null) {
      throw new Error('Playwright did not expose the re-exported OneIMG Package path')
    }
    const reexportZip = await JSZip.loadAsync(await readFile(reexportPath))
    const reexportManifest = JSON.parse(await reexportZip.file('manifest.json')!.async('string')) as {
      readonly documents: readonly [{ readonly sourceDocumentId: string }]
    }
    expect(reexportManifest.documents[0]!.sourceDocumentId).toBe(originalState.documentId)

    const recoveryPackage = await rewriteManifest(packagePath, (candidate) => {
      candidate.formatVersion = 2
    })
    const beforeRecoveryImport = await readStudioState(page)
    await page.getByTestId('studio-package-input').setInputFiles({
      buffer: recoveryPackage,
      mimeType: 'application/zip',
      name: 'newer-format.oneimg',
    })
    await expect(page.getByTestId('studio-import-report')).toContainText('需要 Recovery Draft')
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId: beforeRecoveryImport.documentId,
      revision: beforeRecoveryImport.revision,
    })

    await page.getByTestId('studio-package-input').setInputFiles(packagePath)
    await expect(page.getByTestId('studio-import-report')).toContainText('检测到相同来源的 Package')
    await page.getByRole('button', { name: '导入新的副本' }).click()
    await expect(page.getByTestId('studio-import-report')).toContainText('这是你选择的新副本')
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, status: '已保存' })
    const duplicateState = await readStudioState(page)
    expect(duplicateState.documentId).not.toBe(importedState.documentId)
  })

  test('packages referenced media with its Document and leaves the active Draft unchanged for invalid input', async ({ page }) => {
    await page.goto('/studio')
    await expect(page.getByTestId('studio-asset-input')).toBeAttached()
    await importGeneratedImage(page)
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, revision: 2, status: '已保存' })

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '保存 .oneimg 副本' }).click()
    const download = await downloadPromise
    const packagePath = await download.path()
    if (packagePath === null) {
      throw new Error('Playwright did not expose the OneIMG Package path')
    }

    const zip = await JSZip.loadAsync(await readFile(packagePath))
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as {
      readonly assets: readonly [{
        readonly id: string
        readonly originalPath: string
        readonly renderSourcePath?: string
      }]
      readonly documents: readonly [{ readonly id: string }]
      readonly entries: readonly { readonly path: string; readonly role: string }[]
    }
    expect(manifest.assets).toHaveLength(1)
    expect(manifest.assets[0]!.renderSourcePath).toBeUndefined()
    const documentPayload = JSON.parse(
      await zip.file(`documents/${manifest.documents[0]!.id}.json`)!.async('string'),
    ) as {
      readonly snapshot: {
        readonly pages: readonly [{
          readonly blocks: readonly [{
            readonly items: readonly [{ readonly assetId: string }]
          }]
        }]
      }
    }
    expect(documentPayload.snapshot.pages[0]!.blocks[0]!.items[0]!.assetId).toBe(manifest.assets[0]!.id)
    expect(manifest.entries.map(entry => entry.role).sort()).toEqual([
      'asset-original',
      'document',
    ])
    expect(Object.keys(zip.files).sort()).toEqual([
      `assets/${manifest.assets[0]!.id}/original.png`,
      `documents/${manifest.documents[0]!.id}.json`,
      'manifest.json',
    ])

    const beforeInvalidImport = await readStudioState(page)
    await page.getByTestId('studio-package-input').setInputFiles({
      buffer: Buffer.from('not a OneIMG Package'),
      mimeType: 'application/zip',
      name: 'broken.oneimg',
    })
    await expect(page.getByTestId('studio-error')).toContainText('ZIP')
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId: beforeInvalidImport.documentId,
      revision: beforeInvalidImport.revision,
    })
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toBeVisible()

    await page.getByTestId('studio-package-input').setInputFiles(packagePath)
    await expect(page.getByTestId('studio-import-report')).toContainText('已创建 Imported Draft')
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toHaveAttribute('data-media-status', 'ready')
    const importedState = await readStudioState(page)
    await corruptPersistedRenderSource(page)
    await page.reload()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId: importedState.documentId,
      meaningful: true,
    })
    await expect(page.getByTestId('studio-import-report')).toContainText('已创建 Imported Draft')
    await expect(page.getByTestId('studio-editor').locator('[data-oneimg-render-root] [data-media-item-id="media-item-1"]'))
      .toHaveAttribute('data-media-status', 'ready')
  })

  test('preserves an unresolved media reference without writing an invalid Original', async ({ page }) => {
    await page.goto('/studio')
    await expect(page.getByTestId('studio-asset-input')).toBeAttached()
    await importGeneratedImage(page, true)
    await expect.poll(() => readStudioState(page)).toMatchObject({ meaningful: true, revision: 2, status: '已保存' })

    const root = page.getByTestId('studio-editor').locator('[data-oneimg-render-root]')
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toHaveAttribute('data-media-status', 'unresolved')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '保存 .oneimg 副本' }).click()
    const download = await downloadPromise
    const packagePath = await download.path()
    if (packagePath === null) {
      throw new Error('Playwright did not expose the OneIMG Package path')
    }

    const zip = await JSZip.loadAsync(await readFile(packagePath))
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as {
      readonly assets: readonly unknown[]
      readonly documents: readonly [{ readonly id: string }]
      readonly safeRecovery: string
    }
    expect(manifest.assets).toHaveLength(0)
    expect(manifest.safeRecovery).toBe('unresolved-assets')
    expect(Object.keys(zip.files).sort()).toEqual([
      `documents/${manifest.documents[0]!.id}.json`,
      'manifest.json',
    ])

    await page.getByTestId('studio-package-input').setInputFiles(packagePath)
    await expect(page.getByTestId('studio-import-report')).toContainText('已创建 Imported Draft')
    await expect(root.locator('[data-media-item-id="media-item-1"]')).toHaveAttribute('data-media-status', 'unresolved')

    const importedState = await readStudioState(page)
    await page.reload()
    await expect.poll(() => readStudioState(page)).toMatchObject({
      documentId: importedState.documentId,
      meaningful: true,
    })
    await expect(page.getByTestId('studio-import-report')).toContainText('已创建 Imported Draft')
    await expect(page.getByTestId('studio-editor').locator('[data-oneimg-render-root] [data-media-item-id="media-item-1"]'))
      .toHaveAttribute('data-media-status', 'unresolved')
  })
})
