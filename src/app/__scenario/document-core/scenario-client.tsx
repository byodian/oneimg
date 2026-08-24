'use client'

import { useEffect, useState } from 'react'
import {
  type DocumentCoreErrorCode,
  createDocumentSession,
  createRichTextBlock,
  createUnknownBlock,
  createUntouchedDocumentRevision,
  deserializeDocumentRevision,
  serializeDocumentRevision,
} from '@/features/document-core'

interface DocumentCoreScenarioResult {
  readonly initialRevision: number
  readonly insertedBlockKinds: readonly string[]
  readonly originalBlockCount: number
  readonly revisionAfterInsert: number
  readonly revisionAfterRedo: number
  readonly revisionAfterUndo: number
  readonly serializedEqual: boolean
  readonly staleCommit: {
    readonly code: DocumentCoreErrorCode
    readonly status: 'rejected'
  }
  readonly status: 'ready'
  readonly unknownBlockRoundTrip: boolean
}

const richText = createRichTextBlock('block:intro', {
  type: 'doc',
  children: [{ type: 'paragraph', text: '首个可编辑内容。' }],
})

const unknown = createUnknownBlock({
  id: 'block:future',
  originalKind: 'timeline',
  originalVersion: 'timeline@2',
  raw: {
    id: 'block:future',
    kind: 'timeline',
    version: 'timeline@2',
    entries: [{ id: 'entry:1', label: '保留内容' }],
  },
})

function runScenario(): DocumentCoreScenarioResult {
  const initial = createUntouchedDocumentRevision({
    documentId: 'document:core-fixture',
    pageId: 'page:core-fixture',
  })
  const session = createDocumentSession(initial, {
    createId: (kind, hint) => `transaction:${kind}:${hint}`,
  })
  const initialRevision = session.getRevision()
  const firstPageId = initialRevision.pages[0]!.id
  const commit = session.commit({
    blocks: [richText, unknown],
    pageId: firstPageId,
    type: 'insert-blocks',
  })
  if (commit.status !== 'committed') {
    throw new Error(`Document Core fixture commit failed: ${commit.message}`)
  }
  const stale = session.commit({
    block: richText,
    pageId: firstPageId,
    type: 'insert-block',
  }, { expectedRevision: 1 })
  if (stale.status !== 'rejected') {
    throw new Error('Document Core fixture stale commit was accepted')
  }
  const revisionAfterInsert = session.getRevision()
  const serialized = session.serialize()
  const roundTrip = deserializeDocumentRevision(serialized)
  const serializedAgain = serializeDocumentRevision(roundTrip)
  const unknownRoundTrip = roundTrip.pages[0]!.blocks[1]!
  const undo = session.undo()
  if (undo.status !== 'committed') {
    throw new Error('Document Core fixture undo was not committed')
  }
  const redo = session.redo()
  if (redo.status !== 'committed') {
    throw new Error('Document Core fixture redo was not committed')
  }
  return {
    initialRevision: initialRevision.revision,
    insertedBlockKinds: revisionAfterInsert.pages[0]!.blocks.map(block => block.kind),
    originalBlockCount: initialRevision.pages[0]!.blocks.length,
    revisionAfterInsert: revisionAfterInsert.revision,
    revisionAfterRedo: redo.revision.revision,
    revisionAfterUndo: undo.revision.revision,
    serializedEqual: serialized === serializedAgain,
    staleCommit: {
      code: stale.code,
      status: 'rejected',
    },
    status: 'ready',
    unknownBlockRoundTrip: unknownRoundTrip.kind === 'unknown'
      && unknownRoundTrip.raw.kind === 'timeline'
      && unknownRoundTrip.raw.entries !== undefined,
  }
}

export function DocumentCoreScenarioClient() {
  const [result, setResult] = useState<DocumentCoreScenarioResult | null>(null)

  useEffect(() => {
    setResult(runScenario())
  }, [])

  return (
    <main>
      <h1>Document Core scenario</h1>
      <output data-testid="document-core-result">
        {result === null ? '{"status":"running"}' : JSON.stringify(result)}
      </output>
    </main>
  )
}
