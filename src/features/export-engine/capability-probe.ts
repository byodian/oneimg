import type { LocalCapabilityProbeObservation } from './preflight'

const PROBE_ID = 'local-svg-foreign-object@3'
const PROBE_TIMEOUT_MS = 2500
const PROBE_TIMEOUT_REASON = '本地 SVG foreignObject 探测超时'
const probeCache = new Map<string, Promise<LocalCapabilityProbeObservation>>()

function probeKey() {
  return `${PROBE_ID}:${globalThis.navigator?.userAgent ?? 'unknown'}`
}

function probeFailure(reason: string): LocalCapabilityProbeObservation {
  return {
    reason,
    status: 'failed',
  }
}

function waitForProbeImage(image: HTMLImageElement, sourceUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error(PROBE_TIMEOUT_REASON))
    }, PROBE_TIMEOUT_MS)

    function cleanup() {
      window.clearTimeout(timeoutId)
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
    }

    function onLoad() {
      cleanup()
      resolve()
    }

    function onError() {
      cleanup()
      reject(new Error('SVG foreignObject image load failed'))
    }

    image.addEventListener('load', onLoad, { once: true })
    image.addEventListener('error', onError, { once: true })
    image.src = sourceUrl
  })
}

function waitForProbeDecode(image: HTMLImageElement) {
  if (typeof image.decode !== 'function') {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error(PROBE_TIMEOUT_REASON))
    }, PROBE_TIMEOUT_MS)

    function cleanup() {
      window.clearTimeout(timeoutId)
    }

    let decodePromise: Promise<void>
    try {
      decodePromise = image.decode()
    } catch (error) {
      cleanup()
      reject(error)
      return
    }
    decodePromise.then(() => {
      cleanup()
      resolve()
    }).catch((error: unknown) => {
      cleanup()
      reject(error)
    })
  })
}

async function runProbe(): Promise<LocalCapabilityProbeObservation> {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') {
    return probeFailure('浏览器缺少 Blob 或 Data URL 能力')
  }
  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return probeFailure('浏览器缺少图片解码或文档能力')
  }

  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2" viewBox="0 0 2 2">
  <foreignObject x="0" y="0" width="2" height="2">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:2px;height:2px;background:#2f64d6"></div>
  </foreignObject>
</svg>`
  try {
    const svgBlob = new Blob([source], { type: 'image/svg+xml' })
    const sourceUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await svgBlob.text())}`
    const image = new Image()
    image.decoding = 'async'
    await waitForProbeImage(image, sourceUrl)
    await waitForProbeDecode(image)
    if (image.naturalWidth < 2 || image.naturalHeight < 2) {
      return probeFailure('SVG foreignObject 未能生成可用的图片尺寸')
    }

    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      return probeFailure('浏览器缺少 Canvas 2D 能力')
    }
    context.drawImage(image, 0, 0)
    const pixel = context.getImageData(0, 0, 1, 1).data
    if ((pixel[3] ?? 0) < 128 || (pixel[2] ?? 0) <= (pixel[0] ?? 0) + 16) {
      return probeFailure('SVG foreignObject 内容未出现在编码像素中')
    }
    const encoded = canvas.toDataURL('image/png')
    if (!encoded.startsWith('data:image/png;base64,')) {
      return probeFailure('浏览器无法编码本地 PNG')
    }
    return { status: 'passed' }
  } catch (error) {
    return probeFailure(error instanceof Error ? error.message : '本地导出能力验证失败')
  }
}

export function probeLocalSvgCapability(): Promise<LocalCapabilityProbeObservation> {
  const key = probeKey()
  const existing = probeCache.get(key)
  if (existing) {
    return existing
  }
  const result = runProbe()
  const cacheEntry = result.then((observation) => {
    if (observation.status === 'failed' && observation.reason === PROBE_TIMEOUT_REASON) {
      probeCache.delete(key)
    }
    return observation
  })
  probeCache.set(key, cacheEntry)
  return cacheEntry
}
