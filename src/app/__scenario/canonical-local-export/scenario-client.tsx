'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import {
  controlledCanonicalSnapshot,
  controlledFixtureResources,
} from '@/features/canonical-renderer/controlled-fixture'
import { waitForCanonicalRenderReady } from '@/features/canonical-renderer/render-ready'
import {
  type ResolvedResourceSet,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import type { LocalExportDiagnostics, LocalRasterizerAdapter } from '@/features/local-export/local-rasterizer'
import { createLocalSvgAdapter } from '@/features/local-export/local-svg-adapter'

export function CanonicalLocalExportScenario() {
  const adapter = useMemo(() => createLocalSvgAdapter(), [])

  return <CanonicalLocalExportHarness adapter={adapter} />
}

function CanonicalLocalExportHarness({ adapter }: { readonly adapter: LocalRasterizerAdapter }) {
  const resolver = useMemo(() => createBrowserResourceResolver(controlledFixtureResources), [])
  const readinessGeneration = useRef(0)
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [previewReady, setPreviewReady] = useState(false)
  const [error, setError] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [diagnostics, setDiagnostics] = useState<(LocalExportDiagnostics & { previewFingerprint: string })>()

  useEffect(() => {
    let active = true
    let resolved: ResolvedResourceSet | undefined

    resolver.resolve(controlledCanonicalSnapshot, 'preview')
      .then((resourceSet) => {
        resolved = resourceSet
        if (active) {
          setResources(resourceSet)
        } else {
          resourceSet.release()
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    return () => {
      active = false
      resolved?.release()
    }
  }, [resolver])

  useEffect(() => {
    if (!resources) {
      setPreviewReady(false)
      return
    }

    let active = true
    const generation = readinessGeneration.current + 1
    readinessGeneration.current = generation
    const previewRoot = document.querySelector<HTMLElement>('[data-testid="canonical-preview"] [data-oneimg-render-root]')
    if (!previewRoot) {
      setError('Canonical preview did not mount a Render Root')
      return
    }

    waitForCanonicalRenderReady(previewRoot, controlledCanonicalSnapshot, resources, {
      isCurrent: () => active && readinessGeneration.current === generation,
    })
      .then(() => {
        if (!active) {
          return
        }
        previewRoot.dataset.renderReady = 'true'
        setPreviewReady(true)
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    return () => {
      active = false
    }
  }, [resources])

  const exportLocalPng = async () => {
    if (!resources || !previewReady || exporting) {
      return
    }
    setExporting(true)
    setError(undefined)

    try {
      const artifact = await adapter.exportPng({
        resources,
        snapshot: controlledCanonicalSnapshot,
      })
      const downloadUrl = URL.createObjectURL(artifact.blob)
      const anchor = document.createElement('a')
      anchor.download = `oneimg-${controlledCanonicalSnapshot.snapshotId}.png`
      anchor.href = downloadUrl
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      setDiagnostics({
        ...artifact.diagnostics,
        previewFingerprint: resources.fingerprint,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setExporting(false)
    }
  }

  return (
    <main style={{ background: '#dfe4ef', minHeight: '100vh', padding: '32px 0 80px' }}>
      <header style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', margin: '0 auto 18px', width: 640 }}>
        <p style={{ color: '#4e5d78', font: '600 12px/1.4 ui-monospace, monospace', margin: 0 }}>
          STUDIO SCENARIO HARNESS · ISSUE #27
        </p>
        <button
          disabled={!resources || !previewReady || exporting}
          onClick={() => {
            exportLocalPng()
          }}
          style={{ background: '#182039', border: 0, borderRadius: 999, color: '#fff', cursor: 'pointer', font: '600 14px/1 sans-serif', padding: '11px 18px' }}
          type="button"
        >
          {exporting ? '正在导出…' : previewReady ? '导出本地 PNG' : '正在准备预览…'}
        </button>
      </header>
      {error && <pre data-testid="scenario-error" style={{ color: '#a00', margin: '0 auto', width: 640 }}>{error}</pre>}
      {!error && !resources && <p data-testid="scenario-loading" style={{ margin: '0 auto', width: 640 }}>Resolving canonical resources…</p>}
      {resources && (
        <div aria-busy={!previewReady} data-testid="canonical-preview" style={{ margin: '0 auto', width: 640 }}>
          <CanonicalRenderSurface
            mode="preview"
            resources={resources}
            snapshot={controlledCanonicalSnapshot}
          />
        </div>
      )}
      {diagnostics && (
        <pre data-testid="export-diagnostics" style={{ background: '#fff', margin: '18px auto 0', overflow: 'auto', padding: 16, width: 640 }}>
          {JSON.stringify(diagnostics)}
        </pre>
      )}
    </main>
  )
}
