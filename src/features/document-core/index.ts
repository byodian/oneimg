import type {
  Block,
  BlockCatalogVersion,
  ChecklistBlock,
  ChecklistItem,
  DataTableBlock,
  DataTableColumn,
  DataTableRow,
  DocumentPresentation,
  DocumentRevision,
  JsonValue,
  MediaArrangement,
  MediaFit,
  MediaGroupBlock,
  MediaItem,
  MediaRotation,
  NormalizedPoint,
  Page,
  PageFormat,
  RichTextBlock,
  RichTextDocument,
  RichTextMark,
  RichTextNode,
  UnknownBlock,
} from './model'

export * from './model'

const DOCUMENT_SCHEMA = 'oneimg-document@1' as const
const DOCUMENT_MODEL_VERSION = 'document@1' as const
const LEGACY_BLOCK_CATALOG_VERSION = 'block-catalog@1' as const
const BLOCK_CATALOG_VERSION = 'block-catalog@2' as const
const CURRENT_RENDERER_REVISION = 'canonical-renderer@3' as const

export const DEFAULT_DOCUMENT_PRESENTATION: DocumentPresentation = {
  density: 'standard',
  fontPackId: 'noto-sans-sc-variable@5.3.0-subset-117-119',
  pageFormat: {
    kind: 'continuous',
    preset: 'long-image',
    width: 640,
  },
  rendererRevision: CURRENT_RENDERER_REVISION,
  sceneId: 'general-long-image',
  sceneVersion: 'general-long-image@1',
  templateId: 'clear-reading',
  templateVersion: 'clear-reading@1',
  themeId: 'clear-paper',
  themeVersion: 'clear-paper@1',
}

export type DocumentCoreErrorCode =
  | 'duplicate-id'
  | 'invalid-block'
  | 'invalid-document'
  | 'invalid-intention'
  | 'invalid-page'
  | 'not-found'
  | 'stale-revision'

export class DocumentCoreError extends Error {
  readonly code: DocumentCoreErrorCode

  constructor(code: DocumentCoreErrorCode, message: string) {
    super(message)
    this.name = 'DocumentCoreError'
    this.code = code
  }
}

export type DocumentIdKind = 'block' | 'transaction'
export type DocumentIdFactory = (kind: DocumentIdKind, hint?: string) => string

export interface SelectionHint {
  readonly blockId?: string
  readonly pageId?: string
}

interface IntentBase {
  readonly selection?: SelectionHint
}

export interface InsertBlocksIntent extends IntentBase {
  readonly blocks: readonly Block[]
  readonly index?: number
  readonly pageId: string
  readonly type: 'insert-blocks'
}

export interface InsertBlockIntent extends IntentBase {
  readonly block: Block
  readonly index?: number
  readonly pageId: string
  readonly type: 'insert-block'
}

export interface ReplaceBlockIntent extends IntentBase {
  readonly block: Block
  readonly blockId: string
  readonly type: 'replace-block'
}

export interface RemoveBlockIntent extends IntentBase {
  readonly blockId: string
  readonly type: 'remove-block'
}

export interface MoveBlockIntent extends IntentBase {
  readonly blockId: string
  readonly index: number
  readonly pageId: string
  readonly type: 'move-block'
}

export interface SetPresentationIntent extends IntentBase {
  readonly presentation: DocumentPresentation
  readonly type: 'set-presentation'
}

export interface SetDocumentNameIntent extends IntentBase {
  readonly documentName: string
  readonly type: 'set-document-name'
}

export type MediaItemChanges = Partial<Pick<MediaItem, 'alternativeText' | 'assetId' | 'caption' | 'featured' | 'fit' | 'focalPoint' | 'rotation' | 'zoom'>>

export interface UpdateMediaItemIntent extends IntentBase {
  readonly blockId: string
  readonly changes: MediaItemChanges
  readonly itemId: string
  readonly type: 'update-media-item'
}

export type MediaGroupChanges = Partial<Pick<MediaGroupBlock, 'arrangement' | 'caption'>>

export interface UpdateMediaGroupIntent extends IntentBase {
  readonly blockId: string
  readonly changes: MediaGroupChanges
  readonly type: 'update-media-group'
}

export interface SetMediaGroupFeaturedIntent extends IntentBase {
  readonly blockId: string
  readonly itemId: string
  readonly type: 'set-media-group-featured'
}

export interface RemoveMediaItemIntent extends IntentBase {
  readonly blockId: string
  readonly itemId: string
  readonly type: 'remove-media-item'
}

export interface MoveMediaItemIntent extends IntentBase {
  readonly blockId: string
  readonly index: number
  readonly itemId: string
  readonly type: 'move-media-item'
}

export type DocumentIntent =
  | InsertBlockIntent
  | InsertBlocksIntent
  | MoveBlockIntent
  | RemoveBlockIntent
  | ReplaceBlockIntent
  | RemoveMediaItemIntent
  | SetDocumentNameIntent
  | SetMediaGroupFeaturedIntent
  | SetPresentationIntent
  | UpdateMediaGroupIntent
  | UpdateMediaItemIntent
  | MoveMediaItemIntent

export interface EditTransaction {
  readonly documentId: string
  readonly id: string
  readonly intentType: DocumentIntent['type'] | 'import' | 'redo' | 'undo'
  readonly resultRevision: number
  readonly selection?: SelectionHint
  readonly sourceRevision: number
}

export interface CommitSuccess {
  readonly revision: DocumentRevision
  readonly status: 'committed'
  readonly transaction: EditTransaction
}

export interface CommitRejection {
  readonly code: DocumentCoreErrorCode
  readonly message: string
  readonly revision: DocumentRevision
  readonly status: 'rejected'
}

