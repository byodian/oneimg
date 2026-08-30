import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

function readFindings(page: Page) {
  return page.getByTestId('preflight-findings').textContent().then(text => JSON.parse(text ?? '{}') as {
    canExport: boolean
    findings: Array<{
      action?: { kind: string; label: string }
      code: string
      kind: string
      message: string
    }>
  })
}

test.describe('Export Preflight and Render Ready contract', () => {
  test('blocks an empty Document with a visible recovery action', async ({ page }) => {
    await page.goto('/scenario/preflight?case=empty')

    const result = await readFindings(page)
    expect(result.canExport).toBe(false)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: expect.objectContaining({ kind: 'focus-content' }),
        code: 'empty-document',
        kind: 'blocking-error',
      }),
    ]))
    await expect(page.getByTestId('preflight-panel')).toContainText('开始输入或粘贴内容')
  })

  test('locates an Unresolved Asset instead of producing an incomplete result', async ({ page }) => {
    await page.goto('/scenario/preflight?case=unresolved')

    const result = await readFindings(page)
    expect(result.canExport).toBe(false)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: expect.objectContaining({ kind: 'relink-resource' }),
        code: 'unresolved-asset',
        kind: 'blocking-error',
      }),
    ]))
    await expect(page.getByTestId('preflight-panel')).toContainText('重新链接资源')
    await expect(page.getByTestId('preflight-panel')).toContainText('image:missing')
  })

  test('classifies an image decode failure as an Unresolved Asset', async ({ page }) => {
    await page.goto('/scenario/preflight?case=decode-failure')

    const result = await readFindings(page)
    expect(result.canExport).toBe(false)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unresolved-asset',
        kind: 'blocking-error',
      }),
    ]))
    await expect(page.getByTestId('preflight-panel')).toContainText('image:decode-failed')
  })

  test('keeps quality warnings and Scene Suggestions non-blocking', async ({ page }) => {
    await page.goto('/scenario/preflight?case=warnings')

    const result = await readFindings(page)
    expect(result.canExport).toBe(true)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'low-resolution-media', kind: 'quality-warning' }),
      expect.objectContaining({ code: 'font-fallback', kind: 'quality-warning' }),
      expect.objectContaining({ code: 'missing-scene-slot', kind: 'content-suggestion' }),
    ]))
    await expect(page.getByTestId('preflight-panel')).toContainText('质量提醒')
    await expect(page.getByTestId('preflight-panel')).toContainText('内容建议')
  })

  test('offers a compatible repair and High-Fidelity route only for ordinary Documents', async ({ page }) => {
    await page.goto('/scenario/preflight?case=risky')
    const ordinary = await readFindings(page)
    expect(ordinary.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: expect.objectContaining({ kind: 'apply-compatible-presentation' }),
        code: 'presentation-risk',
        kind: 'quality-warning',
      }),
      expect.objectContaining({
        alternatives: expect.arrayContaining([
          expect.objectContaining({ kind: 'authorize-high-fidelity' }),
        ]),
        code: 'presentation-risk',
      }),
    ]))

    await page.goto('/scenario/preflight?case=sensitive-risk')
    const sensitive = await readFindings(page)
    expect(sensitive.findings.some(finding => finding.action?.kind === 'authorize-high-fidelity')).toBe(false)
    expect(sensitive.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: expect.objectContaining({ kind: 'apply-compatible-presentation' }),
        code: 'presentation-risk',
      }),
    ]))
    await expect(page.getByTestId('preflight-panel')).not.toContainText('授权 High-Fidelity Export')
  })

  test('does not offer an unverified compatibility repair after a probe failure', async ({ page }) => {
    await page.goto('/scenario/preflight?case=probe-failure')

    const result = await readFindings(page)
    expect(result.canExport).toBe(false)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'local-capability-probe-failed',
        kind: 'blocking-error',
      }),
    ]))
    expect(result.findings.some(finding => finding.action?.kind === 'apply-compatible-presentation')).toBe(false)
    await expect(page.getByTestId('preflight-panel')).not.toContainText('应用兼容呈现')
    await expect(page.getByTestId('preflight-panel')).not.toContainText('授权 High-Fidelity Export')
  })

  test('offers High-Fidelity authorization after a probe failure when available', async ({ page }) => {
    await page.goto('/scenario/preflight?case=probe-failure-hf')

    const result = await readFindings(page)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: expect.objectContaining({ kind: 'authorize-high-fidelity' }),
        code: 'local-capability-probe-failed',
        kind: 'blocking-error',
      }),
    ]))
    expect(result.findings.some(finding => finding.action?.kind === 'apply-compatible-presentation')).toBe(false)
    await expect(page.getByTestId('preflight-panel')).toContainText('授权 High-Fidelity Export')
    await expect(page.getByTestId('preflight-panel')).not.toContainText('应用兼容呈现')
  })

  test('keeps Render Ready failure blocking and reports stable layout diagnostics', async ({ page }) => {
    await page.goto('/scenario/preflight?case=renderer-failure')

    const result = await readFindings(page)
    expect(result.canExport).toBe(false)
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'renderer-unavailable', kind: 'blocking-error' }),
      expect.objectContaining({ code: 'corrupt-content', kind: 'blocking-error' }),
    ]))
    await expect(page.getByTestId('render-ready-diagnostics')).toContainText('"stableFrames":2')
    await expect(page.getByTestId('render-ready-diagnostics')).toContainText('"paginationFinal":true')
  })
})
