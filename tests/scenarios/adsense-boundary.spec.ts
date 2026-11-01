import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { type Page, expect, test } from '@playwright/test'

const adResourceHosts = ['googlesyndication.com', 'googleadservices.com', 'doubleclick.net']

async function watchForAdRequests(page: Page) {
  const adRequests: string[] = []
  page.on('request', (request) => {
    if (adResourceHosts.some(host => request.url().includes(host))) {
      adRequests.push(request.url())
    }
  })
  await page.route(/https:\/\/[^/]*(?:googlesyndication\.com|googleadservices\.com|doubleclick\.net)\//, route => route.abort())
  return adRequests
}

test.describe('public and editor advertising boundary', () => {
  test('keeps advertisement requests out of all current routes', async ({ page }) => {
    const adRequests = await watchForAdRequests(page)

    for (const route of ['/', '/editor', '/about', '/blog', '/sponsor', '/studio', '/scenario/studio-recovery', '/__scenario/studio-recovery', '/route-that-does-not-exist']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(adRequests, `unexpected ad request on ${route}`).toEqual([])
    }
  })

  test('uses a full document transition and preserves existing local content', async ({ page }) => {
    const adRequests = await watchForAdRequests(page)
    const originalTitle = '广告隔离合成草稿'
    const updatedTitle = '跨页面后修改的合成标题'
    const updatedBody = '修改后的本地内容必须保留。'

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.evaluate(title => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ContentDB', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('contents', { keyPath: 'id', autoIncrement: true })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('contents', 'readwrite')
        transaction.objectStore('contents').add({
          title,
          content: '<p>这段专用示例内容必须保留。</p>',
          parentId: null,
          type: 'normal_content',
        })
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onerror = () => {
          database.close()
          reject(transaction.error)
        }
      }
    }), originalTitle)
    await page.addScriptTag({ content: 'document.documentElement.dataset.publicScriptExecuted = "true"' })
    expect(await page.locator('html').getAttribute('data-public-script-executed')).toBe('true')

    await page.locator('main').getByRole('link', { name: '免费开始创作' }).first().click()

    await expect(page).toHaveURL(/\/editor$/)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('html').getAttribute('data-public-script-executed')).toBeNull()
    expect(adRequests).toEqual([])
    await expect(page.getByRole('link', { name: originalTitle })).toBeVisible()
    await expect(page.getByText('这段专用示例内容必须保留。').first()).toBeVisible()

    const originalDraft = page.getByRole('link', { name: originalTitle })
    await originalDraft.hover()
    await originalDraft.locator('svg').first().click()
    const editorForm = page.locator('form.editor-container')
    await expect(editorForm).toHaveCount(1)
    const saveButton = editorForm.getByRole('button', { name: '保存', exact: true })
    const textboxes = page.locator('main [contenteditable="true"]')
    await expect(textboxes).toHaveCount(2)
    await textboxes.nth(0).fill(updatedTitle)
    await textboxes.nth(1).fill(updatedBody)
    expect(await saveButton.evaluate(button => !(button as HTMLButtonElement).disabled)).toBe(true)
    // The sortable row marks its whole subtree aria-disabled while editing, so click the enabled submit control directly.
    await saveButton.click({ force: true })
    await expect(page.getByRole('link', { name: updatedTitle })).toBeVisible()
    await expect(page.getByText(updatedBody).first()).toBeVisible()

    await page.getByRole('button', { name: '导出图片' }).click()
    const pngButton = page.getByRole('dialog').getByRole('button', { name: 'PNG' })
    await expect(pngButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await pngButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('preview_images.zip')
    const downloadPath = await download.path()
    if (downloadPath === null) {
      throw new Error('Playwright did not expose the local image export')
    }
    const archive = await JSZip.loadAsync(await readFile(downloadPath))
    const exportedPng = Object.values(archive.files).find(file => file.name.endsWith('.png'))
    if (exportedPng === undefined) {
      throw new Error('The local image export did not contain a PNG')
    }
    expect((await exportedPng.async('nodebuffer')).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: updatedTitle })).toBeVisible()
    await expect(page.getByText(updatedBody).first()).toBeVisible()
    expect(adRequests).toEqual([])

    await page.goBack()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/$/)
    expect(await page.locator('html').getAttribute('data-public-script-executed')).toBeNull()
    await page.goForward()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByRole('link', { name: updatedTitle })).toBeVisible()
    await expect(page.getByText(updatedBody).first()).toBeVisible()

    await page.getByRole('link', { name: '赞助' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/sponsor$/)
    await page.goBack()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByRole('link', { name: updatedTitle })).toBeVisible()
    await page.goForward()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/sponsor$/)
    expect(adRequests).toEqual([])
  })
})
