import type { CanonicalRenderSnapshot } from './model'
import type { ResolvedResourceSet } from './resource-resolver'
import {
  abortableRenderPromise,
  createRenderAbortError,
  isRenderAbortError,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

function nextAnimationFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export interface CanonicalGeometry {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CanonicalPaginationPage {
  readonly height: number
  readonly index: number
  readonly y: number
}

export interface CanonicalPaginationDiagnostics {
  readonly final: boolean
  readonly pageCount: number
  readonly pages: readonly CanonicalPaginationPage[]
}

export interface CanonicalRenderReadiness {
  readonly fontFallbackIds: readonly string[]
  readonly geometry: readonly CanonicalGeometry[]
  readonly height: number
  readonly overflow: {
    readonly horizontal: boolean
    readonly vertical: boolean
  }
  readonly pagination: CanonicalPaginationDiagnostics
  readonly stableFrames: number
  readonly width: number
}

export type CanonicalRenderReadyErrorCode = 'image-decode-failed' | 'image-load-failed' | 'pagination-not-final'

export class CanonicalRenderReadyError extends Error {
  readonly code: CanonicalRenderReadyErrorCode
  readonly readiness?: CanonicalRenderReadiness
  readonly resourceIds: readonly string[]

  constructor(
    code: CanonicalRenderReadyErrorCode,
    message: string,
    options: { readonly readiness?: CanonicalRenderReadiness; readonly resourceIds?: readonly string[] } = {},
  ) {
    super(message)
    this.name = 'CanonicalRenderReadyError'
    this.code = code
    this.readiness = options.readiness
    this.resourceIds = [...(options.resourceIds ?? [])]
  }
}

export interface CanonicalRenderReadyOptions {
  readonly isCurrent?: () => boolean
  readonly signal?: AbortSignal
  readonly generation?: {
    readonly expected: number
    readonly getCurrent: () => number
  }
}

function assertCurrent(options: CanonicalRenderReadyOptions) {
  throwIfRenderAborted(options.signal)
  if (options.isCurrent && !options.isCurrent()) {
    throw new Error('Canonical Render Root readiness became stale')
  }
  if (options.generation && options.generation.getCurrent() !== options.generation.expected) {
    throw new Error('Canonical Render Root readiness generation became stale')
  }
}

export function getCanonicalGeometry(root: HTMLElement): readonly CanonicalGeometry[] {
  const rootRect = root.getBoundingClientRect()
  return Array.from(root.querySelectorAll<HTMLElement>('[data-block-id], [data-resource-id]'))
    .map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        height: rect.height,
        id: element.dataset.blockId ?? element.dataset.resourceId ?? '',
        width: rect.width,
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
      }
    })
}

function geometrySignature(root: HTMLElement) {
  const rootRect = root.getBoundingClientRect()
  return [
    rootRect.width.toFixed(3),
    rootRect.height.toFixed(3),
    String(root.clientHeight),
    String(root.clientWidth),
    String(root.scrollHeight),
    String(root.scrollWidth),
    root.dataset.paginationState ?? '',
    root.dataset.paginationSnapshotId ?? '',
    root.dataset.paginationDiagnostics ?? '',
    getCanonicalGeometry(root)
      .map(geometry => [
        geometry.id,
        geometry.x.toFixed(3),
        geometry.y.toFixed(3),
        geometry.width.toFixed(3),
        geometry.height.toFixed(3),
      ].join(':'))
      .join('|'),
  ].join(';')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePaginationDiagnostics(value: unknown): CanonicalPaginationDiagnostics | undefined {
  if (!isRecord(value) || typeof value.final !== 'boolean' || typeof value.pageCount !== 'number') {
    return undefined
  }
  if (!Number.isInteger(value.pageCount) || value.pageCount < 1 || !Array.isArray(value.pages)) {
    return undefined
  }

  const pages = value.pages.flatMap((page): CanonicalPaginationPage[] => {
    if (!isRecord(page)
      || typeof page.height !== 'number'
      || typeof page.index !== 'number'
      || typeof page.y !== 'number'
      || !Number.isFinite(page.height)
      || !Number.isInteger(page.index)
      || page.index < 0
      || !Number.isFinite(page.y)
      || page.height <= 0
      || page.y < 0
    ) {
      return []
    }
    return [{
      height: page.height,
      index: page.index,
      y: page.y,
    }]
  })
  if (pages.length !== value.pages.length || pages.length !== value.pageCount) {
    return undefined
  }
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!
    if (page.index !== index) {
      return undefined
    }
    if (index > 0) {
      const previous = pages[index - 1]!
      if (Math.abs(page.y - (previous.y + previous.height)) > 1) {
        return undefined
      }
    } else if (Math.abs(page.y) > 1) {
      return undefined
    }
  }
  return {
    final: value.final,
    pageCount: value.pageCount,
    pages,
  }
}

