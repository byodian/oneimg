'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import {
  controlledCanonicalSnapshot,
  controlledFixtureResources,
} from '@/features/canonical-renderer/controlled-fixture'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import {
  type CanonicalRenderReadiness,
  waitForCanonicalRenderReady,
} from '@/features/canonical-renderer/render-ready'
import {
  type BrowserResourceDefinition,
  type ResolvedResourceSet,
  type ResourceResolverDiagnostics,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import {
  type ExportJob,
  type ExportJobState,
  createExportEngine,
} from '@/features/export-engine'
import {
  isRenderAbortError,
} from '@/features/rendering/cancellation'
import {
  EMPTY_LOCAL_EXPORT_CLEANUP_AUDIT,
  type LocalExportDiagnostics,
  type LocalExportProgress,
  type LocalExportStage,
  type LocalExportStageHook,
  type LocalRasterizerAdapter,
} from '@/features/local-export/local-rasterizer'
import { createLocalSvgAdapter } from '@/features/local-export/local-svg-adapter'

export interface CanonicalExportScenarioProps {
  readonly beforeExportStage?: LocalExportStageHook
  readonly resourceDefinitions: readonly BrowserResourceDefinition[]
  readonly runThroughExportEngine?: boolean
  readonly scenarioLabel: string
  readonly snapshot: CanonicalRenderSnapshot
}

export function CanonicalLocalExportScenario() {
  return (
    <CanonicalLocalExportHarness
      resourceDefinitions={controlledFixtureResources}
      scenarioLabel="STUDIO SCENARIO HARNESS · ISSUE #27"
      snapshot={controlledCanonicalSnapshot}
    />
  )
}

export function CanonicalExportEngineScenario() {
  return (
    <CanonicalLocalExportHarness
      resourceDefinitions={controlledFixtureResources}
      runThroughExportEngine
      scenarioLabel="STUDIO SCENARIO HARNESS · ISSUE #35"
      snapshot={controlledCanonicalSnapshot}
    />
  )
}

export function CanonicalLocalExportHarness({
  adapter,
  beforeExportStage,
  resourceDefinitions,
  runThroughExportEngine = false,
  scenarioLabel,
  snapshot,
}: CanonicalExportScenarioProps & { readonly adapter?: LocalRasterizerAdapter }) {
  const resolvedAdapter = useMemo(
    () => adapter ?? createLocalSvgAdapter(),
    [adapter],
  )
  const resolver = useMemo(() => createBrowserResourceResolver(resourceDefinitions), [resourceDefinitions])
  const exportEngine = useMemo(
    () => createExportEngine({ localAdapter: resolvedAdapter, resolver }),
    [resolvedAdapter, resolver],
  )
  const readinessGeneration = useRef(0)
  const exportController = useRef<AbortController>()
  const exportJobRef = useRef<ExportJob>()
  const cancelRequestedAt = useRef<number>()
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [renderReadiness, setRenderReadiness] = useState<CanonicalRenderReadiness>()
  const [previewReady, setPreviewReady] = useState(false)
  const [error, setError] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'canceled' | 'completed' | 'failed' | 'idle' | 'running'>('idle')
  const [progress, setProgress] = useState<LocalExportProgress>({
    completed: 0,
    segmentCount: 0,
    stage: 'cleanup',
    total: 0,
  })
  const [diagnostics, setDiagnostics] = useState<(LocalExportDiagnostics & { previewFingerprint: string })>()
  const [resourceAudit, setResourceAudit] = useState<ResourceResolverDiagnostics>(resolver.getDiagnostics())

  useEffect(() => () => {
    exportController.current?.abort()
    if (exportJobRef.current !== undefined) {
      exportEngine.cancel(exportJobRef.current.id)
    }
  }, [exportEngine])

  useEffect(() => {
    let active = true
    let resolved: ResolvedResourceSet | undefined
    const controller = new AbortController()

    resolver.resolve(snapshot, 'preview', { signal: controller.signal })
      .then((resourceSet) => {
        resolved = resourceSet
        if (active) {
          setResources(resourceSet)
          setResourceAudit(resolver.getDiagnostics())
        } else {
          resourceSet.release()
        }
      })
      .catch((reason: unknown) => {
        if (active && !isRenderAbortError(reason)) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
        if (active) {
          setResourceAudit(resolver.getDiagnostics())
        }
      })

    return () => {
      active = false
      controller.abort()
      resolved?.release()
    }
  }, [resolver, snapshot])

  useEffect(() => {
    if (!resources) {
      setPreviewReady(false)
      setRenderReadiness(undefined)
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

    waitForCanonicalRenderReady(previewRoot, snapshot, resources, {
      generation: {
        expected: generation,
        getCurrent: () => readinessGeneration.current,
      },
      isCurrent: () => active && readinessGeneration.current === generation,
    })
      .then((readiness) => {
        if (!active) {
          return
        }
        previewRoot.dataset.renderReady = 'true'
        setRenderReadiness(readiness)
        setPreviewReady(true)
      })
      .catch((reason: unknown) => {
        if (active && !isRenderAbortError(reason)) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    return () => {
      active = false
    }
  }, [resources, snapshot])

  const releasePreviewResources = () => {
    if (exportController.current) {
      cancelRequestedAt.current = performance.now()
      setExportStatus('canceled')
      exportController.current.abort()
    }
    if (exportJobRef.current !== undefined) {
      exportEngine.cancel(exportJobRef.current.id)
    }
    resources?.release()
    setResources(undefined)
    setPreviewReady(false)
    setRenderReadiness(undefined)
    setResourceAudit(resolver.getDiagnostics())
  }

  const cancelExport = () => {
    if (runThroughExportEngine && exportJobRef.current !== undefined) {
      exportEngine.cancel(exportJobRef.current.id)
      return
    }
    if (!exportController.current) {
      return
    }
    cancelRequestedAt.current = performance.now()
    setExportStatus('canceled')
    exportController.current.abort()
  }

  const exportThroughEngine = () => {
    if (!resources || !previewReady || exporting) {
      return
    }
    const previewRoot = document.querySelector<HTMLElement>('[data-testid="canonical-preview"] [data-oneimg-render-root]')
    if (!previewRoot) {
      setError('Canonical preview did not mount a Render Root')
      setExportStatus('failed')
      return
    }
    const bounds = previewRoot.getBoundingClientRect()
    const plan = exportEngine.plan({
      meaningful: true,
      output: { format: 'png', scale: 1 },
      pageMeasurements: [{
        height: bounds.height,
        id: 'page-1',
        kind: snapshot.presentation.pageFormat.kind,
        width: bounds.width,
      }],
      renderReady: previewReady,
      resourceFingerprint: resources.fingerprint,
      snapshot,
    })
    if (!plan.canRun) {
      setError(plan.routeReason)
      setExportStatus('failed')
      return
    }
    const job = exportEngine.run(plan)
    exportJobRef.current = job
    setExporting(true)
    setExportStatus('running')
    setError(undefined)
    setDiagnostics(undefined)
    setProgress({ completed: 0, segmentCount: plan.pages.reduce((total, page) => total + page.segmentCount, 0), stage: 'render-ready', total: 1 })
    const unsubscribe = job.subscribe((state: ExportJobState) => {
      const stage: LocalExportStage = state.stage === 'packaging'
        ? 'packaging'
        : state.stage === 'encoding'
          ? 'encoding'
          : state.stage === 'ready' || state.stage === 'canceled' || state.stage === 'failed'
            ? 'cleanup'
            : 'render-ready'
      setProgress({
        completed: state.completed,
        segmentCount: state.segmentCount,
        stage,
        total: state.total,
      })
    })
    job.promise.then((result) => {
      const downloadUrl = URL.createObjectURL(result.artifact.blob)
      const anchor = document.createElement('a')
      const extension = result.artifact.format === 'zip' ? 'zip' : 'png'
      anchor.download = `oneimg-${snapshot.snapshotId}.${extension}`
      anchor.href = downloadUrl
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      setDiagnostics({
        ...result.artifact.diagnostics,
        previewFingerprint: resources.fingerprint,
      })
      setExportStatus('completed')
    }).catch((reason: unknown) => {
      if (job.getState().status === 'canceled' || isRenderAbortError(reason)) {
        setExportStatus('canceled')
      } else {
        setError(reason instanceof Error ? reason.message : String(reason))
        setExportStatus('failed')
      }
    }).finally(() => {
      unsubscribe()
      if (exportJobRef.current?.id === job.id) {
        exportJobRef.current = undefined
      }
      setResourceAudit(resolver.getDiagnostics())
      setExporting(false)
    })
  }

  const exportLocalPng = async () => {
    if (!resources || !previewReady || exporting) {
      return
    }
    if (runThroughExportEngine) {
      exportThroughEngine()
      return
    }
    const controller = new AbortController()
    exportController.current = controller
    cancelRequestedAt.current = undefined
    setExporting(true)
    setExportStatus('running')
    setError(undefined)
    setDiagnostics(undefined)
    setProgress({ completed: 0, segmentCount: 0, stage: 'render-ready', total: 1 })

    let exportResources: ResolvedResourceSet | undefined
    try {
      exportResources = await resolver.resolve(snapshot, 'local-export', { signal: controller.signal })
      const artifact = await resolvedAdapter.exportPng({
        beforeStage: beforeExportStage,
        onProgress: setProgress,
        resources: exportResources,
        signal: controller.signal,
        snapshot,
      })
      if (controller.signal.aborted) {
        return
      }
      const downloadUrl = URL.createObjectURL(artifact.blob)
      const anchor = document.createElement('a')
      const extension = artifact.format === 'zip' ? 'zip' : 'png'
      anchor.download = `oneimg-${snapshot.snapshotId}.${extension}`
      anchor.href = downloadUrl
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      setDiagnostics({
        ...artifact.diagnostics,
        previewFingerprint: resources.fingerprint,
      })
      setExportStatus('completed')
    } catch (reason) {
      if (isRenderAbortError(reason) || controller.signal.aborted) {
        const cleanupAudit = {
          ...EMPTY_LOCAL_EXPORT_CLEANUP_AUDIT,
          cancelLatencyMs: cancelRequestedAt.current === undefined
            ? null
            : performance.now() - cancelRequestedAt.current,
        }
        setProgress(current => current.cleanupAudit ? current : {
          cleanupAudit,
          completed: 1,
          segmentCount: 0,
          stage: 'cleanup',
          total: 1,
        })
        setExportStatus('canceled')
      } else {
        setError(reason instanceof Error ? reason.message : String(reason))
        setExportStatus('failed')
      }
    } finally {
      if (exportController.current === controller) {
        exportController.current = undefined
      }
      exportResources?.release()
      setResourceAudit(resolver.getDiagnostics())
      cancelRequestedAt.current = undefined
      setExporting(false)
    }
  }

  const statusLabel = {
    canceled: '已取消',
    completed: '已完成',
    failed: '失败',
    idle: '待机',
    running: '导出中',
  }[exportStatus]

  return (
    <main style={{ background: '#dfe4ef', minHeight: '100vh', padding: '32px 0 80px' }}>
      <header style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', margin: '0 auto 18px', width: 640 }}>
        <p style={{ color: '#4e5d78', font: '600 12px/1.4 ui-monospace, monospace', margin: 0 }}>
          {scenarioLabel}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {resources && (
            <button
              onClick={releasePreviewResources}
              style={{ background: '#fff', border: '1px solid #b8c1d4', borderRadius: 999, color: '#182039', cursor: 'pointer', font: '600 13px/1 sans-serif', padding: '11px 14px' }}
              type="button"
            >
              释放预览资源
            </button>
          )}
          <button
            disabled={!resources || !previewReady || (!exporting && exportStatus === 'running')}
            onClick={() => {
              if (exporting) {
                cancelExport()
              } else {
                exportLocalPng()
              }
            }}
            style={{ background: '#182039', border: 0, borderRadius: 999, color: '#fff', cursor: 'pointer', font: '600 14px/1 sans-serif', padding: '11px 18px' }}
            type="button"
          >
            {exporting ? '取消导出' : previewReady ? '导出本地 PNG' : '正在准备预览…'}
          </button>
        </div>
      </header>
      <p data-testid="export-status" style={{ color: '#4e5d78', margin: '0 auto 8px', width: 640 }}>{statusLabel}</p>
      {error && <pre data-testid="scenario-error" style={{ color: '#a00', margin: '0 auto', width: 640 }}>{error}</pre>}
      {!error && !resources && <p data-testid="scenario-loading" style={{ margin: '0 auto', width: 640 }}>Resolving canonical resources…</p>}
      {resources && (
        <div aria-busy={!previewReady} data-testid="canonical-preview" style={{ margin: '0 auto', width: 640 }}>
          <CanonicalRenderSurface
            mode="preview"
            resources={resources}
            snapshot={snapshot}
          />
        </div>
      )}
      <pre data-testid="resource-audit" style={{ background: '#fff', margin: '18px auto 0', overflow: 'auto', padding: 16, width: 640 }}>
        {JSON.stringify(resourceAudit)}
      </pre>
      <pre data-testid="render-ready-diagnostics" style={{ background: '#fff', margin: '18px auto 0', overflow: 'auto', padding: 16, width: 640 }}>
        {JSON.stringify(renderReadiness ?? null)}
      </pre>
      <pre data-testid="export-audit" style={{ background: '#fff', margin: '18px auto 0', overflow: 'auto', padding: 16, width: 640 }}>
        {JSON.stringify(progress)}
      </pre>
      {diagnostics && (
        <pre data-testid="export-diagnostics" style={{ background: '#fff', margin: '18px auto 0', overflow: 'auto', padding: 16, width: 640 }}>
          {JSON.stringify(diagnostics)}
        </pre>
      )}
    </main>
  )
}
