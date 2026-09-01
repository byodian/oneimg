import {
  type DocumentRevision,
  type EditTransaction,
  deserializeDocumentRevision,
  isMeaningfulDocumentRevision,
  serializeDocumentRevision,
} from '@/features/document-core'
import type { PackageImportReport } from '@/features/oneimg-package'

const DEFAULT_DATABASE_NAME = 'OneImgLocalCore'
const DATABASE_VERSION = 4
const DOCUMENT_STORE = 'documents'
const TRANSACTION_STORE = 'transactions'
const PACKAGE_IMPORT_STORE = 'package-imports'
const ASSET_STORE = 'assets'

export type DurableReceiptStatus = 'already-saved' | 'saved' | 'stale'

export interface DurableReceipt {
  readonly documentId: string
  readonly revision: number
  readonly savedAt: string
  readonly status: DurableReceiptStatus
}

export interface PersistCommitInput {
  readonly assets?: readonly LocalAssetRecord[]
  readonly revision: DocumentRevision
  readonly transaction: EditTransaction
}

export interface PersistImportedDraftInput extends PersistCommitInput {
  readonly packageImport: RecordPackageImportInput
}

export interface RecentDocument {
  readonly documentId: string
  readonly documentName: string
  readonly revision: number
  readonly updatedAt: string
}

export interface ConflictDraft {
  readonly createdAt: string
  readonly documentId: string
  readonly documentName: string
  readonly revision: number
  readonly sourceDocumentId: string
}

export interface PackageImportRecord {
  readonly assets: readonly LocalAssetRecord[]
  readonly documentId: string
  readonly importedAt: string
  readonly packageId: string
  readonly report?: PackageImportReport
  readonly sourceDocumentId: string
}

export interface LocalAssetRecord {
  readonly assetId: string
  readonly original: Blob
  readonly renderSource?: Blob
  readonly renderSourceRevision?: string
}

export type PackageImportAssetRecord = LocalAssetRecord

export interface RecordPackageImportInput {
  readonly assets?: readonly LocalAssetRecord[]
  readonly documentId: string
  readonly packageId: string
  readonly report?: PackageImportReport
  readonly sourceDocumentId: string
}

export interface LocalRepository {
  readonly close: () => void
  readonly listAssets: () => Promise<readonly LocalAssetRecord[]>
  readonly listConflictDrafts: () => Promise<readonly ConflictDraft[]>
  readonly listImportedPackages: () => Promise<readonly PackageImportRecord[]>
  readonly listRecents: () => Promise<readonly RecentDocument[]>
  readonly persistImportedDraft: (input: PersistImportedDraftInput) => Promise<DurableReceipt>
  readonly persistCommit: (input: PersistCommitInput) => Promise<DurableReceipt>
  readonly restore: (documentId: string) => Promise<DocumentRevision | null>
}

export type LocalRepositoryErrorCode =
  | 'conflict'
  | 'corrupt-record'
  | 'invalid-commit'
  | 'unavailable'
  | 'write-failed'

export class LocalRepositoryError extends Error {
  readonly code: LocalRepositoryErrorCode
  readonly conflictDraft?: ConflictDraft

  constructor(
    code: LocalRepositoryErrorCode,
    message: string,
    options: { readonly conflictDraft?: ConflictDraft } = {},
  ) {
    super(message)
    this.name = 'LocalRepositoryError'
    this.code = code
    this.conflictDraft = options.conflictDraft
  }
}

export interface LocalRepositoryOptions {
  readonly beforePersistCommit?: (input: PersistCommitInput) => Promise<void> | void
  readonly clock?: () => string
}

export interface IndexedDbLocalRepositoryOptions extends LocalRepositoryOptions {
  readonly dbName?: string
  readonly indexedDB?: IDBFactory
}

interface StoredDocumentRecord {
  readonly conflictOfDocumentId?: string
  readonly documentId: string
  readonly documentName: string
  readonly kind?: 'conflict' | 'draft'
  readonly meaningful: boolean
  readonly revision: number
  readonly serializedRevision: string
  readonly updatedAt: string
}

interface StoredTransactionRecord {
  readonly documentId: string
  readonly id: string
  readonly revision: number
  readonly transaction: EditTransaction
}

interface StoredPackageImportRecord extends PackageImportRecord {
  readonly id: string
}

interface StoredAssetRecord extends LocalAssetRecord {
  readonly id: string
}

