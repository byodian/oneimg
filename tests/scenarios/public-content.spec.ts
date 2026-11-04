import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { type Page, expect, test } from '@playwright/test'

const slugs = ['quick-start', 'long-image-and-slices', 'templates-and-size', 'save-and-restore']
const adHosts = /(?:googlesyndication\.com|googleadservices\.com|doubleclick\.net|fundingchoicesmessages\.google\.com)/
const advertisingEnabled = process.env.ONEIMG_ADS_ENABLED === '1'

async function blockThirdPartyAds(page: Page) {
  const requests: string[] = []
  page.on('request', (request) => {
    if (adHosts.test(request.url())) {
      requests.push(new URL(request.url()).hostname)
    }
  })
  await page.context().route(adHosts, route => route.abort())
  return requests
}

async function addSection(page: Page, title: string, text: string) {
  await page.getByRole('button', { name: '添加标题', exact: true }).click()
  const form = page.locator('form.editor-container')
  const fields = form.locator('[contenteditable="true"]')
  await fields.nth(0).fill(title)
  await fields.nth(1).fill(text)
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  await form.getByRole('button', { name: '取消', exact: true }).click()
}

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
  test(`public tutorials and policies work at ${viewport.width}px`, async ({ page, request }) => {
    await page.setViewportSize(viewport)
    const adRequests = await blockThirdPartyAds(page)
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: '使用教程', exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/blog$/)
    await expect(page.locator('main h2')).toHaveCount(4)
    for (const slug of slugs) {
      const response = await page.goto(`/blog/${slug}`)
      expect(response?.status()).toBe(200)
      await expect(page.locator('main h1')).not.toBeEmpty()
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://oneimgai.com/blog/${slug}`)
      await expect(page.getByText('维护：byodian')).toBeVisible()
      await expect(page.locator('article img')).toHaveCount(1)
      await expect.poll(() => page.locator('article img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
      expect(await page.locator('article img').getAttribute('alt')).toBeTruthy()
      expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    }
    for (const path of ['/about', '/privacy', '/terms', '/sponsor']) {
      expect((await page.goto(path))?.status()).toBe(200)
      await expect(page.getByRole('navigation', { name: '页脚导航' }).getByRole('link', { name: '隐私设置' })).toHaveAttribute('href', '/privacy#choices')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://oneimgai.com${path}`)
      await expect(page.locator('body')).not.toContainText('About Us')
    }
    expect((await request.get('/blog/does-not-exist')).status()).toBe(404)
    expect((await page.goto('/blog/does-not-exist'))?.status()).toBe(404)
    await expect(page.locator('#oneimg-ad-script')).toHaveCount(0)
    if (!advertisingEnabled) {
      expect(adRequests).toEqual([])
    }
  })
}

test('sitemap describes real public pages and distinct article identities', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(match => match[1])
  expect(urls).toHaveLength(10)
  expect(new Set(urls).size).toBe(10)
  expect(xml).not.toMatch(/\/(editor|studio|scenario|__scenario)|does-not-exist/)
  const titles: string[] = []
  for (const url of urls) {
    const response = await request.get(new URL(url).pathname)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('rel="canonical"')
    if (url.includes('/blog/')) {
      titles.push(html.match(/<title>(.*?)<\/title>/)?.[1] ?? '')
    }
  }
  expect(new Set(titles).size).toBe(4)
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain('Sitemap: https://oneimgai.com/sitemap.xml')
})

test('privacy controls are honest when CMP is not configured and keyboard navigation works', async ({ page }) => {
  test.skip(advertisingEnabled, 'Default-off configuration exercise')
  const ads = await blockThirdPartyAds(page)
  await page.goto('/privacy#choices')
  await expect(page.getByRole('button', { name: '打开 Google 隐私选择' })).toBeDisabled()
  await expect(page.getByRole('status').filter({ hasText: '尚未启用' })).toBeVisible()
  await expect(page.getByText('同源第三方脚本', { exact: false })).toBeVisible()
  await page.goto('/blog')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#public-main')).toBeFocused()
  expect(ads).toEqual([])
})