export type DocumentCommitResult = CommitRejection | CommitSuccess

export interface HistoryNoop {
  readonly revision: DocumentRevision
  readonly status: 'noop'
}

export type DocumentHistoryResult = CommitSuccess | HistoryNoop | CommitRejection

export interface DocumentSessionOptions {
  readonly createId?: DocumentIdFactory
  readonly maxHistoryEntries?: number
}

export interface DocumentCommitOptions {
  readonly expectedRevision?: number
}

export interface DocumentSession {
  readonly canRedo: () => boolean
  readonly canUndo: () => boolean
  readonly commit: (intent: DocumentIntent, options?: DocumentCommitOptions) => DocumentCommitResult
  readonly getRevision: () => DocumentRevision
  readonly redo: (options?: DocumentCommitOptions) => DocumentHistoryResult
  readonly serialize: () => string
  readonly undo: (options?: DocumentCommitOptions) => DocumentHistoryResult
}

export interface CreateDocumentRevisionOptions {
  readonly documentId: string
  readonly documentName?: string
  readonly pageId?: string
  readonly presentation?: DocumentPresentation
}

export function createUntouchedDocumentRevision(
  options: CreateDocumentRevisionOptions,
): DocumentRevision {
  const pageId = options.pageId ?? `${options.documentId}:page-1`
  const presentation = cloneValue(options.presentation ?? DEFAULT_DOCUMENT_PRESENTATION)
  return freezeRevision({
    blockVersion: BLOCK_CATALOG_VERSION,
    documentName: options.documentName ?? '',
    id: options.documentId,
    modelVersion: DOCUMENT_MODEL_VERSION,
    pages: [{
      blocks: [],
      format: cloneValue(presentation.pageFormat),
      id: pageId,
    }],
    presentation,
    revision: 1,
    schema: DOCUMENT_SCHEMA,
  })
}

export function createImportedDocumentRevision(
  sourceRevision: DocumentRevision,
  documentId: string,
): DocumentRevision {
  assertNonEmptyString(documentId, 'Imported Document id')
  return freezeRevision({
    ...cloneValue(sourceRevision),
    id: documentId,
    revision: 1,
  })
}

export function createImportedDocumentTransaction(documentId: string): EditTransaction {
  assertNonEmptyString(documentId, 'Imported Document id')
  return freezeDeep({
    documentId,
    id: defaultIdFactory('transaction', `import-${documentId}`),
    intentType: 'import' as const,
    resultRevision: 1,
    sourceRevision: 0,
  })
}

export function createRichTextBlock(
  id: string,
  content: RichTextDocument,
): RichTextBlock {
  const block = {
    content: cloneValue(content),
    id,
    kind: 'rich-text' as const,
    version: 1 as const,
  }
  validateBlock(block)
  return freezeDeep(block)
}

export function createChecklistBlock(
  id: string,
  items: readonly ChecklistItem[],
): ChecklistBlock {
  const block = {
    id,
    items: cloneValue(items),
    kind: 'checklist' as const,
    version: 1 as const,
  }
  validateBlock(block)
  return freezeDeep(block)
}

export function createDataTableBlock(
  id: string,
  columns: readonly DataTableColumn[],
  rows: readonly DataTableRow[],
): DataTableBlock {
  const block = {
    columns: cloneValue(columns),
    id,
    kind: 'data-table' as const,
    rows: cloneValue(rows),
    version: 1 as const,
  }
  validateBlock(block)
  return freezeDeep(block)
}

export interface CreateMediaItemOptions {
  readonly alternativeText?: string
  readonly assetId: string
  readonly caption?: string
  readonly featured?: boolean
  readonly fit?: MediaFit
  readonly focalPoint?: NormalizedPoint
  readonly id: string
  readonly rotation?: MediaRotation
  readonly zoom?: number
}

export function createMediaItem(options: CreateMediaItemOptions): MediaItem {
  const item = {
    alternativeText: options.alternativeText,
    assetId: options.assetId,
    caption: options.caption,
    featured: options.featured ?? false,
    fit: options.fit ?? 'cover',
    focalPoint: cloneValue(options.focalPoint ?? { x: 0.5, y: 0.5 }),
    id: options.id,
    rotation: options.rotation ?? 0,
    zoom: options.zoom ?? 1,
  }
  const normalized = removeUndefinedProperties(item)
  validateMediaItem(normalized)
  return freezeDeep(normalized)
}

export interface CreateMediaGroupBlockOptions {
  readonly arrangement?: MediaArrangement
  readonly caption?: string
  readonly id: string
  readonly items: readonly MediaItem[]
}

export function createMediaGroupBlock(options: CreateMediaGroupBlockOptions): MediaGroupBlock {
  const block = {
    arrangement: options.arrangement ?? 'auto',
    caption: options.caption,
    id: options.id,
    items: cloneValue(options.items),
    kind: 'media-group' as const,
    version: 1 as const,
  }
  const normalized = removeUndefinedProperties(block)
  validateBlock(normalized)
  return freezeDeep(normalized)
}

export interface CreateUnknownBlockOptions {
  readonly id: string
  readonly originalKind: string
  readonly originalVersion?: string
  readonly raw: { readonly [key: string]: JsonValue }
}

export function createUnknownBlock(options: CreateUnknownBlockOptions): UnknownBlock {
  const block = {
    id: options.id,
    kind: 'unknown' as const,
    originalKind: options.originalKind,
    ...(options.originalVersion === undefined ? {} : { originalVersion: options.originalVersion }),
    raw: cloneValue(options.raw),
    version: 1 as const,
  }
  validateBlock(block)
  return freezeDeep(block)
}

