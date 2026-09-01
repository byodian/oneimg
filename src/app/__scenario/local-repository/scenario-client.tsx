'use client'

import { useEffect, useState } from 'react'
import {
  type EditTransaction,
  createDocumentSession,
  createMediaGroupBlock,
  createMediaItem,
  createRichTextBlock,
  createUntouchedDocumentRevision,
} from '@/features/document-core'
import {
  type LocalRepository,
  createInMemoryLocalRepository,
  createIndexedDbLocalRepository,
} from '@/features/local-repository'

interface RepositoryCheck {
  readonly conflictDraftCount: number
  readonly conflictDraftRevision: number
  readonly conflictDraftSourceDocumentId: string
  readonly duplicateStatus: string
  readonly importedPackageAssetCount: number
  readonly importedPackageCount: number
  readonly importedPackageId: string
  readonly importedPackageReportDocumentCount: number
  readonly recentIds: readonly string[]
  readonly restoredRevision: number
  readonly staleRevisionAfterWrite: number
  readonly staleStatus: string
}

interface LocalRepositoryScenarioResult {
  readonly indexedDb: RepositoryCheck
  readonly memory: RepositoryCheck
  readonly status: 'ready'
}

function makeInitialTransaction(documentId: string, transactionId = 'transaction:initial'): EditTransaction {
  return {
    documentId,
    id: transactionId,
    intentType: 'insert-blocks',
    resultRevision: 1,
    sourceRevision: 0,
  }
}

