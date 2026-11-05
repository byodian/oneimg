'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownToLine,
  Check,
  FileDown,
  Image as ImageIcon,
  Maximize2,
  Minus,
  PackageOpen,
  PanelLeft,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { SocialShareDialog } from '@/features/social-share/share-dialog'
import { SOCIAL_SHARE_STYLE_PACK_ID, createSocialShareSnapshot } from '@/features/social-share'
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
  type Block,
  type DocumentCommitResult,
  type DocumentHistoryResult,
  type DocumentRevision,
  type DocumentSession,
  type MediaArrangement,
  type MediaGroupChanges,
  type MediaItem,
  createDocumentSession,
  createImportedDocumentTransaction,
  createMediaGroupBlock,
  createMediaItem,
  createRichTextBlock,
  createUntouchedDocumentRevision,
  isMeaningfulDocumentRevision,
  stableStringify,
} from '@/features/document-core'
import {
  type AssetPipeline,
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
import {
  type OneImgPackageImportResult,
  type PackageImportReport,
  type PackageProgress,
  createOneImgPackage,
  importOneImgPackage,
} from '@/features/oneimg-package'
import {
  ONEIMG_PACKAGE_APPLICATION_VERSION,
  createStudioImportTransaction,
  createStudioImportedDocument,
  createStudioPackageExport,
} from '@/features/oneimg-package/studio-adapter'
import { isRenderAbortError } from '@/features/rendering/cancellation'
import {
  type ConflictDraft,
  type LocalAssetRecord,
  type LocalRepository,
  LocalRepositoryError,
  createIndexedDbLocalRepository,
} from '@/features/local-repository'

const ACTIVE_DOCUMENT_HINT_KEY = 'oneimg:studio:active-document'
const STUDIO_DATABASE_NAME = 'OneImgStudio'
const MIN_PREVIEW_SCALE = 0.5
const MAX_PREVIEW_SCALE = 2
const PREVIEW_SCALE_STEP = 0.1

type StudioPhase = 'conflict' | 'editing' | 'error' | 'exporting' | 'ready' | 'restored' | 'saved' | 'saving' | 'unsaved'
type StudioOutputTab = 'image' | 'portable'
type StudioMobilePanel = 'config' | 'preview' | 'output'

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
  readonly diagnostics?: boolean
}

type PendingStudioCommit = {
  readonly revision: DocumentRevision
  readonly transaction: Extract<DocumentCommitResult, { status: 'committed' }>['transaction']
}

interface StudioExportReceipt {
  readonly cacheKey: string
  readonly documentRevision?: number
  readonly format: 'png' | 'zip'
  readonly fromCache: boolean
  readonly snapshotId: string
}

interface StudioPackageImportStatus {
  readonly duplicate?: boolean
  readonly kind: 'cancelled' | 'duplicate' | 'imported' | 'recovery'
  readonly packageId?: string
  readonly report?: PackageImportReport
  readonly sourceDocumentId?: string
}

function persistedAssetRecords(assetPipeline: AssetPipeline): readonly LocalAssetRecord[] {
  return assetPipeline.list().map((asset) => {
    const original = assetPipeline.getOriginal(asset.id)
    if (asset.status !== 'ready') {
      return { assetId: asset.id, original }
    }
    const renderSource = assetPipeline.getRenderSource(asset.id)
    return {
      assetId: asset.id,
      original,
      renderSource: renderSource.blob,
      renderSourceRevision: renderSource.metadata.id,
    }
  })
}

async function rehydrateStoredAsset(assetPipeline: AssetPipeline, asset: LocalAssetRecord) {
  try {
    await assetPipeline.ingest(
      asset.original,
      asset.renderSource === undefined || asset.renderSourceRevision === undefined
        ? {}
        : {
            renderSource: {
              blob: asset.renderSource,
              revision: asset.renderSourceRevision,
            },
          },
    )
  } catch {
    // A stale or corrupt persisted Render Source must not hide otherwise restorable work.
    // Re-ingest the Original so a bad optimization becomes a regenerated or unresolved Asset.
    await assetPipeline.ingest(asset.original).catch(() => undefined)
  }
}

function createStudioRandomSuffix() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createStudioDocumentId() {
  return `document:studio:${createStudioRandomSuffix()}`
}

function createStudioPackageId() {
  return `package-${createStudioRandomSuffix()}`
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

function findMediaGroup(revision: DocumentRevision, pageId?: string) {
  const pages = pageId ? revision.pages.filter(page => page.id === pageId) : revision.pages
  const block = pages.flatMap(page => page.blocks).find(candidate => candidate.kind === 'media-group')
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
  const editor = root.closest<HTMLElement>('[data-testid="studio-editor"]')
  const scale = Number(editor?.dataset.previewScale ?? '1')
  const previousTransform = editor?.style.transform

  if (editor !== null && scale !== 1) {
    editor.style.transform = 'none'
  }

  try {
    const bounds = root.getBoundingClientRect()
    return [{
      height: bounds.height,
      id: 'page-1',
      kind: snapshot.presentation.pageFormat.kind,
      layoutFingerprint: getCanonicalLayoutFingerprint(root),
      semanticBoundaries: getCanonicalSemanticSliceBoundaries(root),
      width: bounds.width,
    }] as const
  } finally {
    if (editor !== null && previousTransform !== undefined) {
      editor.style.transform = previousTransform
    }
  }
}

function exportPlansMatch(left: ExportPlan | undefined, right: ExportPlan | undefined) {
  if (left === right) {
    return true
  }
  if (left === undefined || right === undefined) {
    return false
  }
  return left.authorization === right.authorization
    && left.cacheKey === right.cacheKey
    && left.cacheReuse === right.cacheReuse
    && left.canRun === right.canRun
    && left.outputFormat === right.outputFormat
    && left.outputScale === right.outputScale
    && left.exportSlices === right.exportSlices
    && left.route === right.route
    && left.routeReason === right.routeReason
    && stableStringify(left.findings) === stableStringify(right.findings)
}

function StudioSliceBoundaryOverlay({ plan }: { readonly plan: ExportPlan }) {
  const page = plan.pages[0]
  const slices = page?.semanticSlices ?? []
  if (!plan.exportSlices || slices.length <= 1) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      data-testid="studio-slice-boundaries"
    >
      <div className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white shadow-sm">
        共 {slices.length} 张分片
      </div>
      {slices.slice(0, -1).map(slice => (
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-indigo-500/80"
          key={slice.index}
          style={{ top: `${(slice.y + slice.height) / plan.outputScale}px` }}
        >
          <span className="absolute right-3 -top-6 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            第 {slice.index + 1} 张
          </span>
        </div>
      ))}
    </div>
  )
}

function StudioPanelHeader({
  action,
  badge,
  description,
  eyebrow,
  icon,
  title,
}: {
  readonly action?: ReactNode
  readonly badge?: ReactNode
  readonly description?: string
  readonly eyebrow?: string
  readonly icon?: ReactNode
  readonly title: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>}
          <h2 className="m-0 mt-0.5 truncate text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="m-0 mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  )
}