export function validateDocumentRevision(value: unknown): DocumentRevision {
  if (!isRecord(value)) {
    throw new DocumentCoreError('invalid-document', 'Document revision must be an object')
  }
  if (value.schema !== DOCUMENT_SCHEMA || value.modelVersion !== DOCUMENT_MODEL_VERSION) {
    throw new DocumentCoreError('invalid-document', 'Document revision uses an unsupported schema')
  }
  if (value.blockVersion !== BLOCK_CATALOG_VERSION && value.blockVersion !== LEGACY_BLOCK_CATALOG_VERSION) {
    throw new DocumentCoreError('invalid-document', 'Document revision uses an unsupported Block Catalog')
  }
  assertNonEmptyString(value.id, 'Document id')
  if (typeof value.documentName !== 'string') {
    throw new DocumentCoreError('invalid-document', 'Document name must be a string')
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
    throw new DocumentCoreError('invalid-document', 'Document revision must be a positive integer')
  }
  validatePresentation(value.presentation)
  if (!Array.isArray(value.pages) || value.pages.length === 0) {
    throw new DocumentCoreError('invalid-document', 'Document must contain at least one Page')
  }

  const pageIds = new Set<string>()
  const blockIds = new Set<string>()
  for (const page of value.pages) {
    validatePage(page)
    if (pageIds.has(page.id)) {
      throw new DocumentCoreError('duplicate-id', `Page id ${page.id} is repeated`)
    }
    pageIds.add(page.id)
    for (const block of page.blocks) {
      validateBlock(block, value.blockVersion)
      if (blockIds.has(block.id)) {
        throw new DocumentCoreError('duplicate-id', `Block id ${block.id} is repeated`)
      }
      blockIds.add(block.id)
    }
  }
  return value as unknown as DocumentRevision
}

export function serializeDocumentRevision(revision: DocumentRevision): string {
  validateDocumentRevision(revision)
  const normalized = upgradeDocumentRevision(revision)
  validateDocumentRevision(normalized)
  return stableStringify(normalized)
}

export function isMeaningfulDocumentRevision(revision: DocumentRevision): boolean {
  validateDocumentRevision(revision)
  return revision.pages.some(page => page.blocks.some((block) => {
    if (block.kind === 'unknown') {
      return true
    }
    if (block.kind === 'checklist') {
      return block.items.some(item => item.text.trim().length > 0)
    }
    if (block.kind === 'data-table') {
      return block.columns.some(column => column.label.trim().length > 0)
        || block.rows.some(row => row.cells.some(cell => cell.trim().length > 0))
    }
    if (block.kind === 'media-group') {
      return block.items.length > 0
    }
    return richTextHasMeaningfulText(block.content)
  }))
}

export function deserializeDocumentRevision(serialized: string): DocumentRevision {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized) as unknown
  } catch {
    throw new DocumentCoreError('invalid-document', 'Document revision is not valid JSON')
  }
  validateDocumentRevision(parsed)
  return freezeRevision(parsed as DocumentRevision)
}

export function createDocumentSession(
  initialRevision: DocumentRevision,
  options: DocumentSessionOptions = {},
): DocumentSession {
  let current = freezeRevision(initialRevision)
  const past: DocumentRevision[] = []
  const future: DocumentRevision[] = []
  const maxHistoryEntries = Math.max(1, Math.floor(options.maxHistoryEntries ?? 100))
  const createId = options.createId ?? defaultIdFactory

  const pushHistory = (history: DocumentRevision[], revision: DocumentRevision) => {
    history.push(revision)
    while (history.length > maxHistoryEntries) {
      history.shift()
    }
  }

  const rejection = (code: DocumentCoreErrorCode, message: string): CommitRejection => ({
    code,
    message,
    revision: current,
    status: 'rejected',
  })

  const createTransaction = (
    sourceRevision: number,
    resultRevision: number,
    intentType: EditTransaction['intentType'],
    selection?: SelectionHint,
  ): EditTransaction => freezeDeep({
    documentId: current.id,
    id: createId('transaction', `${sourceRevision}-${resultRevision}-${intentType}`),
    intentType,
    resultRevision,
    ...(selection === undefined ? {} : { selection: cloneValue(selection) }),
    sourceRevision,
  })

  const commitRevision = (
    nextContent: DocumentRevision,
    intentType: EditTransaction['intentType'],
    selection?: SelectionHint,
  ): CommitSuccess => {
    const sourceRevision = current.revision
    const next = freezeRevision({
      ...cloneValue(nextContent),
      id: current.id,
      revision: sourceRevision + 1,
    })
    pushHistory(past, current)
    future.length = 0
    current = next
    return {
      revision: current,
      status: 'committed',
      transaction: createTransaction(sourceRevision, current.revision, intentType, selection),
    }
  }

  const expectedRevisionMatches = (optionsForCommit?: DocumentCommitOptions) => {
    const expectedRevision = optionsForCommit?.expectedRevision
    return expectedRevision === undefined || expectedRevision === current.revision
  }

  const commit = (
    intent: DocumentIntent,
    optionsForCommit: DocumentCommitOptions = {},
  ): DocumentCommitResult => {
    if (!expectedRevisionMatches(optionsForCommit)) {
      return rejection(
        'stale-revision',
        `Expected revision ${optionsForCommit.expectedRevision}, current revision is ${current.revision}`,
      )
    }
    try {
      const next = applyIntent(current, intent)
      return commitRevision(next, intent.type, intent.selection)
    } catch (error) {
      if (error instanceof DocumentCoreError) {
        return rejection(error.code, error.message)
      }
      throw error
    }
  }

  const commitRevisionWithoutHistory = (
    target: DocumentRevision,
    intentType: 'redo' | 'undo',
  ): CommitSuccess => {
    const sourceRevision = current.revision
    current = freezeRevision({
      ...cloneValue(target),
      id: current.id,
      revision: sourceRevision + 1,
    })
    return {
      revision: current,
      status: 'committed',
      transaction: createTransaction(sourceRevision, current.revision, intentType),
    }
  }

  const moveHistory = (
    direction: 'redo' | 'undo',
    optionsForCommit: DocumentCommitOptions = {},
  ): DocumentHistoryResult => {
    if (!expectedRevisionMatches(optionsForCommit)) {
      return rejection(
        'stale-revision',
        `Expected revision ${optionsForCommit.expectedRevision}, current revision is ${current.revision}`,
      )
    }
    const source = direction === 'undo' ? past : future
    const destination = direction === 'undo' ? future : past
    const target = source.pop()
    if (!target) {
      return { revision: current, status: 'noop' }
    }
    pushHistory(destination, current)
    const result = commitRevisionWithoutHistory(target, direction)
    return result
  }

  return {
    canRedo: () => future.length > 0,
    canUndo: () => past.length > 0,
    commit,
    getRevision: () => current,
    redo: optionsForCommit => moveHistory('redo', optionsForCommit),
    serialize: () => serializeDocumentRevision(current),
    undo: optionsForCommit => moveHistory('undo', optionsForCommit),
  }
}

