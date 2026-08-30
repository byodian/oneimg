'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import { type CanonicalRenderSnapshot, collectSnapshotResourceIds } from '@/features/canonical-renderer/model'
import {
  type ResolvedResourceSet,
  ResourceResolverError,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import {
  type CanonicalRenderReadiness,
  CanonicalRenderReadyError,
  getCanonicalLayoutFingerprint,
  getCanonicalSemanticSliceBoundaries,
  waitForCanonicalRenderReady,
} from '@/features/canonical-renderer/render-ready'
import {
  type DocumentCommitResult,
  type DocumentHistoryResult,
  type DocumentRevision,
  type DocumentSession,
  type MediaItem,
  createDocumentSession,
  createMediaGroupBlock,
  createMediaItem,
  createRichTextBlock,
  createUntouchedDocumentRevision,
  isMeaningfulDocumentRevision,
} from '@/features/document-core'
import {
  type AssetRecord,
  createBrowserAssetPipeline,
} from '@/features/asset-pipeline'
import { MediaGroupEditor } from '@/features/asset-pipeline/media-group-editor'
import {
  createGeneralLongImageSnapshot,
  createRichTextDocumentFromPlainText,
  generalLongImageResourceDefinitions,
  richTextDocumentHasMeaningfulText,
  richTextDocumentToEditableText,
  updateGeneralLongImagePresentation,
  updateRichTextDocumentText,
} from '@/features/general-long-image'
import { GeneralLongImagePresentationPanel } from '@/features/general-long-image/presentation-panel'
import {
  type ExportJob,
  ExportJobError,
  type ExportOutputScale,
  ExportPanel,
  type ExportPlan,
  ExportPreflightPanel,
  type PreflightAction,
  evaluateExportPreflight,
  probeLocalSvgCapability,
  readPreflightImageObservations,
} from '@/features/export-engine'
import { canonicalStylePack } from '@/features/canonical-renderer/style-pack'
import { createStudioExportEngine } from '@/features/export-engine/studio-export-engine'
import { parseSmartPaste } from '@/features/smart-paste'
import {
  type LocalPngArtifact,
  getLocalPngSliceFilename,
} from '@/features/local-export/local-rasterizer'
import { isRenderAbortError } from '@/features/rendering/cancellation'
import {
  type ConflictDraft,
  type LocalRepository,
  LocalRepositoryError,
  createIndexedDbLocalRepository,
} from '@/features/local-repository'

const ACTIVE_DOCUMENT_HINT_KEY = 'oneimg:studio:active-document'
const STUDIO_DATABASE_NAME = 'OneImgStudio'

type StudioPhase = 'conflict' | 'editing' | 'error' | 'exporting' | 'ready' | 'restored' | 'saved' | 'saving' | 'unsaved'

interface StudioDocumentState {
  readonly conflictDraftCount: number
  readonly documentId: string
  readonly durableRevision: number
  readonly meaningful: boolean
  readonly recentCount: number
  readonly restored: boolean
  readonly revision: number
  readonly status: string
}

export interface StudioClientProps {
  readonly createRepository?: () => LocalRepository
}

type PendingStudioCommit = {
  readonly revision: DocumentRevision
  readonly transaction: Extract<DocumentCommitResult, { status: 'committed' }>['transaction']
}

interface StudioExportReceipt {
  readonly documentRevision?: number
  readonly format: 'png' | 'zip'
  readonly fromCache: boolean
  readonly snapshotId: string
}

function createStudioDocumentId() {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `document:studio:${suffix}`
}

function phaseLabel(phase: StudioPhase) {
  switch (phase) {
    case 'conflict':
      return '已保留冲突草稿'
    case 'editing':
      return '编辑中'
    case 'error':
      return '加载失败'
    case 'exporting':
      return '导出中'
    case 'ready':
      return '可以开始编辑'
    case 'restored':
      return '已恢复'
    case 'saved':
      return '已保存'
    case 'saving':
      return '保存中…'
    case 'unsaved':
      return '未保存，仍可继续编辑'
  }
}

function findBlock(revision: DocumentRevision, blockId: string | undefined) {
  if (blockId === undefined) {
    return undefined
  }
  return revision.pages.flatMap(page => page.blocks).find(block => block.id === blockId)
}

function findMediaGroup(revision: DocumentRevision) {
  const block = revision.pages.flatMap(page => page.blocks).find(candidate => candidate.kind === 'media-group')
  return block?.kind === 'media-group' ? block : undefined
}

function normalizeEditableText(text: string) {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(/\n+/g, '\n').trim()
}

function readStudioPageMeasurement(snapshot: CanonicalRenderSnapshot) {
  const root = document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-oneimg-render-root]')
  if (root === null) {
    return undefined
  }
  const bounds = root.getBoundingClientRect()
  return [{
    height: bounds.height,
    id: 'page-1',
    kind: snapshot.presentation.pageFormat.kind,
    layoutFingerprint: getCanonicalLayoutFingerprint(root),
    semanticBoundaries: getCanonicalSemanticSliceBoundaries(root),
    width: bounds.width,
  }] as const
}

function sliceBoundaryLabel(kind: string) {
  switch (kind) {
    case 'block':
      return 'Block'
    case 'heading':
      return '标题'
    case 'keep-together':
      return 'Keep Together'
    case 'section':
      return 'Section'
    case 'document-end':
      return '文档末尾'
    case 'visual-fallback':
      return '视觉回退'
    default:
      return kind
  }
}

function StudioSliceBoundaryOverlay({ plan }: { readonly plan: ExportPlan }) {
  const page = plan.pages[0]
  const slices = page?.semanticSlices ?? []
  if (slices.length <= 1) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      data-testid="studio-slice-boundaries"
    >
      <div className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white shadow-sm">
        预计输出 {slices.length} 个 Slice
      </div>
      {slices.slice(0, -1).map(slice => (
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-indigo-500/80"
          key={slice.index}
          style={{ top: `${(slice.y + slice.height) / plan.outputScale}px` }}
        >
          <span className="absolute right-3 -top-6 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Slice {slice.index + 1} · {sliceBoundaryLabel(slice.boundary.kind)}
          </span>
        </div>
      ))}
    </div>
  )
}

