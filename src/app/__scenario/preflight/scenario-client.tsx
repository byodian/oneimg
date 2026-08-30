'use client'

import { useEffect, useMemo, useState } from 'react'
import { controlledCanonicalSnapshot } from '@/features/canonical-renderer/controlled-fixture'
import type { CanonicalRenderReadiness } from '@/features/canonical-renderer/render-ready'
import {
  ExportPreflightPanel,
  type PreflightAction,
  type PreflightFinding,
  evaluateExportPreflight,
} from '@/features/export-engine'
import { type CanonicalRenderSnapshot, collectSnapshotResourceIds } from '@/features/canonical-renderer/model'

const stableReadiness: CanonicalRenderReadiness = {
  fontFallbackIds: [],
  geometry: [],
  height: 640,
  overflow: { horizontal: false, vertical: false },
  pagination: {
    final: true,
    pageCount: 1,
    pages: [{ height: 640, index: 0, y: 0 }],
  },
  stableFrames: 2,
  width: 640,
}

type PreflightCase = 'decode-failure' | 'empty' | 'probe-failure' | 'probe-failure-hf' | 'renderer-failure' | 'risky' | 'sensitive-risk' | 'unresolved' | 'warnings'

function snapshotForCase(caseName: PreflightCase): CanonicalRenderSnapshot {
  if (caseName === 'risky') {
    return { ...controlledCanonicalSnapshot, localCapability: 'high-fidelity-required' }
  }
  if (caseName === 'sensitive-risk') {
    return {
      ...controlledCanonicalSnapshot,
      localCapability: 'high-fidelity-required',
      sensitive: true,
    }
  }
  return controlledCanonicalSnapshot
}

function readCase(): PreflightCase {
  if (typeof window === 'undefined') {
    return 'warnings'
  }
  const value = new URLSearchParams(window.location.search).get('case')
  return value === 'empty'
    || value === 'decode-failure'
    || value === 'probe-failure'
    || value === 'probe-failure-hf'
    || value === 'renderer-failure'
    || value === 'risky'
    || value === 'sensitive-risk'
    || value === 'unresolved'
    || value === 'warnings'
    ? value
    : 'warnings'
}

export function PreflightScenario() {
  const [caseName, setCaseName] = useState<PreflightCase>('warnings')
  const [lastAction, setLastAction] = useState<PreflightAction>()

  useEffect(() => {
    setCaseName(readCase())
  }, [])

  const snapshot = useMemo(() => snapshotForCase(caseName), [caseName])
  const result = useMemo(() => {
    const rendererFailure = caseName === 'renderer-failure'
    const decodeFailure = caseName === 'decode-failure'
    const probeFailure = caseName === 'probe-failure' || caseName === 'probe-failure-hf'
    const unresolved = caseName === 'unresolved'
    const warningCase = caseName === 'warnings'
    const findingsInput = {
      contentError: rendererFailure ? 'invalid-render-root' : undefined,
      fontFallbackIds: warningCase ? ['font:noto-sans-sc@5.3.0/118'] : [],
      highFidelityAvailable: caseName === 'risky' || caseName === 'probe-failure-hf',
      images: warningCase ? [{
        blockId: 'section:media',
        naturalHeight: 320,
        naturalWidth: 480,
        renderedHeight: 480,
        renderedWidth: 640,
        resourceId: 'image:low-resolution@1',
      }] : decodeFailure ? [{
        blockId: 'section:media',
        naturalHeight: 0,
        naturalWidth: 0,
        renderedHeight: 480,
        renderedWidth: 640,
        resourceId: 'image:decode-failed',
      }] : [],
      localCapabilityProbe: probeFailure
        ? { reason: 'probe fixture failed', status: 'failed' as const }
        : { status: 'passed' as const },
      meaningful: caseName !== 'empty',
      readiness: stableReadiness,
      renderReady: !rendererFailure && !unresolved && !decodeFailure,
      rendererAvailable: !rendererFailure,
      resolvedResourceIds: unresolved ? collectSnapshotResourceIds(snapshot).filter(id => id !== 'image:missing') : collectSnapshotResourceIds(snapshot),
      sceneSlots: warningCase ? [{
        id: 'hero',
        label: '标题',
        recommended: true,
        satisfied: false,
        targetId: 'section:hero',
      }] : [],
      snapshot: rendererFailure ? undefined : snapshot,
      unresolvedResourceIds: unresolved ? ['image:missing'] : [],
    }
    return evaluateExportPreflight(findingsInput)
  }, [caseName, snapshot])

  const handleAction = (action: PreflightAction, _finding: PreflightFinding) => {
    setLastAction(action)
  }

  const diagnostics = {
    ...stableReadiness,
    paginationFinal: stableReadiness.pagination.final,
  }

  return (
    <main style={{ background: '#dfe4ef', minHeight: '100vh', padding: '32px 0 80px' }}>
      <div style={{ margin: '0 auto', width: 640 }}>
        <p style={{ color: '#4e5d78', font: '600 12px/1.4 ui-monospace, monospace', margin: '0 0 18px' }}>
          STUDIO SCENARIO HARNESS · ISSUE #36
        </p>
        <ExportPreflightPanel findings={result.findings} onAction={handleAction} />
        {lastAction && <p data-testid="preflight-last-action">{lastAction.label}</p>}
        <output data-testid="preflight-findings" style={{ display: 'block', marginTop: 18 }}>
          {JSON.stringify(result)}
        </output>
        <pre data-testid="render-ready-diagnostics" style={{ background: '#fff', marginTop: 18, overflow: 'auto', padding: 16 }}>
          {JSON.stringify(diagnostics)}
        </pre>
      </div>
    </main>
  )
}
