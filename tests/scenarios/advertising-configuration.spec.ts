import { expect, test } from '@playwright/test'

const variant = process.env.ONEIMG_TEST_ADS_CONFIG ?? 'default'

test(`advertising configuration fails closed: ${variant}`, async ({ page }) => {
  const thirdParty: string[] = []
  await page.context().route(/https:\/\/[^/]*(?:googlesyndication\.com|googleadservices\.com|doubleclick\.net|fundingchoicesmessages\.google\.com)\//, (route) => {
    thirdParty.push(new URL(route.request().url()).hostname)
    return route.abort()
  })
  await page.goto('/blog/quick-start')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(variant === 'valid' ? 1 : 0)
  if (variant !== 'valid') {
    expect(thirdParty).toEqual([])
  }
  await page.goto('/privacy#choices')
  const button = page.getByRole('button', { name: '打开 Google 隐私选择', exact: true })
  if (variant === 'default' || variant === 'unverified-cmp' || variant === 'invalid-cmp-url') {
    await expect(button).toBeDisabled()
  } else {
    await expect(button).toBeEnabled()
  }
  await page.goto('/editor')
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0)
  await expect(page.locator('#oneimg-google-cmp')).toHaveCount(0)
})