async function checkRepository(repository: LocalRepository): Promise<RepositoryCheck> {
  const initial = createUntouchedDocumentRevision({
    documentId: 'document:repository-fixture',
    pageId: 'page:repository-fixture',
  })
  const session = createDocumentSession(initial, {
    createId: (kind, hint) => `transaction:${kind}:${hint}`,
  })
  const pageId = initial.pages[0]!.id
  const firstCommit = session.commit({
    block: createRichTextBlock('block:repository-text', {
      type: 'doc',
      children: [{ type: 'paragraph', text: '已持久化的内容。' }],
    }),
    pageId,
    type: 'insert-block',
  })
  if (firstCommit.status !== 'committed') {
    throw new Error(`First repository fixture commit failed: ${firstCommit.message}`)
  }
  const secondCommit = session.commit({
    block: createRichTextBlock('block:repository-more', {
      type: 'doc',
      children: [{ type: 'paragraph', text: '第二个 revision。' }],
    }),
    pageId,
    type: 'insert-block',
  })
  if (secondCommit.status !== 'committed') {
    throw new Error(`Second repository fixture commit failed: ${secondCommit.message}`)
  }

  await repository.persistCommit({ revision: initial, transaction: makeInitialTransaction(initial.id) })
  const revisionTwo = firstCommit.revision
  const revisionThree = secondCommit.revision
  await Promise.all([
    repository.persistCommit({ revision: revisionTwo, transaction: firstCommit.transaction }),
    repository.persistCommit({ revision: revisionThree, transaction: secondCommit.transaction }),
  ])
  const duplicate = await repository.persistCommit({
    revision: revisionThree,
    transaction: secondCommit.transaction,
  })
  const stale = await repository.persistCommit({
    revision: revisionTwo,
    transaction: firstCommit.transaction,
  })
  const branchSession = createDocumentSession(revisionTwo, {
    createId: (kind, hint) => `transaction:branch:${kind}:${hint}`,
  })
  const branchCommit = branchSession.commit({
    block: createRichTextBlock('block:repository-text', {
      type: 'doc',
      children: [{ type: 'paragraph', text: '竞争分支的内容。' }],
    }),
    blockId: 'block:repository-text',
    type: 'replace-block',
  })
  if (branchCommit.status !== 'committed') {
    throw new Error(`Conflict fixture commit failed: ${branchCommit.message}`)
  }
  try {
    await repository.persistCommit({ revision: branchCommit.revision, transaction: branchCommit.transaction })
    throw new Error('Conflict fixture was silently accepted')
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'conflict') {
      throw error
    }
  }
  const conflictDrafts = await repository.listConflictDrafts()
  const conflictDraft = conflictDrafts[0]
  if (conflictDraft === undefined) {
    throw new Error('Conflict Draft was not retained')
  }
  const restoredConflict = await repository.restore(conflictDraft.documentId)
  if (restoredConflict === null || restoredConflict.revision !== branchCommit.revision.revision) {
    throw new Error('Conflict Draft could not be restored')
  }
  const restored = await repository.restore(initial.id)
  if (!restored) {
    throw new Error('Repository did not restore the fixture')
  }
  const recents = await repository.listRecents()
  const importedBaseRevision = createUntouchedDocumentRevision({
    documentId: 'document:imported-fixture',
    pageId: 'page:imported-fixture',
  })
  const importedSession = createDocumentSession(importedBaseRevision, {
    createId: (kind, hint) => `transaction:imported:${kind}:${hint}`,
  })
  const importedCommit = importedSession.commit({
    block: createMediaGroupBlock({
      arrangement: 'sequence',
      id: 'block:imported-media',
      items: [createMediaItem({
        assetId: 'asset:repository-fixture',
        id: 'media-item:imported-fixture',
      })],
    }),
    pageId: importedBaseRevision.pages[0]!.id,
    type: 'insert-block',
  })
  if (importedCommit.status !== 'committed') {
    throw new Error(`Imported repository fixture failed: ${importedCommit.message}`)
  }
  const importedRevision = importedCommit.revision
  const importedPackage = {
    assets: [{
      assetId: 'asset:repository-fixture',
      original: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    }],
    documentId: importedRevision.id,
    packageId: 'package:repository-fixture',
    report: {
      exactAssetCount: 1,
      exactDocumentCount: 1,
      findings: [],
      unknownBlockCount: 0,
      unresolvedAssetCount: 0,
    },
    sourceDocumentId: initial.id,
  } as const
  await repository.persistImportedDraft({
    revision: importedRevision,
    transaction: importedCommit.transaction,
    packageImport: importedPackage,
  })
  await repository.persistImportedDraft({
    revision: importedRevision,
    transaction: importedCommit.transaction,
    packageImport: importedPackage,
  })
  const importedPackages = await repository.listImportedPackages()
  repository.close()
  return {
    conflictDraftCount: conflictDrafts.length,
    conflictDraftRevision: conflictDraft.revision,
    conflictDraftSourceDocumentId: conflictDraft.sourceDocumentId,
    duplicateStatus: duplicate.status,
    importedPackageAssetCount: importedPackages[0]?.assets.length ?? 0,
    importedPackageCount: importedPackages.length,
    importedPackageId: importedPackages[0]?.packageId ?? '',
    importedPackageReportDocumentCount: importedPackages[0]?.report?.exactDocumentCount ?? 0,
    recentIds: recents.map(item => item.documentId),
    restoredRevision: restored.revision,
    staleRevisionAfterWrite: stale.revision,
    staleStatus: stale.status,
  }
}

async function runScenario(): Promise<LocalRepositoryScenarioResult> {
  const memory = await checkRepository(createInMemoryLocalRepository({
    clock: () => '2026-08-24T00:00:00.000Z',
  }))
  const indexedDb = await checkRepository(createIndexedDbLocalRepository({
    clock: () => '2026-08-24T00:00:00.000Z',
    dbName: `OneImgLocalCoreScenario-${crypto.randomUUID()}`,
  }))
  return { indexedDb, memory, status: 'ready' }
}

export function LocalRepositoryScenarioClient() {
  const [result, setResult] = useState<LocalRepositoryScenarioResult | { readonly status: 'error'; readonly message: string } | null>(null)

  useEffect(() => {
    runScenario().then(setResult).catch((error) => {
      setResult({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    })
  }, [])

  return (
    <main>
      <h1>Local Repository scenario</h1>
      <output data-testid="local-repository-result">
        {result === null ? '{"status":"running"}' : JSON.stringify(result)}
      </output>
    </main>
  )
}
