export type CanonicalResourceId = string

export interface ReferenceViewport {
  readonly width: number
}

export interface CanonicalFontPack {
  readonly id: string
  readonly resourceIds: readonly CanonicalResourceId[]
  readonly supportedWeights: readonly number[]
}

export interface CanonicalTheme {
  readonly accent: string
  readonly background: string
  readonly foreground: string
  readonly muted: string
  readonly surface: string
}

export interface HeroSection {
  readonly id: string
  readonly kind: 'hero'
  readonly eyebrow: string
  readonly title: string
  readonly body: string
}

export interface FeatureGridSection {
  readonly id: string
  readonly kind: 'feature-grid'
  readonly label: string
  readonly items: readonly {
    readonly id: string
    readonly title: string
    readonly body: string
  }[]
}

export interface MediaSection {
  readonly id: string
  readonly kind: 'media'
  readonly label: string
  readonly title: string
  readonly body: string
  readonly image: {
    readonly resourceId: CanonicalResourceId
    readonly alt: string
  }
}

export interface SummarySection {
  readonly id: string
  readonly kind: 'summary'
  readonly title: string
  readonly body: string
  readonly facts: readonly string[]
}

export type CanonicalSection =
  | HeroSection
  | FeatureGridSection
  | MediaSection
  | SummarySection

export interface CanonicalDocument {
  readonly id: string
  readonly sections: readonly CanonicalSection[]
}

export interface CanonicalRenderSnapshot {
  readonly schemaVersion: 1
  readonly snapshotId: string
  readonly rendererRevision: string
  readonly stylePackId: string
  readonly locale: string
  readonly direction: 'ltr' | 'rtl'
  readonly referenceViewport: ReferenceViewport
  readonly fontPack: CanonicalFontPack
  readonly theme: CanonicalTheme
  readonly document: CanonicalDocument
}

export function collectSnapshotResourceIds(snapshot: CanonicalRenderSnapshot) {
  const resourceIds = new Set<CanonicalResourceId>(snapshot.fontPack.resourceIds)

  for (const section of snapshot.document.sections) {
    if (section.kind === 'media') {
      resourceIds.add(section.image.resourceId)
    }
  }

  return Array.from(resourceIds)
}
