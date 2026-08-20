import {
  type CanonicalRenderSnapshot,
  type CanonicalResourceId,
  collectSnapshotResourceIds,
} from './model'

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
  readonly resources: readonly ResolvedResource[]
  get(resourceId: CanonicalResourceId): ResolvedResource
  release(): void
}

export interface ResourceResolver {
  resolve(snapshot: CanonicalRenderSnapshot, target: RenderTarget): Promise<ResolvedResourceSet>
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(blob: Blob) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))
}

async function loadBlob(definition: BrowserResourceDefinition) {
  if (definition.source.type === 'blob') {
    return definition.source.create()
  }

  const response = await fetch(definition.source.href, { cache: 'force-cache' })
  if (!response.ok) {
    throw new Error(`Unable to resolve ${definition.id}: HTTP ${response.status}`)
  }

  return new Blob([await response.arrayBuffer()], { type: definition.mimeType })
}

function quoteCss(value: string) {
  return JSON.stringify(value)
}

class BrowserResourceResolver implements ResourceResolver {
  private readonly definitions: ReadonlyMap<CanonicalResourceId, BrowserResourceDefinition>
  private generation = 0

  constructor(definitions: readonly BrowserResourceDefinition[]) {
    this.definitions = new Map(definitions.map(definition => [definition.id, definition]))
  }

  async resolve(snapshot: CanonicalRenderSnapshot, target: RenderTarget): Promise<ResolvedResourceSet> {
    const sessionId = `${snapshot.snapshotId}:${target}:${++this.generation}`
    const requestedIds = collectSnapshotResourceIds(snapshot)
    const objectUrls: string[] = []
    const fontFaces: FontFace[] = []

    try {
      const resources = await Promise.all(requestedIds.map(async (resourceId) => {
        const definition = this.definitions.get(resourceId)
        if (!definition) {
          throw new Error(`No resource definition for ${resourceId}`)
        }

        const blob = await loadBlob(definition)
        const objectUrl = URL.createObjectURL(blob)
        objectUrls.push(objectUrl)

        return {
          blob,
          id: definition.id,
          kind: definition.kind,
          mimeType: definition.mimeType,
          objectUrl,
          byteLength: blob.size,
          sha256: await sha256(blob),
          font: definition.font,
        } satisfies ResolvedResource
      }))

      for (const resource of resources) {
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
        await fontFace.load()
        document.fonts.add(fontFace)
        fontFaces.push(fontFace)
      }

      const resourceMap = new Map(resources.map(resource => [resource.id, resource]))
      const fontResources = snapshot.fontPack.resourceIds.map((resourceId) => {
        const resource = resourceMap.get(resourceId)
        if (!resource?.font) {
          throw new Error(`Canonical font resource ${resourceId} did not resolve as a font`)
        }
        return resource
      })
      const fontFamily = fontResources.map(resource => quoteCss(resource.font!.family)).join(', ')
      const fontFaceCss = fontResources.map(resource => String.raw`
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

      let released = false

      return {
        sessionId,
        target,
        fingerprint,
        fontFaceCss,
        fontFamily,
        resources,
        get(resourceId) {
          const resource = resourceMap.get(resourceId)
          if (!resource) {
            throw new Error(`Resource ${resourceId} is not part of ${sessionId}`)
          }
          return resource
        },
        release() {
          if (released) {
            return
          }
          released = true
          for (const fontFace of fontFaces) {
            document.fonts.delete(fontFace)
          }
          for (const objectUrl of objectUrls) {
            URL.revokeObjectURL(objectUrl)
          }
        },
      }
    } catch (error) {
      for (const fontFace of fontFaces) {
        document.fonts.delete(fontFace)
      }
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl)
      }
      throw error
    }
  }
}

export function createBrowserResourceResolver(definitions: readonly BrowserResourceDefinition[]) {
  return new BrowserResourceResolver(definitions)
}
