'use client'

import { useMemo } from 'react'
import { CanonicalLocalExportHarness } from '@/app/__scenario/canonical-local-export/scenario-client'
import {
  longCanonicalFixtureResources,
  longCanonicalSnapshot,
} from '@/features/canonical-renderer/long-fixture'
import { createRenderAbortError } from '@/features/rendering/cancellation'
import type { LocalExportStage, LocalExportStageHook } from '@/features/local-export/local-rasterizer'

const CANCELLABLE_STAGES: readonly LocalExportStage[] = [
  'render-ready',
  'serializing',
  'encoding',
  'packaging',
]

function waitForCancellation(signal?: AbortSignal) {
  if (!signal) {
    return Promise.resolve()
  }

  return new Promise<void>((_resolve, reject) => {
    const onAbort = () => reject(createRenderAbortError())
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
    }
  })
}

export function CanonicalLongExportScenario() {
  const beforeExportStage = useMemo<LocalExportStageHook | undefined>(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const requestedStage = new URLSearchParams(window.location.search).get('cancelStage')
    if (!CANCELLABLE_STAGES.some(stage => stage === requestedStage)) {
      return undefined
    }

    return async (stage, signal) => {
      if (stage === requestedStage) {
        await waitForCancellation(signal)
      }
    }
  }, [])
  const cancelAfterPackagingChunk = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('cancelAfterPackagingChunk') === '1'

  return (
    <CanonicalLocalExportHarness
      exportSlices
      beforeExportStage={beforeExportStage}
      cancelAfterPackagingChunk={cancelAfterPackagingChunk}
      resourceDefinitions={longCanonicalFixtureResources}
      scenarioLabel="STUDIO SCENARIO HARNESS · ISSUE #28"
      snapshot={longCanonicalSnapshot}
    />
  )
}

export function CanonicalLongExportEngineScenario() {
  const cancelAfterPackagingChunk = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('cancelAfterPackagingChunk') === '1'
  return (
    <CanonicalLocalExportHarness
      exportSlices
      cancelAfterPackagingChunk={cancelAfterPackagingChunk}
      resourceDefinitions={longCanonicalFixtureResources}
      runThroughExportEngine
      scenarioLabel="STUDIO SCENARIO HARNESS · ISSUE #35 · SEGMENTED"
      snapshot={longCanonicalSnapshot}
    />
  )
}
