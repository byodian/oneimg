import { type Page, expect, test } from '@playwright/test'

interface FixtureOptions {
  initial?: 'pending' | 'accepted' | 'rejected';
  eu?: boolean;
  mode?: number;
  us?: 'none' | 'allowed' | 'opted-out' | 'unknown';
  fill?: 'filled' | 'unfilled' | 'blocked' | 'slow';
  cmp?: 'ready' | 'blocked' | 'silent';
  noGpp?: boolean;
  deferredData?: boolean;
}

// Injected solely as intercepted third-party responses; no application test API.
function syntheticGoogleCmp(options: FixtureOptions) {
  type Callback = Record<string, () => void>
  const host = window as unknown as Record<string, any>
  host.syntheticCmpExecuted = true
  const saved = localStorage.getItem('synthetic-cmp-choice')
  let choice = saved || options.initial || 'pending'
  const eu = options.eu !== false
  let us = options.us || 'none'
  let tcfCallback: ((data: unknown, success: boolean) => void) | undefined
  let gppCallback: ((data: unknown, success: boolean) => void) | undefined
  const mode = () => options.mode ?? (!eu ? 3 : choice === 'accepted' ? 1 : 2)
  const tcdata = () => ({ gdprApplies: eu, cmpStatus: 'loaded', eventStatus: choice === 'pending' ? 'cmpuishown' : 'tcloaded', purpose: { consents: { 1: choice === 'accepted' } }, vendor: { consents: { 755: choice === 'accepted' } } })
  const gppdata = () => ({ cmpStatus: 'loaded', signalStatus: us === 'unknown' ? 'not ready' : 'ready', applicableSections: us === 'none' ? [-1] : [7], supportedAPIs: ['7:usnat'], parsedSections: us === 'none' ? {} : { usnat: [{ SaleOptOut: us === 'opted-out' ? 1 : 2, SharingOptOut: us === 'opted-out' ? 1 : 2, TargetedAdvertisingOptOut: us === 'opted-out' ? 1 : 2, Gpc: false }] } })
  const notify = () => {
    if (localStorage.getItem('synthetic-cmp-failure')) {
      tcfCallback?.(undefined, false); return
    }
    tcfCallback?.(tcdata(), true); gppCallback?.({ pingData: gppdata() }, true)
  }
  const region = document.createElement('section')
  region.setAttribute('aria-label', '合成 Google 隐私消息')
  region.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:white;padding:20px;border:2px solid blue;'
  const choose = (value: string) => {
    choice = value; localStorage.setItem('synthetic-cmp-choice', value); region.hidden = true; notify()
  }
  for (const [label, value] of [['合成接受', 'accepted'], ['合成拒绝', 'rejected']]) {
    const button = document.createElement('button')
    button.textContent = label
    button.onclick = () => choose(value)
    region.appendChild(button)
  }
  const optOut = document.createElement('button')
  optOut.textContent = '合成美国州退出'
  optOut.onclick = () => {
    us = 'opted-out'; localStorage.setItem('synthetic-cmp-us', 'opted-out'); notify()
  }
  region.appendChild(optOut)
  if (localStorage.getItem('synthetic-cmp-us') === 'opted-out') {
    us = 'opted-out'
  }
  region.hidden = !(eu && choice === 'pending')
  document.body.appendChild(region)
  for (const [label, action] of [['合成撤回选择', () => choose('rejected')], ['合成美国州动态退出', () => {
    us = 'opted-out'; localStorage.setItem('synthetic-cmp-us', 'opted-out'); notify()
  }], ['合成 CMP 回调失败', () => {
    localStorage.setItem('synthetic-cmp-failure', '1'); notify()
  }]] as const) {
    const button = document.createElement('button'); button.textContent = label; button.onclick = action; button.style.cssText = `position:fixed;right:5px;top:${100 + document.querySelectorAll('body > button').length * 30}px;z-index:99998;background:white`; document.body.appendChild(button)
  }
  const oldQueue = host.googlefc?.callbackQueue || []
  host.__tcfapi = (_command: string, _version: number, callback: typeof tcfCallback) => {
    tcfCallback = callback; notify()
  }
  host.__gpp = (command: string, receive: typeof gppCallback) => {
    if (command === 'addEventListener') {
      gppCallback = receive; receive?.({ pingData: gppdata() }, true)
    } else {
      receive?.(gppdata(), true)
    }
  }
  host.googlefc = {
    callbackQueue: {
      push: (entry: Callback) => {
        Object.values(entry).forEach(callback => callback())
      },
    },
    getGoogleConsentModeValues: () => ({ adStoragePurposeConsentStatus: mode(), adUserDataPurposeConsentStatus: mode(), adPersonalizationPurposeConsentStatus: mode() }),
    usstatesoptout: { getInitialUsStatesOptOutStatus: () => us === 'none' ? 1 : us === 'opted-out' ? 3 : 2 },
    showRevocationMessage: () => {
      choice = 'pending'; region.hidden = false; notify()
    },
  }
  if (options.noGpp) {
    delete host.__gpp
  }
  for (const entry of oldQueue) {
    if (options.deferredData && choice === 'pending' && !entry.CONSENT_API_READY) {
      continue
    }
    host.googlefc.callbackQueue.push(entry)
  }
}

