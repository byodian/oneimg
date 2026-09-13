import { cloneValue, freezeDeep } from '@/features/document-core'
import {
  type CanonicalRenderSnapshot,
  collectSnapshotResourceIds,
} from '@/features/canonical-renderer/model'
import { throwIfRenderAborted } from '@/features/rendering/cancellation'

/** Resolved canonical bytes only: never pass Asset Originals or resolver URLs. */
export interface HighFidelityResource {
  readonly id: string
  readonly kind: 'font' | 'image'
  readonly blob: Blob
}

export interface HighFidelityRequest {
  readonly snapshot: CanonicalRenderSnapshot
  readonly resources: readonly HighFidelityResource[]
  readonly output: { readonly format: 'png', readonly scale: 1 | 2 | 3 }
}

const preparedRequests = new WeakSet<HighFidelityRequest>()

export type HighFidelityErrorCode =
  | 'authorization-required'
  | 'canceled'
  | 'cleanup-pending'
  | 'invalid-request'
  | 'invalid-result'
  | 'remote-failed'
  | 'sensitive-local-only'
  | 'unresolved-resource'

export class HighFidelityError extends Error {
  constructor(readonly code: HighFidelityErrorCode) {
    // Provider exceptions may contain authored content or signed URLs.
    super(code)
    this.name = 'HighFidelityError'
  }
}

/** Prepare locally, before asking for authorization or invoking an Adapter. */
export function prepareHighFidelityRequest(
  snapshot: CanonicalRenderSnapshot,
  resources: readonly HighFidelityResource[],
  scale: 1 | 2 | 3,
): HighFidelityRequest {
  if (snapshot.sensitive) {
    throw new HighFidelityError('sensitive-local-only')
  }
  if (snapshot.unresolvedResourceIds?.length || snapshot.document.sections.some(section => (
    section.kind === 'media-group' && section.items.some(item => item.status !== 'ready' || !item.resourceId)
  ))) {
    throw new HighFidelityError('unresolved-resource')
  }
  if (![1, 2, 3].includes(scale) || snapshot.schemaVersion !== 1) {
    throw new HighFidelityError('invalid-request')
  }
  const selected = collectSnapshotResourceIds(snapshot).map((id) => {
    const matches = resources.filter(resource => resource.id === id)
    const resource = matches[0]
    if (matches.length !== 1 || !resource || resource.blob.size === 0) {
      throw new HighFidelityError('unresolved-resource')
    }
    const kind = snapshot.fontPack.resourceIds.includes(id) ? 'font' : 'image'
    if (resource.kind !== kind) {
      throw new HighFidelityError('invalid-request')
    }
    // Blob.slice strips File names and creates an immutable byte view.
    return Object.freeze({ id, kind, blob: resource.blob.slice(0, resource.blob.size, resource.blob.type) })
  })
  const request: HighFidelityRequest = Object.freeze({
    snapshot: freezeDeep(cloneValue(snapshot)),
    resources: Object.freeze(selected),
    output: Object.freeze({ format: 'png', scale }),
  })
  preparedRequests.add(request)
  return request
}

export interface HighFidelityEncodedResult {
  readonly blob: Blob
  readonly rendererRevision: string
  readonly width: number
  readonly height: number
}

/**
 * Internal transport boundary. Implementations own Job-scoped capabilities,
 * remote idempotency, deadlines, and server-side deletion/expiry. open must
 * compensate a failed allocation; a returned session is disposed by the runner.
 * dispose is idempotent and confirms deletion of inputs, outputs and browser.
 */
export interface HighFidelityAdapter {
  open(jobId: string, request: HighFidelityRequest, signal: AbortSignal): Promise<{
    render(signal: AbortSignal): Promise<HighFidelityEncodedResult>
    dispose(): Promise<void>
  }>
}

export type HighFidelityJobStatus = 'preparing' | 'rendering' | 'cleaning' | 'ready' | 'failed' | 'canceled'

export interface HighFidelityJobState {
  readonly jobId: string
  readonly status: HighFidelityJobStatus
  readonly cleanup: 'pending' | 'complete'
  readonly error?: HighFidelityErrorCode
}

export interface HighFidelityResult extends HighFidelityEncodedResult {
  // This foundation does not own a certification registry. Every result must
  // be displayed as decoded final bytes and downloaded without rerendering.
  readonly fidelity: 'proof-required'
}

export interface HighFidelityJob {
  readonly id: string
  readonly promise: Promise<HighFidelityResult>
  getState(): HighFidelityJobState
  cancel(): boolean
  retryCleanup(): Promise<void>
}

