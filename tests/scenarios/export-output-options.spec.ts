import { expect, test } from '@playwright/test'
import { SINGLE_IMAGE_RENDER_LIMITS, createExportRenderPlan } from '../../src/features/local-export/segmented-render'

for (const scale of [1, 2, 3] as const) {
  test(`exports a complete image at ${scale}× unless slicing is enabled`, () => {
    const whole = createExportRenderPlan(640, 2400, scale)
    expect(whole.mode).toBe('single')
    expect(whole.segments).toHaveLength(1)
    expect({ width: whole.width, height: whole.height }).toEqual({ width: 640 * scale, height: 2400 * scale })

    const sliced = createExportRenderPlan(640, 2400, scale, true)
    expect(sliced.mode).toBe(scale === 1 ? 'single' : 'segmented')
    expect(sliced.segments.reduce((height, segment) => height + segment.height, 0)).toBe(whole.height)
    expect(sliced.width).toBe(whole.width)
  })
}

test('requires an explicit choice when a complete image exceeds its safety limits', () => {
  for (const [width, height] of [[640, 20_000], [3000, 6000], [SINGLE_IMAGE_RENDER_LIMITS.maxDimension + 1, 1]]) {
    expect(() => createExportRenderPlan(width!, height!, 1)).toThrow('降低倍率或开启分片导出')
  }
  expect(createExportRenderPlan(640, 20_000, 1, true).mode).toBe('segmented')
  expect(createExportRenderPlan(640, SINGLE_IMAGE_RENDER_LIMITS.maxDimension, 1).mode).toBe('single')
})

test('scales fractional layout measurements before rounding to output pixels', () => {
  const plan = createExportRenderPlan(640, 159.65625, 3)
  expect(plan.width).toBe(1920)
  expect(plan.height).toBe(479)
  expect(plan.segments[0]?.captureHeight).toBe(479)
})