function StudioMobileNavigation({
  activePanel,
  exportDisabled,
  onChange,
}: {
  readonly activePanel: StudioMobilePanel
  readonly exportDisabled: boolean
  readonly onChange: (panel: StudioMobilePanel) => void
}) {
  const items: readonly { readonly icon: ReactNode; readonly label: string; readonly value: StudioMobilePanel }[] = [
    { icon: <SlidersHorizontal className="h-4 w-4" />, label: '配置', value: 'config' },
    { icon: <ImageIcon className="h-4 w-4" />, label: '预览', value: 'preview' },
    { icon: <ArrowDownToLine className="h-4 w-4" />, label: '导出', value: 'output' },
  ]

  return (
    <nav
      aria-label="Studio 工作区"
      className="grid grid-cols-3 border-b border-slate-200 bg-white px-3 py-2 xl:hidden"
      data-testid="studio-mobile-navigation"
    >
      {items.map(item => (
        <button
          aria-current={activePanel === item.value ? 'page' : undefined}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${activePanel === item.value
            ? 'bg-violet-50 text-violet-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'} ${item.value === 'output' && exportDisabled ? 'opacity-60' : ''}`}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function StudioPreviewControls({
  onCleanPreview,
  onFit,
  onZoomChange,
  scale,
}: {
  readonly onCleanPreview?: () => void
  readonly onFit: () => void
  readonly onZoomChange: (scale: number) => void
  readonly scale: number
}) {
  const percentage = Math.round(scale * 100)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-end px-3 sm:bottom-4 sm:px-4"
      data-testid="studio-preview-controls"
    >
      <div
        aria-label="预览缩放"
        className="pointer-events-auto flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-2 py-1.5 text-slate-600 shadow-[0_10px_30px_rgba(24,32,57,0.16)] backdrop-blur"
        role="group"
      >
        <button
          aria-label="缩小预览"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={scale <= MIN_PREVIEW_SCALE}
          onClick={() => onZoomChange(scale - PREVIEW_SCALE_STEP)}
          title="缩小"
          type="button"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          aria-label="预览缩放"
          className="h-1.5 w-24 cursor-pointer accent-violet-600 sm:w-32"
          data-testid="studio-preview-zoom"
          max={MAX_PREVIEW_SCALE * 100}
          min={MIN_PREVIEW_SCALE * 100}
          onChange={event => onZoomChange(Number(event.currentTarget.value) / 100)}
          step={PREVIEW_SCALE_STEP * 100}
          type="range"
          value={percentage}
        />
        <output
          aria-live="polite"
          className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-slate-700"
        >
          {percentage}%
        </output>
        <button
          aria-label="放大预览"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={scale >= MAX_PREVIEW_SCALE}
          onClick={() => onZoomChange(scale + PREVIEW_SCALE_STEP)}
          title="放大"
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          aria-pressed={scale === 1}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold transition hover:bg-slate-100 hover:text-slate-900"
          onClick={onFit}
          title="适应预览"
          type="button"
        >
          适应
        </button>
        {onCleanPreview && (
          <button
            aria-label="清爽预览"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onCleanPreview}
            title="清爽预览"
            type="button"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function StudioOutputShell({
  activeTab,
  imageContent,
  onTabChange,
  portableContent,
}: {
  readonly activeTab: StudioOutputTab
  readonly imageContent: ReactNode
  readonly onTabChange: (tab: StudioOutputTab) => void
  readonly portableContent: ReactNode
}) {
  return (
    <aside
      aria-label="输出工作区"
      className="flex min-h-0 w-full min-w-0 flex-col border-l border-slate-200 bg-white xl:w-[332px]"
      data-testid="studio-output-sidebar"
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <StudioPanelHeader
          icon={<ArrowDownToLine className="h-4 w-4" />}
          title="输出"
        />
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="输出类型">
          <button
            aria-selected={activeTab === 'image'}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${activeTab === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => onTabChange('image')}
            role="tab"
            type="button"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            图片导出
          </button>
          <button
            aria-selected={activeTab === 'portable'}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${activeTab === 'portable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => onTabChange('portable')}
            role="tab"
            type="button"
          >
            <PackageOpen className="h-3.5 w-3.5" />
            便携副本
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" role="tabpanel">
        {activeTab === 'image' ? imageContent : portableContent}
      </div>
    </aside>
  )
}

function blockOutlineLabel(block: Block, index: number) {
  switch (block.kind) {
    case 'rich-text': {
      const firstLine = richTextDocumentToEditableText(block.content)
        .split('\n')
        .map(line => line.trim())
        .find(Boolean)
      return firstLine?.slice(0, 42) || `文本内容 ${index + 1}`
    }
    case 'media-group':
      return `图片组 · ${block.items.length} 张`
    case 'data-table':
      return `数据表 · ${block.rows.length} 行`
    case 'checklist':
      return `清单 · ${block.items.length} 项`
    case 'unknown':
      return `未识别内容 · ${block.originalKind}`
  }
}

function StudioContentOutline({
  activeBlockId,
  disabled = false,
  onSelect,
  revision,
}: {
  readonly activeBlockId?: string
  readonly disabled?: boolean
  readonly onSelect: (blockId: string) => void
  readonly revision: DocumentRevision
}) {
  const blocks = revision.pages.flatMap(page => page.blocks)

  return (
    <section aria-label="内容大纲" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" data-testid="studio-content-outline">
      <StudioPanelHeader
        badge={<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{blocks.length} 个区块</span>}
        icon={<PanelLeft className="h-4 w-4" />}
        title="内容大纲"
      />
      {blocks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">
          在中央预览中输入内容后，结构会显示在这里。
        </div>
      ) : (
        <ol className="mt-3 space-y-1.5" data-testid="studio-outline-items">
          {blocks.map((block, index) => (
            <li key={block.id}>
              <button
                aria-current={activeBlockId === block.id ? 'true' : undefined}
                aria-label={`定位第 ${index + 1} 个区块`}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${activeBlockId === block.id
                  ? 'bg-violet-50 text-violet-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={disabled}
                onClick={() => onSelect(block.id)}
                type="button"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate">{blockOutlineLabel(block, index)}</span>
                {activeBlockId === block.id && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function isCommitted(
  result: DocumentCommitResult | DocumentHistoryResult,
): result is Extract<DocumentCommitResult, { status: 'committed' }> {
  return result.status === 'committed'
}

export function StudioClient({ createRepository, diagnostics = false }: StudioClientProps = {}) {
  const mounted = useRef(true)
  const durableRevisionNumber = useRef(0)
  const durableRevisionSnapshot = useRef<DocumentRevision | undefined>(undefined)
  const pendingCommit = useRef<PendingStudioCommit | undefined>(undefined)
  const session = useRef<DocumentSession | undefined>(undefined)
  const repository = useRef<LocalRepository | undefined>(undefined)
  const saveTail = useRef(Promise.resolve())
  const exportJobRef = useRef<ExportJob | undefined>(undefined)
  const pendingPackageImport = useRef<OneImgPackageImportResult | undefined>(undefined)
  const importedPackageIds = useRef(new Set<string>())
  const sourceDocumentIds = useRef(new Map<string, string>())
  const previewFocusTimeout = useRef<number | undefined>(undefined)
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
  const [activePageId, setActivePageId] = useState<string>()
  const [shareOpen, setShareOpen] = useState(false)
  const [mediaPageFeedback, setMediaPageFeedback] = useState<{ focusItemId: string, pendingFocus: boolean, message: string }>()
  const currentPage = revision?.pages.find(page => page.id === activePageId) ?? revision?.pages[0]
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
  const [exportPlan, setExportPlan] = useState<ExportPlan>()
  const [exportPlanVersion, setExportPlanVersion] = useState(0)
  const [exportJob, setExportJob] = useState<ExportJob>()
  const [exportJobState, setExportJobState] = useState<ReturnType<ExportJob['getState']>>()
  const [exportOutputScale, setExportOutputScale] = useState<ExportOutputScale>(1)
  const [exportSlices, setExportSlices] = useState(false)
  const [exportArtifact, setExportArtifact] = useState<LocalPngArtifact>()
  const [lastExport, setLastExport] = useState<StudioExportReceipt>()
  const [outputTab, setOutputTab] = useState<StudioOutputTab>('image')
  const [mobilePanel, setMobilePanel] = useState<StudioMobilePanel>('preview')
  const [previewScale, setPreviewScale] = useState(1)
  const [activeBlockId, setActiveBlockId] = useState<string>()
  const [packageWriting, setPackageWriting] = useState(false)
  const [packageImporting, setPackageImporting] = useState(false)
  const [packageProgress, setPackageProgress] = useState<PackageProgress>()
  const [packageImportStatus, setPackageImportStatus] = useState<StudioPackageImportStatus>()
  const packageImportLocked = packageImporting || packageImportStatus?.kind === 'duplicate'

  useEffect(() => () => {
    if (previewFocusTimeout.current !== undefined) {
      window.clearTimeout(previewFocusTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (packageImportStatus?.kind !== undefined && packageImportStatus.kind !== 'cancelled') {
      setOutputTab('portable')
    }
  }, [packageImportStatus?.kind])

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
        if (displayedRevision.presentation.sceneId === 'social-smart-collage') {
          return createSocialShareSnapshot(displayedRevision, displayedRevision.pages.find(page => page.id === activePageId)?.id ?? displayedRevision.pages[0]!.id, { assets: assetMap })
        }
        return createGeneralLongImageSnapshot(displayedRevision, { assets: assetMap })
      } catch {
        return undefined
      }
    },
    [activePageId, assetMap, displayedRevision],
  )
  const contentError = displayedRevision !== undefined && snapshot === undefined ? 'invalid-document' : undefined
  const resourceSnapshot = useRef(snapshot)
  resourceSnapshot.current = snapshot
  const resourceSetRef = useRef<ResolvedResourceSet | undefined>(undefined)
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
  const mediaGroup = revision === undefined ? undefined : findMediaGroup(revision, currentPage?.id)

  const preflight = useMemo(() => evaluateExportPreflight({
    contentError,
    fontFallbackIds: renderResources?.fontFallbackIds,
    highFidelityAvailable: false,
    images: imageObservations,
    localCapabilityProbe,
    meaningful,
    readiness: renderReadiness,
    renderReady: previewReady,
    rendererAvailable: rendererAvailable && (snapshot?.stylePackId === canonicalStylePack.id || snapshot?.stylePackId === SOCIAL_SHARE_STYLE_PACK_ID),
    resourceResolutionPending: snapshot !== undefined && renderResources === undefined && resourceErrorIds.length === 0,
    resolvedResourceIds: renderResources?.resources.map(resource => resource.id),
    snapshot,
    unresolvedResourceIds: [...resourceErrorIds, ...renderErrorResourceIds],
  }), [contentError, imageObservations, localCapabilityProbe, meaningful, previewReady, renderErrorResourceIds, renderReadiness, renderResources, rendererAvailable, resourceErrorIds, snapshot])

  const currentExportArtifact = exportPlan !== undefined
    && exportArtifact !== undefined
    && snapshot !== undefined
    && exportArtifact.diagnostics.snapshotId === snapshot.snapshotId
    && exportArtifact.diagnostics.snapshotId === exportPlan.snapshot.snapshotId
    && lastExport?.cacheKey === exportPlan.cacheKey
    && exportArtifact.diagnostics.exportFingerprint === exportPlan.resourceFingerprint
    && exportArtifact.diagnostics.layoutFingerprint === exportPlan.pages[0]?.layoutFingerprint
    ? exportArtifact
    : undefined
  const packageSaveEligible = revision !== undefined

  const buildExportPlan = useCallback(() => {
    if (snapshot === undefined) {
      return undefined
    }
    return exportEngine.plan({
      documentRevision: revision?.revision,
      meaningful,
      output: { format: 'png', scale: exportOutputScale, slices: exportSlices },
      pageMeasurements: readStudioPageMeasurement(snapshot),
      renderReady: previewReady,
      preflightFindings: preflight.findings,
      fontFallbackIds: renderResources?.fontFallbackIds,
      resourceFingerprint: renderResources?.fingerprint,
      snapshot,
    })
  }, [exportEngine, exportOutputScale, exportSlices, meaningful, preflight.findings, previewReady, renderResources?.fontFallbackIds, renderResources?.fingerprint, revision?.revision, snapshot])

  useEffect(() => {
    if (snapshot === undefined) {
      return
    }
    const nextPlan = buildExportPlan()
    setExportPlan((current) => {
      return exportPlansMatch(current, nextPlan) ? current : nextPlan
    })
  }, [buildExportPlan, exportPlanVersion, snapshot])

  useEffect(() => {
    setExportArtifact(current => current?.diagnostics.snapshotId === snapshot?.snapshotId ? current : undefined)
    setExportJobState(current => current?.status === 'running' ? current : undefined)
  }, [snapshot?.snapshotId])

  useEffect(() => {
    if (exportJob === undefined) {
      setExportJobState(undefined)
      return
    }
    let active = true
    let flushFrame: number | undefined
    let pendingState: ReturnType<ExportJob['getState']> | undefined
    // Export adapters can publish many progress states in one producer turn;
    // keep React updates on the browser frame boundary.
    const flush = () => {
      flushFrame = undefined
      if (!active || pendingState === undefined) {
        return
      }
      const nextState = pendingState
      pendingState = undefined
      setExportJobState(nextState)
    }
    const publish = (nextState: ReturnType<ExportJob['getState']>) => {
      pendingState = nextState
      if (flushFrame !== undefined) {
        return
      }
      flushFrame = window.requestAnimationFrame(flush)
    }
    const unsubscribe = exportJob.subscribe(publish)
    return () => {
      active = false
      pendingState = undefined
      if (flushFrame !== undefined) {
        window.cancelAnimationFrame(flushFrame)
      }
      unsubscribe()
    }
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
        const importedPackages = await localRepository.listImportedPackages()
        const persistedAssets = await localRepository.listAssets()
        importedPackageIds.current = new Set(importedPackages.map(item => item.packageId))
        sourceDocumentIds.current = new Map(importedPackages.map(item => [item.documentId, item.sourceDocumentId]))
        for (const asset of persistedAssets) {
          await rehydrateStoredAsset(assetPipeline, asset)
        }
        for (const importedPackage of importedPackages) {
          for (const asset of importedPackage.assets) {
            await rehydrateStoredAsset(assetPipeline, asset)
          }
        }
        setAssets(assetPipeline.list())
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
        const restoredPackage = importedPackages.find(item => item.documentId === usableRevision.id)
        if (restoredPackage !== undefined) {
          setPackageImportStatus({
            kind: 'imported',
            packageId: restoredPackage.packageId,
            report: restoredPackage.report,
            sourceDocumentId: restoredPackage.sourceDocumentId,
          })
        }
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
      setError('预览加载失败，请刷新后重试。')
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
        const receipt = await localRepository.persistCommit({
          assets: persistedAssetRecords(assetPipeline),
          revision: nextRevision,
          transaction,
        })
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

  async function savePackage() {
    const currentRevision = session.current?.getRevision() ?? revision
    if (
      currentRevision === undefined
      || !packageSaveEligible
      || packageWriting
      || packageImportLocked
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return
    }

    setPackageWriting(true)
    setPackageProgress(undefined)
    setError(undefined)
    try {
      const packageInput = createStudioPackageExport(
        currentRevision,
        assetPipeline,
        sourceDocumentIds.current.get(currentRevision.id),
      )
      const artifact = await createOneImgPackage({
        applicationVersion: ONEIMG_PACKAGE_APPLICATION_VERSION,
        assets: packageInput.assets,
        documents: [packageInput.document],
        onProgress: setPackageProgress,
        packageId: createStudioPackageId(),
      })
      const packageBlob = await new Response(artifact.stream).blob()
      const downloadUrl = URL.createObjectURL(new Blob([packageBlob], { type: 'application/zip' }))
      const anchor = document.createElement('a')
      anchor.download = `oneimg-${artifact.manifest.packageId}-r${currentRevision.revision}.oneimg`
      anchor.href = downloadUrl
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      setPackageProgress(undefined)
    } catch (reason) {
      setPackageProgress(undefined)
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setPackageWriting(false)
    }
  }

  async function commitImportedPackage(result: OneImgPackageImportResult, duplicate: boolean) {
    if ('recovery' in result && result.recovery !== undefined) {
      setPackageImportStatus({
        kind: 'recovery',
        packageId: result.packageId,
        report: result.report,
      })
      return
    }
    const draft = result.drafts[0]
    const localRepository = repository.current
    if (draft === undefined || localRepository === undefined) {
      throw new Error('OneIMG Package 没有可导入的 Document')
    }

    const importedAssetIds = new Map<string, string>()
    const stagedAssetIds = new Set<string>()
    try {
      for (const asset of draft.assets) {
        const ingested = await assetPipeline.ingest(
          asset.original,
          asset.renderSource === undefined || asset.renderSourceRevision === undefined
            ? {}
            : {
                renderSource: {
                  blob: asset.renderSource,
                  revision: asset.renderSourceRevision,
                },
              },
        )
        if (ingested.created) {
          stagedAssetIds.add(ingested.asset.id)
        }
        importedAssetIds.set(asset.assetId, ingested.asset.id)
      }
      const importedDocumentId = createStudioDocumentId()
      const importedRevision = createStudioImportedDocument(draft, importedAssetIds, importedDocumentId)
      const transaction = createStudioImportTransaction(importedRevision.id)
      const packageImport = result.packageId === undefined
        ? undefined
        : {
            assets: draft.assets.flatMap((asset) => {
              const assetId = importedAssetIds.get(asset.assetId)
              return assetId === undefined ? [] : [{
                assetId,
                original: asset.original,
                ...(asset.renderSource === undefined ? {} : { renderSource: asset.renderSource }),
                ...(asset.renderSourceRevision === undefined ? {} : { renderSourceRevision: asset.renderSourceRevision }),
              }]
            }),
            documentId: importedRevision.id,
            packageId: result.packageId,
            report: result.report,
            sourceDocumentId: draft.sourceDocumentId,
          }
      const receipt = packageImport === undefined
        ? await localRepository.persistCommit({
          assets: persistedAssetRecords(assetPipeline),
          revision: importedRevision,
          transaction,
        })
        : await localRepository.persistImportedDraft({
          assets: persistedAssetRecords(assetPipeline),
          packageImport,
          revision: importedRevision,
          transaction,
        })
      if (receipt.status === 'stale') {
        throw new Error('导入的草稿未能保存，请重新导入。')
      }
      stagedAssetIds.clear()
      if (result.packageId !== undefined) {
        importedPackageIds.current.add(result.packageId)
        sourceDocumentIds.current.set(importedRevision.id, draft.sourceDocumentId)
      }

      session.current = createDocumentSession(importedRevision)
      durableRevisionSnapshot.current = importedRevision
      durableRevisionNumber.current = importedRevision.revision
      pendingCommit.current = undefined
      setPendingCommitRevision(undefined)
      setRevision(importedRevision)
      setAssets(assetPipeline.list())
      setDurableRevision(importedRevision.revision)
      setRecentCount((await localRepository.listRecents()).length)
      setConflictDraftCount((await localRepository.listConflictDrafts()).length)
      setConflictDraft(undefined)
      setConflictPreviewRevision(undefined)
      setRestored(false)
      setError(undefined)
      setExportArtifact(undefined)
      setExportPlan(undefined)

      setPackageImportStatus({
        duplicate,
        kind: 'imported',
        packageId: result.packageId,
        report: result.report,
        sourceDocumentId: draft.sourceDocumentId,
      })
      setPhase('saved')
      window.localStorage.setItem(ACTIVE_DOCUMENT_HINT_KEY, importedRevision.id)
    } catch (error) {
      stagedAssetIds.forEach(assetId => assetPipeline.remove(assetId))
      throw error
    }
  }

  async function importPackageFile(file: File) {
    const currentRevision = session.current?.getRevision() ?? revision
    if (
      currentRevision === undefined
      || packageWriting
      || packageImporting
      || pendingPackageImport.current !== undefined
      || pendingCommitRevision !== undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return
    }

    setPackageImporting(true)
    setPackageProgress(undefined)
    setError(undefined)
    try {
      const result = await importOneImgPackage(file, {
        onProgress: setPackageProgress,
        reservedIds: [currentRevision.id],
      })
      setPackageProgress(undefined)
      if ('recovery' in result && result.recovery !== undefined) {
        setPackageImportStatus({
          kind: 'recovery',
          packageId: result.packageId,
          report: result.report,
        })
        setError(result.recovery.message)
        setPhase('editing')
        return
      }
      if (result.drafts.length !== 1) {
        throw new Error('请选择只包含一份文档的副本文件。')
      }
      const duplicate = result.packageId !== undefined && importedPackageIds.current.has(result.packageId)
      if (duplicate) {
        pendingPackageImport.current = result
        const draft = result.drafts[0]
        setPackageImportStatus({
          duplicate: true,
          kind: 'duplicate',
          packageId: result.packageId,
          report: result.report,
          sourceDocumentId: draft?.sourceDocumentId,
        })
        return
      }
      await commitImportedPackage(result, false)
    } catch (reason) {
      setPackageProgress(undefined)
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('editing')
    } finally {
      setPackageImporting(false)
    }
  }

  async function confirmDuplicatePackageImport() {
    const result = pendingPackageImport.current
    if (result === undefined || packageImporting) {
      return
    }
    pendingPackageImport.current = undefined
    setPackageImporting(true)
    setPackageProgress(undefined)
    setError(undefined)
    try {
      await commitImportedPackage(result, true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPhase('editing')
    } finally {
      setPackageImporting(false)
    }
  }

  function cancelDuplicatePackageImport() {
    pendingPackageImport.current = undefined
    setPackageImportStatus({ kind: 'cancelled' })
    setPackageProgress(undefined)
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
    setRestored(true)
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
      const nextBlockId = `${currentPage?.id ?? currentRevision.id}:block-${crypto.randomUUID()}`
      result = currentSession.commit({
        block: createRichTextBlock(nextBlockId, nextDocument),
        index: 0,
        pageId: currentPage?.id ?? currentRevision.pages[0]!.id,
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

    const currentGroup = findMediaGroup(currentRevision, currentPage?.id)
    const currentItems = currentGroup?.items ?? []
    if (currentRevision.presentation.sceneId !== 'social-smart-collage' && files.length > 9 - currentItems.length) {
      setError('一个 Media Group 最多保留 9 张图片；本次导入没有提交。')
      return
    }

    setAssetImporting(true)
    setError(undefined)
    try {
      const imported = await assetPipeline.ingestMany(files)
      const nextRevision = currentSession.getRevision()
      const nextGroup = findMediaGroup(nextRevision, currentPage?.id)
      const nextItems = nextGroup?.items ?? []
      if (nextRevision.presentation.sceneId !== 'social-smart-collage' && imported.entries.length > 9 - nextItems.length) {
        throw new Error('一个 Media Group 最多保留 9 张图片；本次导入没有提交。')
      }
      const existingItemIds = new Set(nextRevision.pages.flatMap(page => page.blocks.flatMap(block => block.kind === 'media-group' ? block.items.map(item => item.id) : [])))
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
      if (nextRevision.presentation.sceneId === 'social-smart-collage') {
        const result = currentSession.commit({ type: 'append-media-items', pageId: currentPage?.id ?? nextRevision.pages[0]!.id, items: importedItems }, { expectedRevision: nextRevision.revision })
        if (!isCommitted(result)) {
          throw new Error(result.message)
        }
        setAssets(assetPipeline.list())
        setRevision(result.revision)
        setPhase('saving')
        persistCommit(result.revision, result.transaction)
        return
      }
      const block = createMediaGroupBlock({
        ...(nextGroup === undefined ? {} : { arrangement: nextGroup.arrangement }),
        id: nextGroup?.id ?? 'block:asset-media-group',
        items: [...nextItems, ...importedItems],
      })
      const result = nextGroup === undefined
        ? currentSession.commit({
          block,
          index: currentPage?.blocks.length ?? nextRevision.pages[0]!.blocks.length,
          pageId: currentPage?.id ?? nextRevision.pages[0]!.id,
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
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
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
      const nextGroup = findMediaGroup(currentSession.getRevision(), currentPage?.id)
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
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
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

  function commitMediaGroupChanges(changes: MediaGroupChanges) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return false
    }

    const result = currentSession.commit({
      blockId: currentGroup.id,
      changes,
      selection: { blockId: currentGroup.id },
      type: 'update-media-group',
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

  function setFeaturedMediaItem(itemId: string) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return false
    }

    const result = currentSession.commit({
      blockId: currentGroup.id,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'set-media-group-featured',
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

  function removeMediaItem(itemId: string) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return false
    }

    const result = currentSession.commit({
      blockId: currentGroup.id,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'remove-media-item',
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

  function moveMediaItem(itemId: string, index: number) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const currentGroup = currentRevision === undefined ? undefined : findMediaGroup(currentRevision, currentPage?.id)
    if (
      currentSession === undefined
      || currentRevision === undefined
      || currentGroup === undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    ) {
      return false
    }

    const result = currentSession.commit({
      blockId: currentGroup.id,
      index,
      itemId,
      selection: { blockId: currentGroup.id },
      type: 'move-media-item',
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

  function organizeMediaPage(itemId: string, targetPageId?: string) {
    const currentSession = session.current
    const currentRevision = currentSession?.getRevision()
    const group = currentRevision && findMediaGroup(currentRevision, currentPage?.id)
    if (!currentSession || !currentRevision || !group || conflictDraft !== undefined || conflictPreviewRevision !== undefined || assetImporting) {
      return false
    }
    const result = currentSession.commit(targetPageId ? {
      type: 'transfer-media-item', blockId: group.id, itemId, targetPageId,
    } : { type: 'split-media-page', blockId: group.id, itemId }, { expectedRevision: currentRevision.revision })
    if (!isCommitted(result)) {
      setError(result.message); return false
    }
    const itemIndex = group.items.findIndex(item => item.id === itemId)
    const destinationIndex = result.revision.pages.findIndex(page => page.id === targetPageId)
    setMediaPageFeedback({
      focusItemId: group.items[Math.max(0, itemIndex - 1)]?.id ?? '',
      pendingFocus: true,
      message: targetPageId ? `图片 ${itemIndex + 1} 已移到第 ${destinationIndex + 1} 页。` : `已从图片 ${itemIndex + 1} 开始分页。`,
    })
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
        ? '请先删除正文中对应的图片，再移除文件。'
        : '有图片无法加载，请重新选择文件或重新粘贴。')
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
    } catch {
      setError('暂时无法开始导出，请稍后重试。')
      setPhase(pendingCommit.current === undefined ? 'saved' : 'unsaved')
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
          cacheKey: job.plan.cacheKey,
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
        // The export panel owns failures; exporting does not change save status.
        setPhase(pendingCommit.current === undefined ? 'saved' : 'unsaved')
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

  function focusPreviewBlock(blockId: string) {
    setActiveBlockId(blockId)
    setMobilePanel('preview')
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="studio-editor"] [data-block-id]'))
      .find(element => element.dataset.blockId === blockId)
    if (target === undefined) {
      return
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.dataset.studioPreviewFocus = 'true'
    if (previewFocusTimeout.current !== undefined) {
      window.clearTimeout(previewFocusTimeout.current)
    }
    previewFocusTimeout.current = window.setTimeout(() => {
      delete target.dataset.studioPreviewFocus
      previewFocusTimeout.current = undefined
    }, 1200)
  }

  function handlePackageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file !== undefined) {
      Promise.resolve(importPackageFile(file)).catch(() => undefined)
    }
  }

  async function saveShareConversion(conversion: DocumentRevision, source: DocumentRevision) {
    const localRepository = repository.current
    const current = session.current?.getRevision()
    if (!localRepository || current?.id !== source.id || current.revision !== source.revision || conflictDraft || conflictPreviewRevision) {
      throw new Error('原稿已变化，请关闭分享面板后重新创建副本。')
    }
    await saveTail.current
    if (pendingCommit.current) {
      throw new Error('原稿尚未保存，请先重试保存。')
    }
    const receipt = await localRepository.persistCommit({
      assets: persistedAssetRecords(assetPipeline),
      revision: conversion,
      transaction: createImportedDocumentTransaction(conversion.id),
    })
    if (receipt.status === 'stale') {
      throw new Error('分享副本未保存，请重试。')
    }
    session.current = createDocumentSession(conversion)
    durableRevisionSnapshot.current = conversion
    durableRevisionNumber.current = conversion.revision
    setRevision(conversion)
    setDurableRevision(conversion.revision)
    setActivePageId(conversion.pages[0]!.id)
    setRecentCount((await localRepository.listRecents()).length)
    setPhase('saved')
  }

  function renderPackageControls() {
    const packageDisabled = !packageSaveEligible
      || packageWriting
      || packageImportLocked
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined
    const inputDisabled = packageWriting
      || packageImporting
      || pendingPackageImport.current !== undefined
      || pendingCommitRevision !== undefined
      || conflictDraft !== undefined
      || conflictPreviewRevision !== undefined

    return (
      <section
        aria-label="便携副本"
        className="rounded-xl border border-slate-200 bg-white p-3"
        data-testid="studio-package-controls"
      >
        <StudioPanelHeader
          description="保存可继续编辑的副本，方便备份和迁移。"
          icon={<PackageOpen className="h-4 w-4" />}
          title="便携副本"
        />
        <div className="mt-3 grid gap-2">
          <button
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={packageDisabled}
            onClick={() => savePackage().catch(() => undefined)}
            type="button"
          >
            <Save className="h-3.5 w-3.5" />
            {packageWriting ? '保存副本中…' : '保存 .oneimg 副本'}
          </button>
          <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-500 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
            <Upload className="h-3.5 w-3.5" />
            导入 .oneimg 副本
            <input
              accept=".oneimg,application/zip"
              aria-label="导入 .oneimg 副本"
              className="sr-only"
              data-testid="studio-package-input"
              disabled={inputDisabled}
              onChange={handlePackageInputChange}
              type="file"
            />
          </label>
        </div>
        {packageProgress && (
          <output className="mt-3 block text-xs leading-5 text-slate-600" data-testid="studio-package-progress" aria-live="polite">
            {packageProgress.stage === 'writing' ? '正在写入' : '正在验证'} （{packageProgress.completedEntries}/{packageProgress.totalEntries}）
          </output>
        )}
        {packageImportStatus && packageImportStatus.kind !== 'cancelled' && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700" data-testid="studio-import-report" role="status">
            {packageImportStatus.kind === 'imported' && (
              <p className="m-0">已导入为新草稿。{packageImportStatus.duplicate ? '这是你选择的新副本。' : ''}</p>
            )}
            {packageImportStatus.kind === 'duplicate' && (
              <>
                <p className="m-0">这份文件已经导入过。仍要创建新副本吗？</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium"
                    disabled={packageImporting}
                    onClick={() => confirmDuplicatePackageImport().catch(() => undefined)}
                    type="button"
                  >
                    导入新的副本
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium"
                    disabled={packageImporting}
                    onClick={cancelDuplicatePackageImport}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              </>
            )}
            {packageImportStatus.kind === 'recovery' && (
              <p className="m-0">这份文件使用了较新的格式，请更新应用后再导入。</p>
            )}
            {packageImportStatus.report && (
              <output className="mt-1 block text-slate-500">
                {`已验证 ${packageImportStatus.report.exactDocumentCount} 份文档、${packageImportStatus.report.exactAssetCount} 张图片`}
                {packageImportStatus.report.unknownBlockCount > 0 ? `；无法识别的内容 ${packageImportStatus.report.unknownBlockCount} 个` : ''}
                {packageImportStatus.report.unresolvedAssetCount > 0 ? `；缺失图片 ${packageImportStatus.report.unresolvedAssetCount} 个` : ''}
              </output>
            )}
          </div>
        )}
        {revision?.presentation.sensitive && (
          <p className="m-0 mt-3 text-xs leading-5 text-amber-800" data-testid="studio-package-sensitive-note">
            此文档的副本不含预览图。文件未加密，请妥善保管。
          </p>
        )}
      </section>
    )
  }

  function handlePreviewZoomChange(nextScale: number) {
    const normalizedScale = Number.isFinite(nextScale) ? nextScale : 1
    const boundedScale = Number(Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, normalizedScale)).toFixed(2))
    setPreviewScale(boundedScale)
    const scroller = document.querySelector<HTMLElement>('[data-testid="studio-scroll-container"]')
    if (scroller !== null) {
      window.requestAnimationFrame(() => {
        scroller.scrollTo({
          behavior: 'smooth',
          left: boundedScale > 1 ? Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2) : 0,
          top: scroller.scrollTop,
        })
      })
    }
  }

  function handlePreviewFit() {
    const scroller = document.querySelector<HTMLElement>('[data-testid="studio-scroll-container"]')
    const availableWidth = scroller === null
      ? snapshot?.referenceViewport.width ?? 640
      : Math.max(0, scroller.clientWidth - 32)
    const fitScale = snapshot === undefined
      ? 1
      : Math.min(1, Math.max(MIN_PREVIEW_SCALE, availableWidth / snapshot.referenceViewport.width))
    handlePreviewZoomChange(fitScale)
  }

  const editingDisabled = packageImportLocked
    || phase === 'exporting'
    || conflictDraft !== undefined
    || conflictPreviewRevision !== undefined
  const exportDisabled = packageImportLocked
    || conflictPreviewRevision !== undefined
    || !meaningful
    || !preflight.canExport
    || preflight.localRoute !== 'local-eligible'

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
        <p aria-live="polite" className="sr-only" data-testid="media-page-announcement" key="media-page-announcement">{mediaPageFeedback?.message}</p>
        <output aria-live="polite" data-testid="studio-status" className="mx-auto block max-w-3xl text-sm text-slate-600">
          {phaseLabel(phase)}
        </output>
        {error && <pre data-testid="studio-error" className="mx-auto mt-4 max-w-3xl whitespace-pre-wrap text-sm text-red-700">{error}</pre>}
        <div className="mx-auto mt-4 max-w-3xl">
          {revision !== undefined && <ExportPreflightPanel compact findings={preflight.findings} onAction={handlePreflightAction} />}
          <p className="mt-4 text-sm text-slate-500" role="status">正在准备编辑器…</p>
        </div>
        {shareOpen && revision && <SocialShareDialog currentPageId={currentPage?.id} localCapabilityProbe={localCapabilityProbe} assets={assetMap} definitions={resourceDefinitions} onClose={() => setShareOpen(false)} onSave={saveShareConversion} source={revision} />}
      {diagnostics && <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>}
      </main>
    )
  }

  const previewHeight = Math.max(320, renderReadiness?.height ?? 480)
  const previewHeightMeasured = renderReadiness !== undefined
  const previewSurface = (
    <div
      className="relative mx-auto"
      data-testid="studio-preview-surface"
      style={{
        height: previewHeightMeasured ? previewHeight * previewScale : undefined,
        minHeight: previewHeightMeasured ? undefined : previewHeight * previewScale,
        width: snapshot.referenceViewport.width * previewScale,
      }}
    >
      <div
        aria-busy={!previewReady}
        className={previewHeightMeasured
          ? 'absolute left-0 top-0 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(24,32,57,0.14)]'
          : 'relative overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(24,32,57,0.14)]'}
        data-preview-scale={previewScale}
        data-preview-zoom={`${Math.round(previewScale * 100)}%`}
        data-testid="studio-editor"
        style={{
          maxWidth: 'none',
          transform: `scale(${previewScale})`,
          transformOrigin: 'top left',
          width: snapshot.referenceViewport.width,
        }}
      >
        <CanonicalRenderSurface
          mode={packageImportLocked || conflictPreviewRevision ? 'preview' : cleanPreview ? 'preview' : 'edit'}
          onRichTextBlur={stableRichTextBlurHandler}
          onRichTextInput={stableRichTextInputHandler}
          onRichTextPaste={stableRichTextPasteHandler}
          resources={renderResources}
          snapshot={snapshot}
        />
        {!cleanPreview && exportPlan && <StudioSliceBoundaryOverlay plan={exportPlan} />}
      </div>
    </div>
  )

  return (
    <main
      className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#f6f7f9] text-slate-900"
      data-testid="studio-root"
    >
      <p aria-live="polite" className="sr-only" data-testid="media-page-announcement" key="media-page-announcement">{mediaPageFeedback?.message}</p>
      {cleanPreview ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 sm:px-5" data-testid="studio-clean-preview-chrome">
            <div>
              <p className="m-0 text-sm font-semibold text-slate-900">清爽预览</p>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-500"
              onClick={() => setCleanPreview(false)}
              type="button"
            >
              <X className="h-4 w-4" />
              返回编辑
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-[#f6f7f9] px-4 pb-20 pt-8" data-testid="studio-scroll-container">
            <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col items-center justify-start gap-4">
              {previewSurface}
            </div>
          </div>
          <StudioPreviewControls
            onFit={handlePreviewFit}
            onZoomChange={handlePreviewZoomChange}
            scale={previewScale}
          />
        </div>
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 sm:px-5" data-testid="studio-header">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm">O</div>
              <div className="min-w-0">
                <h1 className="m-0 truncate text-sm font-semibold text-slate-900 sm:text-base">{revision.documentName || '新建长图'}</h1>
              </div>
              <div
                className="ml-1 flex min-w-0 items-center gap-2 border-l border-slate-200 pl-3 text-xs text-slate-500"
                data-testid="studio-editor-chrome"
              >
                <p className="m-0 flex shrink-0 items-center gap-1.5" data-testid="studio-status" aria-live="polite">
                  <span
                    aria-hidden="true"
                    className={['h-2 w-2 rounded-full', phase === 'error' || phase === 'conflict'
                      ? 'bg-red-500'
                      : phase === 'saving' || phase === 'exporting'
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'].join(' ')}
                  />
                  {phaseLabel(phase)}
                </p>
                {!meaningful && (
                  <span className={restored ? 'truncate' : 'sr-only'} data-testid="studio-starter-hint">
                    开始输入即可，无需命名。
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                aria-label="撤销"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!session.current?.canUndo() || packageImportLocked || conflictDraft !== undefined || conflictPreviewRevision !== undefined || phase === 'exporting'}
                onClick={() => moveHistory('undo')}
                title="撤销"
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                aria-label="重做"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!session.current?.canRedo() || packageImportLocked || conflictDraft !== undefined || conflictPreviewRevision !== undefined || phase === 'exporting'}
                onClick={() => moveHistory('redo')}
                title="重做"
                type="button"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                aria-label="导出本地文件"
                className="flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                disabled={exportDisabled}
                onClick={() => {
                  setOutputTab('image')
                  setMobilePanel('output')
                  setExportPlan(buildExportPlan())

                  setExportPlanVersion(version => version + 1)
                }}
                title="打开图片导出"
                type="button"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{phase === 'exporting' ? '导出中…' : '导出'}</span>
              </button>
            </div>
          </header>

          {revision.presentation.sceneId === 'social-smart-collage' && <nav aria-label="当前文档页" className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
            {revision.pages.map((page, index) => <button aria-current={currentPage?.id === page.id ? 'page' : undefined} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm aria-[current=page]:bg-violet-100" disabled={phase === 'exporting' || assetImporting} key={page.id} onClick={() => {
              setActivePageId(page.id); setActiveBlockId(undefined)
            }} type="button">第 {index + 1} 页</button>)}
          </nav>}
          <StudioMobileNavigation activePanel={mobilePanel} exportDisabled={exportDisabled} onChange={setMobilePanel} />

          {(error || (pendingCommitRevision !== undefined && phase === 'unsaved') || conflictDraft || conflictPreviewRevision) && (
            <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
              {error && <p data-testid="studio-error" className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}
              {pendingCommitRevision !== undefined && phase === 'unsaved' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="studio-save-recovery">
                  <p className="m-0">最新修改尚未保存到本地。</p>
                  <div className="flex shrink-0 gap-2">
                    <button className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium" onClick={retryPendingCommit} type="button">重试保存</button>
                    <button className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium" onClick={restoreDurableRevision} type="button">恢复已保存内容</button>
                  </div>
                </div>
              )}
              {conflictDraft && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950" data-testid="studio-conflict-notice">
                  <p className="m-0">另一窗口修改了此文档，已将你的编辑保留为“{conflictDraft.documentName}”。</p>
                  <div className="flex shrink-0 gap-2">
                    <button className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 font-medium" onClick={() => openConflictDraft().catch(() => undefined)} type="button">查看冲突草稿</button>
                    <button className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 font-medium" onClick={() => restoreDurableRevision().catch(() => undefined)} type="button">恢复已保存内容</button>
                  </div>
                </div>
              )}
              {conflictPreviewRevision && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-violet-100 px-4 py-3 text-sm text-violet-950" data-testid="studio-conflict-preview">
                  <p className="m-0">正在查看冲突草稿；这是独立的只读预览。</p>
                  <button className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 font-medium" onClick={() => setConflictPreviewRevision(undefined)} type="button">返回编辑</button>
                </div>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[304px_minmax(0,1fr)_332px]">
            <aside
              aria-label="方案配置"
              className={`${mobilePanel === 'config' ? 'flex' : 'hidden'} min-h-0 w-full flex-col border-r border-slate-200 bg-white lg:flex xl:w-[304px]`}
              data-testid="studio-config-sidebar"
            >
              <div className="shrink-0 border-b border-slate-200 px-3 py-3">
                <StudioPanelHeader
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                  title="配置"
                />
                <p className="m-0 mt-1 text-[11px] text-slate-500" data-testid="studio-presentation-summary">
                  {revision.presentation.pageFormat.preset === 'long-image' ? '连续长图' : '固定画幅'} · {snapshot.referenceViewport.width}px
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {revision.presentation.sceneId !== 'social-smart-collage' && <GeneralLongImagePresentationPanel
                  compact
                  disabled={editingDisabled}
                  onChange={commitPresentation}
                  resources={renderResources}
                  snapshot={snapshot}
                />}
                {revision.presentation.sceneId === 'social-smart-collage' && <button className="w-full rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-800" onClick={() => setShareOpen(true)} type="button">调整分享版式和输出</button>}
                <StudioContentOutline
                  activeBlockId={activeBlockId}
                  disabled={editingDisabled}
                  onSelect={focusPreviewBlock}
                  revision={revision.presentation.sceneId === 'social-smart-collage' && currentPage ? { ...revision, pages: [currentPage] } : revision}
                />
                <MediaGroupEditor
                  arrangement={mediaGroup?.arrangement ?? 'auto'}
                  disabled={assetImporting || editingDisabled}
                  items={mediaGroup?.items ?? []}
                  onImportFiles={importFiles}
                  onMoveItem={moveMediaItem}
                  pageNavigation={revision.presentation.sceneId === 'social-smart-collage' ? {
                    currentPageId: currentPage!.id,
                    canSplitFirst: currentPage!.blocks[0]?.id !== mediaGroup?.id,
                    feedback: mediaPageFeedback,
                    onFocusHandled: () => setMediaPageFeedback(current => current && ({ ...current, pendingFocus: false })),
                    pages: revision.pages.map((page, index) => ({ id: page.id, label: `第 ${index + 1} 页`, full: page.blocks.reduce((count, block) => count + (block.kind === 'media-group' ? block.items.length : 0), 0) >= 9 })),
                    onMove: (itemId, pageId) => organizeMediaPage(itemId, pageId),
                    onSplit: itemId => organizeMediaPage(itemId),
                  } : undefined}
                  onRemoveItem={removeMediaItem}
                  onRelinkItem={relinkFile}
                  onSetFeaturedItem={setFeaturedMediaItem}
                  onUpdateArrangement={(arrangement: MediaArrangement) => commitMediaGroupChanges({ arrangement })}
                  onUpdateItem={commitMediaItem}
                  unresolvedItemIds={mediaGroup?.items
                    .filter(item => assetMap.get(item.assetId)?.status !== 'ready')
                    .map(item => item.id)}
                />
              </div>
            </aside>

            {/* Keep the canonical layout measurable while mobile controls are open. */}
            <section
              aria-label="中央预览"
              className={`flex min-h-0 min-w-0 flex-col bg-[#f6f7f9] ${mobilePanel === 'preview' ? 'relative' : 'invisible fixed -left-[10000px] bottom-0 top-0 w-[640px] lg:visible lg:relative lg:inset-auto lg:w-auto'}`}
            >
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-4 pb-20 pt-4 sm:px-5 sm:pt-5" data-testid="studio-scroll-container">
                <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col items-center justify-start gap-3">
                  {previewSurface}
                </div>
              </div>
              <StudioPreviewControls
                onCleanPreview={() => setCleanPreview(true)}
                onFit={handlePreviewFit}
                onZoomChange={handlePreviewZoomChange}
                scale={previewScale}
              />
            </section>

            <div
              className={`${mobilePanel === 'output' ? 'flex' : 'hidden'} min-h-0 w-full bg-white lg:max-xl:fixed lg:max-xl:top-[110px] lg:max-xl:bottom-0 lg:max-xl:right-0 lg:max-xl:z-30 lg:max-xl:w-[360px] lg:max-xl:shadow-2xl xl:static xl:flex xl:w-[332px]`}
              data-testid="studio-output-column"
            >
              <StudioOutputShell
                activeTab={outputTab}
                imageContent={(
                  <div className="space-y-3">
                    <button className="w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-800 disabled:opacity-40" disabled={!revision.pages.some(page => page.blocks.some(block => block.kind === 'media-group')) || editingDisabled || pendingCommitRevision !== undefined} onClick={() => setShareOpen(true)} type="button">制作分享页</button>
                    {preflight.findings.length > 0 && <ExportPreflightPanel compact findings={preflight.findings} onAction={handlePreflightAction} />}
                    <ExportPanel
                      availableSliceIndexes={currentExportArtifact?.segments?.map(segment => segment.index) ?? []}
                      diagnostics={diagnostics}
                      exportSlices={exportSlices}
                      jobState={exportJobState}
                      onCancel={cancelExport}
                      onDownloadSlice={downloadSlice}
                      onOutputScaleChange={(scale) => {
                        setExportOutputScale(scale)
                        setExportArtifact(undefined)
                        setExportJobState(undefined)
                        setExportPlanVersion(version => version + 1)
                      }}
                      onExportSlicesChange={(enabled) => {
                        setExportSlices(enabled)
                        setExportArtifact(undefined)
                        setExportJobState(undefined)
                        setExportPlanVersion(version => version + 1)
                      }}
                      onRun={runExport}
                      outputScale={exportOutputScale}
                      plan={exportPlan}
                    />
                    {diagnostics && lastExport && <output hidden data-testid="studio-export-result">{JSON.stringify(lastExport)}</output>}
                  </div>
                )}
                onTabChange={setOutputTab}
                portableContent={renderPackageControls()}
              />
            </div>
          </div>

        </>
      )}
      {shareOpen && <SocialShareDialog currentPageId={currentPage?.id} localCapabilityProbe={localCapabilityProbe} assets={assetMap} definitions={resourceDefinitions} onClose={() => setShareOpen(false)} onSave={saveShareConversion} source={revision} />}
      {diagnostics && <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>}
    </main>
  )
}
