'use client'

import {
  DEFAULT_SEGMENTED_RENDER_LIMITS,
  type SemanticSliceBoundary,
  createSegmentedRenderPlan,
} from '@/features/local-export/segmented-render'

const plannerLimits = {
  ...DEFAULT_SEGMENTED_RENDER_LIMITS,
  maxSegmentPixels: 40_000,
  maxSegments: 8,
  maxSinglePageHeight: 1,
  maxSinglePagePixels: 1,
  segmentBleed: 0,
}
function summarizePlan(plan: ReturnType<typeof createSegmentedRenderPlan>) {
  return plan.semanticSlices.map(slice => ({
    boundary: slice.boundary,
    height: slice.height,
    index: slice.index,
    y: slice.y,
  }))
}

function runPlannerCase(boundaries: readonly SemanticSliceBoundary[], limits = plannerLimits) {
  try {
    const plan = createSegmentedRenderPlan(100, 900, limits, boundaries)
    return { slices: summarizePlan(plan) }
  } catch (reason) {
    return { error: reason instanceof Error ? reason.message : String(reason) }
  }
}

export function SegmentedRenderScenario() {
  const cases = {
    boundaryAtBudget: runPlannerCase([
      { id: 'block:budget', kind: 'block', y: 400 },
    ]),
    duplicateBoundaryPriority: runPlannerCase([
      { id: 'section:earlier', kind: 'section', y: 200 },
      { id: 'block:duplicate', kind: 'block', y: 300 },
      { id: 'heading:duplicate', kind: 'heading', y: 300 },
    ]),
    invalidCoordinates: runPlannerCase([
      { id: 'block:nan', kind: 'block', y: Number.NaN },
      { id: 'block:outside', kind: 'block', y: 901 },
    ]),
    keepTogether: runPlannerCase([
      { id: 'keep:grid', endY: 350, kind: 'keep-together', y: 250 },
      { id: 'block:nested', kind: 'block', y: 280 },
    ]),
    maxSegments: runPlannerCase([], { ...plannerLimits, maxSegments: 2 }),
  }

  return (
    <main>
      <h1>Segmented Render Planner Scenario</h1>
      <pre data-testid="segmented-render-contract">{JSON.stringify(cases)}</pre>
    </main>
  )
}
