'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type SocialOutputFormat,
  createSocialBundle,
  createSocialFilenamePrefix,
  downloadSocialBlob,
  encodeSocialPage,
  probeSocialFormats,
  socialPageFilename,
} from './output'
import {
  SOCIAL_SHARE_FORMATS,
  type SocialShareFormat,
  type SocialShareMode,
  createSocialShareConversion,
  createSocialShareSnapshot,
} from './index'
import { type DocumentRevision, isMeaningfulDocumentRevision } from '@/features/document-core'
import type { AssetRecord } from '@/features/asset-pipeline'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import {
  type BrowserResourceDefinition,
  type ResolvedResourceSet,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import { getCanonicalLayoutFingerprint, waitForCanonicalRenderReady } from '@/features/canonical-renderer/render-ready'
import { type ExportPlan, type ExportPlanRequest, type ExportPreflightInput, type LocalCapabilityProbeObservation, evaluateExportPreflight, readPreflightImageObservations } from '@/features/export-engine'
import { createStudioExportEngine } from '@/features/export-engine/studio-export-engine'
import { isRenderAbortError, throwIfRenderAborted } from '@/features/rendering/cancellation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const buttonBase = 'min-h-10 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 focus-visible:outline-violet-600'
const control = `${buttonBase} border-slate-300 bg-white text-slate-800`
const primary = `${buttonBase} border-violet-600 bg-violet-600 text-white`

interface SharePageReadiness {
  readonly request: ExportPlanRequest
  readonly preflight: Omit<ExportPreflightInput, 'localCapabilityProbe'>
}

function SharePage({ snapshot, meaningful, definitions, active, onReady, onError }: {
  readonly snapshot: CanonicalRenderSnapshot
  readonly meaningful: boolean
  readonly definitions: readonly BrowserResourceDefinition[]
  readonly active: boolean
  readonly onReady: (value: SharePageReadiness) => void
  readonly onError: (message: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(0.45)
  useEffect(() => {
    const update = () => setScale(Math.min(0.68, (window.innerWidth - 80) / snapshot.referenceViewport.width))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [snapshot.referenceViewport.width])
  useEffect(() => {
    const controller = new AbortController()
    let resolved: ResolvedResourceSet | undefined
    createBrowserResourceResolver(definitions).resolve(snapshot, 'preview', { signal: controller.signal }).then((value) => {
      resolved = value
      if (controller.signal.aborted) {
        value.release()
      } else {
        setResources(value)
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        onError(reason instanceof Error ? reason.message : '图片资源加载失败。')
      }
    })
    return () => {
      controller.abort(); resolved?.release()
    }
  }, [definitions, onError, snapshot])
  useEffect(() => {
    const root = host.current?.querySelector<HTMLElement>('[data-oneimg-render-root]')
    if (!root || !resources) {
      return
    }
    const controller = new AbortController()
    waitForCanonicalRenderReady(root, snapshot, resources, { signal: controller.signal }).then((readiness) => {
      throwIfRenderAborted(controller.signal)
      if (readiness.overflow.horizontal || readiness.overflow.vertical) {
        throw new Error('这一页的内容超出画幅，请改用更高的格式或减少本页内容。')
      }
      onReady({
        preflight: {
          snapshot,
          meaningful,
          readiness,
          renderReady: true,
          rendererAvailable: true,
          highFidelityAvailable: false,
          images: readPreflightImageObservations(root),
          fontFallbackIds: resources.fontFallbackIds,
          resolvedResourceIds: resources.resources.map(resource => resource.id),
        },
        request: {
          snapshot,
          meaningful,
          renderReady: true,
          resourceFingerprint: resources.fingerprint,
          fontFallbackIds: resources.fontFallbackIds,
          pageMeasurements: [{
            id: snapshot.snapshotId,
            kind: 'bounded',
            width: readiness.width,
            height: readiness.height,
            layoutFingerprint: getCanonicalLayoutFingerprint(root),
          }],
        },
      })
      setReady(true)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        onError(reason instanceof Error ? reason.message : '页面尚未就绪。')
      }
    })
    return () => controller.abort()
  }, [meaningful, onError, onReady, resources, snapshot])
  return (
    <div aria-hidden={!active} className={active ? 'relative mx-auto' : 'invisible fixed -left-[10000px] top-0'} style={{ width: snapshot.referenceViewport.width * scale, height: (snapshot.presentation.pageFormat.height ?? 640) * scale }}>
      <div data-testid="social-canonical-page" ref={host} style={{ width: snapshot.referenceViewport.width, transform: ready ? `scale(${scale})` : undefined, transformOrigin: 'top left', opacity: ready ? 1 : 0 }}>
        {resources && <CanonicalRenderSurface mode="preview" resources={resources} snapshot={snapshot} />}
      </div>
    </div>
  )
}

export function SocialShareDialog({ source, currentPageId, assets, definitions, localCapabilityProbe, onClose, onSave }: {
  readonly source: DocumentRevision
  readonly currentPageId?: string
  readonly localCapabilityProbe: LocalCapabilityProbeObservation
  readonly assets: ReadonlyMap<string, AssetRecord>
  readonly definitions: readonly BrowserResourceDefinition[]
  readonly onClose: () => void
  readonly onSave: (conversion: DocumentRevision, source: DocumentRevision) => Promise<void>
}) {
  const initialIsSocial = source.presentation.sceneId === 'social-smart-collage'
  const imageCount = source.pages.flatMap(page => page.blocks).reduce((count, block) => count + (block.kind === 'media-group' ? block.items.length : 0), 0)
  const initialMode = source.pages.length > 1 || imageCount > 9 ? 'set' : 'together'
  const [mode, setMode] = useState<SocialShareMode>(initialMode)
  const initialFormat = SOCIAL_SHARE_FORMATS.find(item => item.id === source.pages[0]?.format.preset)?.id ?? 'square'
  const [format, setFormat] = useState<SocialShareFormat>(initialFormat)
  const [candidate, setCandidate] = useState(() => initialIsSocial ? source : createSocialShareConversion(source, { mode: initialMode, format: initialFormat, documentId: crypto.randomUUID() }))
  const [accepted, setAccepted] = useState(initialIsSocial)
  const [pageIndex, setPageIndex] = useState(initialIsSocial ? Math.max(0, source.pages.findIndex(page => page.id === currentPageId)) : 0)
  const [requests, setRequests] = useState<ReadonlyMap<string, SharePageReadiness>>(new Map())
  const [outputFormat, setOutputFormat] = useState<SocialOutputFormat>('png')
  const [formats, setFormats] = useState<readonly SocialOutputFormat[]>(['png'])
  const [quality, setQuality] = useState(0.9)
  const [outputScale, setOutputScale] = useState<1 | 2 | 3>(1)
  const [encoded, setEncoded] = useState<ReadonlyMap<string, Blob>>(new Map())
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState('')
  const [filenameDate] = useState(() => new Date())
  const [filenameName, setFilenameName] = useState(source.presentation.sensitive ? 'oneimg' : source.documentName || 'oneimg')
  const filenamePrefix = createSocialFilenamePrefix({ nameOverride: filenameName, date: filenameDate })
  const [busy, setBusy] = useState(false)
  const [proofKey, setProofKey] = useState('')
  const operation = useRef<AbortController>()
  const activeJob = useRef<string>()
  const pngs = useRef(new Map<string, Blob>())
  const engine = useMemo(() => createStudioExportEngine(definitions), [definitions])
  const prepared = useMemo(() => {
    try {
      return { snapshots: candidate.pages.map(page => createSocialShareSnapshot(candidate, page.id, { assets })), error: undefined }
    } catch (reason) {
      return { snapshots: [], error: reason instanceof Error ? reason.message : '分享页暂时无法预览。' }
    }
  }, [assets, candidate])
  const snapshots = prepared.snapshots
  const plans = useMemo(() => snapshots.map((snapshot, index) => {
    const request = requests.get(snapshot.snapshotId)
    return request && engine.plan({ ...request.request, preflightFindings: [...evaluateExportPreflight({ ...request.preflight, localCapabilityProbe }).findings, ...(isMeaningfulDocumentRevision({ ...candidate, pages: [candidate.pages[index]!] }) ? [] : [{ code: 'empty-page', kind: 'quality-warning' as const, message: '这一页没有内容，将导出空白页。可返回编辑后移除或添加内容。' }])], output: { format: 'png', scale: outputScale } })
  }), [candidate, engine, localCapabilityProbe, outputScale, requests, snapshots])
  const onReady = useCallback((value: SharePageReadiness) => setRequests(current => new Map(current).set(value.request.snapshot.snapshotId, value)), [])
  const onError = useCallback((message: string) => setError(message), [])
  const pngKey = (index: number) => `${snapshots[index]?.snapshotId ?? 'unavailable'}:${outputScale}`
  const encodedKey = (index: number) => `${pngKey(index)}:${outputFormat}:${quality}`
  const key = encodedKey(pageIndex)
  const currentBlob = encoded.get(key)
  const proofReady = currentBlob !== undefined && proofKey === key
  const [proofUrl, setProofUrl] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    probeSocialFormats(controller.signal).then((value) => {
      if (!controller.signal.aborted) {
        setFormats(value)
      }
    }).catch(() => undefined)
    return () => {
      controller.abort()
    }
  }, [])
  useEffect(() => {
    if (!currentBlob) {
      setProofUrl('')
      return
    }
    const url = URL.createObjectURL(currentBlob)
    setProofUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [currentBlob])
  useEffect(() => () => {
    operation.current?.abort()
    if (activeJob.current) {
      engine.cancel(activeJob.current)
    }
    pngs.current.clear()
  }, [engine])

  function cancel() {
    operation.current?.abort()
    if (activeJob.current) {
      engine.cancel(activeJob.current)
    }
    setStatus('已取消，分享副本已保留。')
  }

  function changeConversion(nextMode: SocialShareMode, nextFormat: SocialShareFormat) {
    try {
      const next = createSocialShareConversion(source, { mode: nextMode, format: nextFormat, documentId: crypto.randomUUID() })
      setCandidate(next)
      setMode(nextMode)
      setFormat(nextFormat)
      setAccepted(false)
      setPageIndex(0)
      setRequests(new Map())
      setEncoded(new Map())
      pngs.current.clear()
      setError(undefined)
      setStatus('预览新副本，确认后即可导出。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法转换。')
    }
  }

  async function save() {
    setBusy(true)
    setError(undefined)
    try {
      await onSave(candidate, source)
      setAccepted(true)
      setStatus('已保存为独立分享副本。原稿仍保留。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试。')
    } finally {
      setBusy(false)
    }
  }

  async function renderPage(index: number, signal: AbortSignal) {
    throwIfRenderAborted(signal)
    const cached = encoded.get(encodedKey(index))
    if (cached) {
      return cached
    }
    let png = pngs.current.get(pngKey(index))
    if (!png) {
      const plan: ExportPlan | undefined = plans[index]
      if (!plan?.canRun) {
        throw new Error('页面尚未就绪，请检查内容是否超出画幅。')
      }
      const job = engine.run(plan)
      activeJob.current = job.id
      const unsubscribe = job.subscribe(state => setStatus(`第 ${index + 1}/${plans.length} 页 · ${state.stage === 'preparing' ? '准备资源' : state.stage === 'rendering' ? '生成图片' : state.stage === 'encoding' ? '编码' : '完成'}`))
      try {
        const result = await job.promise
        throwIfRenderAborted(signal)
        if (result.artifact.format !== 'png') {
          throw new Error('分享页必须生成完整图片。')
        }
        png = result.artifact.blob
        pngs.current.set(pngKey(index), png)
        while (pngs.current.size > 8) {
          pngs.current.delete(pngs.current.keys().next().value!)
        }
      } finally {
        unsubscribe()
        activeJob.current = undefined
      }
    }
    const blob = await encodeSocialPage(png, outputFormat, quality, signal)
    throwIfRenderAborted(signal)
    setEncoded((current) => {
      const next = new Map(current).set(encodedKey(index), blob)
      while (next.size > 8) {
        next.delete(next.keys().next().value!)
      }
      return next
    })
    return blob
  }

  async function generate(bundle = false) {
    if (busy || !accepted) {
      return
    }
    const controller = new AbortController()
    operation.current = controller
    setBusy(true)
    setError(undefined)
    try {
      if (bundle) {
        const pages: Blob[] = []
        for (let index = 0; index < plans.length; index += 1) {
          pages.push(await renderPage(index, controller.signal))
        }
        setStatus('正在打包分享页…')
        const blob = await createSocialBundle(pages, outputFormat, filenamePrefix, controller.signal)
        throwIfRenderAborted(controller.signal)
        downloadSocialBlob(blob, `${filenamePrefix}-share-set.zip`)
        setStatus(`已下载 ${pages.length} 页。`)
      } else {
        await renderPage(pageIndex, controller.signal)
        setStatus('已生成实际编码预览。')
      }
    } catch (reason) {
      if (controller.signal.aborted || isRenderAbortError(reason)) {
        setStatus('已取消，分享副本已保留。')
      } else {
        setError(reason instanceof Error ? reason.message : '导出失败，请重试。')
      }
    } finally {
      operation.current = undefined
      setBusy(false)
    }
  }

  const clipboardSupported = typeof window !== 'undefined' && window.isSecureContext
    && typeof ClipboardItem !== 'undefined' && typeof ClipboardItem.supports === 'function'
    && ClipboardItem.supports('image/png') && typeof navigator.clipboard?.write === 'function'
  const shareFile = proofReady && currentBlob ? new File([currentBlob], socialPageFilename(pageIndex, outputFormat, filenamePrefix), { type: currentBlob.type }) : undefined
  let shareSupported = false
  try {
    shareSupported = shareFile !== undefined && typeof navigator.share === 'function' && navigator.canShare?.({ files: [shareFile] }) === true
  } catch { /* A denied Permissions Policy leaves download available. */ }
  const allReady = plans.length > 0 && plans.every(plan => plan?.canRun)

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        cancel(); onClose()
      }
    }}>
      <DialogContent className="max-h-[94dvh] max-w-5xl overflow-y-auto bg-slate-50 p-4 sm:p-6" data-testid="social-share-dialog">
        <DialogTitle>制作分享页</DialogTitle>
        <DialogDescription>先预览版式，再保存分享副本。文字和原始照片始终保留。</DialogDescription>
        <div className="mt-4 grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-4">
            <fieldset disabled={busy} className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-slate-700">分享方式</legend>
              <div className="grid grid-cols-2 gap-2">
                <button className={mode === 'together' ? primary : control} aria-pressed={mode === 'together'} onClick={() => changeConversion('together', format)} type="button">拼成一张</button>
                <button className={mode === 'set' ? primary : control} aria-pressed={mode === 'set'} onClick={() => changeConversion('set', format)} type="button">成组分享</button>
              </div>
              <p className="text-xs text-slate-500">成组分享时，一张照片一页，顺序保持不变。</p>
              <label className="grid gap-1 text-sm">分享画幅
                <select aria-label="分享画幅" className={control} value={format} onChange={event => changeConversion(mode, event.target.value as SocialShareFormat)}>
                  {SOCIAL_SHARE_FORMATS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              {!accepted && <button className={`${primary} w-full`} onClick={() => save().catch(() => undefined)} disabled={!allReady} type="button">保存分享副本</button>}
              <label className="grid gap-1 text-sm">导出文件名
                <input aria-label="分享文件名" className={control} value={filenameName} onChange={event => setFilenameName(event.target.value)} />
                <span className="text-xs text-slate-500">自动附加日期和页序号。</span>
              </label>
              <label className="grid gap-1 text-sm">图片格式
                <select aria-label="分享图片格式" className={control} value={outputFormat} onChange={event => setOutputFormat(event.target.value as SocialOutputFormat)}>
                  {formats.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                </select>
              </label>
              {outputFormat !== 'png' && <label className="grid gap-1 text-sm">编码质量 {Math.round(quality * 100)}%
                <input aria-label="分享编码质量" type="range" min="10" max="100" step="5" value={Math.round(quality * 100)} onChange={event => setQuality(Number(event.target.value) / 100)} />
              </label>}
              <label className="grid gap-1 text-sm">输出倍率
                <select aria-label="分享输出倍率" className={control} value={outputScale} onChange={event => setOutputScale(Number(event.target.value) as 1 | 2 | 3)}>
                  {[1, 2, 3].map(value => <option key={value} value={value}>{value}×</option>)}
                </select>
              </label>
              <button className={`${primary} w-full`} disabled={!accepted || !plans[pageIndex]?.canRun} onClick={() => generate().catch(() => undefined)} type="button">生成第 {pageIndex + 1} 页预览</button>
              <button className={`${control} w-full`} disabled={!proofReady} onClick={() => currentBlob && downloadSocialBlob(currentBlob, socialPageFilename(pageIndex, outputFormat, filenamePrefix))} type="button">下载第 {pageIndex + 1} 页</button>
              {clipboardSupported ? <button className={`${control} w-full`} disabled={!proofReady || !pngs.current.has(pngKey(pageIndex))} onClick={() => {
                const png = pngs.current.get(pngKey(pageIndex))!
                navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(() => setStatus(`已复制第 ${pageIndex + 1} 页 PNG。`)).catch(() => setError('无法复制图片，请下载当前页。'))
              }} type="button">复制第 {pageIndex + 1} 页</button> : <p className="text-xs text-slate-500">此浏览器不支持复制图片，请下载当前页。</p>}
              {shareSupported && <button className={`${control} w-full`} onClick={() => {
                navigator.share({ files: [shareFile!] }).then(() => setStatus('已打开系统分享。')).catch((reason: unknown) => {
                  if (!isRenderAbortError(reason)) {
                    setError('系统分享不可用，请下载当前页。')
                  }
                })
              }} type="button">系统分享第 {pageIndex + 1} 页</button>}
              <button className={`${control} w-full`} disabled={!accepted || !allReady || (outputFormat !== 'png' && !proofReady)} onClick={() => generate(true).catch(() => undefined)} type="button">下载全部 {candidate.pages.length} 页 ZIP</button>
            </fieldset>
            {busy && <button className={control} onClick={cancel} type="button">取消生成</button>}
            {prepared.error && <p className="text-sm text-red-700" role="alert">{prepared.error}</p>}
            {plans[pageIndex]?.findings.map(finding => <p className={finding.kind === 'blocking-error' ? 'text-sm text-red-700' : 'text-sm text-slate-600'} key={`${finding.code}:${finding.resourceId ?? ''}`} role={finding.kind === 'blocking-error' ? 'alert' : undefined}>{finding.message}</p>)}
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <p className="text-sm text-slate-600" role="status">{status}</p>
          </div>
          <div className="min-w-0 space-y-4">
            <nav aria-label="分享页" className="flex flex-wrap gap-2">
              {candidate.pages.map((page, index) => <button aria-current={pageIndex === index ? 'page' : undefined} className={pageIndex === index ? primary : control} disabled={busy} key={page.id} onClick={() => setPageIndex(index)} type="button">第 {index + 1} 页</button>)}
            </nav>
            <p className="text-xs font-semibold text-slate-500">版式预览 · {pageIndex + 1} / {candidate.pages.length}</p>
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-200/60 p-2">
              {snapshots.map((snapshot, index) => <SharePage active={index === pageIndex} definitions={definitions} meaningful={isMeaningfulDocumentRevision(candidate)} key={snapshot.snapshotId} onError={onError} onReady={onReady} snapshot={snapshot} />)}
            </div>
            {currentBlob && proofUrl && <div className="rounded-xl border border-violet-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-slate-600">实际编码预览 · {outputFormat.toUpperCase()} · {currentBlob.size.toLocaleString()} 字节</p>
              {/* Final encoded bytes; downloading reuses this Blob. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`第 ${pageIndex + 1} 页实际编码预览`} className="mx-auto max-h-[420px] max-w-full" data-testid="social-encoded-preview" key={key} onLoad={() => setProofKey(key)} onError={() => {
                setProofKey(''); setError('成品无法解码，请重新生成。')
              }} src={proofUrl} />
            </div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