function applyIntent(current: DocumentRevision, intent: DocumentIntent): DocumentRevision {
  if (!isRecord(intent) || typeof intent.type !== 'string') {
    throw new DocumentCoreError('invalid-intention', 'Editing intention must declare a type')
  }
  const next = cloneValue(current)
  switch (intent.type) {
    case 'insert-block':
      return applyInsertBlocks(next, {
        blocks: [intent.block],
        index: intent.index,
        pageId: intent.pageId,
      })
    case 'insert-blocks':
      return applyInsertBlocks(next, intent)
    case 'replace-block':
      return applyReplaceBlock(next, intent)
    case 'remove-block':
      return applyRemoveBlock(next, intent.blockId)
    case 'move-block':
      return applyMoveBlock(next, intent)
    case 'move-media-item':
      return applyMoveMediaItem(next, intent)
    case 'set-presentation':
      validatePresentation(intent.presentation)
      return {
        ...next,
        pages: next.pages.map(page => ({
          ...page,
          format: cloneValue(intent.presentation.pageFormat),
        })),
        presentation: cloneValue(intent.presentation),
      }
    case 'set-document-name':
      if (typeof intent.documentName !== 'string') {
        throw new DocumentCoreError('invalid-intention', 'Document name must be a string')
      }
      return { ...next, documentName: intent.documentName }
    case 'set-media-group-featured':
      return applySetMediaGroupFeatured(next, intent)
    case 'update-media-item':
      return applyUpdateMediaItem(next, intent)
    case 'update-media-group':
      return applyUpdateMediaGroup(next, intent)
    case 'remove-media-item':
      return applyRemoveMediaItem(next, intent)
    default:
      return assertNever(intent)
  }
}

function applyInsertBlocks(
  current: DocumentRevision,
  intent: Pick<InsertBlocksIntent, 'blocks' | 'index' | 'pageId'>,
): DocumentRevision {
  const pageIndex = current.pages.findIndex(page => page.id === intent.pageId)
  if (pageIndex < 0) {
    throw new DocumentCoreError('not-found', `Page ${intent.pageId} was not found`)
  }
  if (intent.blocks.length === 0) {
    throw new DocumentCoreError('invalid-intention', 'At least one Block is required')
  }
  const existingBlockIds = new Set(current.pages.flatMap(page => page.blocks.map(block => block.id)))
  const incomingIds = new Set<string>()
  for (const block of intent.blocks) {
    validateBlock(block)
    if (existingBlockIds.has(block.id) || incomingIds.has(block.id)) {
      throw new DocumentCoreError('duplicate-id', `Block id ${block.id} is already in the Document`)
    }
    incomingIds.add(block.id)
  }
  const page = current.pages[pageIndex]!
  const index = intent.index ?? page.blocks.length
  if (!Number.isSafeInteger(index) || index < 0 || index > page.blocks.length) {
    throw new DocumentCoreError('invalid-intention', 'Block insertion index is outside the Page')
  }
  const blocks = [
    ...page.blocks.slice(0, index),
    ...intent.blocks.map(block => cloneValue(block)),
    ...page.blocks.slice(index),
  ]
  return {
    ...current,
    pages: current.pages.map((candidate, candidateIndex) => candidateIndex === pageIndex
      ? { ...candidate, blocks }
      : candidate),
  }
}

function applyReplaceBlock(
  current: DocumentRevision,
  intent: Pick<ReplaceBlockIntent, 'block' | 'blockId'>,
): DocumentRevision {
  if (intent.block.id !== intent.blockId) {
    throw new DocumentCoreError('invalid-intention', 'Replacement Block must keep its identity')
  }
  validateBlock(intent.block)
  let replaced = false
  const pages = current.pages.map(page => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.id !== intent.blockId) {
        return block
      }
      replaced = true
      return cloneValue(intent.block)
    }),
  }))
  if (!replaced) {
    throw new DocumentCoreError('not-found', `Block ${intent.blockId} was not found`)
  }
  return { ...current, pages }
}

