import JSZip from 'jszip'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type {
  LocalExportCleanupAudit,
  LocalExportDiagnostics,
  LocalExportProgress,
  LocalExportRequest,
  LocalPngArtifact,
  LocalPngSegment,
  LocalRasterizerAdapter,
} from './local-rasterizer'
import { type RasterWorkerClient, createRasterWorkerClient } from './raster-worker'
import { type RenderSegment, createSegmentedRenderPlan } from './segmented-render'
import { CanonicalRenderSurface, getCanonicalOwnedCss } from '@/features/canonical-renderer/canonical-renderer'
import type { CanonicalResourceId } from '@/features/canonical-renderer/model'
import { getCanonicalGeometry, waitForCanonicalRenderReady } from '@/features/canonical-renderer/render-ready'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'
import {
  createRenderAbortError,
  isRenderAbortError,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

const ADAPTER_ID = 'local-svg-foreign-object@1'
const MAX_SVG_DATA_URL_BYTES = 512 * 1024

type PerformanceWithMemory = Performance & {
  readonly memory?: {
    readonly usedJSHeapSize?: number
  }
}

function readUsedHeapBytes() {
  const usedJSHeapSize = (performance as PerformanceWithMemory).memory?.usedJSHeapSize
  return typeof usedJSHeapSize === 'number' && Number.isFinite(usedJSHeapSize)
    ? usedJSHeapSize
    : null
}

function wrapCssAsCdata(value: string) {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

function emitProgress(
  onProgress: ((progress: LocalExportProgress) => void) | undefined,
  progress: LocalExportProgress,
) {
  onProgress?.(progress)
}

async function waitBeforeStage(
  beforeStage: LocalExportRequest['beforeStage'],
  stage: LocalExportProgress['stage'],
  signal?: AbortSignal,
) {
  await beforeStage?.(stage, signal)
  throwIfRenderAborted(signal)
}

function blobToDataUrl(blob: Blob, signal?: AbortSignal) {
  throwIfRenderAborted(signal)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    const onAbort = () => {
      reader.abort()
      reject(createRenderAbortError())
    }
    const cleanup = () => signal?.removeEventListener('abort', onAbort)
    reader.addEventListener('load', () => {
      cleanup()
      resolve(String(reader.result))
    }, { once: true })
    reader.addEventListener('error', () => {
      cleanup()
      reject(reader.error ?? new Error('Unable to read resource Blob'))
    }, { once: true })
    reader.addEventListener('abort', () => {
      cleanup()
      reject(createRenderAbortError())
    }, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      onAbort()
    } else {
      reader.readAsDataURL(blob)
    }
  })
}

