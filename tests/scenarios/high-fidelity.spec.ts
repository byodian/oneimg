import UPNG from '@pdf-lib/upng'
import { expect, test } from '@playwright/test'
import { controlledCanonicalSnapshot } from '../../src/features/canonical-renderer/controlled-fixture'
import { collectSnapshotResourceIds } from '../../src/features/canonical-renderer/model'
import { prepareHighFidelityRequest } from '../../src/features/high-fidelity'

function resources() {
  return collectSnapshotResourceIds(controlledCanonicalSnapshot).map(id => ({
    id,
    kind: id.startsWith('font:') ? 'font' as const : 'image' as const,
    blob: new Blob([id], { type: id.startsWith('font:') ? 'font/woff2' : 'image/png' }),
  }))
}

test('prepares only referenced render bytes and freezes the snapshot independently of editing', () => {
  const snapshot = { ...structuredClone(controlledCanonicalSnapshot), theme: { ...controlledCanonicalSnapshot.theme, accent: String(controlledCanonicalSnapshot.theme.accent) } }
  const selected = resources()
  const request = prepareHighFidelityRequest(snapshot, [...selected, {
    id: 'unrelated-original', kind: 'image', blob: new Blob(['EXIF GPS original']),
  }], 2)
  snapshot.theme.accent = '#000000'
  expect(request.snapshot.theme.accent).toBe('#ff5c35')
  expect(Object.isFrozen(request.snapshot.document)).toBe(true)
  expect(request.resources.map(resource => resource.id)).toEqual(selected.map(resource => resource.id))
  expect(request.output).toEqual({ format: 'png', scale: 2 })
})

test('rejects sensitive snapshots and missing or unresolved resources before transfer', () => {
  expect(() => prepareHighFidelityRequest({ ...controlledCanonicalSnapshot, sensitive: true }, resources(), 1)).toThrow('sensitive-local-only')
  expect(() => prepareHighFidelityRequest(controlledCanonicalSnapshot, [], 1)).toThrow('unresolved-resource')
  expect(() => prepareHighFidelityRequest({ ...controlledCanonicalSnapshot, unresolvedResourceIds: ['missing'] }, resources(), 1)).toThrow('unresolved-resource')
})

function deferred<T>() {
  let resolvePromise!: (value: T) => void
  let rejectPromise!: (reason: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

const png = new Blob([UPNG.encode([new Uint8Array(640 * 4).buffer], 640, 1, 0)], { type: 'image/png' })
const encoded = { blob: png, width: 640, height: 1, rendererRevision: 'observed-browser@1' }

// A transport double sits at the provider boundary. Assertions observe only
// the public runner, transferred inputs and the transport's owned lifecycle.
test('requires authorization, deduplicates starts, and retains final proof bytes after cleanup', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  let opens = 0
  let closes = 0
  const runner = createHighFidelityJobRunner({
    async open() {
      opens += 1
      return {
        render: async () => encoded,
        dispose: async () => {
          closes += 1
        },
      }
    },
  })
  const request = prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1)
  expect(() => runner.run(request, { granted: false })).toThrow('authorization-required')
  expect(opens).toBe(0)
  const job = runner.run(request, { granted: true })
  expect(runner.run(request, { granted: true })).toBe(job)
  const result = await job.promise
  expect(result.blob).toBe(png)
  expect(result.fidelity).toBe('proof-required')
  expect(job.getState()).toEqual({ jobId: job.id, status: 'ready', cleanup: 'complete' })
  expect(job.cancel()).toBe(false)
  expect(runner.run(request, { granted: true })).toBe(job)
  expect({ opens, closes }).toEqual({ opens: 1, closes: 1 })
})

test('cancel closes an active browser without waiting for a late render and cannot publish its bytes', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  const rendering = deferred<typeof encoded>()
  const started = deferred<void>()
  let closes = 0
  const runner = createHighFidelityJobRunner({
    async open() {
      return {
        render() {
          started.resolve(); return rendering.promise
        },
        async dispose() {
          closes += 1
        },
      }
    },
  })
  const request = prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1)
  const job = runner.run(request, { granted: true })
  const canceled = expect(job.promise).rejects.toThrow('canceled')
  await started.promise
  expect(job.cancel()).toBe(true)
  expect(job.cancel()).toBe(false)
  await expect.poll(() => closes).toBe(1)
  expect(job.getState().status).toBe('canceled')
  rendering.resolve(encoded)
  await canceled
  expect(job.getState()).toMatchObject({ status: 'canceled', cleanup: 'complete' })
  expect(runner.run(request, { granted: true })).toBe(job)
})

test('disposes a session that finishes opening after cancellation without rendering', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  const opened = deferred<{ render: () => Promise<typeof encoded>, dispose: () => Promise<void> }>()
  const started = deferred<void>()
  let closes = 0
  let renders = 0
  const runner = createHighFidelityJobRunner({
    open() {
      started.resolve(); return opened.promise
    },
  })
  const job = runner.run(prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1), { granted: true })
  const canceled = expect(job.promise).rejects.toThrow('canceled')
  await started.promise
  job.cancel()
  opened.resolve({
    async render() {
      renders += 1; return encoded
    },
    async dispose() {
      closes += 1
    },
  })
  await canceled
  expect({ renders, closes }).toEqual({ renders: 0, closes: 1 })
  expect(job.getState()).toMatchObject({ status: 'canceled', cleanup: 'complete' })
})

