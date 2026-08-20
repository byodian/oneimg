import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type {
  LocalExportDiagnostics,
  LocalExportRequest,
  LocalPngArtifact,
  LocalRasterizerAdapter,
} from './local-rasterizer'
import { CanonicalRenderSurface, getCanonicalOwnedCss } from '@/features/canonical-renderer/canonical-renderer'
import type { CanonicalResourceId } from '@/features/canonical-renderer/model'
import { getCanonicalGeometry, waitForCanonicalRenderReady } from '@/features/canonical-renderer/render-ready'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'

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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read resource Blob')))
    reader.readAsDataURL(blob)
  })
}

async function serializeToSvg(
  root: HTMLElement,
  resources: ResolvedResourceSet,
  cssText: string,
  width: number,
  height: number,
) {
  const canonicalRoot = root.cloneNode(true) as HTMLElement
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
    const resource = imageResources[index]
    if (!resource) {
      throw new Error(`Missing image resource for ${image.dataset.resourceId}`)
    }
    image.src = await blobToDataUrl(resource.blob)
  }))

  const canonicalMarkup = new XMLSerializer().serializeToString(canonicalRoot)
  return {
    embeddedImageCount: images.length,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden"><style type="text/css">${wrapCssAsCdata(cssText)}</style>${canonicalMarkup}</div></foreignObject></svg>`,
  }
}

async function decodeSvg(svgBlob: Blob) {
  const svgText = await svgBlob.text()
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  const sourceBytes = new TextEncoder().encode(source).byteLength
  if (sourceBytes > MAX_SVG_DATA_URL_BYTES) {
    throw new Error(`Local SVG transport exceeds the bounded ${MAX_SVG_DATA_URL_BYTES}-byte limit`)
  }
  const image = new Image()
  image.decoding = 'sync'
  image.src = source

  try {
    await image.decode()
    return { image, sourceBytes }
  } catch (error) {
    image.src = ''
    throw error
  }
}

async function rasterizePng(image: CanvasImageSource, width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to create an OffscreenCanvas 2D context')
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    canvas.width = 0
    canvas.height = 0
    return { blob, usedOffscreenCanvas: true }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create a Canvas 2D context')
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to encode PNG')), 'image/png')
  })
  canvas.width = 0
  canvas.height = 0
  return { blob, usedOffscreenCanvas: false }
}

async function exportPng({ snapshot, resources }: LocalExportRequest): Promise<LocalPngArtifact> {
  const startedAt = performance.now()
  let peakMemoryBytes = readUsedHeapBytes()
  const sampleMemory = () => {
    const current = readUsedHeapBytes()
    if (current !== null) {
      peakMemoryBytes = Math.max(peakMemoryBytes ?? current, current)
    }
  }
  sampleMemory()
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
  let image: HTMLImageElement | undefined

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

    await waitForCanonicalRenderReady(canonicalRoot, snapshot, resources)
    sampleMemory()
    const renderReadyAt = performance.now()
    const bounds = canonicalRoot.getBoundingClientRect()
    const width = Math.ceil(bounds.width)
    const height = Math.ceil(bounds.height)
    const geometry = getCanonicalGeometry(canonicalRoot)
    const serialized = await serializeToSvg(canonicalRoot, resources, getCanonicalOwnedCss(resources), width, height)
    sampleMemory()
    const { svgText } = serialized
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const decodedSvg = await decodeSvg(svgBlob)
    image = decodedSvg.image
    const raster = await rasterizePng(decodedSvg.image, width, height)
    sampleMemory()
    const finishedAt = performance.now()

    const diagnostics: LocalExportDiagnostics = {
      adapterId: ADAPTER_ID,
      snapshotId: snapshot.snapshotId,
      exportFingerprint: resources.fingerprint,
      source: 'canonical-svg-foreign-object',
      width,
      height,
      geometry,
      renderReadyMs: renderReadyAt - startedAt,
      rasterizeMs: finishedAt - renderReadyAt,
      totalMs: finishedAt - startedAt,
      svgBytes: svgBlob.size,
      pngBytes: raster.blob.size,
      resourceCount: resources.resources.length,
      embeddedImageCount: serialized.embeddedImageCount,
      usedOffscreenCanvas: raster.usedOffscreenCanvas,
      peakMemoryBytes,
      memorySource: peakMemoryBytes === null ? 'unavailable' : 'performance.memory',
      svgDataUrlBytes: decodedSvg.sourceBytes,
      svgTransport: 'bounded-data-url',
    }

    return { blob: raster.blob, diagnostics }
  } finally {
    if (image) {
      image.src = ''
    }
    reactRoot.unmount()
    host.remove()
  }
}

export function createLocalSvgAdapter(): LocalRasterizerAdapter {
  return {
    id: ADAPTER_ID,
    exportPng,
  }
}