function isCommitted(
  result: DocumentCommitResult | DocumentHistoryResult,
): result is Extract<DocumentCommitResult, { status: 'committed' }> {
  return result.status === 'committed'
}

export function StudioClient({ createRepository }: StudioClientProps = {}) {
  const mounted = useRef(true)
  const durableRevisionNumber = useRef(0)
  const durableRevisionSnapshot = useRef<DocumentRevision>()
  const pendingCommit = useRef<PendingStudioCommit>()
  const session = useRef<DocumentSession>()
  const repository = useRef<LocalRepository>()
  const saveTail = useRef(Promise.resolve())
  const exportJobRef = useRef<ExportJob>()
  const readinessGeneration = useRef(0)
  // Keep the native contenteditable node stable during input while exposing the latest Studio state to events.
  const richTextBlurHandler = useRef<(blockId: string | undefined, text: string) => void>(() => undefined)
  const richTextInputHandler = useRef<() => void>(() => undefined)
  const richTextPasteHandler = useRef<(blockId: string | undefined, payload: { readonly html: string; readonly text: string }) => boolean>(() => false)
  const stableRichTextBlurHandler = useCallback(
    (blockId: string | undefined, text: string) => richTextBlurHandler.current(blockId, text),
    [],
  )
  const stableRichTextInputHandler = useCallback(
    () => richTextInputHandler.current(),
    [],
  )
  const stableRichTextPasteHandler = useCallback(
    (blockId: string | undefined, payload: { readonly html: string; readonly text: string }) => (
      richTextPasteHandler.current(blockId, payload)
    ),
    [],
  )
  const assetPipeline = useMemo(() => createBrowserAssetPipeline(), [])
  const [revision, setRevision] = useState<DocumentRevision>()
  const [assets, setAssets] = useState<readonly AssetRecord[]>([])
  const [assetImporting, setAssetImporting] = useState(false)
  const [durableRevision, setDurableRevision] = useState(0)
  const [pendingCommitRevision, setPendingCommitRevision] = useState<number>()
  const [recentCount, setRecentCount] = useState(0)
  const [conflictDraft, setConflictDraft] = useState<ConflictDraft>()
  const [conflictDraftCount, setConflictDraftCount] = useState(0)
  const [conflictPreviewRevision, setConflictPreviewRevision] = useState<DocumentRevision>()
  const [restored, setRestored] = useState(false)
  const [phase, setPhase] = useState<StudioPhase>('ready')
  const [cleanPreview, setCleanPreview] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [renderReadiness, setRenderReadiness] = useState<CanonicalRenderReadiness>()
  const [renderReadyRetryVersion, setRenderReadyRetryVersion] = useState(0)
  const [rendererAvailable, setRendererAvailable] = useState(true)
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [resolvedResourceKey, setResolvedResourceKey] = useState('')
  const [imageObservations, setImageObservations] = useState<ReturnType<typeof readPreflightImageObservations>>([])
  const [resourceErrorIds, setResourceErrorIds] = useState<readonly string[]>([])
  const [renderErrorResourceIds, setRenderErrorResourceIds] = useState<readonly string[]>([])
  const [localCapabilityProbe, setLocalCapabilityProbe] = useState<{
    readonly reason?: string
    readonly status: 'failed' | 'passed' | 'pending'
  }>({ status: 'pending' })
  const [error, setError] = useState<string>()
  const [exportPanelOpen, setExportPanelOpen] = useState(false)
  const [exportPlan, setExportPlan] = useState<ExportPlan>()
  const [exportPlanVersion, setExportPlanVersion] = useState(0)
  const [exportJob, setExportJob] = useState<ExportJob>()
  const [exportJobState, setExportJobState] = useState<ReturnType<ExportJob['getState']>>()
  const [exportOutputScale, setExportOutputScale] = useState<ExportOutputScale>(1)
  const [exportArtifact, setExportArtifact] = useState<LocalPngArtifact>()
  const [lastExport, setLastExport] = useState<StudioExportReceipt>()

  const assetMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets])
  const resourceDefinitions = useMemo(() => [
    ...generalLongImageResourceDefinitions,
    ...assets.flatMap((asset) => {
      if (asset.status !== 'ready') {
        return []
      }
      const source = assetPipeline.createRenderSourceDefinition(asset.id)
      return [{
        id: source.id,
        kind: 'image' as const,
        mimeType: source.mimeType,
        source: {
          create: source.create,
          type: 'blob' as const,
        },
      }]
    }),
  ], [assetPipeline, assets])
  const resolver = useMemo(
    () => createBrowserResourceResolver(resourceDefinitions),
    [resourceDefinitions],
  )
  const exportEngine = useMemo(
    () => createStudioExportEngine(resourceDefinitions),
    [resourceDefinitions],
  )

  const displayedRevision = conflictPreviewRevision ?? revision
  const snapshot = useMemo(
    () => {
      if (displayedRevision === undefined) {
        return undefined
      }
      try {
        return createGeneralLongImageSnapshot(displayedRevision, { assets: assetMap })
      } catch {
        return undefined
      }
    },
    [assetMap, displayedRevision],
  )
  const contentError = displayedRevision !== undefined && snapshot === undefined ? 'invalid-document' : undefined
  const resourceSnapshot = useRef(snapshot)
  resourceSnapshot.current = snapshot
  const resourceSetRef = useRef<ResolvedResourceSet>()
  resourceSetRef.current = resources
  const resourceKey = useMemo(
    () => snapshot === undefined ? '' : collectSnapshotResourceIds(snapshot).join('|'),
    [snapshot],
  )
  const renderResources = resources !== undefined && resolvedResourceKey === resourceKey
    ? resources
    : undefined
  const meaningful = useMemo(() => {
    if (revision === undefined) {
      return false
    }
    try {
      return isMeaningfulDocumentRevision(revision)
    } catch {
      return false
    }
  }, [revision])
  const mediaGroup = revision === undefined ? undefined : findMediaGroup(revision)

  const preflight = useMemo(() => evaluateExportPreflight({
    contentError,
    fontFallbackIds: renderResources?.fontFallbackIds,
    highFidelityAvailable: false,
    images: imageObservations,
    localCapabilityProbe,
    meaningful,
    readiness: renderReadiness,
    renderReady: previewReady,
    rendererAvailable: rendererAvailable && snapshot?.stylePackId === canonicalStylePack.id,
    resourceResolutionPending: snapshot !== undefined && renderResources === undefined && resourceErrorIds.length === 0,
    resolvedResourceIds: renderResources?.resources.map(resource => resource.id),
    snapshot,
    unresolvedResourceIds: [...resourceErrorIds, ...renderErrorResourceIds],
  }), [contentError, imageObservations, localCapabilityProbe, meaningful, previewReady, renderErrorResourceIds, renderReadiness, renderResources, rendererAvailable, resourceErrorIds, snapshot])

  const currentExportArtifact = exportPlan !== undefined
    && exportArtifact !== undefined
    && exportArtifact.diagnostics.snapshotId === exportPlan.snapshot.snapshotId
    && exportArtifact.diagnostics.exportFingerprint === exportPlan.resourceFingerprint
    && exportArtifact.diagnostics.layoutFingerprint === exportPlan.pages[0]?.layoutFingerprint
    ? exportArtifact
    : undefined

  const buildExportPlan = useCallback(() => {
    if (snapshot === undefined) {
      return undefined
    }
    return exportEngine.plan({
      documentRevision: revision?.revision,
      meaningful,
      output: { format: 'png', scale: exportOutputScale },
      pageMeasurements: readStudioPageMeasurement(snapshot),
      renderReady: previewReady,
      preflightFindings: preflight.findings,
      resourceFingerprint: renderResources?.fingerprint,
      snapshot,
    })
  }, [exportEngine, exportOutputScale, meaningful, preflight.findings, previewReady, renderResources?.fingerprint, revision?.revision, snapshot])

  useEffect(() => {
    if (!exportPanelOpen || snapshot === undefined) {
      return
    }
    setExportPlan(buildExportPlan())
  }, [buildExportPlan, exportPanelOpen, exportPlanVersion, snapshot])

  useEffect(() => {
    setExportArtifact(current => current?.diagnostics.snapshotId === snapshot?.snapshotId ? current : undefined)
  }, [snapshot?.snapshotId])

  useEffect(() => {
    if (exportJob === undefined) {
      setExportJobState(undefined)
      return
    }
    return exportJob.subscribe(setExportJobState)
  }, [exportJob])

  useEffect(() => {
    let active = true
    probeLocalSvgCapability()
      .then((result) => {
        if (active) {
          setLocalCapabilityProbe(result)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setLocalCapabilityProbe({
            reason: reason instanceof Error ? reason.message : '本地导出能力验证失败',
            status: 'failed',
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    let active = true

    async function start() {
      try {
        const localRepository = createRepository?.() ?? createIndexedDbLocalRepository({ dbName: STUDIO_DATABASE_NAME })
        repository.current = localRepository
        const recents = await localRepository.listRecents()
        const conflictDrafts = await localRepository.listConflictDrafts()
        const hintedDocumentId = window.localStorage.getItem(ACTIVE_DOCUMENT_HINT_KEY)
        let restoredRevision: DocumentRevision | null = null

        const candidateDocumentIds = Array.from(new Set([
          ...recents.map(item => item.documentId),
          ...(hintedDocumentId === null ? [] : [hintedDocumentId]),
        ]))
        for (const candidateDocumentId of candidateDocumentIds) {
          try {
            const candidate = await localRepository.restore(candidateDocumentId)
            const isActiveHint = candidateDocumentId === hintedDocumentId
            if (candidate !== null && (isMeaningfulDocumentRevision(candidate) || isActiveHint)) {
              restoredRevision = candidate
              break
            }
          } catch {
            // A corrupt candidate must not prevent a newer valid Recent from opening.
          }
        }
        if (!active) {
          return
        }

        const hasRestoredRevision = restoredRevision !== null
        const usableRevision: DocumentRevision = hasRestoredRevision
          ? restoredRevision!
          : createUntouchedDocumentRevision({ documentId: createStudioDocumentId() })
        session.current = createDocumentSession(usableRevision)
        durableRevisionSnapshot.current = usableRevision
        durableRevisionNumber.current = hasRestoredRevision ? usableRevision.revision : 0
        setRevision(usableRevision)
        setDurableRevision(durableRevisionNumber.current)
        setRecentCount(recents.length)
        setConflictDraftCount(conflictDrafts.length)
        setRestored(hasRestoredRevision)
        setPhase(hasRestoredRevision ? 'restored' : 'ready')
      } catch (reason) {
        if (!active) {
          return
        }
        setError(reason instanceof Error ? reason.message : String(reason))
        setPhase('error')
      }
    }

    start().catch(() => undefined)
    return () => {
      active = false
      mounted.current = false
      if (exportJobRef.current !== undefined) {
        exportEngine.cancel(exportJobRef.current.id)
      }
      repository.current?.close()
    }
    // The Repository and resource resolver are intentionally created once per Studio session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const snapshotForResources = resourceSnapshot.current
    if (snapshotForResources === undefined || resourceKey === '') {
      resourceSetRef.current?.release()
      resourceSetRef.current = undefined
      setResources(undefined)
      setResolvedResourceKey('')
      setPreviewReady(false)
      setRenderReadiness(undefined)
      setImageObservations([])
      setResourceErrorIds([])
      setRenderErrorResourceIds([])
      return
    }

    let active = true
    const controller = new AbortController()
    resourceSetRef.current?.release()
    resourceSetRef.current = undefined
    setResources(undefined)
    setResolvedResourceKey('')
    setPreviewReady(false)
    setRenderReadiness(undefined)
    setImageObservations([])
    setResourceErrorIds([])
    setRenderErrorResourceIds([])

    resolver.resolve(snapshotForResources, 'preview', { signal: controller.signal })
      .then((resourceSet) => {
        if (!active) {
          resourceSet.release()
          return
        }
        setResources(resourceSet)
        setResolvedResourceKey(resourceKey)
        setResourceErrorIds([])
      })
      .catch((reason: unknown) => {
        if (active && !isRenderAbortError(reason)) {
          setResources(undefined)
          setResolvedResourceKey('')
          setResourceErrorIds(reason instanceof ResourceResolverError ? reason.resourceIds : [])
          setError(reason instanceof Error ? reason.message : String(reason))
          setPhase('error')
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [resolver, resourceKey])

  useEffect(() => () => {
    resources?.release()
  }, [resources])

  useEffect(() => {
    const generation = readinessGeneration.current + 1
    readinessGeneration.current = generation
    if (
      !renderResources
      || snapshot === undefined
      || resourceSetRef.current !== renderResources
      || resolvedResourceKey !== resourceKey
    ) {
      setRendererAvailable(true)
      setPreviewReady(false)
      setRenderReadiness(undefined)
      return
    }

    let active = true
    setRendererAvailable(true)
    setPreviewReady(false)
    setRenderReadiness(undefined)
    setImageObservations([])
    setRenderErrorResourceIds([])
    const root = document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-oneimg-render-root]')
    if (!root) {
      setRendererAvailable(false)
      setError('Studio did not mount a Canonical Render Root')
      setPhase('error')
      return
    }

    waitForCanonicalRenderReady(root, snapshot, renderResources, {
      generation: {
        expected: generation,
        getCurrent: () => readinessGeneration.current,
      },
      isCurrent: () => active && readinessGeneration.current === generation,
    })
      .then((readiness) => {
        if (!active) {
          return
        }
        root.dataset.renderReady = 'true'
        setRenderReadiness(readiness)
        setRenderErrorResourceIds([])
        setImageObservations(readPreflightImageObservations(root))
        setPreviewReady(true)
        if (!meaningful && !cleanPreview) {
          document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-studio-empty-editor]')?.focus()
        }
      })
      .catch((reason: unknown) => {
        if (active && !isRenderAbortError(reason)) {
          setRenderErrorResourceIds(reason instanceof CanonicalRenderReadyError ? reason.resourceIds : [])
          if (reason instanceof CanonicalRenderReadyError && reason.readiness !== undefined) {
            setRenderReadiness(reason.readiness)
          }
          setError(reason instanceof Error ? reason.message : String(reason))
          setPhase('error')
        }
      })

    return () => {
      active = false
    }
  }, [cleanPreview, meaningful, renderReadyRetryVersion, renderResources, resolvedResourceKey, resourceKey, snapshot])

  function persistCommit(nextRevision: DocumentRevision, transaction: Extract<DocumentCommitResult, { status: 'committed' }>['transaction']) {
    const localRepository = repository.current
    const pending: PendingStudioCommit = { revision: nextRevision, transaction }
    pendingCommit.current = pending
    setPendingCommitRevision(nextRevision.revision)
    if (!localRepository) {
      setPhase('unsaved')
      return
    }

    const task = saveTail.current
      .catch(() => undefined)
      .then(async () => {
        const receipt = await localRepository.persistCommit({ revision: nextRevision, transaction })
        if (!mounted.current) {
          return
        }
        if (receipt.status === 'stale') {
          setError('这次保存基于较早版本，当前内容没有覆盖已提交版本。')
          setPhase('unsaved')
          return
        }
        durableRevisionNumber.current = Math.max(durableRevisionNumber.current, receipt.revision)
        durableRevisionSnapshot.current = nextRevision
        setDurableRevision(durableRevisionNumber.current)
        setRecentCount((await localRepository.listRecents()).length)
        setConflictDraftCount((await localRepository.listConflictDrafts()).length)
        window.localStorage.setItem(ACTIVE_DOCUMENT_HINT_KEY, nextRevision.id)
        if (pendingCommit.current?.transaction.id === pending.transaction.id) {
          pendingCommit.current = undefined
          setPendingCommitRevision(undefined)
          setError(undefined)
          setPhase('saved')
        } else {
          setPhase('saving')
        }
      })
      .catch((reason: unknown) => {
        if (!mounted.current) {
          return
        }
        if (reason instanceof LocalRepositoryError && reason.code === 'conflict') {
          pendingCommit.current = undefined
          setPendingCommitRevision(undefined)
          if (reason.conflictDraft !== undefined) {
            setConflictDraft(reason.conflictDraft)
            setConflictDraftCount(current => current + 1)
          }
          setError(reason.message)
          setPhase('conflict')
          return
        }
        setError(reason instanceof Error ? reason.message : String(reason))
        setPhase('unsaved')
      })
    saveTail.current = task.then(() => undefined, () => undefined)
  }

  function retryPendingCommit() {
    const pending = pendingCommit.current
    if (pending === undefined || phase === 'conflict') {
      return
    }
    setError(undefined)
    setPhase('saving')
    persistCommit(pending.revision, pending.transaction)
  }

  async function openConflictDraft() {
    const draft = conflictDraft
    const localRepository = repository.current
    if (draft === undefined || localRepository === undefined) {
      return
    }
    try {
      const restored = await localRepository.restore(draft.documentId)
      if (restored === null) {
        throw new Error('冲突草稿无法恢复')
      }
      setConflictPreviewRevision(restored)
      setError(undefined)
      setPhase('conflict')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('error')
    }
  }

  async function restoreDurableRevision() {
    const knownDurable = durableRevisionSnapshot.current
    if (knownDurable === undefined) {
      return
    }
    let durable = knownDurable
    const localRepository = repository.current
    if (localRepository !== undefined) {
      try {
        durable = await localRepository.restore(knownDurable.id) ?? knownDurable
      } catch {
        durable = knownDurable
      }
    }
    durableRevisionSnapshot.current = durable
    if (durableRevisionNumber.current > 0 || durable.revision > 1) {
      durableRevisionNumber.current = durable.revision
    }
    session.current = createDocumentSession(durable)
    pendingCommit.current = undefined
    setPendingCommitRevision(undefined)
    setRevision(durable)
    setConflictPreviewRevision(undefined)
    setConflictDraft(undefined)
    setError(undefined)
    if (localRepository !== undefined) {
      setRecentCount((await localRepository.listRecents()).length)
      setConflictDraftCount((await localRepository.listConflictDrafts()).length)
    }
    setDurableRevision(durableRevisionNumber.current)
    setPhase(durableRevisionNumber.current > 0 ? 'saved' : 'ready')
  }

  function commitText(blockId: string | undefined, text: string) {
    const currentSession = session.current
    const currentRevision = revision
    if (!currentSession || currentRevision === undefined || conflictDraft !== undefined || conflictPreviewRevision !== undefined) {
      return
    }

    const nextDocument = createRichTextDocumentFromPlainText(text)
    const hasText = richTextDocumentHasMeaningfulText(nextDocument)
    const existingBlock = findBlock(currentRevision, blockId)
    let result: DocumentCommitResult
    if (!hasText && blockId !== undefined && existingBlock !== undefined) {
      result = currentSession.commit({ blockId, type: 'remove-block' }, { expectedRevision: currentRevision.revision })
    } else if (hasText && blockId !== undefined && existingBlock?.kind === 'rich-text') {
      if (normalizeEditableText(richTextDocumentToEditableText(existingBlock.content)) === normalizeEditableText(text)) {
        return
      }
      const content = updateRichTextDocumentText(existingBlock.content, text)
      result = currentSession.commit({
        block: createRichTextBlock(blockId, content),
        blockId,
        type: 'replace-block',
      }, { expectedRevision: currentRevision.revision })
    } else if (hasText && blockId === undefined) {
      const nextBlockId = `${currentRevision.id}:block-1`
      result = currentSession.commit({
        block: createRichTextBlock(nextBlockId, nextDocument),
        index: 0,
        pageId: currentRevision.pages[0]!.id,
        type: 'insert-block',
      }, { expectedRevision: currentRevision.revision })
    } else {
      return
    }

    if (!isCommitted(result)) {
      setError(result.message)
      setPhase('unsaved')
      return
    }
    setError(undefined)
    setRevision(result.revision)
    setPhase('saving')
    persistCommit(result.revision, result.transaction)
  }

  async function importFiles(files: readonly File[]) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    if (
      files.length === 0
      || currentSession === undefined
      || currentRevision === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
      || assetImporting
    ) {
      return
    }

    const currentGroup = findMediaGroup(currentRevision)
    const currentItems = currentGroup?.items ?? []
    if (files.length > 9 - currentItems.length) {
      setError('一个 Media Group 最多保留 9 张图片；本次导入没有提交。')
      return
    }

    setAssetImporting(true)
    setError(undefined)
    try {
      const imported = await assetPipeline.ingestMany(files)
      const nextRevision = currentSession.getRevision()
      const nextGroup = findMediaGroup(nextRevision)
      const nextItems = nextGroup?.items ?? []
      if (imported.entries.length > 9 - nextItems.length) {
        throw new Error('一个 Media Group 最多保留 9 张图片；本次导入没有提交。')
      }
      const existingItemIds = new Set(nextItems.map(item => item.id))
      let nextItemNumber = nextItems.length + 1
      const importedItems = imported.entries.map((entry, index) => {
        let id = `media-item-${nextItemNumber}`
        nextItemNumber += 1
        while (existingItemIds.has(id)) {
          id = `media-item-${nextItemNumber}`
          nextItemNumber += 1
        }
        existingItemIds.add(id)
        return createMediaItem({
          assetId: entry.asset.id,
          featured: nextItems.length === 0 && index === 0,
          id,
        })
      })
      const block = createMediaGroupBlock({
        ...(nextGroup === undefined ? {} : { arrangement: nextGroup.arrangement }),
        id: nextGroup?.id ?? 'block:asset-media-group',
        items: [...nextItems, ...importedItems],
      })
      const result = nextGroup === undefined
        ? currentSession.commit({
          block,
          index: nextRevision.pages[0]!.blocks.length,
          pageId: nextRevision.pages[0]!.id,
          type: 'insert-block',
        }, { expectedRevision: nextRevision.revision })
        : currentSession.commit({ block, blockId: nextGroup.id, type: 'replace-block' }, {
          expectedRevision: nextRevision.revision,
        })
      if (!isCommitted(result)) {
        throw new Error(result.message)
      }
      setAssets(assetPipeline.list())
      setRevision(result.revision)
      setPhase('saving')
      persistCommit(result.revision, result.transaction)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('editing')
    } finally {
      setAssetImporting(false)
    }
  }

  async function relinkFile(itemId: string, file: File) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || currentGroup.items.every(item => item.id !== itemId)
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
      || assetImporting
    ) {
      return
    }

    setAssetImporting(true)
    setError(undefined)
    try {
      const imported = await assetPipeline.ingest(file)
      const nextGroup = findMediaGroup(currentSession.getRevision())
      const item = nextGroup?.items.find(candidate => candidate.id === itemId)
      if (item === undefined) {
        throw new Error(`Media Item ${itemId} was not found`)
      }
      if (!commitMediaItem({ ...item, assetId: imported.asset.id })) {
        throw new Error('资源重新链接未提交')
      }
      setAssets(assetPipeline.list())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('editing')
    } finally {
      setAssetImporting(false)
    }
  }

  function commitMediaItem(item: MediaItem) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
      || currentGroup.items.every(candidate => candidate.id !== item.id)
    ) {
      return false
    }

    const result = currentSession.commit({
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
    }, { expectedRevision: currentRevision.revision })
    if (!isCommitted(result)) {
      setError(result.message)
      setPhase('unsaved')
      return false
    }
    setError(undefined)
    setRevision(result.revision)
    setPhase('saving')
    persistCommit(result.revision, result.transaction)
    return true
  }

  function commitPresentation(change: Parameters<typeof updateGeneralLongImagePresentation>[1]) {
    const currentSession = session.current
    const currentRevision = revision
    if (!currentSession || currentRevision === undefined || conflictDraft !== undefined || conflictPreviewRevision !== undefined) {
      return
    }

    const presentation = updateGeneralLongImagePresentation(currentRevision.presentation, change)
    const currentPageFormat = currentRevision.presentation.pageFormat
    const nextPageFormat = presentation.pageFormat
    const unchanged = currentRevision.presentation.density === presentation.density
      && currentRevision.presentation.templateId === presentation.templateId
      && currentRevision.presentation.templateVersion === presentation.templateVersion
      && currentRevision.presentation.themeId === presentation.themeId
      && currentRevision.presentation.themeVersion === presentation.themeVersion
      && currentPageFormat.kind === nextPageFormat.kind
      && currentPageFormat.preset === nextPageFormat.preset
      && currentPageFormat.width === nextPageFormat.width
      && currentPageFormat.height === nextPageFormat.height
    if (unchanged) {
      return
    }

    const result = currentSession.commit({ presentation, type: 'set-presentation' }, {
      expectedRevision: currentRevision.revision,
    })
    if (!isCommitted(result)) {
      setError(result.message)
      setPhase('unsaved')
      return
    }
    setError(undefined)
    setRevision(result.revision)
    setPhase('saving')
    persistCommit(result.revision, result.transaction)
  }

  function handlePreflightAction(action: PreflightAction) {
    if (action.kind === 'focus-content') {
      const target = action.targetId === undefined
        ? document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-studio-empty-editor]')
        : Array.from(document.querySelectorAll<HTMLElement>('[data-testid="studio-editor"] [data-block-id]'))
          .find(element => element.dataset.blockId === action.targetId)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
      target?.focus()
      return
    }

    if (action.kind === 'apply-compatible-presentation') {
      if (revision === undefined) {
        return
      }
      const currentPageFormat = revision.presentation.pageFormat
      if (currentPageFormat.kind !== 'continuous' || currentPageFormat.preset !== 'long-image') {
        commitPresentation({ pageFormatId: 'long-image' })
        return
      }
      if (revision.presentation.templateId !== 'clear-reading') {
        commitPresentation({ templateId: 'clear-reading' })
        return
      }
      if (revision.presentation.themeId !== 'clear-paper') {
        commitPresentation({ themeId: 'clear-paper' })
        return
      }
      if (revision.presentation.density !== 'standard') {
        commitPresentation({ density: 'standard' })
      }
      return
    }

    if (action.kind === 'authorize-high-fidelity') {
      setError('High-Fidelity Export 需要连接已授权的远程适配器；当前版本不会以 best-effort 方式生成不一致的本地文件。')
      setPhase('unsaved')
      return
    }

    if (action.kind === 'retry-render-ready') {
      setError(undefined)
      setPreviewReady(false)
      setRenderReadiness(undefined)
      setRenderReadyRetryVersion(version => version + 1)
      return
    }

    if (action.kind === 'relink-resource' && action.resourceId !== undefined) {
      const input = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid^="studio-relink-input-"]'))
        .find(candidate => candidate.dataset.assetId === action.resourceId)
      if (input !== undefined) {
        input.click()
        return
      }
    }

    if (action.resourceId !== undefined) {
      setError(action.kind === 'remove-resource'
        ? `资源 ${action.resourceId} 仍被当前内容引用；移除资源前请先删除对应内容。`
        : `资源 ${action.resourceId} 尚未解析；请重新链接或重新粘贴对应内容。`)
      setPhase('unsaved')
    }
  }

  function commitPaste(
    blockId: string | undefined,
    payload: { readonly html: string; readonly text: string },
  ) {
    const currentSession = session.current
    const currentRevision = revision
    if (!currentSession || currentRevision === undefined || conflictDraft !== undefined || conflictPreviewRevision !== undefined) {
      return false
    }

    const parsed = parseSmartPaste(payload, {
      createBlockId: (kind, index) => `${currentRevision.id}:paste-${currentRevision.revision + 1}-${kind}-${index + 1}`,
    })
    if (parsed.blocks.length === 0) {
      return false
    }

    const location = blockId === undefined
      ? undefined
      : currentRevision.pages.reduce<{ pageId: string; index: number } | undefined>((found, page) => {
        if (found !== undefined) {
          return found
        }
        const index = page.blocks.findIndex(block => block.id === blockId)
        return index < 0 ? undefined : { index, pageId: page.id }
      }, undefined)
    const page = location === undefined
      ? currentRevision.pages[0]!
      : currentRevision.pages.find(candidate => candidate.id === location.pageId)!
    const index = location === undefined ? page.blocks.length : location.index + 1
    const result = currentSession.commit({
      blocks: parsed.blocks,
      index,
      pageId: page.id,
      selection: {
        blockId: parsed.blocks.at(-1)!.id,
        pageId: page.id,
      },
      type: 'insert-blocks',
    }, { expectedRevision: currentRevision.revision })

    if (!isCommitted(result)) {
      setError(result.message)
      setPhase('unsaved')
      return true
    }
    setError(undefined)
    setRevision(result.revision)
    setPhase('saving')
    persistCommit(result.revision, result.transaction)
    return true
  }

  richTextBlurHandler.current = commitText
  richTextInputHandler.current = () => {
    if (conflictDraft === undefined && phase !== 'saving' && phase !== 'exporting') {
      setPhase('editing')
    }
  }
  richTextPasteHandler.current = commitPaste

  function moveHistory(direction: 'redo' | 'undo') {
    const currentSession = session.current
    const currentRevision = revision
    if (!currentSession || currentRevision === undefined || conflictDraft !== undefined || conflictPreviewRevision !== undefined) {
      return
    }
    const result = direction === 'undo'
      ? currentSession.undo({ expectedRevision: currentRevision.revision })
      : currentSession.redo({ expectedRevision: currentRevision.revision })
    if (!isCommitted(result)) {
      if (result.status === 'rejected') {
        setError(result.message)
        setPhase('unsaved')
      }
      return
    }
    setError(undefined)
    setRevision(result.revision)
    setPhase('saving')
    persistCommit(result.revision, result.transaction)
  }

  function runExport() {
    const currentPlan = buildExportPlan()
    if (currentPlan !== undefined) {
      setExportPlan(currentPlan)
    }
    if (
      currentPlan === undefined
      || !currentPlan.canRun
      || conflictPreviewRevision !== undefined
      || exportJobState?.status === 'running'
    ) {
      return
    }

    let job: ExportJob
    try {
      job = exportEngine.run(currentPlan)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('unsaved')
      return
    }

    exportJobRef.current = job
    setExportJob(job)
    setExportArtifact(undefined)
    setError(undefined)
    setPhase('exporting')
    job.promise
      .then((result) => {
        if (!mounted.current) {
          return
        }
        const extension = result.artifact.format === 'zip' ? 'zip' : 'png'
        const url = URL.createObjectURL(result.artifact.blob)
        const anchor = document.createElement('a')
        anchor.download = `oneimg-general-long-image-r${result.documentRevision ?? 0}.${extension}`
        anchor.href = url
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 0)
        setLastExport({
          documentRevision: result.documentRevision,
          format: result.artifact.format,
          fromCache: result.fromCache,
          snapshotId: result.snapshotId,
        })
        setExportArtifact(result.artifact)
        setExportPlanVersion(version => version + 1)
        if (conflictDraft !== undefined) {
          setPhase('conflict')
        } else if (pendingCommit.current !== undefined) {
          setPhase('unsaved')
        } else {
          setPhase('saved')
        }
      })
      .catch((reason: unknown) => {
        if (!mounted.current) {
          return
        }
        if (reason instanceof ExportJobError && reason.code === 'canceled') {
          setPhase(pendingCommit.current === undefined ? 'saved' : 'unsaved')
          return
        }
        setError(reason instanceof Error ? reason.message : String(reason))
        setPhase('unsaved')
      })
      .finally(() => {
        if (exportJobRef.current?.id === job.id) {
          exportJobRef.current = undefined
        }
      })
  }

  function cancelExport() {
    if (exportJob === undefined) {
      return
    }
    exportEngine.cancel(exportJob.id)
  }

  function downloadSlice(index: number) {
    const segment = currentExportArtifact?.segments?.find(candidate => candidate.index === index)
    if (segment === undefined) {
      return
    }
    const downloadUrl = URL.createObjectURL(segment.blob)
    const anchor = document.createElement('a')
    anchor.download = getLocalPngSliceFilename(segment.index)
    anchor.href = downloadUrl
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
  }

  const state: StudioDocumentState = {
    conflictDraftCount,
    documentId: revision?.id ?? '',
    durableRevision,
    meaningful,
    recentCount,
    restored,
    revision: revision?.revision ?? 0,
    status: phaseLabel(phase),
  }

  if (revision === undefined || snapshot === undefined || renderResources === undefined) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-900">
        <output aria-live="polite" data-testid="studio-status" className="mx-auto block max-w-3xl text-sm text-slate-600">
          {phaseLabel(phase)}
        </output>
        {error && <pre data-testid="studio-error" className="mx-auto mt-4 max-w-3xl whitespace-pre-wrap text-sm text-red-700">{error}</pre>}
        <div className="mx-auto mt-4 max-w-3xl">
          {revision !== undefined && <ExportPreflightPanel findings={preflight.findings} onAction={handlePreflightAction} />}
          <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-xs" data-testid="studio-render-ready-diagnostics">
            {JSON.stringify(renderReadiness ?? null)}
          </pre>
        </div>
        <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>
      </main>
    )
  }

  return (
    <main
      className="h-screen overflow-y-auto bg-slate-100 px-6 py-8 text-slate-900 sm:px-10"
      data-testid="studio-scroll-container"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        {cleanPreview && (
          <div className="flex justify-end" data-testid="studio-clean-preview-chrome">
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
              onClick={() => setCleanPreview(false)}
              type="button"
            >
              返回编辑
            </button>
          </div>
        )}
        {!cleanPreview && (
          <header className="flex items-center justify-between gap-4" data-testid="studio-header">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">OneIMG Studio</p>
              <h1 className="mt-1 text-xl font-semibold">新建长图</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="撤销"
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!session.current?.canUndo() || conflictDraft !== undefined || conflictPreviewRevision !== undefined || phase === 'exporting'}
                onClick={() => moveHistory('undo')}
                type="button"
              >
                撤销
              </button>
              <button
                aria-label="重做"
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!session.current?.canRedo() || conflictDraft !== undefined || conflictPreviewRevision !== undefined || phase === 'exporting'}
                onClick={() => moveHistory('redo')}
                type="button"
              >
                重做
              </button>
              <button
                aria-pressed={cleanPreview}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
                onClick={() => setCleanPreview(true)}
                type="button"
              >
                清爽预览
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={conflictPreviewRevision !== undefined || !meaningful || !preflight.canExport || preflight.localRoute !== 'local-eligible'}
                onClick={() => {
                  setExportPlan(buildExportPlan())
                  setExportPanelOpen(open => !open)
                  setExportPlanVersion(version => version + 1)
                }}
                type="button"
              >
                {exportPanelOpen ? '关闭导出面板' : phase === 'exporting' ? '导出中…' : '导出本地文件'}
              </button>
            </div>
          </header>
        )}

        <div className={`${cleanPreview ? 'hidden' : 'flex'} items-center justify-between text-sm text-slate-500`} data-testid="studio-editor-chrome">
          <p className="m-0" data-testid="studio-status" aria-live="polite">{phaseLabel(phase)}</p>
          {!meaningful && <p className="m-0" data-testid="studio-starter-hint">无需命名或创建项目，直接开始输入。</p>}
        </div>

        {error && <p data-testid="studio-error" className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!cleanPreview && (
          <MediaGroupEditor
            disabled={assetImporting || phase === 'exporting' || conflictDraft !== undefined || conflictPreviewRevision !== undefined}
            items={mediaGroup?.items ?? []}
            onImportFiles={importFiles}
            onRelinkItem={relinkFile}
            onUpdateItem={commitMediaItem}
            unresolvedItemIds={mediaGroup?.items
              .filter(item => assetMap.get(item.assetId)?.status !== 'ready')
              .map(item => item.id)}
          />
        )}
        {pendingCommitRevision !== undefined && phase === 'unsaved' && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="studio-save-recovery">
            <p className="m-0">第 {pendingCommitRevision} 个版本还没有保存到本地。</p>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 font-medium"
                onClick={retryPendingCommit}
                type="button"
              >
                重试保存
              </button>
              <button
                className="rounded-full border border-amber-300 px-3 py-1.5 font-medium"
                onClick={restoreDurableRevision}
                type="button"
              >
                恢复已提交版本
              </button>
            </div>
          </div>
        )}
        {conflictDraft && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950" data-testid="studio-conflict-notice">
            <p className="m-0">检测到另一个写入分支，已保留“{conflictDraft.documentName}”。当前已提交内容没有被覆盖。</p>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded-full border border-violet-300 bg-white px-3 py-1.5 font-medium"
                onClick={() => openConflictDraft().catch(() => undefined)}
                type="button"
              >
                查看冲突草稿
              </button>
              <button
                className="rounded-full border border-violet-300 bg-white px-3 py-1.5 font-medium"
                onClick={() => restoreDurableRevision().catch(() => undefined)}
                type="button"
              >
                恢复已提交版本
              </button>
            </div>
          </div>
        )}
        {conflictPreviewRevision && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-violet-100 px-4 py-3 text-sm text-violet-950" data-testid="studio-conflict-preview">
            <p className="m-0">正在查看冲突草稿；这是独立的只读预览。</p>
            <button
              className="shrink-0 rounded-full border border-violet-300 bg-white px-3 py-1.5 font-medium"
              onClick={() => setConflictPreviewRevision(undefined)}
              type="button"
            >
              返回当前 Draft
            </button>
          </div>
        )}
        {!cleanPreview && <ExportPreflightPanel findings={preflight.findings} onAction={handlePreflightAction} />}
        {!cleanPreview && exportPanelOpen && (
          <ExportPanel
            availableSliceIndexes={currentExportArtifact?.segments?.map(segment => segment.index) ?? []}
            jobState={exportJobState}
            onCancel={cancelExport}
            onClose={() => setExportPanelOpen(false)}
            onDownloadSlice={downloadSlice}
            onOutputScaleChange={(scale) => {
              setExportOutputScale(scale)
              setExportArtifact(undefined)
              setExportPlanVersion(version => version + 1)
            }}
            onRun={runExport}
            outputScale={exportOutputScale}
            plan={exportPlan}
          />
        )}
        {!cleanPreview && lastExport && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950" data-testid="studio-export-receipt">
            <div>
              <p className="m-0 font-medium">
                导出已完成：{lastExport.snapshotId === snapshot.snapshotId ? '当前版本' : `基于较早版本 r${lastExport.documentRevision ?? '?'}`}
              </p>
              <output className="mt-1 block text-xs" data-testid="studio-export-result">
                {JSON.stringify({
                  documentRevision: lastExport.documentRevision,
                  format: lastExport.format,
                  fromCache: lastExport.fromCache,
                  snapshotId: lastExport.snapshotId,
                })}
              </output>
            </div>
            {lastExport.snapshotId !== snapshot.snapshotId && (
              <button
                className="shrink-0 rounded-full border border-emerald-300 bg-white px-3 py-1.5 font-medium"
                onClick={() => {
                  setExportPanelOpen(true)
                  setExportPlanVersion(version => version + 1)
                }}
                type="button"
              >
                重新导出当前版本
              </button>
            )}
          </div>
        )}
        {!cleanPreview && (
          <GeneralLongImagePresentationPanel
            disabled={phase === 'exporting' || conflictDraft !== undefined || conflictPreviewRevision !== undefined}
            onChange={commitPresentation}
            resources={renderResources}
            snapshot={snapshot}
          />
        )}
        <div
          aria-busy={!previewReady}
          className="relative mx-auto w-full overflow-x-auto rounded-2xl shadow-[0_20px_60px_rgba(24,32,57,0.14)]"
          data-testid="studio-editor"
          style={{ maxWidth: snapshot.referenceViewport.width }}
        >
          <CanonicalRenderSurface
            mode={conflictPreviewRevision ? 'preview' : cleanPreview ? 'preview' : 'edit'}
            onRichTextBlur={stableRichTextBlurHandler}
            onRichTextInput={stableRichTextInputHandler}
            onRichTextPaste={stableRichTextPasteHandler}
            resources={renderResources}
            snapshot={snapshot}
          />
          {!cleanPreview && exportPanelOpen && exportPlan && <StudioSliceBoundaryOverlay plan={exportPlan} />}
        </div>
        <pre className="overflow-auto rounded-xl bg-white p-4 text-xs" data-testid="studio-render-ready-diagnostics">
          {JSON.stringify(renderReadiness ?? null)}
        </pre>
        {!cleanPreview && <p className="m-0 text-center text-xs text-slate-500">内容默认保存在此设备。编辑会在离开正文后自动保存。</p>}
        <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>
      </div>
    </main>
  )
}