test('keeps deletion failure visible and retries cleanup without rerendering or reviving the job', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  let closes = 0
  let renders = 0
  const runner = createHighFidelityJobRunner({
    async open() {
      return {
        async render() {
          renders += 1; return encoded
        },
        async dispose() {
          closes += 1
          if (closes === 1) {
            throw new Error('private filename and https://signed.example/secret')
          }
        },
      }
    },
  })
  const job = runner.run(prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1), { granted: true })
  await expect(job.promise).rejects.toThrow('cleanup-pending')
  expect(job.getState()).toMatchObject({ status: 'failed', cleanup: 'pending', error: 'cleanup-pending' })
  expect(JSON.stringify(job.getState())).not.toMatch(/private|signed|secret/)
  await Promise.all([job.retryCleanup(), job.retryCleanup()])
  expect(job.getState()).toMatchObject({ status: 'failed', cleanup: 'complete' })
  expect({ renders, closes }).toEqual({ renders: 1, closes: 2 })
})

for (const stage of ['open', 'render'] as const) {
  test(`scrubs provider errors at ${stage} and finishes the owned cleanup`, async () => {
    const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
    let closes = 0
    const secret = new Error('Document title /home/private.png https://signed.example/token')
    const runner = createHighFidelityJobRunner({
      async open() {
        if (stage === 'open') {
          throw secret
        }
        return {
          async render() {
            throw secret
          },
          async dispose() {
            closes += 1
          },
        }
      },
    })
    const job = runner.run(prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1), { granted: true })
    await expect(job.promise).rejects.toThrow(/^remote-failed$/)
    expect(job.getState()).toMatchObject({ status: 'failed', cleanup: 'complete', error: 'remote-failed' })
    expect(closes).toBe(stage === 'render' ? 1 : 0)
  })
}

test('owns final bytes and metadata even when the provider reuses its result during disposal', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  const providerResult = { ...encoded }
  const runner = createHighFidelityJobRunner({
    async open() {
      return {
        render: async () => providerResult,
        async dispose() {
          providerResult.blob = new Blob(['discarded'])
          providerResult.width = 0
          providerResult.rendererRevision = 'discarded'
        },
      }
    },
  })
  const job = runner.run(prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1), { granted: true })
  expect(await job.promise).toMatchObject({ ...encoded, fidelity: 'proof-required' })
  expect((await job.promise).blob).toBe(png)
})

for (const invalid of ['png', 'metadata', 'width', 'scale', 'bounded-height'] as const) {
  test(`rejects invalid ${invalid} output and still disposes its session`, async () => {
    const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
    let result = encoded
    let closes = 0
    if (invalid === 'png') {
      result = { ...encoded, blob: new Blob(['not an image'], { type: 'image/png' }) }
    }
    if (invalid === 'metadata') {
      result = { ...encoded, height: 2 }
    }
    if (invalid === 'width') {
      result = {
        ...encoded,
        width: 1,
        blob: new Blob([UPNG.encode([new Uint8Array(4).buffer], 1, 1, 0)], { type: 'image/png' }),
      }
    }
    const snapshot = invalid === 'bounded-height' ? {
      ...controlledCanonicalSnapshot,
      presentation: { ...controlledCanonicalSnapshot.presentation, pageFormat: { kind: 'bounded' as const, preset: 'square', width: 640, height: 640 } },
    } : controlledCanonicalSnapshot
    const runner = createHighFidelityJobRunner({
      async open() {
        return {
          render: async () => result,
          dispose: async () => {
            closes += 1
          },
        }
      },
    })
    const job = runner.run(prepareHighFidelityRequest(snapshot, resources(), invalid === 'scale' ? 2 : 1), { granted: true })
    await expect(job.promise).rejects.toThrow('invalid-result')
    expect(job.getState()).toMatchObject({ status: 'failed', cleanup: 'complete' })
    expect(closes).toBe(1)
  })
}

test('rejects ambiguous resource identity and incorrect resource kinds before execution', () => {
  const selected = resources()
  expect(() => prepareHighFidelityRequest(controlledCanonicalSnapshot, [...selected, selected[0]!], 1)).toThrow('unresolved-resource')
  expect(() => prepareHighFidelityRequest(controlledCanonicalSnapshot, selected.map(resource => ({ ...resource, kind: 'image' })), 1)).toThrow('invalid-request')
  // Runtime boundary checks also apply to callers outside TypeScript.
  // @ts-expect-error deliberately invalid runtime scale
  expect(() => prepareHighFidelityRequest(controlledCanonicalSnapshot, selected, 0)).toThrow('invalid-request')
})

test('rejects structurally forged requests and cancels before allocation', async () => {
  const { createHighFidelityJobRunner } = await import('../../src/features/high-fidelity')
  let opens = 0
  const runner = createHighFidelityJobRunner({
    async open() {
      opens += 1
      return { render: async () => encoded, dispose: async () => undefined }
    },
  })
  const request = prepareHighFidelityRequest(controlledCanonicalSnapshot, resources(), 1)
  expect(() => runner.run({ ...request }, { granted: true })).toThrow('invalid-request')
  const job = runner.run(request, { granted: true })
  job.cancel()
  await expect(job.promise).rejects.toThrow('canceled')
  expect(opens).toBe(0)
  expect(job.getState()).toMatchObject({ status: 'canceled', cleanup: 'complete' })
})