async function validateResult(result: HighFidelityEncodedResult, request: HighFidelityRequest) {
  const signature = new Uint8Array(await result.blob.slice(0, 24).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10]
  if (result.blob.type !== 'image/png' || signature.length < 24
    || !png.every((byte, index) => signature[index] === byte)
    || String.fromCharCode(...Array.from(signature.slice(12, 16))) !== 'IHDR'
    || !Number.isSafeInteger(result.width) || result.width <= 0
    || !Number.isSafeInteger(result.height) || result.height <= 0
    || !result.rendererRevision
    || result.width !== Math.ceil(request.snapshot.referenceViewport.width * request.output.scale)
    || (request.snapshot.presentation.pageFormat.kind === 'bounded'
      && result.height !== Math.ceil((request.snapshot.presentation.pageFormat.height ?? 0) * request.output.scale))) {
    throw new HighFidelityError('invalid-result')
  }
  const header = new DataView(signature.buffer)
  if (header.getUint32(16) !== result.width || header.getUint32(20) !== result.height) {
    throw new HighFidelityError('invalid-result')
  }
}

/** Local lifecycle coordinator, composed behind the Export Engine, not a UI API. */
export function createHighFidelityJobRunner(adapter: HighFidelityAdapter) {
  const jobs = new WeakMap<HighFidelityRequest, HighFidelityJob>()
  return {
    run(request: HighFidelityRequest, authorization: { readonly granted: boolean }): HighFidelityJob {
      if (!preparedRequests.has(request)) {
        throw new HighFidelityError('invalid-request')
      }
      if (!authorization.granted) {
        throw new HighFidelityError('authorization-required')
      }
      const existing = jobs.get(request)
      if (existing) {
        return existing
      }
      const id = crypto.randomUUID()
      const controller = new AbortController()
      let state: HighFidelityJobState = Object.freeze({ jobId: id, status: 'preparing', cleanup: 'pending' })
      let session: Awaited<ReturnType<HighFidelityAdapter['open']>> | undefined
      let cleanupPromise: Promise<void> | undefined
      const update = (next: Partial<HighFidelityJobState>) => {
        state = Object.freeze({ ...state, ...next })
      }
      const clean = (): Promise<void> => {
        if (cleanupPromise) {
          return cleanupPromise
        }
        cleanupPromise = Promise.resolve().then(async () => {
          await session?.dispose()
          session = undefined
          update({ cleanup: 'complete' })
        }).catch(() => {
          cleanupPromise = undefined
          update({ error: 'cleanup-pending' })
          throw new HighFidelityError('cleanup-pending')
        })
        return cleanupPromise
      }
      const execute = async (): Promise<HighFidelityResult> => {
        let result: HighFidelityEncodedResult | undefined
        let error: HighFidelityErrorCode | undefined
        try {
          throwIfRenderAborted(controller.signal)
          session = await adapter.open(id, request, controller.signal)
          throwIfRenderAborted(controller.signal)
          update({ status: 'rendering' })
          const rendered = await session.render(controller.signal)
          result = Object.freeze({
            blob: rendered.blob,
            width: rendered.width,
            height: rendered.height,
            rendererRevision: rendered.rendererRevision,
          })
          throwIfRenderAborted(controller.signal)
          await validateResult(result, request)
          throwIfRenderAborted(controller.signal)
        } catch (reason) {
          error = controller.signal.aborted ? 'canceled' : reason instanceof HighFidelityError ? reason.code : 'remote-failed'
        }
        if (!controller.signal.aborted) {
          update({ status: 'cleaning' })
        }
        try {
          await clean()
        } catch {
          error = 'cleanup-pending'
        }
        if (controller.signal.aborted) {
          update({ status: 'canceled', error: state.cleanup === 'complete' ? 'canceled' : 'cleanup-pending' })
          throw new HighFidelityError('canceled')
        }
        if (error || !result) {
          update({ status: 'failed', error: error ?? 'remote-failed' })
          throw new HighFidelityError(error ?? 'remote-failed')
        }
        update({ status: 'ready' })
        return Object.freeze({
          blob: result.blob,
          width: result.width,
          height: result.height,
          rendererRevision: result.rendererRevision,
          fidelity: 'proof-required',
        })
      }
      // Defer allocation until the handle is registered, including reentrant starts.
      const promise = Promise.resolve().then(execute)
      const job: HighFidelityJob = {
        id,
        promise,
        getState: () => state,
        cancel() {
          if (['ready', 'failed', 'canceled'].includes(state.status)) {
            return false
          }
          update({ status: 'canceled', error: 'canceled' })
          controller.abort()
          if (session) {
            clean().catch(() => undefined)
          }
          return true
        },
        async retryCleanup() {
          if (!['failed', 'canceled', 'ready'].includes(state.status)) {
            throw new HighFidelityError('invalid-request')
          }
          // execute owns cleanup until its promise settles (including late open).
          await promise.catch(() => undefined)
          await clean()
        },
      }
      jobs.set(request, job)
      return job
    },
  }
}
