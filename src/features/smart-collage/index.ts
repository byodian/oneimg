import type { MediaArrangement } from '@/features/document-core'

export type ResolvedMediaArrangement = Exclude<MediaArrangement, 'auto'>

export type SmartCollageLayoutRole =
  | 'balanced-wide'
  | 'grid'
  | 'hero'
  | 'margin-primary'
  | 'margin-secondary'
  | 'sequence'
  | 'single'

export type SmartCollageLayoutReason =
  | 'balanced-count'
  | 'featured-intent'
  | 'portrait-set'
  | 'single-image'

export interface SmartCollageItemLayout {
  readonly itemId: string
  readonly role: SmartCollageLayoutRole
}

export interface SmartCollageLayout {
  readonly columns: 1 | 2
  readonly items: readonly SmartCollageItemLayout[]
  readonly reason: SmartCollageLayoutReason
  readonly requestedArrangement: MediaArrangement
  readonly resolvedArrangement: ResolvedMediaArrangement
}

export interface SmartCollageItemInput {
  readonly featured: boolean
  readonly id: string
  readonly intrinsicDimensions?: {
    readonly height: number
    readonly width: number
  }
}

const PORTRAIT_RATIO_LIMIT = 0.82
const MAX_PORTRAIT_ALBUM_ITEMS = 4
const MAX_FEATURED_ITEMS = 4

function itemAspectRatio(item: SmartCollageItemInput) {
  const width = item.intrinsicDimensions?.width
  const height = item.intrinsicDimensions?.height
  if (width === undefined || height === undefined || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1
  }
  return width / height
}

function resolveAutoArrangement(items: readonly SmartCollageItemInput[]) {
  if (items.length === 1) {
    return {
      reason: 'single-image' as const,
      resolvedArrangement: 'sequence' as const,
    }
  }

  const portraitCount = items.filter(item => itemAspectRatio(item) <= PORTRAIT_RATIO_LIMIT).length
  if (items.length <= MAX_PORTRAIT_ALBUM_ITEMS && portraitCount === items.length) {
    return {
      reason: 'portrait-set' as const,
      resolvedArrangement: 'margin-album' as const,
    }
  }

  if (items.length <= MAX_FEATURED_ITEMS && items.some(item => item.featured)) {
    return {
      reason: 'featured-intent' as const,
      resolvedArrangement: 'featured' as const,
    }
  }

  return {
    reason: 'balanced-count' as const,
    resolvedArrangement: 'balanced' as const,
  }
}

function getFeaturedItemId(items: readonly SmartCollageItemInput[]) {
  return items.find(item => item.featured)?.id ?? items[0]?.id
}

function resolveItemLayouts(
  items: readonly SmartCollageItemInput[],
  resolvedArrangement: ResolvedMediaArrangement,
  featuredItemId: string | undefined,
) {
  return items.map((item, index): SmartCollageItemLayout => {
    if (items.length === 1) {
      return { itemId: item.id, role: 'single' }
    }
    if (resolvedArrangement === 'sequence') {
      return { itemId: item.id, role: 'sequence' }
    }
    if (resolvedArrangement === 'featured') {
      return {
        itemId: item.id,
        role: item.id === featuredItemId ? 'hero' : 'grid',
      }
    }
    if (resolvedArrangement === 'margin-album') {
      return {
        itemId: item.id,
        role: index === 0 ? 'margin-primary' : 'margin-secondary',
      }
    }
    return {
      itemId: item.id,
      role: items.length >= 3 && index === items.length - 1 && items.length % 2 === 1
        ? 'balanced-wide'
        : 'grid',
    }
  })
}

export function resolveSmartCollageLayout(
  items: readonly SmartCollageItemInput[],
  arrangement: MediaArrangement,
): SmartCollageLayout {
  if (items.length === 0) {
    throw new Error('Smart Collage requires at least one Media Item')
  }

  const autoResolution = arrangement === 'auto'
    ? resolveAutoArrangement(items)
    : {
        reason: arrangement === 'featured' ? 'featured-intent' as const : 'balanced-count' as const,
        resolvedArrangement: arrangement,
      }
  const resolvedArrangement = autoResolution.resolvedArrangement
  const columns = resolvedArrangement === 'sequence' || items.length === 1 ? 1 : 2
  const featuredItemId = resolvedArrangement === 'featured' ? getFeaturedItemId(items) : undefined

  return {
    columns,
    items: resolveItemLayouts(items, resolvedArrangement, featuredItemId),
    reason: autoResolution.reason,
    requestedArrangement: arrangement,
    resolvedArrangement,
  }
}