function applyRemoveBlock(current: DocumentRevision, blockId: string): DocumentRevision {
  let removed = false
  const pages = current.pages.map((page) => {
    const blocks = page.blocks.filter((block) => {
      const keep = block.id !== blockId
      removed ||= !keep
      return keep
    })
    return { ...page, blocks }
  })
  if (!removed) {
    throw new DocumentCoreError('not-found', `Block ${blockId} was not found`)
  }
  return { ...current, pages }
}

function applyUpdateMediaItem(
  current: DocumentRevision,
  intent: Pick<UpdateMediaItemIntent, 'blockId' | 'changes' | 'itemId'>,
): DocumentRevision {
  let updated = false
  let foundBlock = false
  const pages = current.pages.map(page => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.id !== intent.blockId) {
        return block
      }
      foundBlock = true
      if (block.kind !== 'media-group') {
        throw new DocumentCoreError('invalid-intention', `Block ${intent.blockId} is not a Media Group`)
      }
      const itemIndex = block.items.findIndex(item => item.id === intent.itemId)
      if (itemIndex < 0) {
        throw new DocumentCoreError('not-found', `Media Item ${intent.itemId} was not found`)
      }
      const nextItems = block.items.map((item, index) => index === itemIndex
        ? removeUndefinedProperties({ ...item, ...cloneValue(intent.changes) })
        : item)
      const nextBlock = {
        ...block,
        items: nextItems,
      }
      validateBlock(nextBlock)
      updated = true
      return nextBlock
    }),
  }))
  if (!foundBlock) {
    throw new DocumentCoreError('not-found', `Block ${intent.blockId} was not found`)
  }
  if (!updated) {
    throw new DocumentCoreError('not-found', `Media Item ${intent.itemId} was not found`)
  }
  return { ...current, pages }
}

function mapMediaGroupBlock(
  current: DocumentRevision,
  blockId: string,
  transform: (block: MediaGroupBlock) => MediaGroupBlock | undefined,
): DocumentRevision {
  let foundBlock = false
  const pages = current.pages.map(page => ({
    ...page,
    blocks: page.blocks.flatMap((block) => {
      if (block.id !== blockId) {
        return [block]
      }
      foundBlock = true
      if (block.kind !== 'media-group') {
        throw new DocumentCoreError('invalid-intention', `Block ${blockId} is not a Media Group`)
      }
      const nextBlock = transform(block)
      if (nextBlock !== undefined) {
        validateBlock(nextBlock)
        return [nextBlock]
      }
      return []
    }),
  }))
  if (!foundBlock) {
    throw new DocumentCoreError('not-found', `Block ${blockId} was not found`)
  }
  return { ...current, pages }
}

function applyUpdateMediaGroup(
  current: DocumentRevision,
  intent: Pick<UpdateMediaGroupIntent, 'blockId' | 'changes'>,
): DocumentRevision {
  return mapMediaGroupBlock(current, intent.blockId, block => (
    removeUndefinedProperties({ ...block, ...cloneValue(intent.changes) })
  ))
}

function applySetMediaGroupFeatured(
  current: DocumentRevision,
  intent: Pick<SetMediaGroupFeaturedIntent, 'blockId' | 'itemId'>,
): DocumentRevision {
  return mapMediaGroupBlock(current, intent.blockId, (block) => {
    if (block.items.every(item => item.id !== intent.itemId)) {
      throw new DocumentCoreError('not-found', `Media Item ${intent.itemId} was not found`)
    }
    return {
      ...block,
      items: block.items.map(item => ({
        ...item,
        featured: item.id === intent.itemId,
      })),
    }
  })
}

function applyRemoveMediaItem(
  current: DocumentRevision,
  intent: Pick<RemoveMediaItemIntent, 'blockId' | 'itemId'>,
): DocumentRevision {
  return mapMediaGroupBlock(current, intent.blockId, (block) => {
    if (block.items.every(item => item.id !== intent.itemId)) {
      throw new DocumentCoreError('not-found', `Media Item ${intent.itemId} was not found`)
    }
    if (block.items.length === 1) {
      return undefined
    }
    return {
      ...block,
      items: block.items.filter(item => item.id !== intent.itemId),
    }
  })
}

function applyMoveMediaItem(
  current: DocumentRevision,
  intent: Pick<MoveMediaItemIntent, 'blockId' | 'index' | 'itemId'>,
): DocumentRevision {
  return mapMediaGroupBlock(current, intent.blockId, (block) => {
    const itemIndex = block.items.findIndex(item => item.id === intent.itemId)
    if (itemIndex < 0) {
      throw new DocumentCoreError('not-found', `Media Item ${intent.itemId} was not found`)
    }
    if (!Number.isSafeInteger(intent.index) || intent.index < 0 || intent.index >= block.items.length) {
      throw new DocumentCoreError('invalid-intention', 'Media Item move index is outside the Media Group')
    }
    const nextItems = [...block.items]
    const moving = nextItems[itemIndex]!
    nextItems.splice(itemIndex, 1)
    nextItems.splice(intent.index, 0, moving)
    return {
      ...block,
      items: nextItems,
    }
  })
}

