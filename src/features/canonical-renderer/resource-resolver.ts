import {
  type CanonicalRenderSnapshot,
  type CanonicalResourceId,
  collectSnapshotResourceIds,
} from './model'
import {
  abortableRenderPromise,
  throwIfRenderAborted,
} from '@/features/rendering/cancellation'

export type RenderTarget = 'preview' | 'local-export'

interface FontResourceMetadata {
  readonly family: string
  readonly style: 'normal'
  readonly weight: string
}

interface UrlResourceSource {
  readonly type: 'url'
  readonly href: string
}

interface BlobResourceSource {
  readonly type: 'blob'
  readonly create: () => Blob
}

export interface BrowserResourceDefinition {
  readonly id: CanonicalResourceId
  readonly kind: 'font' | 'image'
  readonly mimeType: string
  readonly source: UrlResourceSource | BlobResourceSource
  readonly font?: FontResourceMetadata
}

export interface ResolvedResource {
  readonly id: CanonicalResourceId
  readonly kind: BrowserResourceDefinition['kind']
  readonly mimeType: string
  readonly blob: Blob
  readonly objectUrl: string
  readonly byteLength: number
  readonly sha256: string
  readonly font?: FontResourceMetadata
}

export interface ResolvedResourceSet {
  readonly sessionId: string
  readonly target: RenderTarget
  readonly fingerprint: string
  readonly fontFaceCss: string
  readonly fontFamily: string
  readonly fontFallbackIds?: readonly CanonicalResourceId[]
  readonly resources: readonly ResolvedResource[]
  get(resourceId: CanonicalResourceId): ResolvedResource
  release(): void
}

export interface ResourceResolveOptions {
  readonly signal?: AbortSignal
}

export interface ResourceResolverDiagnostics {
  readonly activeObjectUrls: number
  readonly activeSessions: number
  readonly createdObjectUrls: number
  readonly releasedSessions: number
  readonly revokedObjectUrls: number
}

export type ResourceResolverErrorCode = 'resource-load-failed' | 'unresolved-resource'

export class ResourceResolverError extends Error {
  readonly code: ResourceResolverErrorCode
  readonly resourceIds: readonly CanonicalResourceId[]

  constructor(
    code: ResourceResolverErrorCode,
    message: string,
    resourceIds: readonly CanonicalResourceId[],
  ) {
    super(message)
    this.name = 'ResourceResolverError'
    this.code = code
    this.resourceIds = [...resourceIds]
  }
}

export interface ResourceResolver {
  resolve(
    snapshot: CanonicalRenderSnapshot,
    target: RenderTarget,
    options?: ResourceResolveOptions,
  ): Promise<ResolvedResourceSet>
  getDiagnostics(): ResourceResolverDiagnostics
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(blob: Blob) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))
}

async function loadBlob(definition: BrowserResourceDefinition, signal?: AbortSignal) {
  throwIfRenderAborted(signal)

  if (definition.source.type === 'blob') {
    const blob = definition.source.create()
    throwIfRenderAborted(signal)
    return blob
  }

  const response = await fetch(definition.source.href, { cache: 'force-cache', signal })
  if (!response.ok) {
    throw new Error(`Unable to resolve ${definition.id}: HTTP ${response.status}`)
  }

  const bytes = await response.arrayBuffer()
  throwIfRenderAborted(signal)
  return new Blob([bytes], { type: definition.mimeType })
}

function quoteCss(value: string) {
  return JSON.stringify(value)
}

class BrowserResourceResolver implements ResourceResolver {
  private readonly definitions: ReadonlyMap<CanonicalResourceId, BrowserResourceDefinition>
  private generation = 0
  private activeObjectUrls = 0
  private activeSessions = 0
  private createdObjectUrls = 0
  private releasedSessions = 0
  private revokedObjectUrls = 0

  constructor(definitions: readonly BrowserResourceDefinition[]) {
    this.definitions = new Map(definitions.map(definition => [definition.id, definition]))
  }

