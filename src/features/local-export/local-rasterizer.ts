import type { RasterWorkerCleanupAudit } from './raster-worker'
import type { RenderSegment, SemanticSlice } from './segmented-render'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import type { CanonicalGeometry } from '@/features/canonical-renderer/render-ready'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'

export interface LocalExportRequest {
  readonly beforeStage?: LocalExportStageHook
  readonly outputScale?: 1 | 2
  readonly pagePlan?: LocalExportPagePlan
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: ResolvedResourceSet
  readonly onProgress?: (progress: LocalExportProgress) => void
  readonly signal?: AbortSignal
}

export interface LocalExportPagePlan {
  readonly height: number
  readonly layoutFingerprint: string
  readonly mode: 'segmented' | 'single'
  readonly resourceFingerprint: string
  readonly semanticSlices: readonly SemanticSlice[]
  readonly segments: readonly RenderSegment[]
  readonly width: number
}

export type LocalExportStage = 'cleanup' | 'encoding' | 'packaging' | 'render-ready' | 'serializing'

/**
 * A cancellable checkpoint hook used by scenario verification and diagnostics.
 * Production callers can omit it; the export signal remains the source of truth.
 */
export type LocalExportStageHook = (stage: LocalExportStage, signal?: AbortSignal) => Promise<void>

export interface LocalExportProgress {
  readonly cleanupAudit?: LocalExportCleanupAudit
  readonly completed: number
  readonly segmentCount: number
  readonly stage: LocalExportStage
  readonly total: number
}

export interface LocalExportCleanupAudit extends RasterWorkerCleanupAudit {
  readonly cancelLatencyMs: number | null
  readonly imageBitmapsCreated: number
  readonly canvasCreated: number
  readonly temporaryCacheEntriesCreated: number
  readonly temporaryCacheEntriesRetained: number
  readonly temporaryCacheEntriesReleased: number
  readonly temporaryObjectUrlsRevoked: number
}

export const EMPTY_LOCAL_EXPORT_CLEANUP_AUDIT: LocalExportCleanupAudit = {
  arrayBuffersReceived: 0,
  arrayBuffersReleased: 0,
  cancelLatencyMs: null,
  canvasCreated: 0,
  canvasDisposed: 0,
  imageBitmapsCreated: 0,
  imageBitmapsClosed: 0,
  requested: 0,
  temporaryCacheEntriesCreated: 0,
  temporaryCacheEntriesRetained: 0,
  temporaryCacheEntriesReleased: 0,
  temporaryObjectUrlsRevoked: 0,
  workerObjectUrlCreated: false,
  workerObjectUrlRevoked: true,
  workerTerminated: true,
}

export interface LocalExportDiagnostics {
  readonly adapterId: string
  readonly cleanupAudit: LocalExportCleanupAudit
  readonly longTaskCount: number
  readonly longTaskMs: number
  readonly snapshotId: string
  readonly exportFingerprint: string
  readonly source: 'canonical-svg-foreign-object'
  readonly width: number
  readonly height: number
  readonly geometry: readonly CanonicalGeometry[]
  readonly renderReadyMs: number
  readonly rasterizeMs: number
  readonly totalMs: number
  readonly svgBytes: number
  readonly svgDataUrlBytes: number
  readonly svgTransport: 'bounded-data-url'
  readonly pngBytes: number
  readonly resourceCount: number
  readonly embeddedImageCount: number
  readonly format: 'png' | 'zip'
  readonly layoutFingerprint: string
  readonly semanticSlices: readonly SemanticSlice[]
  readonly segmentCount: number
  readonly segmentBleed: number
  readonly segmented: boolean
  readonly segmentPlan: readonly RenderSegment[]
  readonly workerAvailable: boolean
  readonly workerFallbackCount: number
  readonly workerUsed: boolean
  readonly usedOffscreenCanvas: boolean
  readonly peakMemoryBytes: number | null
  readonly peakEstimatedRasterBytes: number
  readonly memorySource: 'performance.memory' | 'unavailable'
  readonly maxSvgDataUrlBytes: number
  readonly outputScale: 1 | 2
  readonly packagingChunkCount: number
}

export interface LocalPngArtifact {
  readonly blob: Blob
  readonly diagnostics: LocalExportDiagnostics
  readonly format: 'png' | 'zip'
  readonly segments?: readonly LocalPngSegment[]
}

export interface LocalPngSegment {
  readonly blob: Blob
  readonly height: number
  readonly index: number
  readonly y: number
}

export function getLocalPngSliceFilename(index: number) {
  return `oneimg-slice-${String(index + 1).padStart(3, '0')}.png`
}

export interface LocalRasterizerAdapter {
  readonly id: string
  exportPng(request: LocalExportRequest): Promise<LocalPngArtifact>
  readonly validatePlan?: (request: LocalExportRequest) => Promise<void>
}
