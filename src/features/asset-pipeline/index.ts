import * as ExifReader from 'exifreader'
import {
  abortableRenderPromise,
  createRenderAbortError,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type SupportedImageMimeType = typeof SUPPORTED_IMAGE_MIME_TYPES[number]
export type AssetStatus = 'ready' | 'unresolved'
export type AssetPipelineFailureCode =
  | 'corrupt-image'
  | 'decode-failed'
  | 'unsupported-format'

export interface ImageDimensions {
  readonly height: number
  readonly width: number
}

export interface NormalizedImageMetadata {
  readonly alphaMode: 'opaque' | 'preserved'
  readonly colorInterpretation: 'srgb'
  readonly exifOrientation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  readonly intrinsicDimensions: ImageDimensions
  readonly orientation: 'top-left'
  readonly rawDimensions: ImageDimensions
}

export interface AssetOriginalMetadata {
  readonly byteLength: number
  readonly fileName: string
  readonly mimeType: string
  readonly sha256: string
}

export interface RenderSourceMetadata {
  readonly byteLength: number
  readonly id: string
  readonly metadata: NormalizedImageMetadata
  readonly mimeType: 'image/png'
}

export interface AssetFailure {
  readonly code: AssetPipelineFailureCode
  readonly message: string
}

export interface ReadyAssetRecord {
  readonly id: string
  readonly original: AssetOriginalMetadata
  readonly renderSource: RenderSourceMetadata
  readonly status: 'ready'
}

export interface UnresolvedAssetRecord {
  readonly failure: AssetFailure
  readonly id: string
  readonly original: AssetOriginalMetadata
  readonly status: 'unresolved'
}

export type AssetRecord = ReadyAssetRecord | UnresolvedAssetRecord

export interface AssetIngestionResult {
  readonly asset: AssetRecord
  readonly created: boolean
}

export interface AssetImportEntry extends AssetIngestionResult {
  readonly ordinal: number
}

export interface AssetImportBatchResult {
  readonly entries: readonly AssetImportEntry[]
}

export interface AssetRenderSource {
  readonly blob: Blob
  readonly metadata: RenderSourceMetadata
}

export interface AssetRenderSourceDefinition {
  readonly create: () => Blob
  readonly id: string
  readonly mimeType: 'image/png'
}

export interface AssetPipelineDiagnostics {
  readonly assetCount: number
  readonly originalBytes: number
  readonly renderSourceBytes: number
}

export interface AssetPipelineOptions {
  readonly maxDecodedPixels?: number
}

export interface AssetIngestionOptions {
  readonly signal?: AbortSignal
}

export interface AssetPipeline {
  readonly createRenderSourceDefinition: (assetId: string) => AssetRenderSourceDefinition
  readonly get: (assetId: string) => AssetRecord | undefined
  readonly getDiagnostics: () => AssetPipelineDiagnostics
  readonly getOriginal: (assetId: string) => Blob
  readonly getRenderSource: (assetId: string) => AssetRenderSource
  readonly ingest: (input: Blob, options?: AssetIngestionOptions) => Promise<AssetIngestionResult>
  readonly ingestMany: (inputs: readonly Blob[], options?: AssetIngestionOptions) => Promise<AssetImportBatchResult>
  readonly list: () => readonly AssetRecord[]
}

const DEFAULT_MAX_DECODED_PIXELS = 40_000_000
const DEFAULT_FILE_NAME = '未命名图片'

type DecodedImage = {
  readonly close: () => void
  readonly draw: (context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void
  readonly dimensions: ImageDimensions
}

type InternalAsset = {
  readonly originalBlob: Blob
  readonly record: AssetRecord
  readonly renderSourceBlob?: Blob
}

function isSupportedMimeType(value: string): value is SupportedImageMimeType {
  return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(value)
}

function readFileName(input: Blob) {
  const candidate = 'name' in input && typeof input.name === 'string' ? input.name : ''
  return candidate.trim() === '' ? DEFAULT_FILE_NAME : candidate
}

function readSniffedMimeType(bytes: Uint8Array): SupportedImageMimeType | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a) {
    return 'image/png'
  }
  if (bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50) {
    return 'image/webp'
  }
  return undefined
}

function imageBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function readExifOrientation(bytes: Uint8Array, mimeType: SupportedImageMimeType) {
  if (mimeType !== 'image/jpeg') {
    return 1 as const
  }
  try {
    const tags = ExifReader.load(imageBytes(bytes)) as {
      readonly Orientation?: { readonly value?: unknown }
    }
    const value = tags.Orientation?.value
    return value === 1 || value === 2 || value === 3 || value === 4
      || value === 5 || value === 6 || value === 7 || value === 8
      ? value
      : 1
  } catch {
    // Missing or malformed EXIF does not make otherwise decodable pixels unusable.
    return 1 as const
  }
}

function stripJpegExifSegments(bytes: Uint8Array, mimeType: SupportedImageMimeType) {
  if (mimeType !== 'image/jpeg' || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes
  }

  const parts: Uint8Array[] = [bytes.slice(0, 2)]
  let offset = 2
  let removed = false
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]!
    if (marker === 0xda) {
      parts.push(bytes.slice(offset))
      offset = bytes.length
      break
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.slice(offset, offset + 2))
      offset += 2
      continue
    }

    const segmentLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!
    const segmentEnd = offset + 2 + segmentLength
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      return bytes
    }
    const isExif = marker === 0xe1
      && bytes[offset + 4] === 0x45
      && bytes[offset + 5] === 0x78
      && bytes[offset + 6] === 0x69
      && bytes[offset + 7] === 0x66
      && bytes[offset + 8] === 0x00
      && bytes[offset + 9] === 0x00
    if (isExif) {
      removed = true
    } else {
      parts.push(bytes.slice(offset, segmentEnd))
    }
    offset = segmentEnd
  }

  if (offset < bytes.length) {
    parts.push(bytes.slice(offset))
  }
  if (!removed) {
    return bytes
  }

  const length = parts.reduce((total, part) => total + part.length, 0)
  const stripped = new Uint8Array(length)
  let targetOffset = 0
  for (const part of parts) {
    stripped.set(part, targetOffset)
    targetOffset += part.length
  }
  return stripped
}

function swapsDimensions(orientation: NormalizedImageMetadata['exifOrientation']) {
  return orientation >= 5
}

function normalizedDimensions(raw: ImageDimensions, orientation: NormalizedImageMetadata['exifOrientation']) {
  return swapsDimensions(orientation)
    ? { height: raw.width, width: raw.height }
    : raw
}

function setOrientationTransform(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  orientation: NormalizedImageMetadata['exifOrientation'],
  raw: ImageDimensions,
  normalized: ImageDimensions,
) {
  switch (orientation) {
    case 1:
      context.setTransform(1, 0, 0, 1, 0, 0)
      break
    case 2:
      context.setTransform(-1, 0, 0, 1, raw.width, 0)
      break
    case 3:
      context.setTransform(-1, 0, 0, -1, raw.width, raw.height)
      break
    case 4:
      context.setTransform(1, 0, 0, -1, 0, raw.height)
      break
    case 5:
      context.setTransform(0, 1, 1, 0, 0, 0)
      break
    case 6:
      context.setTransform(0, 1, -1, 0, normalized.width, 0)
      break
    case 7:
      context.setTransform(0, -1, -1, 0, normalized.width, normalized.height)
      break
    case 8:
      context.setTransform(0, -1, 1, 0, 0, normalized.height)
      break
  }
}

async function decodeWithImageElement(blob: Blob, signal?: AbortSignal): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(blob)
  const image = new Image()
  image.decoding = 'async'
  try {
    const decoded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to decode image'))
    })
    image.src = objectUrl
    await abortableRenderPromise(decoded, signal)
    throwIfRenderAborted(signal)
    const dimensions = { height: image.naturalHeight, width: image.naturalWidth }
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error('Image has no intrinsic dimensions')
    }
    return {
      close: () => URL.revokeObjectURL(objectUrl),
      dimensions,
      draw: context => context.drawImage(image, 0, 0),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function decodeImage(blob: Blob, signal?: AbortSignal): Promise<DecodedImage> {
  throwIfRenderAborted(signal)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await abortableRenderPromise(createImageBitmap(blob, {
        colorSpaceConversion: 'default',
        imageOrientation: 'none',
      }), signal)
      const dimensions = { height: bitmap.height, width: bitmap.width }
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        bitmap.close()
        throw new Error('Image has no intrinsic dimensions')
      }
      return {
        close: () => bitmap.close(),
        dimensions,
        draw: context => context.drawImage(bitmap, 0, 0),
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      // A browser may expose createImageBitmap but not decode a given image type.
      // The HTMLImageElement path is still local and applies the same transforms.
    }
  }
  return decodeWithImageElement(blob, signal)
}

function createCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas === 'function') {
    return new OffscreenCanvas(width, height)
  }
  if (typeof document === 'undefined') {
    throw new Error('No local canvas implementation is available')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

async function encodePng(canvas: OffscreenCanvas | HTMLCanvasElement) {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/png' })
  }
  const htmlCanvas = canvas as HTMLCanvasElement
  return new Promise<Blob>((resolve, reject) => {
    htmlCanvas.toBlob(blob => blob === null
      ? reject(new Error('Unable to encode normalized Render Source'))
      : resolve(blob), 'image/png')
  })
}

async function createNormalizedRenderSource(
  decoded: DecodedImage,
  orientation: NormalizedImageMetadata['exifOrientation'],
  signal?: AbortSignal,
) {
  const rawDimensions = decoded.dimensions
  const intrinsicDimensions = normalizedDimensions(rawDimensions, orientation)
  const canvas = createCanvas(intrinsicDimensions.width, intrinsicDimensions.height)
  const context = canvas.getContext('2d', { alpha: true })
  if (context === null) {
    throw new Error('Unable to create a local 2D canvas')
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  setOrientationTransform(context, orientation, rawDimensions, intrinsicDimensions)
  throwIfRenderAborted(signal)
  decoded.draw(context)
  throwIfRenderAborted(signal)
  const blob = await abortableRenderPromise(encodePng(canvas), signal)
  throwIfRenderAborted(signal)
  return { blob, intrinsicDimensions, rawDimensions }
}

function createUnresolvedRecord(
  id: string,
  original: AssetOriginalMetadata,
  failure: AssetFailure,
): UnresolvedAssetRecord {
  return { failure, id, original, status: 'unresolved' }
}

function failureFromError(error: unknown): AssetFailure {
  return {
    code: 'decode-failed',
    message: error instanceof Error ? error.message : 'Unable to decode image',
  }
}

class BrowserAssetPipeline implements AssetPipeline {
  private readonly assets = new Map<string, InternalAsset>()
  private readonly maxDecodedPixels: number

  constructor(options: AssetPipelineOptions = {}) {
    this.maxDecodedPixels = Math.max(1, Math.floor(options.maxDecodedPixels ?? DEFAULT_MAX_DECODED_PIXELS))
  }

  async ingest(input: Blob, options: AssetIngestionOptions = {}): Promise<AssetIngestionResult> {
    throwIfRenderAborted(options.signal)
    const bytes = new Uint8Array(await input.arrayBuffer())
    throwIfRenderAborted(options.signal)
    const sniffedMimeType = readSniffedMimeType(bytes)
    const declaredMimeType = input.type.trim().toLowerCase()
    const digest = await crypto.subtle.digest('SHA-256', imageBytes(bytes))
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    // Keep the stable content identity compatible with package path identifiers.
    const id = `asset-${sha256}`
    const existing = this.assets.get(id)
    if (existing !== undefined) {
      return { asset: existing.record, created: false }
    }

    const original = {
      byteLength: input.size,
      fileName: readFileName(input),
      mimeType: declaredMimeType || sniffedMimeType || 'application/octet-stream',
      sha256,
    } satisfies AssetOriginalMetadata

    if (sniffedMimeType === undefined) {
      const record = createUnresolvedRecord(id, original, {
        code: declaredMimeType === '' || isSupportedMimeType(declaredMimeType) ? 'corrupt-image' : 'unsupported-format',
        message: declaredMimeType === '' || isSupportedMimeType(declaredMimeType)
          ? '图片文件签名无效，已保留为待恢复资源。'
          : '仅支持 JPEG、PNG 和 WebP 图片，且文件声明必须与实际格式一致。',
      })
      this.assets.set(id, { originalBlob: new Blob([imageBytes(bytes)], { type: original.mimeType }), record })
      return { asset: record, created: true }
    }
    if (declaredMimeType !== '' && declaredMimeType !== sniffedMimeType) {
      const record = createUnresolvedRecord(id, original, {
        code: 'unsupported-format',
        message: '仅支持 JPEG、PNG 和 WebP 图片，且文件声明必须与实际格式一致。',
      })
      this.assets.set(id, { originalBlob: new Blob([imageBytes(bytes)], { type: original.mimeType }), record })
      return { asset: record, created: true }
    }

    const originalBlob = new Blob([imageBytes(bytes)], { type: sniffedMimeType })
    const decodeBlob = new Blob([imageBytes(stripJpegExifSegments(bytes, sniffedMimeType))], { type: sniffedMimeType })
    let decoded: DecodedImage | undefined
    try {
      decoded = await decodeImage(decodeBlob, options.signal)
      const rawDimensions = decoded.dimensions
      if (rawDimensions.width * rawDimensions.height > this.maxDecodedPixels) {
        throw new Error(`Image exceeds the ${this.maxDecodedPixels.toLocaleString()} pixel local limit`)
      }
      const exifOrientation = readExifOrientation(bytes, sniffedMimeType)
      const normalized = await createNormalizedRenderSource(decoded, exifOrientation, options.signal)
      const metadata: NormalizedImageMetadata = {
        alphaMode: sniffedMimeType === 'image/jpeg' ? 'opaque' : 'preserved',
        colorInterpretation: 'srgb',
        exifOrientation,
        intrinsicDimensions: normalized.intrinsicDimensions,
        orientation: 'top-left',
        rawDimensions: normalized.rawDimensions,
      }
      const renderSource = {
        byteLength: normalized.blob.size,
        id: `${id}:render-source:png@1`,
        metadata,
        mimeType: 'image/png' as const,
      } satisfies RenderSourceMetadata
      const record = {
        id,
        original,
        renderSource,
        status: 'ready' as const,
      } satisfies ReadyAssetRecord
      this.assets.set(id, { originalBlob, record, renderSourceBlob: normalized.blob })
      return { asset: record, created: true }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      const record = createUnresolvedRecord(id, original, failureFromError(error))
      this.assets.set(id, { originalBlob, record })
      return { asset: record, created: true }
    } finally {
      decoded?.close()
    }
  }

  async ingestMany(inputs: readonly Blob[], options: AssetIngestionOptions = {}): Promise<AssetImportBatchResult> {
    const entries: AssetImportEntry[] = []
    for (let ordinal = 0; ordinal < inputs.length; ordinal += 1) {
      throwIfRenderAborted(options.signal)
      entries.push({
        ...(await this.ingest(inputs[ordinal]!, options)),
        ordinal,
      })
    }
    return { entries }
  }

  get(assetId: string) {
    return this.assets.get(assetId)?.record
  }

  list() {
    return Array.from(this.assets.values(), value => value.record)
  }

  getOriginal(assetId: string) {
    const asset = this.assets.get(assetId)
    if (asset === undefined) {
      throw new Error(`Asset ${assetId} was not found`)
    }
    return asset.originalBlob
  }

  getRenderSource(assetId: string): AssetRenderSource {
    const asset = this.assets.get(assetId)
    if (asset === undefined || asset.record.status !== 'ready' || asset.renderSourceBlob === undefined) {
      throw new Error(`Asset ${assetId} does not have a resolved Render Source`)
    }
    return {
      blob: asset.renderSourceBlob,
      metadata: asset.record.renderSource,
    }
  }

  createRenderSourceDefinition(assetId: string): AssetRenderSourceDefinition {
    const source = this.getRenderSource(assetId)
    return {
      create: () => source.blob,
      id: source.metadata.id,
      mimeType: source.metadata.mimeType,
    }
  }

  getDiagnostics(): AssetPipelineDiagnostics {
    return Array.from(this.assets.values()).reduce<AssetPipelineDiagnostics>((diagnostics, asset) => ({
      assetCount: diagnostics.assetCount + 1,
      originalBytes: diagnostics.originalBytes + asset.originalBlob.size,
      renderSourceBytes: diagnostics.renderSourceBytes + (asset.renderSourceBlob?.size ?? 0),
    }), {
      assetCount: 0,
      originalBytes: 0,
      renderSourceBytes: 0,
    })
  }
}

export function createBrowserAssetPipeline(options: AssetPipelineOptions = {}): AssetPipeline {
  return new BrowserAssetPipeline(options)
}

export function isSupportedImageMimeType(value: string): value is SupportedImageMimeType {
  return isSupportedMimeType(value)
}

export function createAssetPipelineAbortError() {
  return createRenderAbortError()
}