export function createInMemoryLocalRepository(
  options: LocalRepositoryOptions = {},
): LocalRepository {
  const clock = options.clock ?? (() => new Date().toISOString())
  const beforePersistCommit = options.beforePersistCommit
  const documents = new Map<string, StoredDocumentRecord>()
  const transactions = new Map<string, StoredTransactionRecord>()
  const packageImports = new Map<string, StoredPackageImportRecord>()
  const assets = new Map<string, StoredAssetRecord>()
  const enqueue = createDocumentQueue()

  return {
    close: () => undefined,
    listAssets: async () => listAssetRecords(assets.values()),
    listConflictDrafts: async () => listConflictRecords(documents.values()),
    listImportedPackages: async () => listPackageImportRecords(packageImports.values()),
    listRecents: async () => listRecentRecords(documents.values()),
    persistCommit: input => enqueue(input.revision.id, async () => {
      await runBeforePersistCommit(beforePersistCommit, input)
      const prepared = prepareCommit(input, clock())
      const preparedAssets = prepareAssetRecords(input.assets)
      const receipt = saveInMemoryCommit(prepared, documents, transactions)
      if (receipt.status !== 'stale') {
        saveInMemoryAssets(preparedAssets, assets)
      }
      return receipt
    }),
    persistImportedDraft: input => enqueue(input.revision.id, async () => {
      await runBeforePersistCommit(beforePersistCommit, input)
      const prepared = prepareCommit(input, clock())
      const packageImport = preparePackageImport(input.packageImport, prepared.record.updatedAt)
      assertImportedDraftIdentity(input.revision, packageImport)
      assertImportedDraftAssets(input.revision, packageImport)
      const preparedAssets = prepareAssetRecords(input.assets ?? packageImport.assets)
      const receipt = saveInMemoryCommit(prepared, documents, transactions)
      if (receipt.status !== 'stale') {
        saveInMemoryAssets(preparedAssets, assets)
        packageImports.set(packageImport.id, packageImport)
      }
      return receipt
    }),
    restore: async (documentId) => {
      const record = documents.get(documentId)
      return record === undefined ? null : deserializeStoredRevision(record)
    },
  }
}

export function createIndexedDbLocalRepository(
  options: IndexedDbLocalRepositoryOptions = {},
): LocalRepository {
  const indexedDb = options.indexedDB ?? globalThis.indexedDB
  if (!indexedDb) {
    throw new LocalRepositoryError('unavailable', 'IndexedDB is not available in this environment')
  }
  const dbName = options.dbName ?? DEFAULT_DATABASE_NAME
  const clock = options.clock ?? (() => new Date().toISOString())
  const beforePersistCommit = options.beforePersistCommit
  const database = openDatabase(indexedDb, dbName)
  const enqueue = createDocumentQueue()

  return {
    close: () => {
      database.then((db) => {
        db.close()
      }).catch(() => undefined)
    },
    listAssets: async () => {
      const db = await database
      const records = await readAllAssets(db)
      return listAssetRecords(records)
    },
    listConflictDrafts: async () => {
      const db = await database
      const records = await readAllDocuments(db)
      return listConflictRecords(records)
    },
    listImportedPackages: async () => {
      const db = await database
      const records = await readAllPackageImports(db)
      return listPackageImportRecords(records)
    },
    listRecents: async () => {
      const db = await database
      const records = await readAllDocuments(db)
      return listRecentRecords(records)
    },
    persistCommit: input => enqueue(input.revision.id, async () => {
      await runBeforePersistCommit(beforePersistCommit, input)
      const db = await database
      const prepared = prepareCommit(input, clock())
      const preparedAssets = prepareAssetRecords(input.assets)
      return saveIndexedDbCommit(db, prepared, undefined, preparedAssets)
    }),
    persistImportedDraft: input => enqueue(input.revision.id, async () => {
      await runBeforePersistCommit(beforePersistCommit, input)
      const db = await database
      const prepared = prepareCommit(input, clock())
      const packageImport = preparePackageImport(input.packageImport, prepared.record.updatedAt)
      assertImportedDraftIdentity(input.revision, packageImport)
      assertImportedDraftAssets(input.revision, packageImport)
      const preparedAssets = prepareAssetRecords(input.assets ?? packageImport.assets)
      return saveIndexedDbCommit(db, prepared, packageImport, preparedAssets)
    }),
    restore: async (documentId) => {
      const db = await database
      const record = await readDocument(db, documentId)
      return record === undefined ? null : deserializeStoredRevision(record)
    },
  }
}

