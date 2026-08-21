export function createRenderAbortError() {
  return new DOMException('Render operation was canceled', 'AbortError')
}

export function throwIfRenderAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createRenderAbortError()
  }
}

export function abortableRenderPromise<T>(promise: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  throwIfRenderAborted(signal)
  if (!signal) {
    return Promise.resolve(promise)
  }

  return new Promise<T>((resolve, reject) => {
    let cleanup: () => void = () => undefined
    const onAbort = () => {
      cleanup()
      reject(createRenderAbortError())
    }
    cleanup = () => signal.removeEventListener('abort', onAbort)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    Promise.resolve(promise).then((value) => {
      cleanup()
      resolve(value)
    }).catch((reason) => {
      cleanup()
      reject(reason)
    })
  })
}

export function isRenderAbortError(reason: unknown): reason is { readonly name: 'AbortError' } {
  return typeof reason === 'object'
    && reason !== null
    && 'name' in reason
    && reason.name === 'AbortError'
}
