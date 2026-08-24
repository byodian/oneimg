export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export type PageFormatKind = 'bounded' | 'continuous'
export type Density = 'comfortable' | 'compact' | 'standard'

export interface PageFormat {
  readonly height?: number
  readonly kind: PageFormatKind
  readonly preset: string
  readonly width: number
}

export interface DocumentPresentation {
  readonly density: Density
  readonly fontPackId: string
  readonly pageFormat: PageFormat
  readonly rendererRevision: string
  readonly sceneId: string
  readonly sceneVersion: string
  readonly templateId: string
  readonly templateVersion: string
  readonly themeId: string
  readonly themeVersion: string
}

export interface Page {
  readonly blocks: readonly Block[]
  readonly format: PageFormat
  readonly id: string
}

export type RichTextMark =
  | { readonly type: 'bold' }
  | { readonly type: 'code' }
  | { readonly type: 'italic' }
  | { readonly type: 'link'; readonly href: string }
  | { readonly type: 'underline' }

export interface RichTextNode {
  readonly children?: readonly RichTextNode[]
  readonly level?: 1 | 2 | 3
  readonly marks?: readonly RichTextMark[]
  readonly text?: string
  readonly type: 'blockquote' | 'bullet-list' | 'heading' | 'list-item' | 'ordered-list' | 'paragraph'
}

export interface RichTextDocument {
  readonly children: readonly RichTextNode[]
  readonly type: 'doc'
}

export interface RichTextBlock {
  readonly content: RichTextDocument
  readonly id: string
  readonly kind: 'rich-text'
  readonly version: 1
}

export interface UnknownBlock {
  readonly id: string
  readonly kind: 'unknown'
  readonly originalKind: string
  readonly originalVersion?: string
  readonly raw: { readonly [key: string]: JsonValue }
  readonly version: 1
}

export type Block = RichTextBlock | UnknownBlock

export interface DocumentRevision {
  readonly blockVersion: 'block-catalog@1'
  readonly documentName: string
  readonly id: string
  readonly modelVersion: 'document@1'
  readonly pages: readonly Page[]
  readonly presentation: DocumentPresentation
  readonly revision: number
  readonly schema: 'oneimg-document@1'
}