async function runBeforePersistCommit(
  hook: LocalRepositoryOptions['beforePersistCommit'],
  input: PersistCommitInput,
) {
  if (hook === undefined) {
    return
  }
  try {
    await hook(input)
  } catch (error) {
    if (error instanceof LocalRepositoryError) {
      throw error
    }
    throw new LocalRepositoryError(
      'write-failed',
      error instanceof Error ? error.message : String(error),
    )
  }
}

interface PreparedCommit {
  readonly record: StoredDocumentRecord
  readonly revision: DocumentRevision
  readonly transaction: StoredTransactionRecord
}

function prepareCommit(input: PersistCommitInput, updatedAt: string): PreparedCommit {
  if (input.transaction.documentId !== input.revision.id) {
    throw new LocalRepositoryError(
      'invalid-commit',
      'Commit transaction and Document revision identities do not match',
    )
  }
  if (input.transaction.resultRevision !== input.revision.revision) {
    throw new LocalRepositoryError(
      'invalid-commit',
      'Commit transaction and Document revision numbers do not match',
    )
  }
  const serializedRevision = serializeDocumentRevision(input.revision)
  const meaningful = isMeaningfulDocumentRevision(input.revision)
  return {
    record: {
      documentId: input.revision.id,
      documentName: input.revision.documentName,
      kind: 'draft',
      meaningful,
      revision: input.revision.revision,
      serializedRevision,
      updatedAt,
    },
    revision: input.revision,
    transaction: {
      documentId: input.revision.id,
      id: input.transaction.id,
      revision: input.revision.revision,
      transaction: input.transaction,
    },
  }
}

function saveInMemoryCommit(
  prepared: PreparedCommit,
  documents: Map<string, StoredDocumentRecord>,
  transactions: Map<string, StoredTransactionRecord>,
): DurableReceipt {
  const existingTransaction = transactions.get(prepared.transaction.id)
  if (existingTransaction !== undefined && (
    existingTransaction.documentId !== prepared.transaction.documentId
    || existingTransaction.revision !== prepared.transaction.revision
  )) {
    throwConflict(prepared, existingTransaction.revision, documents)
  }
  const conflictDraft = findConflictDraft(prepared, documents.get(prepared.record.documentId), existingTransaction)
  if (conflictDraft !== undefined) {
    documents.set(conflictDraft.record.documentId, conflictDraft.record)
    throw new LocalRepositoryError(
      'conflict',
      `Document ${prepared.record.documentId} has a competing revision ${prepared.record.revision}`,
      { conflictDraft: conflictDraft.descriptor },
    )
  }
  return resolveCommitAgainstCurrent(
    prepared,
    documents.get(prepared.record.documentId),
    (receipt) => {
      if (receipt.status === 'saved') {
        documents.set(prepared.record.documentId, prepared.record)
        transactions.set(prepared.transaction.id, prepared.transaction)
      }
    },
  )
}

function resolveCommitAgainstCurrent(
  prepared: PreparedCommit,
  existing: StoredDocumentRecord | undefined,
  save: (receipt: DurableReceipt) => void,
): DurableReceipt {
  if (existing !== undefined && prepared.record.revision < existing.revision) {
    return {
      documentId: existing.documentId,
      revision: existing.revision,
      savedAt: existing.updatedAt,
      status: 'stale',
    }
  }
  if (existing !== undefined && prepared.record.revision === existing.revision) {
    if (prepared.record.serializedRevision !== existing.serializedRevision) {
      throw new LocalRepositoryError(
        'conflict',
        `Document ${prepared.record.documentId} has two different revision ${prepared.record.revision} values`,
      )
    }
    return {
      documentId: existing.documentId,
      revision: existing.revision,
      savedAt: existing.updatedAt,
      status: 'already-saved',
    }
  }
  const receipt: DurableReceipt = {
    documentId: prepared.record.documentId,
    revision: prepared.record.revision,
    savedAt: prepared.record.updatedAt,
    status: 'saved',
  }
  save(receipt)
  return receipt
}

