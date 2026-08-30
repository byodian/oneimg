import { expect, test } from '@playwright/test'

test('keeps the semantic planner edge cases deterministic', async ({ page }) => {
  await page.goto('/scenario/segmented-render')

  const cases = JSON.parse(await page.getByTestId('segmented-render-contract').textContent() ?? '{}') as {
    boundaryAtBudget: { slices: Array<{ boundary: { kind: string }; height: number; y: number }> }
    duplicateBoundaryPriority: { slices: Array<{ boundary: { id: string; kind: string }; height: number; y: number }> }
    invalidCoordinates: { slices: Array<{ boundary: { kind: string }; height: number; y: number }> }
    keepTogether: { slices: Array<{ boundary: { kind: string }; height: number; y: number }> }
    maxSegments: { error?: string }
  }

  expect(cases.duplicateBoundaryPriority.slices[0]).toMatchObject({
    boundary: { id: 'heading:duplicate', kind: 'heading' },
    height: 300,
    y: 0,
  })
  expect(cases.boundaryAtBudget.slices[0]).toMatchObject({
    boundary: { kind: 'block' },
    height: 400,
  })
  expect(cases.invalidCoordinates.slices[0]).toMatchObject({
    boundary: { kind: 'visual-fallback' },
    height: 400,
  })
  expect(cases.keepTogether.slices[0]).toMatchObject({
    boundary: { kind: 'keep-together' },
    height: 350,
  })
  expect(cases.maxSegments.error).toContain('at most 2 parts')
})