function applyMoveBlock(
  current: DocumentRevision,
  intent: Pick<MoveBlockIntent, 'blockId' | 'index' | 'pageId'>,
): DocumentRevision {
  let moving: Block | undefined
  const sourcePageIndex = current.pages.findIndex(page => page.blocks.some(block => block.id === intent.blockId))
  if (sourcePageIndex < 0) {
    throw new DocumentCoreError('not-found', `Block ${intent.blockId} was not found`)
  }
  const destinationPageIndex = current.pages.findIndex(page => page.id === intent.pageId)
  if (destinationPageIndex < 0) {
    throw new DocumentCoreError('not-found', `Page ${intent.pageId} was not found`)
  }
  const pagesWithoutBlock = current.pages.map((page) => {
    const blocks = page.blocks.filter((block) => {
      if (block.id === intent.blockId) {
        moving = block
        return false
      }
      return true
    })
    return { ...page, blocks }
  })
  if (!moving) {
    throw new DocumentCoreError('not-found', `Block ${intent.blockId} was not found`)
  }
  const destination = pagesWithoutBlock[destinationPageIndex]!
  if (!Number.isSafeInteger(intent.index) || intent.index < 0 || intent.index > destination.blocks.length) {
    throw new DocumentCoreError('invalid-intention', 'Block move index is outside the Page')
  }
  const blocks = [
    ...destination.blocks.slice(0, intent.index),
    cloneValue(moving),
    ...destination.blocks.slice(intent.index),
  ]
  return {
    ...current,
    pages: pagesWithoutBlock.map((page, pageIndex) => pageIndex === destinationPageIndex
      ? { ...page, blocks }
      : page),
  }
}

function validatePresentation(value: unknown): asserts value is DocumentPresentation {
  if (!isRecord(value)) {
    throw new DocumentCoreError('invalid-document', 'Presentation must be an object')
  }
  if (value.density !== 'comfortable' && value.density !== 'compact' && value.density !== 'standard') {
    throw new DocumentCoreError('invalid-document', 'Presentation density is invalid')
  }
  for (const key of [
    'fontPackId',
    'rendererRevision',
    'sceneId',
    'sceneVersion',
    'templateId',
    'templateVersion',
    'themeId',
    'themeVersion',
  ]) {
    assertNonEmptyString(value[key], `Presentation ${key}`)
  }
  if (value.sensitive !== undefined && typeof value.sensitive !== 'boolean') {
    throw new DocumentCoreError('invalid-document', 'Presentation sensitive flag must be a boolean')
  }
  validatePageFormat(value.pageFormat)
}

function validatePage(page: unknown): asserts page is Page {
  if (!isRecord(page)) {
    throw new DocumentCoreError('invalid-page', 'Page must be an object')
  }
  assertNonEmptyString(page.id, 'Page id')
  validatePageFormat(page.format)
  if (!Array.isArray(page.blocks)) {
    throw new DocumentCoreError('invalid-page', 'Page Blocks must be an array')
  }
}

function validatePageFormat(value: unknown): asserts value is PageFormat {
  if (!isRecord(value)) {
    throw new DocumentCoreError('invalid-page', 'Page Format must be an object')
  }
  if (value.kind !== 'bounded' && value.kind !== 'continuous') {
    throw new DocumentCoreError('invalid-page', 'Page Format kind is invalid')
  }
  assertNonEmptyString(value.preset, 'Page Format preset')
  if (typeof value.width !== 'number' || !Number.isFinite(value.width) || value.width <= 0) {
    throw new DocumentCoreError('invalid-page', 'Page Format width must be positive')
  }
  if (value.height !== undefined && (
    typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height <= 0
  )) {
    throw new DocumentCoreError('invalid-page', 'Page Format height must be positive')
  }
  if (value.kind === 'bounded' && value.height === undefined) {
    throw new DocumentCoreError('invalid-page', 'Bounded Page Format requires a height')
  }
}

function validateBlock(
  value: unknown,
  blockVersion: BlockCatalogVersion = BLOCK_CATALOG_VERSION,
): asserts value is Block {
  if (!isRecord(value)) {
    throw new DocumentCoreError('invalid-block', 'Block must be an object')
  }
  assertNonEmptyString(value.id, 'Block id')
  if (blockVersion === LEGACY_BLOCK_CATALOG_VERSION && (value.kind === 'checklist' || value.kind === 'data-table')) {
    throw new DocumentCoreError('invalid-block', `${String(value.kind)} Block is unsupported by ${blockVersion}`)
  }
  if (value.kind === 'rich-text') {
    if (value.version !== 1) {
      throw new DocumentCoreError('invalid-block', 'Rich Text Block version is unsupported')
    }
    validateRichTextDocument(value.content)
    if (!richTextHasMeaningfulText(value.content)) {
      throw new DocumentCoreError('invalid-block', 'Rich Text Block must contain non-whitespace text')
    }
    return
  }
  if (value.kind === 'checklist') {
    validateChecklistBlock(value)
    return
  }
  if (value.kind === 'data-table') {
    validateDataTableBlock(value)
    return
  }
  if (value.kind === 'media-group') {
    validateMediaGroupBlock(value)
    return
  }
  if (value.kind === 'unknown') {
    if (value.version !== 1 || typeof value.originalKind !== 'string' || value.originalKind.length === 0) {
      throw new DocumentCoreError('invalid-block', 'Unknown Block metadata is invalid')
    }
    if (!isJsonObject(value.raw)) {
      throw new DocumentCoreError('invalid-block', 'Unknown Block raw data must be a JSON object')
    }
    return
  }
  throw new DocumentCoreError('invalid-block', `Unsupported Block kind ${String(value.kind)}`)
}

function validateRichTextDocument(value: unknown): asserts value is RichTextDocument {
  if (!isRecord(value) || value.type !== 'doc' || !Array.isArray(value.children)) {
    throw new DocumentCoreError('invalid-block', 'Rich Text content must be a semantic document')
  }
  for (const node of value.children) {
    validateRichTextNode(node)
  }
}

