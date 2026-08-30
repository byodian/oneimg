import type {
  ChecklistItem,
  DataTableColumn,
  DataTableRow,
  Density,
  PageFormat,
  RichTextDocument,
} from '@/features/document-core'

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

export interface CanonicalPresentation {
  readonly density: Density
  readonly pageFormat: PageFormat
  readonly templateId: string
  readonly templateVersion: string
  readonly themeId: string
  readonly themeVersion: string
}

export type CanonicalLocalCapability = 'certified' | 'high-fidelity-required' | 'unsupported'

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

export interface RichTextSection {
  readonly content: RichTextDocument
  readonly id: string
  readonly kind: 'rich-text'
}

export interface ChecklistSection {
  readonly id: string
  readonly items: readonly ChecklistItem[]
  readonly kind: 'checklist'
}

export interface DataTableSection {
  readonly columns: readonly DataTableColumn[]
  readonly id: string
  readonly kind: 'data-table'
  readonly rows: readonly DataTableRow[]
}

export interface UnknownBlockSection {
  readonly fallbackText: string
  readonly id: string
  readonly kind: 'unknown-block'
  readonly originalKind: string
  readonly originalVersion?: string
}

export type CanonicalSection =
  | HeroSection
  | FeatureGridSection
  | ChecklistSection
  | DataTableSection
  | MediaSection
  | RichTextSection
  | SummarySection
  | UnknownBlockSection

export interface CanonicalDocument {
  readonly id: string
  readonly sections: readonly CanonicalSection[]
}

export interface CanonicalRenderSnapshot {
  readonly schemaVersion: 1
  readonly snapshotId: string
  readonly rendererRevision: string
  readonly stylePackId: string
  readonly localCapability: CanonicalLocalCapability
  readonly locale: string
  readonly direction: 'ltr' | 'rtl'
  readonly referenceViewport: ReferenceViewport
  readonly fontPack: CanonicalFontPack
  readonly presentation: CanonicalPresentation
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
