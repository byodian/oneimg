import {
  type DocumentRevision,
  type EditTransaction,
  deserializeDocumentRevision,
  isMeaningfulDocumentRevision,
  serializeDocumentRevision,
} from '@/features/document-core'

const DEFAULT_DATABASE_NAME = 'OneImgLocalCore'
const DATABASE_VERSION = 1
const DOCUMENT_STORE = 'documents'
const TRANSACTION_STORE = 'transactions'

export type DurableReceiptStatus = 'already-saved' | 'saved' | 'stale'

export interface DurableReceipt {
  readonly documentId: string
  readonly revision: number
  readonly savedAt: string
  readonly status: DurableReceiptStatus
}

export interface PersistCommitInput {
  readonly revision: DocumentRevision
  readonly transaction: EditTransaction
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

export interface LocalRepository {
  readonly close: () => void
  readonly listConflictDrafts: () => Promise<readonly ConflictDraft[]>
  readonly listRecents: () => Promise<readonly RecentDocument[]>
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

export function createInMemoryLocalRepository(
  options: LocalRepositoryOptions = {},
): LocalRepository {
  const clock = options.clock ?? (() => new Date().toISOString())
  const beforePersistCommit = options.beforePersistCommit
  const documents = new Map<string, StoredDocumentRecord>()
  const transactions = new Map<string, StoredTransactionRecord>()
  const enqueue = createDocumentQueue()

  return {
    close: () => undefined,
    listConflictDrafts: async () => listConflictRecords(documents.values()),
    listRecents: async () => listRecentRecords(documents.values()),
    persistCommit: input => enqueue(input.revision.id, async () => {
      await runBeforePersistCommit(beforePersistCommit, input)
      const prepared = prepareCommit(input, clock())
      return saveInMemoryCommit(prepared, documents, transactions)
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
    listConflictDrafts: async () => {
      const db = await database
      const records = await readAllDocuments(db)
      return listConflictRecords(records)
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
      return saveIndexedDbCommit(db, prepared)
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

function saveIndexedDbCommit(db: IDBDatabase, prepared: PreparedCommit): Promise<DurableReceipt> {
  return new Promise((resolve, reject) => {
    let outcome: DurableReceipt | undefined
    let conflictDraft: PreparedConflictDraft | undefined
    let failure: Error | undefined
    const transaction = db.transaction([DOCUMENT_STORE, TRANSACTION_STORE], 'readwrite')
    const documents = transaction.objectStore(DOCUMENT_STORE)
    const storedTransactions = transaction.objectStore(TRANSACTION_STORE)
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
      if (outcome.status !== 'saved') {
        transaction.abort()
        return
      }
      documents.put(prepared.record)
      storedTransactions.put(prepared.transaction)
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
      if (conflictDraft === undefined && outcome !== undefined && outcome.status !== 'saved') {
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
      if (outcome?.status === 'saved') {
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