async function serializeToSvg(
  root: HTMLElement,
  resources: ResolvedResourceSet,
  cssText: string,
  width: number,
  height: number,
  fullHeight: number,
  offsetY: number,
  signal?: AbortSignal,
) {
  throwIfRenderAborted(signal)
  const canonicalRoot = root.cloneNode(true) as HTMLElement
  if (offsetY > 0) {
    canonicalRoot.style.transform = `translateY(-${offsetY}px)`
  }
  const images = Array.from(canonicalRoot.querySelectorAll<HTMLImageElement>('img[data-resource-id]'))
  const imageResources = images.map((image) => {
    const resource = resources.get(image.dataset.resourceId as CanonicalResourceId)
    if (resource.kind !== 'image') {
      throw new Error(`Resource ${resource.id} is not an image`)
    }
    return resource
  })
  const estimatedImageDataBytes = imageResources.reduce(
    (total, resource) => total + Math.ceil(resource.byteLength / 3) * 4,
    0,
  )
  if (estimatedImageDataBytes > MAX_SVG_DATA_URL_BYTES) {
    throw new Error(`Local image payload exceeds the bounded ${MAX_SVG_DATA_URL_BYTES}-byte SVG transport limit`)
  }

  await Promise.all(images.map(async (image, index) => {
    throwIfRenderAborted(signal)
    const resource = imageResources[index]
    if (!resource) {
      throw new Error(`Missing image resource for ${image.dataset.resourceId}`)
    }
    image.src = await blobToDataUrl(resource.blob, signal)
  }))

  throwIfRenderAborted(signal)
  const canonicalMarkup = new XMLSerializer().serializeToString(canonicalRoot)
  return {
    embeddedImageCount: images.length,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="height:${height}px;width:${width}px;overflow:hidden;position:relative"><style type="text/css">${wrapCssAsCdata(cssText)}</style><div style="height:${fullHeight}px;position:relative;width:${width}px">${canonicalMarkup}</div></div></foreignObject></svg>`,
  }
}

async function decodeSvg(svgBlob: Blob, signal?: AbortSignal) {
  throwIfRenderAborted(signal)
  const svgText = await svgBlob.text()
  throwIfRenderAborted(signal)
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  const sourceBytes = new TextEncoder().encode(source).byteLength
  if (sourceBytes > MAX_SVG_DATA_URL_BYTES) {
    throw new Error(`Local SVG transport exceeds the bounded ${MAX_SVG_DATA_URL_BYTES}-byte limit`)
  }
  const image = new Image()
  image.decoding = 'sync'
  image.src = source

  try {
    if (!signal) {
      await image.decode()
    } else {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          image.src = ''
          reject(createRenderAbortError())
        }
        signal.addEventListener('abort', onAbort, { once: true })
        if (signal.aborted) {
          onAbort()
          return
        }
        image.decode().then(() => {
          signal.removeEventListener('abort', onAbort)
          resolve()
        }).catch((reason) => {
          signal.removeEventListener('abort', onAbort)
          reject(reason)
        })
      })
    }
    throwIfRenderAborted(signal)
    return { image, sourceBytes }
  } catch (error) {
    image.src = ''
    throw error
  }
}

async function yieldToMainThread(signal?: AbortSignal) {
  throwIfRenderAborted(signal)
  await new Promise<void>((resolve, reject) => {
    let frames = 0
    const onAbort = () => reject(createRenderAbortError())
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      onAbort()
      return
    }
    const next = () => {
      if (signal?.aborted) {
        return
      }
      frames += 1
      if (frames >= 2) {
        signal?.removeEventListener('abort', onAbort)
        resolve()
        return
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(next)
      } else {
        setTimeout(next, 0)
      }
    }
    next()
  })
}

async function rasterizeOnMain(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  sourceY: number,
  outputWidth: number,
  outputHeight: number,
  signal: AbortSignal | undefined,
  onCanvasCreated: () => void,
  onCanvasDisposed: () => void,
) {
  throwIfRenderAborted(signal)
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(outputWidth, outputHeight)
    onCanvasCreated()
    try {
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Unable to create an OffscreenCanvas 2D context')
      }
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight)
      throwIfRenderAborted(signal)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      throwIfRenderAborted(signal)
      return blob
    } finally {
      canvas.width = 0
      canvas.height = 0
      onCanvasDisposed()
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  onCanvasCreated()
  try {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to create a Canvas 2D context')
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight)
    throwIfRenderAborted(signal)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to encode PNG')), 'image/png')
    })
    throwIfRenderAborted(signal)
    return blob
  } finally {
    canvas.width = 0
    canvas.height = 0
    onCanvasDisposed()
  }
}

async function rasterizeSegment(
  image: HTMLImageElement,
  segment: RenderSegment,
  width: number,
  outputScale: 1 | 2,
  worker: RasterWorkerClient,
  signal: AbortSignal | undefined,
  onBitmapCreated: () => void,
  onBitmapClosed: () => void,
  onCanvasCreated: () => void,
  onCanvasDisposed: () => void,
  onWorkerEncoded: () => void,
  onWorkerFallback: () => void,
) {
  if (worker.available && typeof createImageBitmap === 'function') {
    throwIfRenderAborted(signal)
    const bitmap = await createImageBitmap(image)
    onBitmapCreated()
    let transferred = false
    try {
      const encoded = worker.encode(bitmap, segment, width, outputScale, signal)
      transferred = true
      const blob = await encoded
      throwIfRenderAborted(signal)
      onWorkerEncoded()
      return blob
    } catch (reason) {
      if (isRenderAbortError(reason)) {
        throw reason
      }
      onWorkerFallback()
      return rasterizeOnMain(
        image,
        width / outputScale,
        segment.height / outputScale,
        segment.trimTop / outputScale,
        width,
        segment.height,
        signal,
        onCanvasCreated,
        onCanvasDisposed,
      )
    } finally {
      if (!transferred) {
        bitmap.close()
        onBitmapClosed()
      }
    }
  }

  onWorkerFallback()
  return rasterizeOnMain(
    image,
    width / outputScale,
    segment.height / outputScale,
    segment.trimTop / outputScale,
    width,
    segment.height,
    signal,
    onCanvasCreated,
    onCanvasDisposed,
  )
}

async function packageSegments(
  segments: readonly LocalPngSegment[],
  signal: AbortSignal | undefined,
  onProgress: ((progress: LocalExportProgress) => void) | undefined,
) {
  const zip = new JSZip()
  for (const segment of segments) {
    throwIfRenderAborted(signal)
    zip.file(`oneimg-segment-${String(segment.index + 1).padStart(3, '0')}.png`, segment.blob)
  }
  return zip.generateAsync({ type: 'blob' }, (metadata) => {
    throwIfRenderAborted(signal)
    emitProgress(onProgress, {
      completed: Math.round(metadata.percent),
      segmentCount: segments.length,
      stage: 'packaging',
      total: 100,
    })
  })
}

async function exportPng({ beforeStage, onProgress, outputScale: requestedOutputScale, signal, snapshot, resources }: LocalExportRequest): Promise<LocalPngArtifact> {
  const outputScale = requestedOutputScale ?? 1
  if (outputScale !== 1 && outputScale !== 2) {
    throw new Error(`Unsupported local output scale: ${outputScale}`)
  }
  const startedAt = performance.now()
  let peakMemoryBytes = readUsedHeapBytes()
  const sampleMemory = () => {
    const current = readUsedHeapBytes()
    if (current !== null) {
      peakMemoryBytes = Math.max(peakMemoryBytes ?? current, current)
    }
  }
  sampleMemory()
  throwIfRenderAborted(signal)
  const worker = createRasterWorkerClient()
  let cancelRequestedAt: number | undefined
  const onAbort = () => {
    cancelRequestedAt ??= performance.now()
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  const host = document.createElement('div')
  host.dataset.oneimgInertRenderSession = snapshot.snapshotId
  host.inert = true
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    left: '-100000px',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${snapshot.referenceViewport.width}px`,
    zIndex: '-1',
  })
  document.body.append(host)

  const reactRoot = createRoot(host)
  let canvasDisposed = 0
  let canvasCreated = 0
  let imageBitmapsCreated = 0
  let imageBitmapsClosed = 0
  let cancelLatencyMs: number | null = null
  let longTaskCount = 0
  let longTaskMs = 0
  let temporarySegmentBlobsCreated = 0
  let temporarySegmentBlobsReleased = 0
  let workerEncoded = 0
  let workerFallbacks = 0
  let temporaryObjectUrlsRevoked = 0
  let longTaskObserver: PerformanceObserver | undefined
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskCount += 1
          longTaskMs += entry.duration
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch {
      longTaskObserver = undefined
    }
  }
  let exportResult: {
    blob: Blob
    format: 'png' | 'zip'
  } | undefined
  const svgSegments: LocalPngSegment[] = []
  let diagnosticsInput: {
    embeddedImageCount: number
    geometry: ReturnType<typeof getCanonicalGeometry>
    maxSvgDataUrlBytes: number
    plan: ReturnType<typeof createSegmentedRenderPlan>
    renderReadyAt: number
    totalSvgBytes: number
  } | undefined

  const getCleanupAudit = (): LocalExportCleanupAudit => {
    const workerAudit = worker.getCleanupAudit()
    return {
      ...workerAudit,
      canvasCreated: workerAudit.canvasCreated + canvasCreated,
      canvasDisposed: workerAudit.canvasDisposed + canvasDisposed,
      imageBitmapsCreated,
      imageBitmapsClosed: workerAudit.imageBitmapsClosed + imageBitmapsClosed,
      cancelLatencyMs,
      temporaryCacheEntriesCreated: temporarySegmentBlobsCreated,
      temporaryCacheEntriesReleased: temporarySegmentBlobsReleased,
      temporaryObjectUrlsRevoked: workerAudit.workerObjectUrlCreated ? temporaryObjectUrlsRevoked : 0,
    }
  }

  try {
    flushSync(() => {
      reactRoot.render(
        <CanonicalRenderSurface mode="export" resources={resources} snapshot={snapshot} />,
      )
    })

    const canonicalRoot = host.querySelector<HTMLElement>('[data-oneimg-render-root]')
    if (!canonicalRoot) {
      throw new Error('Canonical Renderer did not mount an inert Render Root')
    }
    if (canonicalRoot.dataset.snapshotId !== snapshot.snapshotId) {
      throw new Error('Inert Render Root was mounted from a different Snapshot')
    }

    emitProgress(onProgress, { completed: 0, segmentCount: 0, stage: 'render-ready', total: 1 })
    await waitBeforeStage(beforeStage, 'render-ready', signal)
    await waitForCanonicalRenderReady(canonicalRoot, snapshot, resources, {
      isCurrent: () => !signal?.aborted,
      signal,
    })
    sampleMemory()
    const renderReadyAt = performance.now()
    const bounds = canonicalRoot.getBoundingClientRect()
    const width = Math.ceil(bounds.width)
    const height = Math.ceil(bounds.height)
    const plan = createSegmentedRenderPlan(width * outputScale, height * outputScale)
    const geometry = getCanonicalGeometry(canonicalRoot)
    let totalSvgBytes = 0
    let maxSvgDataUrlBytes = 0
    let embeddedImageCount = 0

    for (const segment of plan.segments) {
      throwIfRenderAborted(signal)
      emitProgress(onProgress, {
        completed: segment.index,
        segmentCount: plan.segments.length,
        stage: 'serializing',
        total: plan.segments.length,
      })
      await waitBeforeStage(beforeStage, 'serializing', signal)
      const serialized = await serializeToSvg(
        canonicalRoot,
        resources,
        getCanonicalOwnedCss(resources),
        plan.width / outputScale,
        segment.captureHeight / outputScale,
        plan.height / outputScale,
        segment.captureY / outputScale,
        signal,
      )
      embeddedImageCount = serialized.embeddedImageCount
      const svgBlob = new Blob([serialized.svgText], { type: 'image/svg+xml;charset=utf-8' })
      const decodedSvg = await decodeSvg(svgBlob, signal)
      totalSvgBytes += svgBlob.size
      maxSvgDataUrlBytes = Math.max(maxSvgDataUrlBytes, decodedSvg.sourceBytes)
      let blob: Blob
      try {
        emitProgress(onProgress, {
          completed: segment.index,
          segmentCount: plan.segments.length,
          stage: 'encoding',
          total: plan.segments.length,
        })
        await waitBeforeStage(beforeStage, 'encoding', signal)
        blob = await rasterizeSegment(
          decodedSvg.image,
          segment,
          plan.width,
          outputScale,
          worker,
          signal,
          () => {
            imageBitmapsCreated += 1
          },
          () => {
            imageBitmapsClosed += 1
          },
          () => {
            canvasCreated += 1
          },
          () => {
            canvasDisposed += 1
          },
          () => {
            workerEncoded += 1
          },
          () => {
            workerFallbacks += 1
          },
        )
      } finally {
        decodedSvg.image.src = ''
      }
      svgSegments.push({ blob, height: segment.height, index: segment.index, y: segment.y })
      if (plan.mode === 'segmented') {
        temporarySegmentBlobsCreated += 1
      }
      sampleMemory()
      emitProgress(onProgress, {
        completed: segment.index + 1,
        segmentCount: plan.segments.length,
        stage: 'encoding',
        total: plan.segments.length,
      })
      await yieldToMainThread(signal)
    }

    if (plan.mode === 'segmented') {
      emitProgress(onProgress, {
        completed: 0,
        segmentCount: plan.segments.length,
        stage: 'packaging',
        total: 100,
      })
      await waitBeforeStage(beforeStage, 'packaging', signal)
      const zipBlob = await packageSegments(svgSegments, signal, onProgress)
      exportResult = { blob: zipBlob, format: 'zip' }
    } else {
      exportResult = { blob: svgSegments[0]!.blob, format: 'png' }
    }
    diagnosticsInput = {
      embeddedImageCount,
      geometry,
      maxSvgDataUrlBytes,
      plan,
      renderReadyAt,
      totalSvgBytes,
    }
    sampleMemory()
  } finally {
    longTaskObserver?.disconnect()
    worker.terminate()
    const workerAudit = worker.getCleanupAudit()
    temporaryObjectUrlsRevoked = workerAudit.workerObjectUrlRevoked ? 1 : 0
    if (cancelRequestedAt !== undefined) {
      cancelLatencyMs = performance.now() - cancelRequestedAt
    }
    temporarySegmentBlobsReleased = temporarySegmentBlobsCreated
    svgSegments.length = 0
    signal?.removeEventListener('abort', onAbort)
    reactRoot.unmount()
    host.remove()
    emitProgress(onProgress, {
      cleanupAudit: getCleanupAudit(),
      completed: 1,
      segmentCount: diagnosticsInput?.plan.segments.length ?? 0,
      stage: 'cleanup',
      total: 1,
    })
  }

  if (!exportResult || !diagnosticsInput) {
    throw new Error('Local export did not produce an artifact')
  }

  const finishedAt = performance.now()
  const cleanupAudit = getCleanupAudit()
  const diagnostics: LocalExportDiagnostics = {
    adapterId: ADAPTER_ID,
    cleanupAudit,
    embeddedImageCount: diagnosticsInput.embeddedImageCount,
    exportFingerprint: resources.fingerprint,
    format: exportResult.format,
    geometry: diagnosticsInput.geometry,
    height: diagnosticsInput.plan.height,
    longTaskCount,
    longTaskMs,
    maxSvgDataUrlBytes: diagnosticsInput.maxSvgDataUrlBytes,
    memorySource: peakMemoryBytes === null ? 'unavailable' : 'performance.memory',
    outputScale,
    peakMemoryBytes,
    peakEstimatedRasterBytes: Math.max(...diagnosticsInput.plan.segments.map(segment => (
      (segment.captureHeight + segment.height) * diagnosticsInput.plan.width * 4
    ))),
    pngBytes: exportResult.blob.size,
    rasterizeMs: finishedAt - diagnosticsInput.renderReadyAt,
    renderReadyMs: diagnosticsInput.renderReadyAt - startedAt,
    resourceCount: resources.resources.length,
    segmentBleed: diagnosticsInput.plan.limits.segmentBleed,
    segmentCount: diagnosticsInput.plan.segments.length,
    segmentPlan: diagnosticsInput.plan.segments,
    segmented: diagnosticsInput.plan.mode === 'segmented',
    snapshotId: snapshot.snapshotId,
    source: 'canonical-svg-foreign-object',
    svgBytes: diagnosticsInput.totalSvgBytes,
    svgDataUrlBytes: diagnosticsInput.maxSvgDataUrlBytes,
    svgTransport: 'bounded-data-url',
    totalMs: finishedAt - startedAt,
    usedOffscreenCanvas: worker.available || typeof OffscreenCanvas !== 'undefined',
    width: diagnosticsInput.plan.width,
    workerAvailable: worker.available,
    workerFallbackCount: workerFallbacks,
    workerUsed: workerEncoded > 0,
  }

  return {
    blob: exportResult.blob,
    diagnostics,
    format: exportResult.format,
  }
}

export function createLocalSvgAdapter(): LocalRasterizerAdapter {
  return {
    id: ADAPTER_ID,
    exportPng,
  }
}