async function interceptAdvertising(page: Page, options: FixtureOptions = {}) {
  const calls = { ads: 0, cmp: 0 }
  await page.context().route(/https:\/\/[^/]*(?:googlesyndication\.com|googleadservices\.com|doubleclick\.net|fundingchoicesmessages\.google\.com)\//, async (route) => {
    if (new URL(route.request().url()).hostname === 'fundingchoicesmessages.google.com') {
      calls.cmp++
      if (options.cmp === 'blocked') {
        return route.abort()
      }
      return route.fulfill({ contentType: 'application/javascript', body: options.cmp === 'silent' ? '/* no CMP response */' : `(${syntheticGoogleCmp.toString()})(${JSON.stringify(options)})` })
    }
    calls.ads++
    if (options.fill === 'blocked') {
      return route.abort()
    }
    const fillScript = options.fill === 'slow' ? '' : `slot.dataset.adStatus = ${JSON.stringify(options.fill || 'filled')};`
    return route.fulfill({ contentType: 'application/javascript', body: `window.syntheticAdExecuted = (window.syntheticAdExecuted || 0) + 1; window.adsbygoogle = { push: function() { window.syntheticSlotStarts = (window.syntheticSlotStarts || 0) + 1; var slot = document.querySelector("ins.adsbygoogle"); if(slot) { slot.dataset.adsbygoogleStatus = "done"; ${fillScript} } } };` })
  })
  return calls
}

async function syntheticMarker(page: Page) {
  return page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticAdExecuted ?? null)
}

