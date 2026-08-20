import type { CanonicalRenderSnapshot } from './model'
import type { ResolvedResourceSet } from './resource-resolver'

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

export interface CanonicalRenderReadyOptions {
  readonly isCurrent?: () => boolean
}

function assertCurrent(options: CanonicalRenderReadyOptions) {
  if (options.isCurrent && !options.isCurrent()) {
    throw new Error('Canonical Render Root readiness became stale')
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
  return getCanonicalGeometry(root)
    .map(geometry => [
      geometry.id,
      geometry.x.toFixed(3),
      geometry.y.toFixed(3),
      geometry.width.toFixed(3),
      geometry.height.toFixed(3),
    ].join(':'))
    .join('|')
}

async function waitForImages(root: HTMLElement, options: CanonicalRenderReadyOptions) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(images.map(async (image) => {
    assertCurrent(options)
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => reject(new Error(`Unable to load ${image.dataset.resourceId ?? image.alt}`)), { once: true })
      })
    }

    if (image.naturalWidth === 0) {
      throw new Error(`Unable to decode ${image.dataset.resourceId ?? image.alt}`)
    }

    await image.decode()
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
  await Promise.all(snapshot.fontPack.supportedWeights.map(weight => (
    document.fonts.load(`${weight} 16px ${resources.fontFamily}`, '所见即所得 Canonical')
  )))
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
        return
      }
    }

    throw new Error('Canonical Render Root did not reach stable geometry')
  } finally {
    mutationObserver.disconnect()
    resizeObserver.disconnect()
  }
}
