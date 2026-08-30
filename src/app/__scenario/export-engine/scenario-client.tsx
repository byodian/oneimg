'use client'

import { useMemo, useRef, useState } from 'react'
import {
  type ExportJob,
  type ExportJobState,
  type ExportPlan,
  createExportEngine,
} from '@/features/export-engine'
import { controlledCanonicalSnapshot } from '@/features/canonical-renderer/controlled-fixture'
import type {
  ResolvedResource,
  ResolvedResourceSet,
  ResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import {
  EMPTY_LOCAL_EXPORT_CLEANUP_AUDIT,
  type LocalExportProgress,
  type LocalPngArtifact,
  type LocalRasterizerAdapter,
} from '@/features/local-export/local-rasterizer'
import { createRenderAbortError } from '@/features/rendering/cancellation'

type ScenarioRun = 'cancel' | 'failure' | 'success'

const SCENARIO_RESOURCE_FINGERPRINT = 'export-engine-scenario-resources@1'

function createScenarioResource(): ResolvedResource {
  return {
    blob: new Blob(['export-engine-scenario'], { type: 'font/woff2' }),
    byteLength: 22,
    font: {
      family: 'Export Engine Scenario',
      style: 'normal',
      weight: '100 900',
    },
    id: controlledCanonicalSnapshot.fontPack.resourceIds[0]!,
    kind: 'font',
    mimeType: 'font/woff2',
    objectUrl: 'blob:export-engine-scenario-resource',
    sha256: 'export-engine-scenario-resource-sha256',
  }
}

function createScenarioResourceSet(releaseCount: { value: number }): ResolvedResourceSet {
  const resource = createScenarioResource()
  return {
    fontFamily: resource.font?.family ?? '',
    fontFaceCss: '',
    fingerprint: SCENARIO_RESOURCE_FINGERPRINT,
    get(resourceId) {
      if (resourceId !== resource.id) {
        throw new Error(`Unknown scenario resource ${resourceId}`)
      }
      return resource
    },
    release() {
      releaseCount.value += 1
    },
    resources: [resource],
    sessionId: 'export-engine-scenario-session',
    target: 'local-export',
  }
}

function createScenarioArtifact(): LocalPngArtifact {
  return {
    blob: new Blob(['scenario-png'], { type: 'image/png' }),
    diagnostics: {
      adapterId: 'export-engine-scenario-adapter@1',
      cleanupAudit: EMPTY_LOCAL_EXPORT_CLEANUP_AUDIT,
      embeddedImageCount: 0,
      exportFingerprint: SCENARIO_RESOURCE_FINGERPRINT,
      format: 'png',
      geometry: [],
      height: 800,
      longTaskCount: 0,
      longTaskMs: 0,
      maxSvgDataUrlBytes: 0,
      memorySource: 'unavailable',
      outputScale: 1,
      peakEstimatedRasterBytes: 640 * 800 * 4,
      peakMemoryBytes: null,
      pngBytes: 12,
      rasterizeMs: 1,
      renderReadyMs: 1,
      resourceCount: 1,
      segmentBleed: 80,
      segmentCount: 1,
      segmentPlan: [],
      segmented: false,
      snapshotId: controlledCanonicalSnapshot.snapshotId,
      source: 'canonical-svg-foreign-object',
      svgBytes: 12,
      svgDataUrlBytes: 12,
      svgTransport: 'bounded-data-url',
      totalMs: 2,
      usedOffscreenCanvas: false,
      width: 640,
      workerAvailable: false,
      workerFallbackCount: 0,
      workerUsed: false,
    },
    format: 'png',
  }
}

export function ExportEngineScenario() {
  const mode = useRef<ScenarioRun>('success')
  const releaseCount = useRef({ value: 0 })
  const resolverCalls = useRef(0)
  const adapterCalls = useRef(0)
  const snapshotFrozen = useRef(false)
  const [plan, setPlan] = useState<ExportPlan>()
  const [job, setJob] = useState<ExportJob>()
  const [jobState, setJobState] = useState<ExportJobState>()
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<string>()
  const engine = useMemo(() => {
    const resolver: ResourceResolver = {
      getDiagnostics: () => ({
        activeObjectUrls: 0,
        activeSessions: 0,
        createdObjectUrls: 0,
        releasedSessions: releaseCount.current.value,
        revokedObjectUrls: 0,
      }),
      resolve: async (_snapshot, _target, options) => {
        resolverCalls.current += 1
        if (mode.current === 'cancel') {
          return new Promise<ResolvedResourceSet>((_resolve, reject) => {
            const onAbort = () => reject(createRenderAbortError())
            options?.signal?.addEventListener('abort', onAbort, { once: true })
            if (options?.signal?.aborted) {
              onAbort()
            }
          })
        }
        if (mode.current === 'failure') {
          throw new Error('Scenario Resource Resolver failed')
        }
        return createScenarioResourceSet(releaseCount.current)
      },
    }
    const adapter: LocalRasterizerAdapter = {
      id: 'export-engine-scenario-adapter@1',
      exportPng: async ({ onProgress, signal, snapshot }) => {
        adapterCalls.current += 1
        snapshotFrozen.current = Object.isFrozen(snapshot) && Object.isFrozen(snapshot.document)
        const progress: LocalExportProgress = {
          completed: 0,
          segmentCount: 1,
          stage: 'encoding',
          total: 1,
        }
        onProgress?.(progress)
        if (mode.current === 'cancel') {
          return new Promise<LocalPngArtifact>((_resolve, reject) => {
            const onAbort = () => reject(createRenderAbortError())
            signal?.addEventListener('abort', onAbort, { once: true })
            if (signal?.aborted) {
              onAbort()
            }
          })
        }
        if (mode.current === 'failure') {
          throw new Error('Scenario adapter failed')
        }
        return createScenarioArtifact()
      },
    }
    return createExportEngine({ localAdapter: adapter, resolver })
  }, [])

  const createPlan = () => engine.plan({
    documentRevision: 1,
    meaningful: true,
    pageMeasurements: [{
      height: 800,
      id: 'page-1',
      kind: 'continuous',
      width: 640,
    }],
    renderReady: true,
    resourceFingerprint: SCENARIO_RESOURCE_FINGERPRINT,
    snapshot: controlledCanonicalSnapshot,
  })

  const run = (nextMode: ScenarioRun) => {
    mode.current = nextMode
    setError(undefined)
    setResult(undefined)
    const nextPlan = createPlan()
    setPlan(nextPlan)
    const nextJob = engine.run(nextPlan)
    setJob(nextJob)
    const unsubscribe = nextJob.subscribe(setJobState)
    nextJob.promise.then((nextResult) => {
      setResult(JSON.stringify({ fromCache: nextResult.fromCache, snapshotId: nextResult.snapshotId }))
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(unsubscribe)
  }

  const cancel = () => {
    if (job !== undefined) {
      engine.cancel(job.id)
    }
  }

  return (
    <main style={{ margin: '0 auto', maxWidth: 760, padding: 32 }}>
      <h1>Export Engine Scenario Harness</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            setPlan(createPlan())
            setError(undefined)
          }}
          type="button"
        >
          查看 Export Plan
        </button>
        <button onClick={() => run('success')} type="button">成功运行</button>
        <button onClick={() => run('failure')} type="button">失败运行</button>
        <button onClick={() => run('cancel')} type="button">可取消运行</button>
        <button disabled={jobState?.status !== 'running'} onClick={cancel} type="button">取消任务</button>
      </div>
      <output data-testid="export-engine-plan">{plan ? JSON.stringify({ cacheReuse: plan.cacheReuse, canRun: plan.canRun, route: plan.route }) : ''}</output>
      <output data-testid="export-engine-job">{jobState ? JSON.stringify(jobState) : ''}</output>
      <output data-testid="export-engine-result">{result ?? ''}</output>
      {error && <output data-testid="export-engine-error">{error}</output>}
      <output data-testid="export-engine-metrics">{JSON.stringify({
        adapterCalls: adapterCalls.current,
        releasedResources: releaseCount.current.value,
        resolverCalls: resolverCalls.current,
        snapshotFrozen: snapshotFrozen.current,
      })}</output>
    </main>
  )
}