  async resolve(
    snapshot: CanonicalRenderSnapshot,
    target: RenderTarget,
    options: ResourceResolveOptions = {},
  ): Promise<ResolvedResourceSet> {
    const sessionId = `${snapshot.snapshotId}:${target}:${++this.generation}`
    const requestedIds = collectSnapshotResourceIds(snapshot)
    const objectUrls = new Set<string>()
    const fontFaces = new Set<FontFace>()
    let released = false
    let sessionRegistered = true
    this.activeSessions += 1

    const revokeObjectUrl = (objectUrl: string) => {
      if (!objectUrls.delete(objectUrl)) {
        return
      }
      URL.revokeObjectURL(objectUrl)
      this.activeObjectUrls -= 1
      this.revokedObjectUrls += 1
    }

    const release = () => {
      if (released) {
        return
      }
      released = true
      for (const fontFace of Array.from(fontFaces)) {
        document.fonts.delete(fontFace)
      }
      fontFaces.clear()
      for (const objectUrl of Array.from(objectUrls)) {
        revokeObjectUrl(objectUrl)
      }
      if (sessionRegistered) {
        sessionRegistered = false
        this.activeSessions -= 1
        this.releasedSessions += 1
      }
    }

    const createObjectUrl = (blob: Blob) => {
      throwIfRenderAborted(options.signal)
      const objectUrl = URL.createObjectURL(blob)
      this.createdObjectUrls += 1
      if (released) {
        URL.revokeObjectURL(objectUrl)
        this.revokedObjectUrls += 1
        throw new DOMException(`Resource session ${sessionId} was released`, 'AbortError')
      }
      objectUrls.add(objectUrl)
      this.activeObjectUrls += 1
      return objectUrl
    }

    try {
      const resourceResults = await Promise.allSettled(requestedIds.map(async (resourceId) => {
        let objectUrl: string | undefined
        try {
          throwIfRenderAborted(options.signal)
          const definition = this.definitions.get(resourceId)
          if (!definition) {
            throw new ResourceResolverError(
              'unresolved-resource',
              `No resource definition for ${resourceId}`,
              [resourceId],
            )
          }

          const blob = await loadBlob(definition, options.signal)
          objectUrl = createObjectUrl(blob)
          const hash = await sha256(blob)
          throwIfRenderAborted(options.signal)
          return {
            blob,
            id: definition.id,
            kind: definition.kind,
            mimeType: definition.mimeType,
            objectUrl,
            byteLength: blob.size,
            sha256: hash,
            font: definition.font,
          } satisfies ResolvedResource
        } catch (error) {
          if (objectUrl !== undefined) {
            revokeObjectUrl(objectUrl)
          }
          if (error instanceof ResourceResolverError || (error instanceof DOMException && error.name === 'AbortError')) {
            throw error
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw error
          }
          throw new ResourceResolverError(
            'resource-load-failed',
            error instanceof Error ? error.message : `Unable to resolve ${resourceId}`,
            [resourceId],
          )
        }
      }))
      const rejectedResources = resourceResults.flatMap((result, index) => result.status === 'rejected'
        ? [{ index, reason: result.reason }]
        : [])
      if (rejectedResources.length > 0) {
        const abortReason = rejectedResources.find(({ reason }) => (
          (reason instanceof DOMException && reason.name === 'AbortError')
          || (reason instanceof Error && reason.name === 'AbortError')
        ))
        if (abortReason) {
          throw abortReason.reason
        }
        const resolverErrors = rejectedResources.map(({ reason }) => reason)
          .filter((reason): reason is ResourceResolverError => reason instanceof ResourceResolverError)
        const resourceIds = rejectedResources.map(({ index }) => requestedIds[index]!)
        const error = resolverErrors[0]
        throw new ResourceResolverError(
          resolverErrors.some(reason => reason.code === 'unresolved-resource')
            ? 'unresolved-resource'
            : 'resource-load-failed',
          error?.message ?? 'Unable to resolve canonical resources',
          resourceIds,
        )
      }
      const resources = resourceResults.map((result) => {
        if (result.status === 'rejected') {
          throw result.reason
        }
        return result.value
      })

      const fontFallbackIds: CanonicalResourceId[] = []
      for (const resource of resources) {
        throwIfRenderAborted(options.signal)
        if (!resource.font) {
          continue
        }

        const fontFace = new FontFace(
          resource.font.family,
          `url(${quoteCss(resource.objectUrl)})`,
          {
            style: resource.font.style,
            weight: resource.font.weight,
          },
        )
        try {
          await abortableRenderPromise(fontFace.load(), options.signal)
          throwIfRenderAborted(options.signal)
          document.fonts.add(fontFace)
          fontFaces.add(fontFace)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw error
          }
          fontFallbackIds.push(resource.id)
        }
      }

      const resourceMap = new Map(resources.map(resource => [resource.id, resource]))
      const fontResources = snapshot.fontPack.resourceIds.map((resourceId) => {
        const resource = resourceMap.get(resourceId)
        if (!resource?.font) {
          throw new ResourceResolverError(
            'unresolved-resource',
            `Canonical font resource ${resourceId} did not resolve as a font`,
            [resourceId],
          )
        }
        return resource
      })
      const fontFallbackSet = new Set(fontFallbackIds)
      const loadedFontResources = fontResources.filter(resource => !fontFallbackSet.has(resource.id))
      const fontFamilies = loadedFontResources.map(resource => quoteCss(resource.font!.family))
      if (fontFallbackIds.length > 0 || fontFamilies.length === 0) {
        fontFamilies.push('system-ui', 'sans-serif')
      }
      const fontFamily = fontFamilies.join(', ')
      const fontFaceCss = loadedFontResources.map(resource => String.raw`
@font-face {
  font-family: ${quoteCss(resource.font!.family)};
  font-style: ${resource.font!.style};
  font-weight: ${resource.font!.weight};
  font-display: block;
  src: url(${quoteCss(resource.objectUrl)}) format('woff2-variations');
}`).join('\n')
      const fingerprint = resources
        .map(resource => `${resource.id}:${resource.sha256}`)
        .sort()
        .join('|')

      return {
        sessionId,
        target,
        fingerprint,
        fontFaceCss,
        fontFamily,
        fontFallbackIds,
        resources,
        get(resourceId) {
          const resource = resourceMap.get(resourceId)
          if (!resource) {
            throw new Error(`Resource ${resourceId} is not part of ${sessionId}`)
          }
          return resource
        },
        release,
      }
    } catch (error) {
      release()
      throw error
    }
  }

  getDiagnostics(): ResourceResolverDiagnostics {
    return {
      activeObjectUrls: this.activeObjectUrls,
      activeSessions: this.activeSessions,
      createdObjectUrls: this.createdObjectUrls,
      releasedSessions: this.releasedSessions,
      revokedObjectUrls: this.revokedObjectUrls,
    }
  }
}

export function createBrowserResourceResolver(definitions: readonly BrowserResourceDefinition[]) {
  return new BrowserResourceResolver(definitions)
}
