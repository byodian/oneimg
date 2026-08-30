import type { PreflightFinding, PreflightFindingKind } from './preflight'
import {
  type PageFormatKind,
  cloneValue,
  freezeDeep,
  stableStringify,
} from '@/features/document-core'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import type { SemanticSliceBoundary } from '@/features/canonical-renderer/semantic-boundaries'
import type {
  LocalExportProgress,
  LocalPngArtifact,
  LocalRasterizerAdapter,
} from '@/features/local-export/local-rasterizer'
import type {
  ResolvedResourceSet,
  ResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import {
  DEFAULT_SEGMENTED_RENDER_LIMITS,
  type RenderSegment,
  type SemanticSlice,
  createSegmentedRenderPlan,
} from '@/features/local-export/segmented-render'
import {
  isRenderAbortError,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

export {
  evaluateExportPreflight,
  readPreflightImageObservations,
} from './preflight'
export type {
  ExportPreflightInput,
  ExportPreflightResult,
  LocalCapabilityProbeObservation,
  PreflightAction,
  PreflightActionKind,
  PreflightFinding,
  PreflightFindingKind,
  PreflightImageObservation,
  PreflightSceneSlotObservation,
} from './preflight'
export type {
  SemanticSlice,
  SemanticSliceBoundary,
  SemanticSliceBoundaryKind,
  SemanticSliceBoundaryReason,
} from '@/features/local-export/segmented-render'
export { probeLocalSvgCapability } from './capability-probe'
export { ExportPreflightPanel } from './preflight-panel'
export type { ExportPreflightPanelProps } from './preflight-panel'

export type ExportOutputScale = 1 | 2
export type ExportFormat = 'png'
export type ExportPlanRoute = 'cannot-export' | 'high-fidelity-recommended' | 'high-fidelity-required' | 'local-eligible'
export type ExportFindingKind = PreflightFindingKind
export type ExportJobExecutionStage = 'encoding' | 'packaging' | 'preparing' | 'rendering'
export type ExportJobStage = ExportJobExecutionStage | 'canceled' | 'failed' | 'ready'

export type ExportFinding = PreflightFinding

export interface ExportPageMeasurement {
  readonly height: number
  readonly id: string
  readonly kind: PageFormatKind
  readonly layoutFingerprint: string
  readonly semanticBoundaries?: readonly SemanticSliceBoundary[]
  readonly width: number
}

export interface ExportPagePlan {
  readonly height: number
  readonly id: string
  readonly index: number
  readonly kind: PageFormatKind
  readonly layoutFingerprint: string
  readonly referenceHeight: number
  readonly referenceWidth: number
  readonly semanticSlices: readonly SemanticSlice[]
  readonly segmentCount: number
  readonly segments: readonly RenderSegment[]
  readonly segmented: boolean
  readonly width: number
}

export interface ExportPlanRequest {
  readonly documentRevision?: number
  readonly meaningful: boolean
  readonly output?: {
    readonly format?: ExportFormat
    readonly scale?: ExportOutputScale
  }
  readonly pageMeasurements?: readonly ExportPageMeasurement[]
  readonly preflightFindings?: readonly PreflightFinding[]
  readonly renderReady: boolean
  readonly resourceFingerprint?: string
  readonly snapshot: CanonicalRenderSnapshot
}

export interface ExportPlan {
  readonly authorization: 'none' | 'required'
  readonly cacheKey: string
  readonly cacheReuse: 'hit' | 'miss' | 'unknown'
  readonly canRun: boolean
  readonly documentRevision?: number
  readonly findings: readonly ExportFinding[]
  readonly id: string
  readonly outputFormat: ExportFormat
  readonly outputScale: ExportOutputScale
  readonly pages: readonly ExportPagePlan[]
  readonly resourceFingerprint: string
  readonly route: ExportPlanRoute
  readonly routeReason: string
  readonly snapshot: CanonicalRenderSnapshot
}

export type ExportJobStatus = 'canceled' | 'failed' | 'ready' | 'running'
export type ExportJobFailureCode =
  | 'canceled'
  | 'encoding-failed'
  | 'packaging-failed'
  | 'rendering-failed'
  | 'resource-resolution-failed'
export type ExportJobRecoveryAction =
  | 'reduce-output-scale'
  | 'resolve-resources'
  | 'retry'
  | 'retry-with-high-fidelity'

export interface ExportJobErrorInfo {
  readonly code: ExportJobFailureCode
  readonly message: string
  readonly nextStep: string
  readonly recoveryAction: ExportJobRecoveryAction
  readonly stage: ExportJobExecutionStage
}

export interface ExportJobState {
  readonly cacheHit: boolean
  readonly completed: number
  readonly error?: ExportJobErrorInfo
  readonly jobId: string
  readonly pageCount: number
  readonly segmentCount: number
  readonly stage: ExportJobStage
  readonly status: ExportJobStatus
  readonly total: number
}

export interface ExportJobResult {
  readonly artifact: LocalPngArtifact
  readonly documentRevision?: number
  readonly fromCache: boolean
  readonly jobId: string
  readonly planId: string
  readonly snapshotId: string
}

export class ExportJobError extends Error {
  readonly code: ExportJobFailureCode
  readonly details: ExportJobErrorInfo
  readonly nextStep: string
  readonly recoveryAction: ExportJobRecoveryAction
  readonly stage: ExportJobExecutionStage

  constructor(details: ExportJobErrorInfo) {
    super(details.message)
    this.code = details.code
    this.details = details
    this.nextStep = details.nextStep
    this.recoveryAction = details.recoveryAction
    this.stage = details.stage
    this.name = 'ExportJobError'
  }
}

export type ExportJobListener = (state: ExportJobState) => void

export interface ExportJob {
  readonly getState: () => ExportJobState
  readonly id: string
  readonly plan: ExportPlan
  readonly promise: Promise<ExportJobResult>
  readonly subscribe: (listener: ExportJobListener) => () => void
}

export interface ExportEngine {
  cancel(jobId: string): boolean
  plan(request: ExportPlanRequest): ExportPlan
  run(plan: ExportPlan): ExportJob
}

export interface ExportEngineOptions {
  readonly encoderRevision?: string
  readonly localAdapter: LocalRasterizerAdapter
  readonly resolver: ResourceResolver
}

const DEFAULT_ENCODER_REVISION = 'png-encoder@1'
const MAX_CACHE_ENTRIES = 8

const FAILURE_POLICIES: Record<ExportJobExecutionStage, {
  readonly code: Exclude<ExportJobFailureCode, 'canceled'>
  readonly nextStep: string
  readonly recoveryAction: ExportJobRecoveryAction
}> = {
  encoding: {
    code: 'encoding-failed',
    nextStep: '降低输出倍率后重试；如果仍失败，请重新导出 PNG。',
    recoveryAction: 'reduce-output-scale',
  },
  packaging: {
    code: 'packaging-failed',
    nextStep: '重新运行当前 Export Plan；如果仍失败，请重新导出 PNG。',
    recoveryAction: 'retry',
  },
  preparing: {
    code: 'resource-resolution-failed',
    nextStep: '检查并重新关联引用资源后，重新运行当前 Export Plan。',
    recoveryAction: 'resolve-resources',
  },
  rendering: {
    code: 'rendering-failed',
    nextStep: '重新运行当前 Export Plan；若仍失败，请切换兼容呈现或 High-Fidelity Export。',
    recoveryAction: 'retry-with-high-fidelity',
  },
}

function activeStage(stage: ExportJobStage): ExportJobExecutionStage {
  return stage === 'encoding' || stage === 'packaging' || stage === 'preparing' || stage === 'rendering'
    ? stage
    : 'preparing'
}

function createJobErrorInfo(
  details: ExportJobErrorInfo,
): ExportJobErrorInfo {
  return freezeDeep(details)
}

function createCanceledErrorInfo(stage: ExportJobExecutionStage): ExportJobErrorInfo {
  return createJobErrorInfo({
    code: 'canceled',
    message: '导出已取消。',
    nextStep: '可以重新运行当前 Export Plan。',
    recoveryAction: 'retry',
    stage,
  })
}

function createFailureErrorInfo(reason: unknown, stage: ExportJobExecutionStage): ExportJobErrorInfo {
  if (reason instanceof ExportJobError) {
    return reason.details
  }
  const policy = FAILURE_POLICIES[stage]
  return createJobErrorInfo({
    ...policy,
    message: reason instanceof Error ? reason.message : String(reason),
    stage,
  })
}

function isCanceledJobError(reason: unknown): reason is ExportJobError {
  return reason instanceof ExportJobError && reason.code === 'canceled'
}

function cloneAndFreezeSnapshot(snapshot: CanonicalRenderSnapshot) {
  return freezeDeep(cloneValue(snapshot))
}

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Unable to plan export: ${label} must be a positive finite number`)
  }
}

function createPagePlan(
  measurement: ExportPageMeasurement,
  index: number,
  outputScale: ExportOutputScale,
): ExportPagePlan {
  assertPositiveFinite(measurement.width, `Page ${measurement.id} width`)
  assertPositiveFinite(measurement.height, `Page ${measurement.id} height`)
  const renderPlan = createSegmentedRenderPlan(
    Math.ceil(measurement.width * outputScale),
    Math.ceil(measurement.height * outputScale),
    DEFAULT_SEGMENTED_RENDER_LIMITS,
    measurement.semanticBoundaries?.map(boundary => ({
      ...boundary,
      ...(boundary.endY === undefined ? {} : { endY: boundary.endY * outputScale }),
      y: boundary.y * outputScale,
    })),
  )
  return {
    height: renderPlan.height,
    id: measurement.id,
    index,
    kind: measurement.kind,
    layoutFingerprint: measurement.layoutFingerprint,
    referenceHeight: measurement.height,
    referenceWidth: measurement.width,
    semanticSlices: renderPlan.semanticSlices,
    segmentCount: renderPlan.segments.length,
    segments: renderPlan.segments,
    segmented: renderPlan.mode === 'segmented',
    width: renderPlan.width,
  }
}

function buildCacheKey(
  snapshot: CanonicalRenderSnapshot,
  adapterId: string,
  encoderRevision: string,
  outputFormat: ExportFormat,
  outputScale: ExportOutputScale,
  pages: readonly ExportPagePlan[],
  resourceFingerprint: string,
) {
  return stableStringify({
    adapterId,
    encoderRevision,
    outputFormat,
    outputScale,
    pages,
    resourceFingerprint,
    snapshot,
  })
}

function routeReason(route: ExportPlanRoute) {
  switch (route) {
    case 'cannot-export':
      return '当前快照没有可执行的本地导出路径。'
    case 'high-fidelity-recommended':
      return '当前快照可本地导出，但高保真路径更适合此输出。'
    case 'high-fidelity-required':
      return '当前呈现超出已认证的本地导出能力。'
    case 'local-eligible':
      return '当前快照可通过已认证的本地路径导出。'
  }
}

function progressStage(progress: LocalExportProgress, current: ExportJobStage): ExportJobStage {
  switch (progress.stage) {
    case 'encoding':
      return 'encoding'
    case 'packaging':
      return 'packaging'
    case 'render-ready':
    case 'serializing':
      return 'rendering'
    case 'cleanup':
      return current
  }
}

/**
 * Internal engine constructor. Production surfaces should use a feature
 * composition such as createStudioExportEngine so adapter selection stays
 * inside the Export Engine boundary.
 */
export function createExportEngine({
  encoderRevision = DEFAULT_ENCODER_REVISION,
  localAdapter,
  resolver,
}: ExportEngineOptions): ExportEngine {
  const artifactCache = new Map<string, LocalPngArtifact>()
  const activeJobs = new Map<string, { cancel: () => void }>()
  let nextPlanId = 0
  let nextJobId = 0

  const cacheArtifact = (key: string, artifact: LocalPngArtifact) => {
    artifactCache.delete(key)
    artifactCache.set(key, artifact)
    while (artifactCache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = artifactCache.keys().next().value
      if (oldestKey === undefined) {
        break
      }
      artifactCache.delete(oldestKey)
    }
  }

  const plan = (request: ExportPlanRequest): ExportPlan => {
    const snapshot = cloneAndFreezeSnapshot(request.snapshot)
    const outputFormat = request.output?.format ?? 'png'
    const outputScale = request.output?.scale ?? 1
    const findings: ExportFinding[] = []
    const addFinding = (finding: ExportFinding) => {
      if (findings.some(existing => (
        existing.code === finding.code
        && existing.resourceId === finding.resourceId
        && existing.targetId === finding.targetId
      ))) {
        return
      }
      findings.push(finding)
    }
    for (const finding of request.preflightFindings ?? []) {
      addFinding(cloneValue(finding))
    }

    if (outputFormat !== 'png') {
      addFinding({ code: 'unsupported-format', kind: 'blocking-error', message: '当前 Export Engine 仅支持 PNG。' })
    }
    if (!request.meaningful) {
      addFinding({ code: 'empty-document', kind: 'blocking-error', message: '空 Document 没有可导出的内容。' })
    }
    if (!request.renderReady) {
      addFinding({ code: 'render-not-ready', kind: 'blocking-error', message: 'Canonical Preview 尚未 Render Ready。' })
    }
    if (request.resourceFingerprint === undefined) {
      addFinding({ code: 'resources-not-ready', kind: 'blocking-error', message: 'Referenced Render Sources 尚未完成解析。' })
    }

    const pages: ExportPagePlan[] = []
    const pageMeasurements = request.pageMeasurements ?? []
    pageMeasurements.forEach((measurement, index) => {
      try {
        pages.push(createPagePlan(measurement, index, outputScale))
      } catch (error) {
        addFinding({
          code: 'invalid-page-measurement',
          kind: 'blocking-error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })
    if (pages.length === 0) {
      addFinding({ code: 'page-measurement-unavailable', kind: 'blocking-error', message: '没有可供导出的 Page 几何信息。' })
    }

    if (snapshot.localCapability === 'unsupported') {
      addFinding({ code: 'unsupported-local-presentation', kind: 'blocking-error', message: '当前呈现没有已验证的导出适配器。' })
    } else if (snapshot.localCapability === 'high-fidelity-required') {
      addFinding({ code: 'local-capability', kind: 'quality-warning', message: '当前呈现需要 High-Fidelity Export 或兼容的本地呈现。' })
    }
    if (snapshot.sensitive && snapshot.localCapability !== 'certified') {
      addFinding({
        code: 'sensitive-local-only',
        kind: 'blocking-error',
        message: 'Sensitive Document 只能通过已认证的本地呈现导出。',
      })
    }

    const hasBlockingFinding = findings.some(finding => finding.kind === 'blocking-error')
    const route: ExportPlanRoute = hasBlockingFinding
      ? 'cannot-export'
      : snapshot.localCapability === 'high-fidelity-required'
        ? 'high-fidelity-required'
        : 'local-eligible'
    const resourceFingerprint = request.resourceFingerprint ?? 'unresolved'
    const cacheKey = buildCacheKey(
      snapshot,
      localAdapter.id,
      encoderRevision,
      outputFormat,
      outputScale,
      pages,
      resourceFingerprint,
    )

    return freezeDeep({
      authorization: route === 'high-fidelity-required' ? 'required' : 'none',
      cacheKey,
      cacheReuse: request.resourceFingerprint === undefined
        ? 'unknown'
        : localAdapter.validatePlan !== undefined && pages.length === 1 && artifactCache.has(cacheKey) ? 'hit' : 'miss',
      canRun: route === 'local-eligible',
      ...(request.documentRevision === undefined ? {} : { documentRevision: request.documentRevision }),
      findings,
      id: `export-plan:${snapshot.snapshotId}:${++nextPlanId}`,
      outputFormat,
      outputScale,
      pages,
      resourceFingerprint,
      route,
      routeReason: routeReason(route),
      snapshot,
    })
  }

  const run = (plannedPlan: ExportPlan): ExportJob => {
    if (!plannedPlan.canRun) {
      throw new Error(`Export Plan ${plannedPlan.id} cannot run: ${plannedPlan.route}`)
    }
    const executionSnapshot = cloneAndFreezeSnapshot(plannedPlan.snapshot)
    const exportPlan = freezeDeep({
      ...plannedPlan,
      cacheKey: buildCacheKey(
        executionSnapshot,
        localAdapter.id,
        encoderRevision,
        plannedPlan.outputFormat,
        plannedPlan.outputScale,
        plannedPlan.pages,
        plannedPlan.resourceFingerprint,
      ),
      snapshot: executionSnapshot,
    })

    const jobId = `export-job:${++nextJobId}`
    const controller = new AbortController()
    const pageCount = exportPlan.pages.length
    const segmentCount = exportPlan.pages.reduce((total, page) => total + page.segmentCount, 0)
    const total = Math.max(1, segmentCount)
    let state: ExportJobState = {
      cacheHit: false,
      completed: 0,
      jobId,
      pageCount,
      segmentCount,
      stage: 'preparing',
      status: 'running',
      total,
    }
    const listeners = new Set<ExportJobListener>()
    let resolvePromise!: (result: ExportJobResult) => void
    let rejectPromise!: (reason: unknown) => void
    const promise = new Promise<ExportJobResult>((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })

    const notify = () => {
      for (const listener of Array.from(listeners)) {
        listener(state)
      }
    }
    const updateState = (next: Partial<ExportJobState>) => {
      if (state.status !== 'running') {
        return
      }
      state = { ...state, ...next }
      notify()
    }
    const cancel = () => {
      if (state.status !== 'running') {
        return
      }
      const error = createCanceledErrorInfo(activeStage(state.stage))
      state = {
        ...state,
        error,
        stage: 'canceled',
        status: 'canceled',
      }
      notify()
      controller.abort()
    }

    const job: ExportJob = {
      getState: () => state,
      id: jobId,
      plan: exportPlan,
      promise,
      subscribe(listener) {
        listeners.add(listener)
        listener(state)
        return () => listeners.delete(listener)
      },
    }
    activeJobs.set(jobId, { cancel })

    const finishReady = (artifact: LocalPngArtifact, fromCache: boolean) => {
      if (state.status !== 'running') {
        return false
      }
      state = {
        ...state,
        cacheHit: fromCache,
        completed: total,
        stage: 'ready',
        status: 'ready',
        total,
      }
      notify()
      resolvePromise({
        artifact,
        documentRevision: exportPlan.documentRevision,
        fromCache,
        jobId,
        planId: exportPlan.id,
        snapshotId: exportPlan.snapshot.snapshotId,
      })
      return true
    }

    const execute = async () => {
      let resources: ResolvedResourceSet | undefined
      try {
        throwIfRenderAborted(controller.signal)
        updateState({ stage: 'preparing' })
        resources = await resolver.resolve(exportPlan.snapshot, 'local-export', { signal: controller.signal })
        throwIfRenderAborted(controller.signal)
        const actualCacheKey = buildCacheKey(
          exportPlan.snapshot,
          localAdapter.id,
          encoderRevision,
          exportPlan.outputFormat,
          exportPlan.outputScale,
          exportPlan.pages,
          resources.fingerprint,
        )
        if (resources.fingerprint !== exportPlan.resourceFingerprint) {
          throw new Error('Referenced resources changed after Export Plan creation; reopen the Export Plan')
        }
        const pagePlan = exportPlan.pages.length === 1
          ? {
              height: exportPlan.pages[0]!.height,
              layoutFingerprint: exportPlan.pages[0]!.layoutFingerprint,
              mode: exportPlan.pages[0]!.segmented ? 'segmented' as const : 'single' as const,
              resourceFingerprint: exportPlan.resourceFingerprint,
              semanticSlices: exportPlan.pages[0]!.semanticSlices,
              segments: exportPlan.pages[0]!.segments,
              width: exportPlan.pages[0]!.width,
            }
          : undefined
        const resolvedArtifact = artifactCache.get(actualCacheKey)
        if (resolvedArtifact !== undefined && localAdapter.validatePlan !== undefined && pagePlan !== undefined) {
          updateState({ stage: 'rendering' })
          await localAdapter.validatePlan({
            outputScale: exportPlan.outputScale,
            pagePlan,
            resources,
            signal: controller.signal,
            snapshot: exportPlan.snapshot,
          })
          throwIfRenderAborted(controller.signal)
          if (!finishReady(resolvedArtifact, true)) {
            throw new ExportJobError(createCanceledErrorInfo(activeStage(state.stage)))
          }
          return
        }

        updateState({ stage: 'rendering' })
        const artifact = await localAdapter.exportPng({
          onProgress: (progress) => {
            if (state.status !== 'running') {
              return
            }
            updateState({
              completed: Math.min(total, Math.max(0, progress.completed)),
              stage: progressStage(progress, state.stage),
              total: progress.total > 0 ? progress.total : total,
            })
          },
          outputScale: exportPlan.outputScale,
          pagePlan,
          resources,
          signal: controller.signal,
          snapshot: exportPlan.snapshot,
        })
        throwIfRenderAborted(controller.signal)
        cacheArtifact(actualCacheKey, artifact)
        finishReady(artifact, false)
      } catch (reason) {
        if (state.status === 'canceled' || controller.signal.aborted || isRenderAbortError(reason) || isCanceledJobError(reason)) {
          const error = state.error?.code === 'canceled'
            ? state.error
            : isCanceledJobError(reason)
              ? reason.details
              : createCanceledErrorInfo(activeStage(state.stage))
          if (state.status === 'running') {
            state = {
              ...state,
              error,
              stage: 'canceled',
              status: 'canceled',
            }
            notify()
          }
          rejectPromise(new ExportJobError(error))
        } else {
          const error = createFailureErrorInfo(reason, activeStage(state.stage))
          state = {
            ...state,
            error,
            stage: 'failed',
            status: 'failed',
          }
          notify()
          rejectPromise(new ExportJobError(error))
        }
      } finally {
        resources?.release()
        activeJobs.delete(jobId)
      }
    }

    execute().catch(() => undefined)
    return job
  }

  return {
    cancel(jobId) {
      const activeJob = activeJobs.get(jobId)
      if (activeJob === undefined) {
        return false
      }
      activeJob.cancel()
      return true
    },
    plan,
    run,
  }
}

export { ExportPanel } from './export-panel'