function validateRichTextNode(value: unknown): asserts value is RichTextNode {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Rich Text node is invalid')
  }
  const allowedTypes = new Set([
    'blockquote',
    'bullet-list',
    'code-block',
    'heading',
    'list-item',
    'ordered-list',
    'paragraph',
    'text',
  ])
  if (!allowedTypes.has(value.type)) {
    throw new DocumentCoreError('invalid-block', `Rich Text node ${String(value.type)} is unsupported`)
  }
  if (value.text !== undefined && typeof value.text !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Rich Text node text must be a string')
  }
  if (value.level !== undefined && (
    value.level !== 1 && value.level !== 2 && value.level !== 3
  )) {
    throw new DocumentCoreError('invalid-block', 'Rich Text heading level is invalid')
  }
  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks)) {
      throw new DocumentCoreError('invalid-block', 'Rich Text marks must be an array')
    }
    for (const mark of value.marks) {
      validateRichTextMark(mark)
    }
  }
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) {
      throw new DocumentCoreError('invalid-block', 'Rich Text children must be an array')
    }
    for (const child of value.children) {
      validateRichTextNode(child)
    }
  }
  if (value.type === 'heading' && value.level === undefined) {
    throw new DocumentCoreError('invalid-block', 'Heading requires a level')
  }
  if (value.type === 'code-block' && value.children !== undefined) {
    throw new DocumentCoreError('invalid-block', 'Code Block cannot contain child nodes')
  }
  if (value.type === 'text' && (typeof value.text !== 'string' || value.text.length === 0)) {
    throw new DocumentCoreError('invalid-block', 'Text node requires text')
  }
  if (value.type.endsWith('list') || value.type === 'list-item') {
    if (!Array.isArray(value.children)) {
      throw new DocumentCoreError('invalid-block', 'List nodes require children')
    }
  }
}

function validateChecklistBlock(value: Record<string, any>) {
  if (value.version !== 1 || !Array.isArray(value.items) || value.items.length === 0) {
    throw new DocumentCoreError('invalid-block', 'Checklist metadata is invalid')
  }
  const itemIds = new Set<string>()
  for (const item of value.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.length === 0) {
      throw new DocumentCoreError('invalid-block', 'Checklist item id is invalid')
    }
    if (itemIds.has(item.id)) {
      throw new DocumentCoreError('duplicate-id', `Checklist item id ${item.id} is repeated`)
    }
    itemIds.add(item.id)
    if (typeof item.text !== 'string' || item.text.trim().length === 0) {
      throw new DocumentCoreError('invalid-block', 'Checklist item text must be meaningful')
    }
    if (typeof item.checked !== 'boolean') {
      throw new DocumentCoreError('invalid-block', 'Checklist item state is invalid')
    }
  }
}

function validateDataTableBlock(value: Record<string, any>) {
  if (value.version !== 1 || !Array.isArray(value.columns) || value.columns.length === 0) {
    throw new DocumentCoreError('invalid-block', 'Data Table columns are invalid')
  }
  if (!Array.isArray(value.rows) || value.rows.length === 0) {
    throw new DocumentCoreError('invalid-block', 'Data Table rows are invalid')
  }
  const columnIds = new Set<string>()
  for (const column of value.columns) {
    if (!isRecord(column) || typeof column.id !== 'string' || column.id.length === 0) {
      throw new DocumentCoreError('invalid-block', 'Data Table column id is invalid')
    }
    if (columnIds.has(column.id)) {
      throw new DocumentCoreError('duplicate-id', `Data Table column id ${column.id} is repeated`)
    }
    columnIds.add(column.id)
    if (typeof column.label !== 'string') {
      throw new DocumentCoreError('invalid-block', 'Data Table column label must be a string')
    }
  }
  const rowIds = new Set<string>()
  for (const row of value.rows) {
    if (!isRecord(row) || typeof row.id !== 'string' || row.id.length === 0) {
      throw new DocumentCoreError('invalid-block', 'Data Table row id is invalid')
    }
    if (rowIds.has(row.id)) {
      throw new DocumentCoreError('duplicate-id', `Data Table row id ${row.id} is repeated`)
    }
    rowIds.add(row.id)
    if (!Array.isArray(row.cells) || row.cells.length !== value.columns.length) {
      throw new DocumentCoreError('invalid-block', 'Data Table row cells do not match its columns')
    }
    if (row.cells.some(cell => typeof cell !== 'string')) {
      throw new DocumentCoreError('invalid-block', 'Data Table cells must be strings')
    }
  }
}

function validateMediaGroupBlock(value: Record<string, any>) {
  if (value.version !== 1 || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 9) {
    throw new DocumentCoreError('invalid-block', 'Media Group must contain between one and nine items')
  }
  if (!['auto', 'balanced', 'featured', 'margin-album', 'sequence'].includes(value.arrangement)) {
    throw new DocumentCoreError('invalid-block', 'Media Group arrangement is invalid')
  }
  if (value.caption !== undefined && typeof value.caption !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Media Group caption must be a string')
  }
  const itemIds = new Set<string>()
  let featuredCount = 0
  for (const item of value.items) {
    validateMediaItem(item)
    if (itemIds.has(item.id)) {
      throw new DocumentCoreError('duplicate-id', `Media Item id ${item.id} is repeated`)
    }
    itemIds.add(item.id)
    if (item.featured) {
      featuredCount += 1
    }
  }
  if (featuredCount > 1) {
    throw new DocumentCoreError('invalid-block', 'Media Group can feature at most one item')
  }
}

