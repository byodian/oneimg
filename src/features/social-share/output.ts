import JSZip from 'jszip'
import { createRenderAbortError, throwIfRenderAborted } from '@/features/rendering/cancellation'

export type SocialOutputFormat = 'png' | 'jpeg' | 'webp'
export const SOCIAL_OUTPUT_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const

export function createSocialFilenamePrefix(options: { readonly documentName?: string, readonly sensitive?: boolean, readonly nameOverride?: string, readonly date: Date }) {
  const name = options.nameOverride ?? (options.sensitive ? 'oneimg' : options.documentName) ?? 'oneimg'
  const cleaned = Array.from(name.normalize('NFKC').split('').filter(character => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127).join('').replace(/[\\/:*?"<>|\u202A-\u202E\u2066-\u2069]/g, '-').replace(/\s+/g, '-').replace(/^[. -]+|[. -]+$/g, '')).slice(0, 32).join('') || 'oneimg'
  const date = [options.date.getFullYear(), String(options.date.getMonth() + 1).padStart(2, '0'), String(options.date.getDate()).padStart(2, '0')].join('-')
  return `${cleaned}-${date}`
}

export function socialPageFilename(index: number, format: SocialOutputFormat, prefix: string) {
  return `${prefix}-page-${String(index + 1).padStart(3, '0')}.${format === 'jpeg' ? 'jpg' : format}`
}

const ENCODER = `
self.onmessage = async ({ data }) => {
  let bitmap;
  let decoded;
  let canvas;
  try {
    bitmap = await createImageBitmap(data.png);
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { colorSpace: 'srgb' });
    if (!context) throw new Error('unsupported');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: data.type, quality: data.quality });
    if (blob.type !== data.type) throw new Error('unsupported');
    decoded = await createImageBitmap(blob);
    if (decoded.width !== bitmap.width || decoded.height !== bitmap.height) throw new Error('invalid');
    self.postMessage({ blob });
  } catch {
    self.postMessage({ error: true });
  } finally {
    if (bitmap) bitmap.close();
    if (decoded) decoded.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
};`

/** Encode an existing canonical Page raster; never relayout or read Originals. */
export async function encodeSocialPage(png: Blob, format: SocialOutputFormat, quality: number, signal?: AbortSignal): Promise<Blob> {
  throwIfRenderAborted(signal)
  if (format === 'png') {
    return png
  }
  if (!Number.isFinite(quality) || quality < 0.1 || quality > 1) {
    throw new Error('请选择 10% 到 100% 的编码质量。')
  }
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('此设备无法编码所选格式，请选择 PNG。')
  }
  const url = URL.createObjectURL(new Blob([ENCODER], { type: 'text/javascript' }))
  let worker: Worker | undefined
  let disposeWait: (() => void) | undefined
  try {
    worker = new Worker(url)
    const activeWorker = worker
    return await new Promise<Blob>((resolve, reject) => {
      const abort = () => {
        reject(createRenderAbortError())
      }
      signal?.addEventListener('abort', abort, { once: true })
      const timer = setTimeout(() => reject(new Error('图片编码超时，请重试或选择 PNG。')), 30_000)
      const finish = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
      }
      disposeWait = finish
      activeWorker.onmessage = ({ data }: MessageEvent<{ blob?: Blob }>) => {
        finish()
        if (signal?.aborted) {
          reject(createRenderAbortError())
        } else if (data.blob?.type === SOCIAL_OUTPUT_MIME[format]) {
          resolve(data.blob)
        } else {
          reject(new Error('此设备不支持所选编码，请选择 PNG。'))
        }
      }
      activeWorker.onerror = () => {
        finish(); reject(new Error('图片编码失败，请选择 PNG 后重试。'))
      }
      if (signal?.aborted) {
        finish()
        abort()
        return
      }
      activeWorker.postMessage({ png, quality, type: SOCIAL_OUTPUT_MIME[format] })
    })
  } finally {
    disposeWait?.()
    worker?.terminate()
    URL.revokeObjectURL(url)
  }
}

export async function probeSocialFormats(signal?: AbortSignal): Promise<readonly SocialOutputFormat[]> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return ['png']
  }
  const canvas = new OffscreenCanvas(1, 1)
  canvas.getContext('2d')?.fillRect(0, 0, 1, 1)
  const png = await canvas.convertToBlob({ type: 'image/png' })
  const supported: SocialOutputFormat[] = ['png']
  for (const format of ['jpeg', 'webp'] as const) {
    throwIfRenderAborted(signal)
    try {
      await encodeSocialPage(png, format, 0.9, signal)
      supported.push(format)
    } catch { /* The encoder returned a different MIME or is unavailable. */ }
  }
  return supported
}

export function createSocialBundle(pages: readonly Blob[], format: SocialOutputFormat, prefix: string, signal?: AbortSignal): Promise<Blob> {
  throwIfRenderAborted(signal)
  const zip = new JSZip()
  // ZIP order follows authored Page order. Stored files are already encoded.
  pages.forEach((blob, index) => {
    if (blob.type !== SOCIAL_OUTPUT_MIME[format]) {
      throw new Error('图片编码与文件扩展名不一致。')
    }
    zip.file(socialPageFilename(index, format, prefix), blob, { date: new Date(1980, 0, 1) })
  })
  return new Promise<Blob>((resolve, reject) => {
    const chunks: Uint8Array<ArrayBuffer>[] = []
    const stream = zip.generateInternalStream({ type: 'uint8array', streamFiles: true, compression: 'STORE' })
    const abort = () => {
      stream.pause()
      chunks.length = 0
      signal?.removeEventListener('abort', abort)
      reject(createRenderAbortError())
    }
    signal?.addEventListener('abort', abort, { once: true })
    stream.on('data', (chunk: Uint8Array) => {
      if (!signal?.aborted) {
        chunks.push(new Uint8Array(chunk))
      }
    }).on('error', () => {
      chunks.length = 0
      signal?.removeEventListener('abort', abort)
      reject(new Error('打包失败，请重试或逐页下载。'))
    }).on('end', () => {
      signal?.removeEventListener('abort', abort)
      if (!signal?.aborted) {
        resolve(new Blob(chunks, { type: 'application/zip' }))
      }
      chunks.length = 0
    })
    if (signal?.aborted) {
      abort()
    } else {
      stream.resume()
    }
  })
}

export function downloadSocialBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
