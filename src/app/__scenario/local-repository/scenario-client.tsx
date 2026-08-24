'use client'

import { useEffect, useState } from 'react'
import {
  type EditTransaction,
  createDocumentSession,
  createRichTextBlock,
  createUntouchedDocumentRevision,
} from '@/features/document-core'
import {
  type LocalRepository,
  createInMemoryLocalRepository,
  createIndexedDbLocalRepository,
} from '@/features/local-repository'

interface RepositoryCheck {
  readonly duplicateStatus: string
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

function makeInitialTransaction(documentId: string): EditTransaction {
  return {
    documentId,
    id: 'transaction:initial',
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
  const restored = await repository.restore(initial.id)
  if (!restored) {
    throw new Error('Repository did not restore the fixture')
  }
  const recents = await repository.listRecents()
  repository.close()
  return {
    duplicateStatus: duplicate.status,
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