function validateMediaItem(value: unknown): asserts value is MediaItem {
  if (!isRecord(value)) {
    throw new DocumentCoreError('invalid-block', 'Media Item must be an object')
  }
  assertNonEmptyString(value.id, 'Media Item id')
  assertNonEmptyString(value.assetId, 'Media Item Asset reference')
  if (value.caption !== undefined && typeof value.caption !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Media Item caption must be a string')
  }
  if (value.alternativeText !== undefined && typeof value.alternativeText !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Media Item Alternative Text must be a string')
  }
  if (typeof value.featured !== 'boolean') {
    throw new DocumentCoreError('invalid-block', 'Media Item Featured state is invalid')
  }
  if (value.fit !== 'cover' && value.fit !== 'contain') {
    throw new DocumentCoreError('invalid-block', 'Media Item fit is invalid')
  }
  if (!isRecord(value.focalPoint)
    || typeof value.focalPoint.x !== 'number'
    || typeof value.focalPoint.y !== 'number'
    || !Number.isFinite(value.focalPoint.x)
    || !Number.isFinite(value.focalPoint.y)
    || value.focalPoint.x < 0
    || value.focalPoint.x > 1
    || value.focalPoint.y < 0
    || value.focalPoint.y > 1) {
    throw new DocumentCoreError('invalid-block', 'Media Item Focal Point must use normalized coordinates')
  }
  if (value.rotation !== 0 && value.rotation !== 90 && value.rotation !== 180 && value.rotation !== 270) {
    throw new DocumentCoreError('invalid-block', 'Media Item rotation must be a right angle')
  }
  if (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom) || value.zoom < 1 || value.zoom > 4) {
    throw new DocumentCoreError('invalid-block', 'Media Item zoom must be between 1 and 4')
  }
}

function validateRichTextMark(value: unknown): asserts value is RichTextMark {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new DocumentCoreError('invalid-block', 'Rich Text mark is invalid')
  }
  if (!['bold', 'code', 'italic', 'link', 'underline'].includes(value.type)) {
    throw new DocumentCoreError('invalid-block', `Rich Text mark ${String(value.type)} is unsupported`)
  }
  if (value.type === 'link' && (typeof value.href !== 'string' || value.href.length === 0)) {
    throw new DocumentCoreError('invalid-block', 'Link mark requires a URL')
  }
}

function richTextHasMeaningfulText(document: RichTextDocument): boolean {
  const text = (nodes: readonly RichTextNode[]): string => nodes.map(node => [
    node.text ?? '',
    ...(node.children === undefined ? [] : [text(node.children)]),
  ].join('')).join('')
  return text(document.children).trim().length > 0
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocumentCoreError('invalid-document', `${label} must be a non-empty string`)
  }
}

function assertNever(value: never): never {
  throw new DocumentCoreError('invalid-intention', `Unsupported editing intention ${String(value)}`)
}

function removeUndefinedProperties<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== undefined),
  ) as T
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonObject(value: unknown): value is { readonly [key: string]: JsonValue } {
  if (!isRecord(value)) {
    return false
  }
  return Object.values(value).every(child => isJsonValue(child))
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (Array.isArray(value)) {
    return value.every(child => isJsonValue(child))
  }
  return isJsonObject(value)
}

function upgradeDocumentRevision(revision: DocumentRevision): DocumentRevision {
  const needsBlockUpgrade = revision.blockVersion === LEGACY_BLOCK_CATALOG_VERSION
  const presentation = upgradePresentation(revision.presentation)
  const needsRendererUpgrade = presentation.rendererRevision !== CURRENT_RENDERER_REVISION
  const needsPresentationUpgrade = presentation !== revision.presentation
  if (!needsBlockUpgrade && !needsRendererUpgrade && !needsPresentationUpgrade) {
    return revision
  }
  return {
    ...revision,
    ...(needsBlockUpgrade ? { blockVersion: BLOCK_CATALOG_VERSION } : {}),
    presentation: {
      ...presentation,
      rendererRevision: CURRENT_RENDERER_REVISION,
    },
  }
}

function upgradePresentation(presentation: DocumentPresentation): DocumentPresentation {
  let upgraded = presentation
  if (presentation.fontPackId === 'noto-sans-sc@1') {
    upgraded = {
      ...upgraded,
      fontPackId: DEFAULT_DOCUMENT_PRESENTATION.fontPackId,
    }
  }
  if (presentation.templateId === 'clear-paper' && presentation.templateVersion === 'clear-paper@1') {
    upgraded = {
      ...upgraded,
      templateId: DEFAULT_DOCUMENT_PRESENTATION.templateId,
      templateVersion: DEFAULT_DOCUMENT_PRESENTATION.templateVersion,
    }
  }
  if (presentation.themeId === 'cobalt' && presentation.themeVersion === 'cobalt@1') {
    upgraded = {
      ...upgraded,
      themeId: DEFAULT_DOCUMENT_PRESENTATION.themeId,
      themeVersion: DEFAULT_DOCUMENT_PRESENTATION.themeVersion,
    }
  }
  return upgraded
}

export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(child => cloneValue(child)) as T
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
    ) as T
  }
  return value
}

export function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) {
      freezeDeep(child)
    }
  }
  return value
}

function freezeRevision(revision: DocumentRevision): DocumentRevision {
  validateDocumentRevision(revision)
  const cloned = cloneValue(upgradeDocumentRevision(revision))
  validateDocumentRevision(cloned)
  return freezeDeep(cloned)
}

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    throw new DocumentCoreError('invalid-document', 'Document contains an undefined value')
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new DocumentCoreError('invalid-document', 'Document contains a non-finite number')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(child => stableStringify(child)).join(',')}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  throw new DocumentCoreError('invalid-document', 'Document contains a non-serializable value')
}

function defaultIdFactory(kind: DocumentIdKind, hint = 'item') {
  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `oneimg-${kind}-${hint}-${randomId}`
}
