export type SemanticSliceBoundaryKind = 'block' | 'heading' | 'keep-together' | 'section'

export interface SemanticSliceBoundary {
  readonly endY?: number
  readonly id: string
  readonly kind: SemanticSliceBoundaryKind
  /** The boundary position in the same CSS-pixel coordinate space as the Page. */
  readonly y: number
}

export type SemanticSliceBoundaryReason = SemanticSliceBoundaryKind | 'document-end' | 'visual-fallback'
