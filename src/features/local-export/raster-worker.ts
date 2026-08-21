import type { RenderSegment } from './segmented-render'
import {
  createRenderAbortError,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

const RASTER_WORKER_SOURCE = String.raw`
const canceled = new Set()

self.onmessage = async (event) => {
  const message = event.data
  if (message.type === 'cancel') {
    canceled.add(message.id)
    return
  }
  if (message.type !== 'encode') {
    return
  }

  const { bitmap, height, id, trimTop, width } = message
  let canvas
  try {
    if (canceled.has(id)) {
      bitmap.close()
      self.postMessage({ canvasCreated: false, id, type: 'canceled' })
      return
    }
    canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to create a Worker OffscreenCanvas 2D context')
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, trimTop, width, height, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (canceled.has(id)) {
      self.postMessage({ canvasCreated: true, id, type: 'canceled' })
      return
    }
    let buffer = await blob.arrayBuffer()
    self.postMessage({ buffer, canvasCreated: true, id, type: 'result' }, [buffer])
    buffer = new ArrayBuffer(0)
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
      canvasCreated: Boolean(canvas),
      id,
      type: 'error',
    })
  } finally {
    bitmap.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
`

export interface RasterWorkerCleanupAudit {
  readonly arrayBuffersReceived: number
  readonly arrayBuffersReleased: number
  readonly canvasCreated: number
  readonly canvasDisposed: number
  readonly imageBitmapsClosed: number
  readonly requested: number
  readonly workerObjectUrlRevoked: boolean
  readonly workerObjectUrlCreated: boolean
  readonly workerTerminated: boolean
}

interface WorkerResult {
  readonly buffer?: ArrayBuffer
  readonly canvasCreated?: boolean
  readonly error?: string
  readonly id: number
  readonly type: 'canceled' | 'error' | 'result'
}

interface PendingEncode {
  readonly bitmap: ImageBitmap
  readonly reject: (reason: unknown) => void
  readonly resolve: (blob: Blob) => void
  readonly signal?: AbortSignal
  readonly onAbort?: () => void
}

export interface RasterWorkerClient {
  readonly available: boolean
  encode(bitmap: ImageBitmap, segment: RenderSegment, width: number, signal?: AbortSignal): Promise<Blob>
  getCleanupAudit(): RasterWorkerCleanupAudit
  terminate(): void
}

function createUnavailableClient(): RasterWorkerClient {
  return {
    available: false,
    encode: async (_bitmap, _segment, _width, signal) => {
      throwIfRenderAborted(signal)
      throw new Error('Raster Worker is unavailable')
    },
    getCleanupAudit: () => ({
      arrayBuffersReceived: 0,
      arrayBuffersReleased: 0,
      canvasCreated: 0,
      canvasDisposed: 0,
      imageBitmapsClosed: 0,
      requested: 0,
      workerObjectUrlRevoked: true,
      workerObjectUrlCreated: false,
      workerTerminated: true,
    }),
    terminate: () => undefined,
  }
}

export function createRasterWorkerClient(): RasterWorkerClient {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return createUnavailableClient()
  }

  const workerBlob = new Blob([RASTER_WORKER_SOURCE], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(workerBlob)
  let worker: Worker
  try {
    worker = new Worker(workerUrl)
  } catch {
    URL.revokeObjectURL(workerUrl)
    return createUnavailableClient()
  }
  URL.revokeObjectURL(workerUrl)

  let nextId = 0
  let terminated = false
  let canvasCreated = 0
  let canvasDisposed = 0
  let imageBitmapsClosed = 0
  let arrayBuffersReceived = 0
  let arrayBuffersReleased = 0
  let requested = 0
  const pending = new Map<number, PendingEncode>()

  const closePendingBitmap = (pendingEncode: PendingEncode) => {
    try {
      pendingEncode.bitmap.close()
      imageBitmapsClosed += 1
    } catch {
      // The browser may already have detached a transferred bitmap.
    }
  }

  const settle = (id: number, callback: (pendingEncode: PendingEncode) => void) => {
    const pendingEncode = pending.get(id)
    if (!pendingEncode) {
      return
    }
    pending.delete(id)
    if (pendingEncode.signal && pendingEncode.onAbort) {
      pendingEncode.signal.removeEventListener('abort', pendingEncode.onAbort)
    }
    callback(pendingEncode)
  }

  worker.addEventListener('message', (event: MessageEvent<WorkerResult>) => {
    const result = event.data
    if (result.type === 'result' && result.buffer) {
      const buffer = result.buffer
      arrayBuffersReceived += 1
      if (result.canvasCreated) {
        canvasCreated += 1
        canvasDisposed += 1
      }
      imageBitmapsClosed += 1
      let blob: Blob
      try {
        blob = new Blob([buffer], { type: 'image/png' })
      } catch (error) {
        arrayBuffersReleased += 1
        settle(result.id, pendingEncode => pendingEncode.reject(error))
        return
      }
      arrayBuffersReleased += 1
      settle(result.id, pendingEncode => pendingEncode.resolve(blob))
      return
    }
    if (result.type === 'canceled') {
      if (result.canvasCreated) {
        canvasCreated += 1
        canvasDisposed += 1
      }
      imageBitmapsClosed += 1
      settle(result.id, (pendingEncode) => {
        pendingEncode.reject(createRenderAbortError())
      })
      return
    }
    if (result.canvasCreated) {
      canvasCreated += 1
      canvasDisposed += 1
    }
    imageBitmapsClosed += 1
    settle(result.id, (pendingEncode) => {
      pendingEncode.reject(new Error(result.error ?? 'Raster Worker failed'))
    })
  })

  worker.addEventListener('error', (event) => {
    const reason = new Error(event.message || 'Raster Worker failed')
    for (const id of Array.from(pending.keys())) {
      settle(id, (pendingEncode) => {
        closePendingBitmap(pendingEncode)
        pendingEncode.reject(reason)
      })
    }
  })

  return {
    available: true,
    encode(bitmap, segment, width, signal) {
      throwIfRenderAborted(signal)
      if (terminated) {
        throw new Error('Raster Worker has been terminated')
      }

      const id = ++nextId
      requested += 1
      const promise = new Promise<Blob>((resolve, reject) => {
        const onAbort = () => {
          if (terminated) {
            return
          }
          worker.postMessage({ id, type: 'cancel' })
        }
        pending.set(id, { bitmap, onAbort, reject, resolve, signal })
        signal?.addEventListener('abort', onAbort, { once: true })
        if (signal?.aborted) {
          bitmap.close()
          imageBitmapsClosed += 1
          settle(id, pendingEncode => pendingEncode.reject(createRenderAbortError()))
          return
        }

        try {
          worker.postMessage({
            bitmap,
            height: segment.height,
            id,
            trimTop: segment.trimTop,
            type: 'encode',
            width,
          }, [bitmap])
        } catch (error) {
          bitmap.close()
          imageBitmapsClosed += 1
          settle(id, pendingEncode => pendingEncode.reject(error))
          throw error
        }
      })
      return promise
    },
    getCleanupAudit() {
      return {
        arrayBuffersReceived,
        arrayBuffersReleased,
        canvasCreated,
        canvasDisposed,
        imageBitmapsClosed,
        requested,
        workerObjectUrlRevoked: true,
        workerObjectUrlCreated: true,
        workerTerminated: terminated,
      }
    },
    terminate() {
      if (terminated) {
        return
      }
      terminated = true
      for (const id of Array.from(pending.keys())) {
        settle(id, (pendingEncode) => {
          closePendingBitmap(pendingEncode)
          pendingEncode.reject(createRenderAbortError())
        })
      }
      worker.terminate()
    },
  }
}