function measureCanonicalPagination(
  root: HTMLElement,
  snapshot: CanonicalRenderSnapshot,
): CanonicalPaginationDiagnostics {
  const rootRect = root.getBoundingClientRect()
  const contentHeight = Math.max(1, Math.ceil(Math.max(rootRect.height, root.scrollHeight)))
  const pageFormat = snapshot.presentation.pageFormat
  const referencePageHeight = pageFormat.kind === 'bounded'
    ? Math.max(1, Math.ceil(pageFormat.height ?? contentHeight))
    : contentHeight
  const pageCount = pageFormat.kind === 'bounded'
    ? Math.max(1, Math.ceil(contentHeight / referencePageHeight))
    : 1

  return {
    final: pageFormat.kind === 'continuous' || pageCount === 1,
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      height: pageFormat.kind === 'bounded'
        ? Math.min(referencePageHeight, Math.max(1, contentHeight - index * referencePageHeight))
        : contentHeight,
      index,
      y: pageFormat.kind === 'bounded' ? index * referencePageHeight : 0,
    })),
  }
}

/**
 * Publishes the renderer-owned pagination result after the DOM has laid out.
 * A future bounded pagination adapter can replace this protocol with real
 * page slots; Render Ready never treats a missing or pending result as final.
 */
export function publishCanonicalPaginationDiagnostics(root: HTMLElement, snapshot: CanonicalRenderSnapshot) {
  const diagnostics = measureCanonicalPagination(root, snapshot)
  root.dataset.paginationDiagnostics = JSON.stringify(diagnostics)
  root.dataset.paginationSnapshotId = snapshot.snapshotId
  root.dataset.paginationState = 'ready'
}

export function readCanonicalPaginationDiagnostics(
  root: HTMLElement,
  snapshot?: CanonicalRenderSnapshot,
): CanonicalPaginationDiagnostics | undefined {
  if (root.dataset.paginationState !== 'ready') {
    return undefined
  }
  if (snapshot !== undefined && root.dataset.paginationSnapshotId !== snapshot.snapshotId) {
    return undefined
  }
  try {
    const diagnostics = parsePaginationDiagnostics(JSON.parse(root.dataset.paginationDiagnostics ?? ''))
    if (diagnostics === undefined) {
      return undefined
    }

    const rootRect = root.getBoundingClientRect()
    const contentHeight = Math.max(1, Math.ceil(Math.max(rootRect.height, root.scrollHeight)))
    const pageFormat = snapshot?.presentation.pageFormat
    if (pageFormat?.kind === 'continuous' && diagnostics.pageCount !== 1) {
      return undefined
    }
    if (pageFormat?.kind === 'bounded') {
      const referencePageHeight = Math.max(1, Math.ceil(pageFormat.height ?? contentHeight))
      if (diagnostics.pages.some(page => page.height > referencePageHeight + 1)) {
        return undefined
      }
      if (diagnostics.final && diagnostics.pages.at(-1)!.y + diagnostics.pages.at(-1)!.height < contentHeight - 1) {
        return undefined
      }
    }
    if (diagnostics.final && diagnostics.pages.at(-1)!.y + diagnostics.pages.at(-1)!.height < contentHeight - 1) {
      return undefined
    }
    return diagnostics
  } catch {
    return undefined
  }
}

function createReadiness(
  root: HTMLElement,
  snapshot: CanonicalRenderSnapshot,
  resources: ResolvedResourceSet,
  pagination: CanonicalPaginationDiagnostics,
  stableFrames: number,
): CanonicalRenderReadiness {
  const rootRect = root.getBoundingClientRect()
  const width = Math.max(1, Math.ceil(rootRect.width))
  const height = Math.max(1, Math.ceil(Math.max(rootRect.height, root.scrollHeight)))
  const horizontalOverflow = root.scrollWidth > root.clientWidth + 1
  const pageFormat = snapshot.presentation.pageFormat
  const referencePageHeight = pageFormat.kind === 'bounded'
    ? Math.max(1, Math.ceil(pageFormat.height ?? height))
    : height
  const verticalOverflow = pageFormat.kind === 'bounded'
    && height > referencePageHeight + 1
    && !pagination.final

  return {
    fontFallbackIds: [...(resources.fontFallbackIds ?? [])],
    geometry: getCanonicalGeometry(root),
    height,
    overflow: {
      horizontal: horizontalOverflow,
      vertical: verticalOverflow,
    },
    pagination,
    stableFrames,
    width,
  }
}

