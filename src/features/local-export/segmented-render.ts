export interface SegmentedRenderLimits {
  readonly maxSegments: number
  readonly maxSegmentPixels: number
  readonly maxSinglePageHeight: number
  readonly maxSinglePagePixels: number
  readonly segmentBleed: number
}

export interface RenderSegment {
  readonly captureHeight: number
  readonly captureY: number
  readonly height: number
  readonly index: number
  readonly trimTop: number
  readonly y: number
}

export interface SegmentedRenderPlan {
  readonly height: number
  readonly limits: SegmentedRenderLimits
  readonly mode: 'segmented' | 'single'
  readonly segments: readonly RenderSegment[]
  readonly width: number
}

export const DEFAULT_SEGMENTED_RENDER_LIMITS: SegmentedRenderLimits = {
  maxSegments: 64,
  maxSegmentPixels: 1_024 * 1_024,
  maxSinglePageHeight: 4_096,
  maxSinglePagePixels: 4 * 1_024 * 1_024,
  segmentBleed: 80,
}

function assertDimension(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Unable to plan render: ${name} must be a positive finite number`)
  }
}

function assertLimit(value: number, name: string, minimum: number) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`Unable to plan render: ${name} must be at least ${minimum}`)
  }
}

export function createSegmentedRenderPlan(
  width: number,
  height: number,
  limits: SegmentedRenderLimits = DEFAULT_SEGMENTED_RENDER_LIMITS,
): SegmentedRenderPlan {
  assertDimension(width, 'width')
  assertDimension(height, 'height')
  assertLimit(limits.maxSegments, 'maxSegments', 1)
  assertLimit(limits.maxSegmentPixels, 'maxSegmentPixels', 1)
  assertLimit(limits.maxSinglePageHeight, 'maxSinglePageHeight', 1)
  assertLimit(limits.maxSinglePagePixels, 'maxSinglePagePixels', 1)
  assertLimit(limits.segmentBleed, 'segmentBleed', 0)

  const normalizedWidth = Math.ceil(width)
  const normalizedHeight = Math.ceil(height)
  const singlePagePixels = normalizedWidth * normalizedHeight
  const canRenderAsSinglePage = normalizedHeight <= limits.maxSinglePageHeight
    && singlePagePixels <= limits.maxSinglePagePixels

  if (canRenderAsSinglePage) {
    return {
      height: normalizedHeight,
      limits,
      mode: 'single',
      segments: [{
        captureHeight: normalizedHeight,
        captureY: 0,
        height: normalizedHeight,
        index: 0,
        trimTop: 0,
        y: 0,
      }],
      width: normalizedWidth,
    }
  }

  const maxCaptureHeight = Math.floor(limits.maxSegmentPixels / normalizedWidth)
  const maxSegmentHeight = maxCaptureHeight - (Math.ceil(limits.segmentBleed) * 2)
  if (maxSegmentHeight < 1) {
    throw new Error(`Unable to segment ${normalizedWidth}px output within the pixel budget and bleed allowance`)
  }

  const segments: RenderSegment[] = []
  for (let y = 0; y < normalizedHeight; y += maxSegmentHeight) {
    if (segments.length >= limits.maxSegments) {
      throw new Error(`Unable to segment ${normalizedHeight}px output into at most ${limits.maxSegments} parts`)
    }
    const segmentHeight = Math.min(maxSegmentHeight, normalizedHeight - y)
    const captureY = Math.max(0, y - Math.ceil(limits.segmentBleed))
    const captureEnd = Math.min(normalizedHeight, y + segmentHeight + Math.ceil(limits.segmentBleed))
    segments.push({
      captureHeight: captureEnd - captureY,
      captureY,
      height: segmentHeight,
      index: segments.length,
      trimTop: y - captureY,
      y,
    })
  }

  return {
    height: normalizedHeight,
    limits,
    mode: 'segmented',
    segments,
    width: normalizedWidth,
  }
}