test.describe('configured tutorials use official CMP signals before advertising', () => {
  test.skip(process.env.ONEIMG_ADS_ENABLED !== '1', 'Run against the synthetic enabled configuration')

  test('pending consent makes no ad request; accepting starts exactly one manual slot', async ({ page }) => {
    const calls = await interceptAdvertising(page)
    await page.goto('/blog/quick-start')
    await expect(page.getByRole('button', { name: '合成接受', exact: true })).toBeVisible()
    expect(calls.ads).toBe(0)
    await page.getByRole('button', { name: '合成接受', exact: true }).click()
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticSlotStarts)).toBe(1)
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(1)
    expect(calls.ads).toBe(1)
    expect(calls.cmp).toBe(1)
    expect(await page.locator('article').evaluate((article) => {
      const sections = article.querySelectorAll(':scope > section')
      const ad = article.querySelector('aside[aria-label="广告"]')!
      return !!(sections[sections.length - 1].compareDocumentPosition(ad) & Node.DOCUMENT_POSITION_FOLLOWING)
    })).toBe(true)
    await page.reload()
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticSlotStarts)).toBe(1)
  })

  for (const options of [{ initial: 'rejected' }, { initial: 'accepted', mode: 0 }, { initial: 'accepted', mode: 4 }, { initial: 'accepted', us: 'opted-out' }, { initial: 'accepted', us: 'unknown' }] as FixtureOptions[]) {
    test(`blocks unknown, denied, unconfigured or opted-out signals ${JSON.stringify(options)}`, async ({ page }) => {
      const calls = await interceptAdvertising(page, options)
      await page.goto('/blog/quick-start')
      await expect.poll(() => calls.cmp).toBe(1)
      await expect(page.locator('article h1')).toBeVisible()
      await expect(page.getByRole('link', { name: '打开编辑器，动手试试' })).toBeVisible()
      await expect(page.locator('#oneimg-ad-script')).toHaveCount(0)
      expect(calls.ads).toBe(0)
    })
  }

  for (const us of ['none', 'allowed'] as const) {
    test(`uses CMP non-applicable regional signals with US status ${us}`, async ({ page }) => {
      const calls = await interceptAdvertising(page, { eu: false, us })
      await page.goto('/blog/quick-start')
      await expect.poll(() => syntheticMarker(page)).toBe(1)
      expect(calls.ads).toBe(1)
    })
  }

  test('reopens, rejects and changes a saved choice through Google on the privacy page', async ({ page }) => {
    const calls = await interceptAdvertising(page, { initial: 'accepted' })
    await page.goto('/blog/quick-start')
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    await page.getByRole('link', { name: '隐私设置', exact: true }).click()
    expect(await syntheticMarker(page)).toBeNull()
    await page.getByRole('button', { name: '打开 Google 隐私选择', exact: true }).click()
    await expect.poll(() => calls.cmp).toBe(2)
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticCmpExecuted)).toBe(true)
    await expect(page.getByRole('button', { name: '合成拒绝', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '合成拒绝', exact: true }).click()
    await expect(page.locator('#oneimg-ad-script')).toHaveCount(0)
    await page.getByRole('navigation', { name: '公开导航' }).getByRole('link', { name: '使用教程' }).click()
    await page.locator('main a[href="/blog/quick-start"]').click()
    await expect(page.getByRole('status').filter({ hasText: '隐私条件尚未满足' })).toBeVisible()
    expect(await syntheticMarker(page)).toBeNull()
    await page.getByRole('link', { name: '隐私设置', exact: true }).click()
    await page.getByRole('button', { name: '打开 Google 隐私选择', exact: true }).click()
    await expect.poll(() => calls.cmp).toBe(4)
    await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticCmpExecuted)).toBe(true)
    await page.getByRole('button', { name: '合成接受', exact: true }).click()
    const count = calls.ads
    await page.goto('/blog/quick-start')
    await expect.poll(() => calls.ads).toBe(count + 1)
  })

  test('clears executing ad context across tutorial, editor, reload, back and forward', async ({ page }) => {
    const calls = await interceptAdvertising(page, { initial: 'accepted' })
    await page.goto('/editor')
    expect(calls.ads).toBe(0)
    await page.getByRole('menuitem').first().click()
    await page.getByRole('menuitem', { name: '使用教程', exact: true }).click()
    await page.locator('main a[href="/blog/quick-start"]').click()
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    await page.getByRole('link', { name: '打开编辑器，动手试试' }).click()
    await expect(page).toHaveURL(/\/editor$/)
    expect(await syntheticMarker(page)).toBeNull()
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).syntheticCmpExecuted ?? null)).toBeNull()
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0)
    const count = calls.ads
    await page.reload()
    expect(await syntheticMarker(page)).toBeNull()
    expect(calls.ads).toBe(count)
    await page.goBack()
    await expect(page).toHaveURL(/\/blog\/quick-start$/)
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    const afterBack = calls.ads
    await page.goForward()
    await expect(page).toHaveURL(/\/editor$/)
    expect(await syntheticMarker(page)).toBeNull()
    expect(calls.ads).toBe(afterBack)
  })

  for (const fill of ['unfilled', 'blocked', 'slow'] as const) {
    test(`keeps reserved space and reading usable when ad is ${fill}`, async ({ page }) => {
      if (fill === 'slow') {
        await page.clock.install()
      }
      await page.setViewportSize({ width: 390, height: 844 })
      const calls = await interceptAdvertising(page, { initial: 'accepted', fill })
      await page.goto('/blog/quick-start')
      if (fill === 'slow') {
        await expect.poll(() => syntheticMarker(page)).toBe(1); await page.clock.fastForward(12500)
      }
      const status = fill === 'unfilled' ? '暂无广告' : '广告未能加载'
      await expect(page.getByRole('status').filter({ hasText: status })).toBeVisible()
      expect(await page.locator('ins.adsbygoogle').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(250)
      expect(calls.ads).toBe(1)
      await page.getByRole('link', { name: '打开编辑器，动手试试' }).click()
      await expect(page).toHaveURL(/\/editor$/)
    })
  }

  for (const cmp of ['blocked', 'silent'] as const) {
    test(`fails closed when CMP is ${cmp}`, async ({ page }) => {
      const calls = await interceptAdvertising(page, { cmp })
      if (cmp === 'silent') {
        await page.clock.install()
      }
      await page.goto('/privacy#choices')
      await page.getByRole('button', { name: '打开 Google 隐私选择', exact: true }).click()
      if (cmp === 'silent') {
        await expect.poll(() => calls.cmp).toBe(1); await page.clock.fastForward(15500)
      }
      await expect(page.getByRole('status').filter({ hasText: '暂时不可用' })).toBeVisible()
      expect(calls.ads).toBe(0)
      await page.goto('/blog/quick-start')
      if (cmp === 'silent') {
        await expect.poll(() => calls.cmp).toBe(2); await page.clock.fastForward(15500)
      }
      await expect(page.getByRole('status').filter({ hasText: '隐私消息不可用' })).toBeVisible()
      expect(calls.ads).toBe(0)
    })
  }

  test('never loads ad scripts outside real tutorial records', async ({ page }) => {
    const calls = await interceptAdvertising(page, { initial: 'accepted' })
    for (const path of ['/', '/blog', '/about', '/privacy', '/terms', '/sponsor', '/editor', '/studio', '/scenario/studio-recovery', '/__scenario/studio-recovery', '/blog/unknown', '/missing']) {
      await page.goto(path)
      await expect(page.locator('#oneimg-ad-script')).toHaveCount(0)
      expect(calls.ads).toBe(0)
      expect(calls.cmp).toBe(0)
    }
  })

  for (const [label, options] of [
    ['合成撤回选择', { initial: 'accepted' }],
    ['合成美国州动态退出', { initial: 'accepted', us: 'allowed' }],
    ['合成 CMP 回调失败', { initial: 'accepted' }],
  ] as [string, FixtureOptions][]) {
    test(`ends executing context after live signal: ${label}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      const calls = await interceptAdvertising(page, options)
      await page.goto('/blog/quick-start')
      await expect.poll(() => syntheticMarker(page)).toBe(1)
      await Promise.all([page.waitForEvent('domcontentloaded'), page.getByRole('button', { name: label, exact: true }).click()])
      expect(await syntheticMarker(page)).toBeNull()
      expect(calls.ads).toBe(1)
      expect(errors).toEqual([])
    })
  }

  test('uses the current Google object when GPP is absent and US rules do not apply', async ({ page }) => {
    const calls = await interceptAdvertising(page, { eu: false, noGpp: true })
    await page.goto('/blog/quick-start')
    await expect.poll(() => syntheticMarker(page)).toBe(1)
    expect(calls.ads).toBe(1)
  })

  test('a visitor can consider the CMP longer than the resource timeout and then accept', async ({ page }) => {
    await page.clock.install()
    const calls = await interceptAdvertising(page, { deferredData: true })
    await page.goto('/blog/quick-start')
    await expect(page.getByRole('button', { name: '合成接受', exact: true })).toBeVisible()
    await page.clock.fastForward(20000)
    await expect(page.getByRole('status').filter({ hasText: '不可用' })).toHaveCount(0)
    expect(calls.ads).toBe(0)
    await page.getByRole('button', { name: '合成接受', exact: true }).click()
    await expect.poll(() => syntheticMarker(page)).toBe(1)
  })

  test('privacy choices can be opened with the keyboard', async ({ page }) => {
    await interceptAdvertising(page, { initial: 'accepted' })
    await page.goto('/privacy#choices')
    const button = page.getByRole('button', { name: '打开 Google 隐私选择', exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: '合成拒绝', exact: true })).toBeVisible()
    expect(await syntheticMarker(page)).toBeNull()
  })
})