async function waitForImages(root: HTMLElement, options: CanonicalRenderReadyOptions) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(images.map(async (image) => {
    const resourceId = image.dataset.resourceId ?? image.alt
    assertCurrent(options)
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        function cleanup() {
          image.removeEventListener('load', onLoad)
          image.removeEventListener('error', onError)
          options.signal?.removeEventListener('abort', onAbort)
        }

        function onLoad() {
          cleanup()
          resolve()
        }

        function onError() {
          cleanup()
          reject(new CanonicalRenderReadyError(
            'image-load-failed',
            `Unable to load ${resourceId}`,
            { resourceIds: [resourceId] },
          ))
        }

        function onAbort() {
          cleanup()
          reject(createRenderAbortError())
        }
        image.addEventListener('load', onLoad, { once: true })
        image.addEventListener('error', onError, { once: true })
        options.signal?.addEventListener('abort', onAbort, { once: true })
        if (options.signal?.aborted) {
          onAbort()
        }
      })
    }

    if (image.naturalWidth === 0) {
      throw new CanonicalRenderReadyError(
        'image-decode-failed',
        `Unable to decode ${resourceId}`,
        { resourceIds: [resourceId] },
      )
    }

    try {
      await abortableRenderPromise(image.decode(), options.signal)
    } catch (error) {
      if (isRenderAbortError(error)) {
        throw error
      }
      throw new CanonicalRenderReadyError(
        'image-decode-failed',
        `Unable to decode ${resourceId}`,
        { resourceIds: [resourceId] },
      )
    }
    assertCurrent(options)
  }))
}

/**
 * Waits for the exact browser state that both the visible preview and an
 * inert export session need before geometry or pixels are sampled.
 */
export async function waitForCanonicalRenderReady(
  root: HTMLElement,
  snapshot: CanonicalRenderSnapshot,
  resources: ResolvedResourceSet,
  options: CanonicalRenderReadyOptions = {},
) {
  assertCurrent(options)
  await Promise.all(snapshot.fontPack.supportedWeights.map(weight => abortableRenderPromise(
    document.fonts.load(`${weight} 16px ${resources.fontFamily}`, '所见即所得 Canonical'),
    options.signal,
  )))
  await abortableRenderPromise(document.fonts.ready, options.signal)
  assertCurrent(options)
  await waitForImages(root, options)

  let geometryInvalidated = true
  const mutationObserver = new MutationObserver(() => {
    geometryInvalidated = true
  })
  const resizeObserver = new ResizeObserver(() => {
    geometryInvalidated = true
  })
  mutationObserver.observe(root, { attributes: true, childList: true, subtree: true })
  resizeObserver.observe(root)
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-block-id], [data-resource-id]'))) {
    resizeObserver.observe(element)
  }

  try {
    let lastSignature = ''
    let stableFrames = 0

    for (let frame = 0; frame < 120; frame += 1) {
      await nextAnimationFrame()
      assertCurrent(options)
      const signature = geometrySignature(root)

      if (!geometryInvalidated && signature === lastSignature) {
        stableFrames += 1
      } else {
        stableFrames = 0
      }

      geometryInvalidated = false
      lastSignature = signature
      if (stableFrames >= 2) {
        assertCurrent(options)
        const pagination = readCanonicalPaginationDiagnostics(root, snapshot)
        if (pagination === undefined) {
          stableFrames = 0
          continue
        }
        const readiness = createReadiness(root, snapshot, resources, pagination, stableFrames)
        if (!readiness.pagination.final) {
          throw new CanonicalRenderReadyError(
            'pagination-not-final',
            'Canonical pagination did not reach a final layout',
            { readiness },
          )
        }
        return readiness
      }
    }

    throw new CanonicalRenderReadyError(
      'pagination-not-final',
      'Canonical pagination diagnostics did not reach a valid final state',
    )
  } finally {
    mutationObserver.disconnect()
    resizeObserver.disconnect()
  }
}