function listRecentRecords(records: Iterable<StoredDocumentRecord>): readonly RecentDocument[] {
  return Array.from(records)
    .filter(record => (record.kind ?? 'draft') === 'draft' && record.meaningful)
    .sort((left, right) => {
      const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt)
      return byUpdatedAt === 0 ? left.documentId.localeCompare(right.documentId) : byUpdatedAt
    })
    .map(record => ({
      documentId: record.documentId,
      documentName: record.documentName,
      revision: record.revision,
      updatedAt: record.updatedAt,
    }))
}

function packageImportRecordId(input: RecordPackageImportInput) {
  return `${input.packageId}:${input.documentId}`
}

function prepareAssetRecords(input: readonly LocalAssetRecord[] | undefined): readonly StoredAssetRecord[] {
  if (input === undefined) {
    return []
  }
  const assetIds = new Set<string>()
  return input.map((asset) => {
    if (typeof asset.assetId !== 'string' || asset.assetId.trim().length === 0) {
      throw new LocalRepositoryError('invalid-commit', 'Local Asset records must declare an Asset identity')
    }
    if (assetIds.has(asset.assetId)) {
      throw new LocalRepositoryError('invalid-commit', `Local Asset ${asset.assetId} is repeated`)
    }
    if ((asset.renderSource === undefined) !== (asset.renderSourceRevision === undefined)) {
      throw new LocalRepositoryError(
        'invalid-commit',
        'Local Asset Render Source bytes and revision must be provided together',
      )
    }
    if (asset.renderSourceRevision !== undefined && asset.renderSourceRevision.trim().length === 0) {
      throw new LocalRepositoryError('invalid-commit', 'Local Asset Render Source revision must be non-empty')
    }
    assetIds.add(asset.assetId)
    return {
      assetId: asset.assetId,
      id: asset.assetId,
      original: asset.original,
      ...(asset.renderSource === undefined ? {} : { renderSource: asset.renderSource }),
      ...(asset.renderSourceRevision === undefined ? {} : { renderSourceRevision: asset.renderSourceRevision }),
    }
  })
}

function saveInMemoryAssets(
  records: readonly StoredAssetRecord[],
  assets: Map<string, StoredAssetRecord>,
) {
  for (const record of records) {
    assets.set(record.id, record)
  }
}

function listAssetRecords(records: Iterable<StoredAssetRecord>): readonly LocalAssetRecord[] {
  return Array.from(records)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ assetId, original, renderSource, renderSourceRevision }) => ({
      assetId,
      original,
      ...(renderSource === undefined ? {} : { renderSource }),
      ...(renderSourceRevision === undefined ? {} : { renderSourceRevision }),
    }))
}

function assertImportedDraftIdentity(
  revision: DocumentRevision,
  packageImport: StoredPackageImportRecord,
) {
  if (packageImport.documentId !== revision.id) {
    throw new LocalRepositoryError(
      'invalid-commit',
      'Imported Package metadata and Document revision identities do not match',
    )
  }
}

function assertImportedDraftAssets(
  revision: DocumentRevision,
  packageImport: StoredPackageImportRecord,
) {
  const referencedAssetIds = new Set(revision.pages.flatMap(page => page.blocks.flatMap(block => (
    block.kind === 'media-group' ? block.items.map(item => item.assetId) : []
  ))))
  const packageAssetIds = new Set<string>()
  for (const asset of packageImport.assets) {
    if (packageAssetIds.has(asset.assetId)) {
      throw new LocalRepositoryError(
        'invalid-commit',
        `Imported Package repeats Asset ${asset.assetId}`,
      )
    }
    if (!referencedAssetIds.has(asset.assetId)) {
      throw new LocalRepositoryError(
        'invalid-commit',
        `Imported Package Asset ${asset.assetId} is not referenced by its Document`,
      )
    }
    packageAssetIds.add(asset.assetId)
  }
}

function preparePackageImport(input: RecordPackageImportInput, importedAt: string): StoredPackageImportRecord {
  if (input.packageId.trim().length === 0 || input.documentId.trim().length === 0 || input.sourceDocumentId.trim().length === 0) {
    throw new LocalRepositoryError(
      'invalid-commit',
      'Imported Package metadata must declare package and Document identities',
    )
  }
  const preparedAssets = prepareAssetRecords(input.assets)
  return {
    assets: preparedAssets.map(({ assetId, original, renderSource, renderSourceRevision }) => ({
      assetId,
      original,
      ...(renderSource === undefined ? {} : { renderSource }),
      ...(renderSourceRevision === undefined ? {} : { renderSourceRevision }),
    })),
    documentId: input.documentId,
    id: packageImportRecordId(input),
    importedAt,
    packageId: input.packageId,
    ...(input.report === undefined ? {} : { report: clonePackageImportReport(input.report) }),
    sourceDocumentId: input.sourceDocumentId,
  }
}

