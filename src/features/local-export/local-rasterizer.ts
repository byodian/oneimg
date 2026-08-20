import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import type { CanonicalGeometry } from '@/features/canonical-renderer/render-ready'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'

export interface LocalExportRequest {
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: ResolvedResourceSet
}

export interface LocalExportDiagnostics {
  readonly adapterId: string
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
  readonly usedOffscreenCanvas: boolean
  readonly peakMemoryBytes: number | null
  readonly memorySource: 'performance.memory' | 'unavailable'
}

export interface LocalPngArtifact {
  readonly blob: Blob
  readonly diagnostics: LocalExportDiagnostics
}

export interface LocalRasterizerAdapter {
  readonly id: string
  exportPng(request: LocalExportRequest): Promise<LocalPngArtifact>
}
