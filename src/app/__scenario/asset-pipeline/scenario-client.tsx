'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import { collectSnapshotResourceIds } from '@/features/canonical-renderer/model'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import {
  type CanonicalRenderReadiness,
  waitForCanonicalRenderReady,
} from '@/features/canonical-renderer/render-ready'
import {
  type ResolvedResourceSet,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import {
  type AssetRecord,
  createBrowserAssetPipeline,
} from '@/features/asset-pipeline'
import { MediaGroupEditor } from '@/features/asset-pipeline/media-group-editor'
import {
  type DocumentCommitResult,
  type DocumentRevision,
  type DocumentSession,
  type MediaArrangement,
  type MediaGroupChanges,
  type MediaItem,
  createDocumentSession,
  createMediaGroupBlock,
  createMediaItem,
  createUntouchedDocumentRevision,
  isMeaningfulDocumentRevision,
} from '@/features/document-core'
import {
  createGeneralLongImageSnapshot,
  generalLongImageResourceDefinitions,
} from '@/features/general-long-image'
import {
  type ExportPreflightResult,
  evaluateExportPreflight,
  readPreflightImageObservations,
} from '@/features/export-engine'

function isCommitted(result: DocumentCommitResult): result is Extract<DocumentCommitResult, { status: 'committed' }> {
  return result.status === 'committed'
}

function getMediaGroup(revision: DocumentRevision) {
  return revision.pages.flatMap(page => page.blocks).find(block => block.kind === 'media-group')
}

export function AssetPipelineScenario() {
  const pipeline = useMemo(() => createBrowserAssetPipeline(), [])
  const session = useRef<DocumentSession | undefined>(undefined)
  if (session.current === undefined) {
    session.current = createDocumentSession(createUntouchedDocumentRevision({
      documentId: 'document:asset-pipeline-scenario',
    }))
  }

  const [revision, setRevision] = useState(() => session.current!.getRevision())
  const [assets, setAssets] = useState<readonly AssetRecord[]>([])
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [readiness, setReadiness] = useState<CanonicalRenderReadiness>()
  const [imageObservations, setImageObservations] = useState<ReturnType<typeof readPreflightImageObservations>>([])
  const [lastTransactionType, setLastTransactionType] = useState<string>()
  const [error, setError] = useState<string>()

  const assetMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets])
  const snapshot = useMemo<CanonicalRenderSnapshot>(
    () => createGeneralLongImageSnapshot(revision, { assets: assetMap }),
    [assetMap, revision],
  )
  const resourceDefinitions = useMemo(() => [
    ...generalLongImageResourceDefinitions,
    ...assets.flatMap(asset => asset.status === 'ready'
      ? [{
          id: asset.renderSource.id,
          kind: 'image' as const,
          mimeType: asset.renderSource.mimeType,
          source: {
            type: 'blob' as const,
            create: () => pipeline.getRenderSource(asset.id).blob,
          },
        }]
      : []),
  ], [assets, pipeline])
  const resolver = useMemo(() => createBrowserResourceResolver(resourceDefinitions), [resourceDefinitions])
  const renderResources = resources !== undefined
    && collectSnapshotResourceIds(snapshot).every(resourceId => resources.resources.some(resource => resource.id === resourceId))
    ? resources
    : undefined
  const meaningful = useMemo(() => isMeaningfulDocumentRevision(revision), [revision])
  const preflight = useMemo<ExportPreflightResult>(() => evaluateExportPreflight({
    highFidelityAvailable: false,
    images: imageObservations,
    localCapabilityProbe: { status: 'passed' },
    meaningful,
    readiness,
    renderReady: readiness !== undefined,
    rendererAvailable: true,
    resourceResolutionPending: renderResources === undefined,
    resolvedResourceIds: renderResources?.resources.map(resource => resource.id),
    snapshot,
    unresolvedResourceIds: snapshot.unresolvedResourceIds,
  }), [imageObservations, meaningful, readiness, renderResources, snapshot])

  const mediaGroup = getMediaGroup(revision)
  const mediaItems = mediaGroup?.kind === 'media-group' ? mediaGroup.items : []
  const result = {
    assetCount: mediaItems.length,
    assetStatuses: mediaItems.map(item => assetMap.get(item.assetId)?.status ?? 'unresolved'),
    canExport: preflight.canExport,
    document: session.current.serialize(),
    lastTransactionType,
    originalMimeTypes: mediaItems.flatMap((item) => {
      const asset = assetMap.get(item.assetId)
      return asset === undefined ? [] : [asset.original.mimeType]
    }),
    previewResourceIds: snapshot.document.sections.flatMap(section => section.kind === 'media-group'
      ? section.items.flatMap(item => item.resourceId === undefined ? [] : [item.resourceId])
      : []),
    renderSourceMimeTypes: mediaItems.flatMap((item) => {
      const asset = assetMap.get(item.assetId)
      return asset?.status === 'ready' ? [asset.renderSource.mimeType] : []
    }),
    renderSourceDimensions: mediaItems.flatMap((item) => {
      const asset = assetMap.get(item.assetId)
      return asset?.status === 'ready' ? [asset.renderSource.metadata.intrinsicDimensions] : []
    }),
    renderSourceExifOrientations: mediaItems.flatMap((item) => {
      const asset = assetMap.get(item.assetId)
      return asset?.status === 'ready' ? [asset.renderSource.metadata.exifOrientation] : []
    }),
    renderSourceOrientations: mediaItems.flatMap((item) => {
      const asset = assetMap.get(item.assetId)
      return asset?.status === 'ready' ? [asset.renderSource.metadata.orientation] : []
    }),
    transactionCount: Math.max(0, revision.revision - 1),
    unresolvedAssetIds: snapshot.unresolvedResourceIds ?? [],
  }

  useEffect(() => {
    let active = true
    let resolved: ResolvedResourceSet | undefined
    const controller = new AbortController()
    setResources(undefined)
    setReadiness(undefined)
    resolver.resolve(snapshot, 'preview', { signal: controller.signal })
      .then((resourceSet) => {
        resolved = resourceSet
        if (!active) {
          resourceSet.release()
          return
        }
        setResources(resourceSet)
      })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })
    return () => {
      active = false
      controller.abort()
      resolved?.release()
    }
  }, [resolver, snapshot])

  useEffect(() => {
    if (renderResources === undefined) {
      setReadiness(undefined)
      return
    }
    let active = true
    const root = document.querySelector<HTMLElement>('[data-testid="asset-preview"] [data-oneimg-render-root]')
    if (root === null) {
      return
    }
    waitForCanonicalRenderReady(root, snapshot, renderResources)
      .then((nextReadiness) => {
        if (!active) {
          return
        }
        root.dataset.renderReady = 'true'
        setReadiness(nextReadiness)
        setImageObservations(readPreflightImageObservations(root))
      })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })
    return () => {
      active = false
    }
  }, [renderResources, snapshot])

  async function importFiles(files: readonly File[]) {
    if (files.length === 0) {
      return
    }
    setError(undefined)
    try {
      const imported = await pipeline.ingestMany(files)
      const current = session.current!.getRevision()
      const currentGroup = getMediaGroup(current)
      const currentItems = currentGroup?.kind === 'media-group' ? currentGroup.items : []
      const nextItems = [
        ...currentItems,
        ...imported.entries.map((entry, index) => createMediaItem({
          assetId: entry.asset.id,
          featured: currentItems.length === 0 && index === 0,
          id: `media-item-${currentItems.length + index + 1}`,
        })),
      ]
      const block = createMediaGroupBlock({
        ...(currentGroup?.kind === 'media-group' ? { arrangement: currentGroup.arrangement } : {}),
        id: currentGroup?.id ?? 'block:asset-media-group',
        items: nextItems,
      })
      const commit = currentGroup?.kind === 'media-group'
        ? session.current!.commit({ block, blockId: currentGroup.id, type: 'replace-block' }, { expectedRevision: current.revision })
        : session.current!.commit({
          block,
          index: current.pages[0]!.blocks.length,
          pageId: current.pages[0]!.id,
          type: 'insert-block',
        }, { expectedRevision: current.revision })
      if (!isCommitted(commit)) {
        throw new Error(commit.message)
      }
      setRevision(commit.revision)
      setLastTransactionType(commit.transaction.intentType)
      setAssets(pipeline.list())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  async function relinkFile(itemId: string, file: File) {
    setError(undefined)
    try {
      const imported = await pipeline.ingest(file)
      const current = session.current!.getRevision()
      const currentGroup = getMediaGroup(current)
      const item = currentGroup?.kind === 'media-group'
        ? currentGroup.items.find(candidate => candidate.id === itemId)
        : undefined
      if (item === undefined) {
        throw new Error(`Media Item ${itemId} was not found`)
      }
      if (!commitMediaItem({ ...item, assetId: imported.asset.id })) {
        throw new Error('资源重新链接未提交')
      }
      setAssets(pipeline.list())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  function commitMediaItem(item: MediaItem) {
    const current = session.current!.getRevision()
    const currentGroup = getMediaGroup(current)
    if (currentGroup?.kind !== 'media-group' || currentGroup.items.every(candidate => candidate.id !== item.id)) {
      setError(`Media Item ${item.id} was not found`)
      return false
    }
    const commit = session.current!.commit({
      blockId: currentGroup.id,
      changes: {
        alternativeText: item.alternativeText,
        assetId: item.assetId,
        caption: item.caption,
        featured: item.featured,
        fit: item.fit,
        focalPoint: item.focalPoint,
        rotation: item.rotation,
        zoom: item.zoom,
      },
      itemId: item.id,
      selection: { blockId: currentGroup.id },
      type: 'update-media-item',
    }, { expectedRevision: current.revision })
    if (!isCommitted(commit)) {
      setError(commit.message)
      return false
    }
    setRevision(commit.revision)
    setLastTransactionType(commit.transaction.intentType)
    return true
  }

  function commitMediaGroupChanges(changes: MediaGroupChanges) {
    const current = session.current!.getRevision()
    const currentGroup = getMediaGroup(current)
    if (currentGroup?.kind !== 'media-group') {
      return false
    }
    const commit = session.current!.commit({
      blockId: currentGroup.id,
      changes,
      selection: { blockId: currentGroup.id },
      type: 'update-media-group',
    }, { expectedRevision: current.revision })
    if (!isCommitted(commit)) {
      setError(commit.message)
      return false
    }
    setRevision(commit.revision)
    setLastTransactionType(commit.transaction.intentType)
    return true
  }

  function setFeaturedItem(itemId: string) {
    const current = session.current!.getRevision()
    const currentGroup = getMediaGroup(current)
    if (currentGroup?.kind !== 'media-group') {
      return false
    }
    const commit = session.current!.commit({
      blockId: currentGroup.id,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'set-media-group-featured',
    }, { expectedRevision: current.revision })
    if (!isCommitted(commit)) {
      setError(commit.message)
      return false
    }
    setRevision(commit.revision)
    setLastTransactionType(commit.transaction.intentType)
    return true
  }

  function removeMediaItem(itemId: string) {
    const current = session.current!.getRevision()
    const currentGroup = getMediaGroup(current)
    if (currentGroup?.kind !== 'media-group') {
      return false
    }
    const commit = session.current!.commit({
      blockId: currentGroup.id,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'remove-media-item',
    }, { expectedRevision: current.revision })
    if (!isCommitted(commit)) {
      setError(commit.message)
      return false
    }
    setRevision(commit.revision)
    setLastTransactionType(commit.transaction.intentType)
    return true
  }

  function moveMediaItem(itemId: string, index: number) {
    const current = session.current!.getRevision()
    const currentGroup = getMediaGroup(current)
    if (currentGroup?.kind !== 'media-group') {
      return false
    }
    const commit = session.current!.commit({
      blockId: currentGroup.id,
      index,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'move-media-item',
    }, { expectedRevision: current.revision })
    if (!isCommitted(commit)) {
      setError(commit.message)
      return false
    }
    setRevision(commit.revision)
    setLastTransactionType(commit.transaction.intentType)
    return true
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Asset Pipeline · Issue #38</p>
          <h1 className="mt-2 text-2xl font-semibold">导入图片并生成保真 MediaGroup</h1>
          <p className="mt-2 text-sm text-slate-600">原始文件保留在本地，预览和导出只读取同一个规范化 Render Source。</p>
        </header>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="asset-error">{error}</p>}

        <MediaGroupEditor
          arrangement={mediaGroup?.kind === 'media-group' ? mediaGroup.arrangement : 'auto'}
          items={mediaItems}
          onImportFiles={importFiles}
          onMoveItem={moveMediaItem}
          onRemoveItem={removeMediaItem}
          onRelinkItem={relinkFile}
          onSetFeaturedItem={setFeaturedItem}
          onUpdateArrangement={(arrangement: MediaArrangement) => commitMediaGroupChanges({ arrangement })}
          onUpdateItem={commitMediaItem}
          unresolvedItemIds={mediaItems
            .filter(item => assetMap.get(item.assetId)?.status !== 'ready')
            .map(item => item.id)}
        />

        <section className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(24,32,57,0.14)]" data-testid="asset-preview">
          {renderResources === undefined
            ? <p className="bg-white p-8 text-sm text-slate-500">正在准备本地资源…</p>
            : <CanonicalRenderSurface mode="preview" resources={renderResources} snapshot={snapshot} />}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">导出状态</h2>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" data-testid="asset-export-button" disabled={!preflight.canExport} type="button">导出本地文件</button>
          </div>
          <p className="mt-2 text-sm text-slate-600">{preflight.canExport ? '可以导出' : '导出已阻止，先解决资源问题'}</p>
          {!preflight.canExport && preflight.findings.length > 0 && (
            <ul className="mt-2 grid gap-1 text-sm text-red-700" data-testid="asset-preflight">
              {preflight.findings.map(finding => (
                <li key={`${finding.code}:${finding.resourceId ?? ''}`}>
                  {finding.message}
                  {finding.action?.kind === 'relink-resource' && <button className="ml-2 underline" type="button">重新链接资源</button>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <output data-testid="asset-pipeline-result" hidden>{JSON.stringify(result)}</output>
      </div>
    </main>
  )
}