function clonePackageImportReport(report: PackageImportReport): PackageImportReport {
  return {
    exactAssetCount: report.exactAssetCount,
    exactDocumentCount: report.exactDocumentCount,
    findings: report.findings.map(finding => ({ ...finding })),
    unknownBlockCount: report.unknownBlockCount,
    unresolvedAssetCount: report.unresolvedAssetCount,
  }
}

function listPackageImportRecords(records: Iterable<StoredPackageImportRecord>): readonly PackageImportRecord[] {
  return Array.from(records)
    .sort((left, right) => {
      const byImportedAt = right.importedAt.localeCompare(left.importedAt)
      return byImportedAt === 0 ? left.id.localeCompare(right.id) : byImportedAt
    })
    .map(({ assets, documentId, importedAt, packageId, report, sourceDocumentId }) => ({
      assets: (assets ?? []).map(asset => ({
        assetId: asset.assetId,
        original: asset.original,
        ...(asset.renderSource === undefined ? {} : { renderSource: asset.renderSource }),
        ...(asset.renderSourceRevision === undefined ? {} : { renderSourceRevision: asset.renderSourceRevision }),
      })),
      documentId,
      importedAt,
      packageId,
      ...(report === undefined ? {} : { report: clonePackageImportReport(report) }),
      sourceDocumentId,
    }))
}

function listConflictRecords(records: Iterable<StoredDocumentRecord>): readonly ConflictDraft[] {
  return Array.from(records)
    .filter(record => record.kind === 'conflict')
    .sort((left, right) => {
      const byCreatedAt = right.updatedAt.localeCompare(left.updatedAt)
      return byCreatedAt === 0
        ? left.documentId.localeCompare(right.documentId)
        : byCreatedAt
    })
    .flatMap(record => record.conflictOfDocumentId === undefined
      ? []
      : [{
          createdAt: record.updatedAt,
          documentId: record.documentId,
          documentName: record.documentName,
          revision: record.revision,
          sourceDocumentId: record.conflictOfDocumentId,
        }])
}

interface PreparedConflictDraft {
  readonly descriptor: ConflictDraft
  readonly record: StoredDocumentRecord
}

function findConflictDraft(
  prepared: PreparedCommit,
  existing: StoredDocumentRecord | undefined,
  existingTransaction: StoredTransactionRecord | undefined,
): PreparedConflictDraft | undefined {
  if (existing === undefined) {
    return undefined
  }
  const isSameTransaction = existingTransaction?.documentId === prepared.transaction.documentId
    && existingTransaction.revision === prepared.transaction.revision
  if (isSameTransaction) {
    const isSameRevision = existing.revision === prepared.record.revision
    if (!isSameRevision || existing.serializedRevision === prepared.record.serializedRevision) {
      return undefined
    }
  }
  const isOlderRevision = prepared.record.revision < existing.revision
  const isDifferentSameRevision = prepared.record.revision === existing.revision
    && prepared.record.serializedRevision !== existing.serializedRevision
  const isBasedOnOlderRevision = prepared.transaction.transaction.sourceRevision < existing.revision
  if (!isOlderRevision && !isDifferentSameRevision && !isBasedOnOlderRevision) {
    return undefined
  }
  return prepareConflictDraft(prepared)
}

function prepareConflictDraft(prepared: PreparedCommit): PreparedConflictDraft {
  const documentId = createConflictDocumentId(prepared.record.documentId)
  const documentName = prepared.revision.documentName.length === 0
    ? '冲突草稿'
    : `${prepared.revision.documentName}（冲突草稿）`
  const revision = deserializeDocumentRevision(serializeDocumentRevision({
    ...prepared.revision,
    documentName,
    id: documentId,
  }))
  const descriptor: ConflictDraft = {
    createdAt: prepared.record.updatedAt,
    documentId,
    documentName,
    revision: revision.revision,
    sourceDocumentId: prepared.record.documentId,
  }
  return {
    descriptor,
    record: {
      conflictOfDocumentId: descriptor.sourceDocumentId,
      documentId,
      documentName,
      kind: 'conflict',
      meaningful: isMeaningfulDocumentRevision(revision),
      revision: revision.revision,
      serializedRevision: serializeDocumentRevision(revision),
      updatedAt: descriptor.createdAt,
    },
  }
}

