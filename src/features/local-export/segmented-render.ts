import type {
  SemanticSliceBoundary,
  SemanticSliceBoundaryKind,
  SemanticSliceBoundaryReason,
} from '@/features/canonical-renderer/semantic-boundaries'

export type {
  SemanticSliceBoundary,
  SemanticSliceBoundaryKind,
  SemanticSliceBoundaryReason,
} from '@/features/canonical-renderer/semantic-boundaries'

export interface SegmentedRenderLimits {
  readonly maxSegments: number
  readonly maxSegmentPixels: number
  readonly maxSinglePageHeight: number
  readonly maxSinglePagePixels: number
  readonly segmentBleed: number
}

export interface SemanticSlice {
  readonly boundary: {
    readonly id: string
    readonly kind: SemanticSliceBoundaryReason
    readonly y: number
  }
  readonly height: number
  readonly index: number
  readonly y: number
}

export interface RenderSegment {
  readonly captureHeight: number
  readonly captureY: number
  readonly height: number
  readonly index: number
  readonly semanticSlice: SemanticSlice
  readonly trimTop: number
  readonly y: number
}

export interface SegmentedRenderPlan {
  readonly height: number
  readonly limits: SegmentedRenderLimits
  readonly mode: 'segmented' | 'single'
  readonly semanticSlices: readonly SemanticSlice[]
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

const SEMANTIC_BOUNDARY_PRIORITY: Record<SemanticSliceBoundaryKind, number> = {
  'block': 2,
  'heading': 3,
  'keep-together': 4,
  'section': 3,
}

function normalizeSemanticBoundaries(
  boundaries: readonly SemanticSliceBoundary[],
  height: number,
) {
  const byPosition = new Map<number, SemanticSliceBoundary>()
  for (const boundary of boundaries) {
    if (
      boundary.id.trim() === ''
      || !Number.isFinite(boundary.y)
      || boundary.y < 0
      || boundary.y >= height
      || (boundary.y === 0 && boundary.kind !== 'keep-together')
    ) {
      continue
    }
    const normalizedY = Math.ceil(boundary.y)
    const normalizedEndY = boundary.kind === 'keep-together'
      && boundary.endY !== undefined
      && Number.isFinite(boundary.endY)
      && boundary.endY > boundary.y
      ? Math.min(height, Math.max(normalizedY + 1, Math.ceil(boundary.endY)))
      : undefined
    const existing = byPosition.get(normalizedY)
    if (
      existing === undefined
      || SEMANTIC_BOUNDARY_PRIORITY[boundary.kind] > SEMANTIC_BOUNDARY_PRIORITY[existing.kind]
      || (
        SEMANTIC_BOUNDARY_PRIORITY[boundary.kind] === SEMANTIC_BOUNDARY_PRIORITY[existing.kind]
        && boundary.id < existing.id
      )
    ) {
      byPosition.set(normalizedY, {
        ...(normalizedEndY === undefined ? {} : { endY: normalizedEndY }),
        id: boundary.id,
        kind: boundary.kind,
        y: normalizedY,
      })
    }
  }
  return Array.from(byPosition.values()).sort((left, right) => left.y - right.y || left.id.localeCompare(right.id))
}

interface SemanticSliceBreakCandidate {
  readonly boundary: SemanticSliceBoundary
  readonly y: number
}

function createSemanticSliceBreakCandidates(boundaries: readonly SemanticSliceBoundary[]) {
  const ranges = boundaries.flatMap((boundary) => {
    if (boundary.kind !== 'keep-together' || boundary.endY === undefined || boundary.endY <= boundary.y) {
      return []
    }
    return [{ endY: boundary.endY, startY: boundary.y }]
  })
  const byPosition = new Map<number, SemanticSliceBreakCandidate>()
  const addCandidate = (boundary: SemanticSliceBoundary, y: number) => {
    if (ranges.some(range => y > range.startY && y < range.endY)) {
      return
    }
    const candidate = {
      boundary: { ...boundary, y },
      y,
    }
    const existing = byPosition.get(y)
    if (
      existing === undefined
      || SEMANTIC_BOUNDARY_PRIORITY[boundary.kind] > SEMANTIC_BOUNDARY_PRIORITY[existing.boundary.kind]
      || (
        SEMANTIC_BOUNDARY_PRIORITY[boundary.kind] === SEMANTIC_BOUNDARY_PRIORITY[existing.boundary.kind]
        && boundary.id < existing.boundary.id
      )
    ) {
      byPosition.set(y, candidate)
    }
  }

  for (const boundary of boundaries) {
    addCandidate(boundary, boundary.y)
    if (boundary.kind === 'keep-together' && boundary.endY !== undefined && boundary.endY > boundary.y) {
      addCandidate({
        id: `${boundary.id}:end`,
        kind: boundary.kind,
        y: boundary.endY,
      }, boundary.endY)
    }
  }

  return Array.from(byPosition.values()).sort((left, right) => left.y - right.y || left.boundary.id.localeCompare(right.boundary.id))
}

function createSemanticSlice(
  index: number,
  y: number,
  endY: number,
  boundary: SemanticSliceBoundary | undefined,
  height: number,
): SemanticSlice {
  const normalizedEndY = Math.min(height, Math.max(y + 1, Math.ceil(endY)))
  return {
    boundary: boundary === undefined
      ? {
          id: normalizedEndY === height ? 'document-end' : `visual:${normalizedEndY}`,
          kind: normalizedEndY === height ? 'document-end' : 'visual-fallback',
          y: normalizedEndY,
        }
      : {
          id: boundary.id,
          kind: boundary.kind,
          y: normalizedEndY,
        },
    height: normalizedEndY - y,
    index,
    y,
  }
}

function createSemanticSlices(
  height: number,
  maxSegmentHeight: number,
  boundaries: readonly SemanticSliceBoundary[],
) {
  const normalizedBoundaries = normalizeSemanticBoundaries(boundaries, height)
  const breakCandidates = createSemanticSliceBreakCandidates(normalizedBoundaries)
  const slices: SemanticSlice[] = []
  let y = 0

  while (y < height) {
    const maxEndY = Math.min(height, y + maxSegmentHeight)
    const candidate = breakCandidates
      .filter(candidate => candidate.y > y && candidate.y <= maxEndY)
      .at(-1)
    const endY = candidate?.y ?? maxEndY
    const slice = createSemanticSlice(slices.length, y, endY, candidate?.boundary, height)
    slices.push(slice)
    y = slice.y + slice.height
  }

  return slices
}

function createRenderSegments(
  slices: readonly SemanticSlice[],
  width: number,
  height: number,
  segmentBleed: number,
) {
  const normalizedBleed = Math.ceil(segmentBleed)
  return slices.map((slice) => {
    const captureY = Math.max(0, slice.y - normalizedBleed)
    const captureEnd = Math.min(height, slice.y + slice.height + normalizedBleed)
    return {
      captureHeight: captureEnd - captureY,
      captureY,
      height: slice.height,
      index: slice.index,
      semanticSlice: slice,
      trimTop: slice.y - captureY,
      y: slice.y,
    }
  })
}

export function createSegmentedRenderPlan(
  width: number,
  height: number,
  limits: SegmentedRenderLimits = DEFAULT_SEGMENTED_RENDER_LIMITS,
  semanticBoundaries: readonly SemanticSliceBoundary[] = [],
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
    const semanticSlice = createSemanticSlice(0, 0, normalizedHeight, undefined, normalizedHeight)
    return {
      height: normalizedHeight,
      limits,
      mode: 'single',
      semanticSlices: [semanticSlice],
      segments: [{
        captureHeight: normalizedHeight,
        captureY: 0,
        height: normalizedHeight,
        index: 0,
        semanticSlice,
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

  const semanticSlices = createSemanticSlices(normalizedHeight, maxSegmentHeight, semanticBoundaries)
  if (semanticSlices.length > limits.maxSegments) {
    throw new Error(`Unable to segment ${normalizedHeight}px output into at most ${limits.maxSegments} parts`)
  }
  const segments = createRenderSegments(
    semanticSlices,
    normalizedWidth,
    normalizedHeight,
    limits.segmentBleed,
  )

  return {
    height: normalizedHeight,
    limits,
    mode: 'segmented',
    semanticSlices,
    segments,
    width: normalizedWidth,
  }
}
