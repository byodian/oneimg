import { expect, test } from '@playwright/test'

test.describe('public and editor advertising boundary', () => {
  test('keeps the advertisement script out of all current routes', async ({ page }) => {
    const adRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('pagead2.googlesyndication.com')) {
        adRequests.push(request.url())
      }
    })
    await page.route('https://pagead2.googlesyndication.com/**', route => route.abort())

    for (const route of ['/', '/editor', '/about', '/blog', '/sponsor', '/studio', '/scenario/studio-recovery', '/__scenario/studio-recovery', '/route-that-does-not-exist']) {
      await page.goto(route)
      await expect.poll(() => adRequests).toEqual([])
    }
  })

  test('uses a full document transition when opening the editor and preserves local content', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ContentDB', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('contents', { keyPath: 'id', autoIncrement: true })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('contents', 'readwrite')
        transaction.objectStore('contents').add({
          title: '广告隔离合成草稿',
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
    }))
    await page.addScriptTag({ content: 'document.documentElement.dataset.publicScriptExecuted = "true"' })
    expect(await page.locator('html').getAttribute('data-public-script-executed')).toBe('true')

    await page.locator('main').getByRole('link', { name: '免费开始创作' }).first().click()

    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByRole('button', { name: '新建项目' })).toBeVisible()
    expect(await page.locator('html').getAttribute('data-public-script-executed')).toBeNull()
    await expect(page.getByRole('link', { name: '广告隔离合成草稿' })).toBeVisible()
    await expect(page.getByText('这段专用示例内容必须保留。').first()).toBeVisible()

    await page.getByRole('button', { name: '添加标题' }).click()
    const textboxes = page.locator('main [contenteditable="true"]')
    await textboxes.nth(0).fill('导航后新增的示例标题')
    await textboxes.nth(1).fill('导航后新增的示例正文。')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByRole('link', { name: '导航后新增的示例标题' })).toBeVisible()

    await page.getByRole('button', { name: '导出图片' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'PNG' })).toBeEnabled()

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await page.goForward()
    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByRole('button', { name: '添加标题' })).toBeVisible()
    await expect(page.getByRole('link', { name: '广告隔离合成草稿' })).toBeVisible()
    await expect(page.getByText('这段专用示例内容必须保留。').first()).toBeVisible()
    await expect(page.getByRole('link', { name: '导航后新增的示例标题' })).toBeVisible()
  })
})