function throwConflict(
  prepared: PreparedCommit,
  currentRevision: number,
  documents: Map<string, StoredDocumentRecord>,
): never {
  const conflictDraft = prepareConflictDraft(prepared)
  documents.set(conflictDraft.record.documentId, conflictDraft.record)
  throw new LocalRepositoryError(
    'conflict',
    `Transaction ${prepared.transaction.id} conflicts with revision ${currentRevision}`,
    { conflictDraft: conflictDraft.descriptor },
  )
}

let conflictSequence = 0

function createConflictDocumentId(documentId: string) {
  conflictSequence += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${documentId}:conflict:${Date.now().toString(36)}-${conflictSequence}-${random}`
}

function deserializeStoredRevision(record: StoredDocumentRecord): DocumentRevision {
  try {
    return deserializeDocumentRevision(record.serializedRevision)
  } catch (error) {
    if (error instanceof LocalRepositoryError) {
      throw error
    }
    throw new LocalRepositoryError(
      'corrupt-record',
      `Stored Document ${record.documentId} could not be validated`,
    )
  }
}

function createDocumentQueue() {
  const tails = new Map<string, Promise<void>>()
  return function enqueue<T>(documentId: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(documentId) ?? Promise.resolve()
    const result = previous.catch(() => undefined).then(task)
    tails.set(documentId, result.then(() => undefined, () => undefined))
    return result
  }
}

function openDatabase(indexedDb: IDBFactory, dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(dbName, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        db.createObjectStore(DOCUMENT_STORE, { keyPath: 'documentId' })
      }
      if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
        const store = db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' })
        store.createIndex('by-document', 'documentId', { unique: false })
      }
      if (!db.objectStoreNames.contains(PACKAGE_IMPORT_STORE)) {
        db.createObjectStore(PACKAGE_IMPORT_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: 'id' })
      }
    }
    request.onerror = () => reject(new LocalRepositoryError(
      'unavailable',
      request.error?.message ?? 'Failed to open Local Repository',
    ))
    request.onblocked = () => reject(new LocalRepositoryError(
      'unavailable',
      'Local Repository database upgrade is blocked',
    ))
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

function saveIndexedDbCommit(
  db: IDBDatabase,
  prepared: PreparedCommit,
  packageImport?: StoredPackageImportRecord,
  assets: readonly StoredAssetRecord[] = [],
): Promise<DurableReceipt> {
  return new Promise((resolve, reject) => {
    let outcome: DurableReceipt | undefined
    let conflictDraft: PreparedConflictDraft | undefined
    let failure: Error | undefined
    const storeNames = [DOCUMENT_STORE, TRANSACTION_STORE]
    if (packageImport !== undefined) {
      storeNames.push(PACKAGE_IMPORT_STORE)
    }
    if (assets.length > 0) {
      storeNames.push(ASSET_STORE)
    }
    const transaction = db.transaction(
      storeNames,
      'readwrite',
    )
    const documents = transaction.objectStore(DOCUMENT_STORE)
    const storedTransactions = transaction.objectStore(TRANSACTION_STORE)
    const packageImports = packageImport === undefined ? undefined : transaction.objectStore(PACKAGE_IMPORT_STORE)
    const storedAssets = assets.length === 0 ? undefined : transaction.objectStore(ASSET_STORE)
    const currentRequest = documents.get(prepared.record.documentId)
    const transactionRequest = storedTransactions.get(prepared.transaction.id)
    let current: StoredDocumentRecord | undefined
    let existingTransaction: StoredTransactionRecord | undefined
    let currentReady = false
    let transactionReady = false

    const fail = (error: Error) => {
      failure = error
      try {
        transaction.abort()
      } catch {
        // The transaction may have completed between the request callback and abort.
      }
    }

    const continueWhenReady = () => {
      if (!currentReady || !transactionReady || failure !== undefined) {
        return
      }
      if (existingTransaction !== undefined && (
        existingTransaction.documentId !== prepared.transaction.documentId
        || existingTransaction.revision !== prepared.transaction.revision
      )) {
        conflictDraft = prepareConflictDraft(prepared)
        try {
          documents.put(conflictDraft.record)
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }
      conflictDraft = findConflictDraft(prepared, current, existingTransaction)
      if (conflictDraft !== undefined) {
        try {
          documents.put(conflictDraft.record)
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)))
        }
        return
      }
      try {
        outcome = resolveCommitAgainstCurrent(prepared, current, () => undefined)
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
        return
      }
      if (outcome.status !== 'saved' && outcome.status !== 'already-saved') {
        transaction.abort()
        return
      }
      if (outcome.status === 'saved') {
        documents.put(prepared.record)
        storedTransactions.put(prepared.transaction)
      }
      if (packageImport !== undefined) {
        packageImports!.put(packageImport)
      }
      for (const asset of assets) {
        storedAssets!.put(asset)
      }
    }

    currentRequest.onerror = () => fail(requestError(currentRequest, 'Failed to read Document record'))
    currentRequest.onsuccess = () => {
      current = currentRequest.result as StoredDocumentRecord | undefined
      currentReady = true
      continueWhenReady()
    }
    transactionRequest.onerror = () => fail(requestError(transactionRequest, 'Failed to read transaction record'))
    transactionRequest.onsuccess = () => {
      existingTransaction = transactionRequest.result as StoredTransactionRecord | undefined
      transactionReady = true
      continueWhenReady()
    }
    transaction.onerror = () => {
      if (failure === undefined) {
        failure = transaction.error ?? new Error('IndexedDB write failed')
      }
    }
    transaction.onabort = () => {
      if (
        conflictDraft === undefined
        && outcome !== undefined
        && (outcome.status === 'stale' || (outcome.status === 'already-saved' && packageImport === undefined))
      ) {
        resolve(outcome)
        return
      }
      reject(new LocalRepositoryError(
        'write-failed',
        failure?.message ?? transaction.error?.message ?? 'IndexedDB write was aborted',
      ))
    }
    transaction.oncomplete = () => {
      if (conflictDraft !== undefined) {
        reject(new LocalRepositoryError(
          'conflict',
          `Document ${prepared.record.documentId} has a competing revision ${prepared.record.revision}`,
          { conflictDraft: conflictDraft.descriptor },
        ))
        return
      }
      if (outcome?.status === 'saved' || outcome?.status === 'already-saved') {
        resolve(outcome)
        return
      }
      reject(new LocalRepositoryError('write-failed', 'IndexedDB commit completed without a receipt'))
    }
  })
}

function requestError(request: IDBRequest, fallback: string): Error {
  return new LocalRepositoryError('write-failed', request.error?.message ?? fallback)
}

function readDocument(db: IDBDatabase, documentId: string): Promise<StoredDocumentRecord | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readonly')
    const request = transaction.objectStore(DOCUMENT_STORE).get(documentId)
    request.onerror = () => reject(new LocalRepositoryError(
      'write-failed',
      request.error?.message ?? 'Failed to read Document record',
    ))
    request.onsuccess = () => resolve(request.result as StoredDocumentRecord | undefined)
  })
}

function readAllDocuments(db: IDBDatabase): Promise<readonly StoredDocumentRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, 'readonly')
    const request = transaction.objectStore(DOCUMENT_STORE).getAll()
    request.onerror = () => reject(new LocalRepositoryError(
      'write-failed',
      request.error?.message ?? 'Failed to list Document records',
    ))
    request.onsuccess = () => resolve(request.result as readonly StoredDocumentRecord[])
  })
}

function readAllAssets(db: IDBDatabase): Promise<readonly StoredAssetRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, 'readonly')
    const request = transaction.objectStore(ASSET_STORE).getAll()
    request.onerror = () => reject(new LocalRepositoryError(
      'write-failed',
      request.error?.message ?? 'Failed to read Asset records',
    ))
    request.onsuccess = () => resolve(request.result as readonly StoredAssetRecord[])
  })
}

function readAllPackageImports(db: IDBDatabase): Promise<readonly StoredPackageImportRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PACKAGE_IMPORT_STORE, 'readonly')
    const request = transaction.objectStore(PACKAGE_IMPORT_STORE).getAll()
    request.onerror = () => reject(new LocalRepositoryError(
      'write-failed',
      request.error?.message ?? 'Failed to read Package import records',
    ))
    request.onsuccess = () => resolve(request.result as readonly StoredPackageImportRecord[])
  })
}