test('tutorial journey creates, styles, exports and restores an actual legacy file', async ({ page }) => {
  test.setTimeout(90000)
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showSaveFilePicker')
  })
  page.on('dialog', dialog => dialog.accept())
  await blockThirdPartyAds(page)
  await page.goto('/blog/quick-start')
  await page.getByRole('link', { name: '打开编辑器，动手试试' }).click()
  await expect(page).toHaveURL(/\/editor$/)
  await page.getByRole('button', { name: '新建项目', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('项目名称').fill('周末阅读笔记')
  await dialog.getByPlaceholder('描述', { exact: true }).fill('给自己留一点安静的时间')
  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: '简约黑白风格', exact: true }).click()
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await addSection(page, '先记录，再打磨', '读到喜欢的句子，先写下自己的理解。')
  await addSection(page, '把想法分享出去', '整理文字，选择喜欢的风格。')
  const preview = page.getByRole('tabpanel', { name: '预览', exact: true })
  await expect(preview).toContainText('先记录，再打磨')
  await page.getByRole('menuitem').first().click()
  await page.getByRole('menu').getByRole('combobox').click()
  await page.getByRole('option', { name: '简约科技风格', exact: true }).click()
  await page.getByRole('menu').getByRole('button').last().click()
  await page.keyboard.press('Escape')
  await page.getByRole('banner').getByRole('combobox').click()
  await page.getByRole('option', { name: '小红书帖子', exact: true }).click()
  await page.getByRole('button', { name: '导出图片', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '1×', exact: true }).click()
  const png = page.getByRole('dialog').getByRole('button', { name: 'PNG', exact: true })
  await expect(png).toBeEnabled({ timeout: 30000 })
  const [download] = await Promise.all([page.waitForEvent('download'), png.click()])
  expect(download.suggestedFilename()).toBe('preview_images.zip')
  const archive = await JSZip.loadAsync(await readFile((await download.path())!))
  const images = Object.values(archive.files).filter(file => file.name.endsWith('.png'))
  expect(images).toHaveLength(4)
  expect(images[0].name).toContain('full_preview')
  for (const image of images) {
    const bytes = await image.async('nodebuffer')
    expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(0)
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(0)
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('menuitem').first().click()
  await page.getByRole('menuitem', { name: '保存到...' }).click()
  const [backupDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: '保存到本地', exact: true }).click()])
  const backup = await readFile((await backupDownload.path())!)
  const saved = JSON.parse(backup.toString())
  expect(saved.type).toBe('oneimg')
  expect(saved.version).toBe(1)
  expect(saved.theme).toBe('wechat-post-1')
  expect(saved.data).toHaveLength(3)
  expect(saved).not.toHaveProperty('size')
  await addSection(page, '打开备份时应被替换的内容', '这条内容不在备份中。')
  await page.getByRole('menuitem').first().click()
  await page.getByRole('menuitem', { name: '打开文件' }).click()
  await expect(page.getByRole('dialog')).toContainText('替换您现有的内容')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('dialog').getByRole('button', { name: '从文件加载', exact: true }).click()])
  await chooser.setFiles({ name: 'tutorial-backup.oneimg', mimeType: 'application/json', buffer: backup })
  await expect(page.getByRole('link', { name: '打开备份时应被替换的内容', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '先记录，再打磨', exact: true })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('combobox')).toContainText('小红书帖子')
  await page.reload()
  await expect(page.getByRole('link', { name: '先记录，再打磨', exact: true })).toBeVisible()
  await expect(page.locator('.adsbygoogle')).toHaveCount(0)
})

test('native save picker receives the editable file and closes its writable handle', async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { syntheticFile?: { name: string; json: string; closed: boolean } }
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async (options: { suggestedName: string }) => ({
        createWritable: async () => ({
          write: async (blob: Blob) => {
            host.syntheticFile = { name: options.suggestedName, json: await blob.text(), closed: false }
          },
          close: async () => {
            if (host.syntheticFile) {
              host.syntheticFile.closed = true
            }
          },
        }),
      }),
    })
  })
  await blockThirdPartyAds(page)
  await page.goto('/editor')
  await page.getByRole('button', { name: '新建项目', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('项目名称').fill('文件保存专用示例')
  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: '简约黑白风格', exact: true }).click()
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('link', { name: '文件保存专用示例', exact: true })).toBeVisible()
  await page.getByRole('menuitem').first().click()
  await page.getByRole('menuitem', { name: '保存到...' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '保存到本地', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { syntheticFile?: { closed: boolean } }).syntheticFile?.closed)).toBe(true)
  const result = await page.evaluate(() => (window as unknown as { syntheticFile: { name: string; json: string } }).syntheticFile)
  expect(result.name).toMatch(/\.oneimg$/)
  expect(JSON.parse(result.json)).toMatchObject({ type: 'oneimg', version: 1, theme: 'apple-style' })
  expect(JSON.parse(result.json).data[0].title).toContain('文件保存专用示例')
})
