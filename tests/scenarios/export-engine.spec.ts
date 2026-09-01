import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

function readJson(page: Page, testId: string) {
  return page.getByTestId(testId).textContent().then(text => JSON.parse(text ?? '{}') as Record<string, unknown>)
}

test.describe('Export Engine scenario', () => {
  test('plans without resolving resources or rasterizing', async ({ page }) => {
    await page.goto('/scenario/export-engine')

    await page.getByRole('button', { name: '查看 Export Plan' }).click()
    await expect(page.getByTestId('export-engine-plan')).toContainText('local-eligible')
    await expect.poll(() => readJson(page, 'export-engine-metrics')).toMatchObject({
      adapterCalls: 0,
      releasedResources: 0,
      resolverCalls: 0,
    })
  })

  test('keeps font fallback outcomes out of the same export cache entry', async ({ page }) => {
    await page.goto('/scenario/export-engine')

    await page.getByRole('button', { name: '比较字体回退缓存键' }).click()
    await expect(page.getByTestId('export-engine-cache-key')).toHaveText('different')
  })

  test('rejects a plan when the font fallback outcome changes before rendering', async ({ page }) => {
    await page.goto('/scenario/export-engine')

    await page.getByRole('button', { name: '字体回退变化运行' }).click()
    await expect.poll(() => readJson(page, 'export-engine-job')).toMatchObject({
      error: {
        code: 'resource-resolution-failed',
        stage: 'preparing',
      },
      stage: 'failed',
      status: 'failed',
    })
    await expect(page.getByTestId('export-engine-error')).toContainText('Referenced render sources changed after Export Plan creation')
    await expect.poll(() => readJson(page, 'export-engine-metrics')).toMatchObject({ adapterCalls: 0 })
  })

  test('publishes ready and failed job states with resource cleanup', async ({ page }) => {
    await page.goto('/scenario/export-engine')

    await page.getByRole('button', { name: '成功运行' }).click()
    await expect.poll(() => readJson(page, 'export-engine-job')).toMatchObject({ status: 'ready', stage: 'ready' })
    await expect.poll(() => readJson(page, 'export-engine-metrics')).toMatchObject({
      adapterCalls: 1,
      releasedResources: 1,
      resolverCalls: 1,
      snapshotFrozen: true,
    })
    await expect(page.getByTestId('export-engine-result')).toContainText('fromCache')

    await page.reload()
    await page.getByRole('button', { name: '失败运行' }).click()
    await expect.poll(() => readJson(page, 'export-engine-job')).toMatchObject({
      error: {
        code: 'resource-resolution-failed',
        nextStep: expect.any(String),
        recoveryAction: 'resolve-resources',
        stage: 'preparing',
      },
      stage: 'failed',
      status: 'failed',
    })
    await expect(page.getByTestId('export-engine-error')).toContainText('Scenario Resource Resolver failed')
  })

  test('commits canceled before a late resolver completion can publish ready', async ({ page }) => {
    await page.goto('/scenario/export-engine')

    await page.getByRole('button', { name: '可取消运行' }).click()
    await expect.poll(() => readJson(page, 'export-engine-job')).toMatchObject({ status: 'running' })
    await page.getByRole('button', { name: '取消任务' }).click()
    await expect.poll(() => readJson(page, 'export-engine-job')).toMatchObject({ status: 'canceled', stage: 'canceled' })
    await expect(page.getByTestId('export-engine-result')).toHaveText('')
  })
})
