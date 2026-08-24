'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import {
  type ResolvedResourceSet,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import { waitForCanonicalRenderReady } from '@/features/canonical-renderer/render-ready'
import {
  type DocumentCommitResult,
  type DocumentRevision,
  type DocumentSession,
  createDocumentSession,
  createRichTextBlock,
  createUntouchedDocumentRevision,
  isMeaningfulDocumentRevision,
} from '@/features/document-core'
import {
  createGeneralLongImageSnapshot,
  createRichTextDocumentFromPlainText,
  generalLongImageResourceDefinitions,
  richTextDocumentHasMeaningfulText,
  updateRichTextDocumentText,
} from '@/features/general-long-image'
import { createLocalSvgAdapter } from '@/features/local-export/local-svg-adapter'
import {
  isRenderAbortError,
} from '@/features/rendering/cancellation'
import {
  type LocalRepository,
  createIndexedDbLocalRepository,
} from '@/features/local-repository'

const ACTIVE_DOCUMENT_HINT_KEY = 'oneimg:studio:active-document'
const STUDIO_DATABASE_NAME = 'OneImgStudio'

type StudioPhase = 'editing' | 'error' | 'exporting' | 'ready' | 'restored' | 'saved' | 'saving' | 'unsaved'

interface StudioDocumentState {
  readonly documentId: string
  readonly durableRevision: number
  readonly meaningful: boolean
  readonly recentCount: number
  readonly restored: boolean
  readonly revision: number
  readonly status: string
}

function createStudioDocumentId() {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `document:studio:${suffix}`
}

function phaseLabel(phase: StudioPhase) {
  switch (phase) {
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

function isCommitted(result: DocumentCommitResult): result is Extract<DocumentCommitResult, { status: 'committed' }> {
  return result.status === 'committed'
}

export function StudioClient() {
  const mounted = useRef(true)
  const session = useRef<DocumentSession>()
  const repository = useRef<LocalRepository>()
  const saveTail = useRef(Promise.resolve())
  const exportController = useRef<AbortController>()
  const readinessGeneration = useRef(0)
  const resolver = useMemo(
    () => createBrowserResourceResolver(generalLongImageResourceDefinitions),
    [],
  )
  const adapter = useMemo(() => createLocalSvgAdapter(), [])
  const [revision, setRevision] = useState<DocumentRevision>()
  const [durableRevision, setDurableRevision] = useState(0)
  const [recentCount, setRecentCount] = useState(0)
  const [restored, setRestored] = useState(false)
  const [phase, setPhase] = useState<StudioPhase>('ready')
  const [cleanPreview, setCleanPreview] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [resources, setResources] = useState<ResolvedResourceSet>()
  const [error, setError] = useState<string>()

  const snapshot = useMemo(
    () => revision === undefined ? undefined : createGeneralLongImageSnapshot(revision),
    [revision],
  )
  const meaningful = revision === undefined ? false : isMeaningfulDocumentRevision(revision)

  useEffect(() => {
    mounted.current = true
    let active = true

    async function start() {
      try {
        const localRepository = createIndexedDbLocalRepository({ dbName: STUDIO_DATABASE_NAME })
        repository.current = localRepository
        const recents = await localRepository.listRecents()
        const hintedDocumentId = window.localStorage.getItem(ACTIVE_DOCUMENT_HINT_KEY)
        let restoredRevision: DocumentRevision | null = null

        const candidateDocumentIds = Array.from(new Set([
          ...recents.map(item => item.documentId),
          ...(hintedDocumentId === null ? [] : [hintedDocumentId]),
        ]))
        for (const candidateDocumentId of candidateDocumentIds) {
          try {
            const candidate = await localRepository.restore(candidateDocumentId)
            if (candidate !== null && isMeaningfulDocumentRevision(candidate)) {
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
        setRevision(usableRevision)
        setDurableRevision(hasRestoredRevision ? usableRevision.revision : 0)
        setRecentCount(recents.length)
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
      exportController.current?.abort()
      repository.current?.close()
      resources?.release()
    }
    // The Repository and resource resolver are intentionally created once per Studio session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (snapshot === undefined) {
      setResources(undefined)
      setPreviewReady(false)
      return
    }

    let active = true
    let resolved: ResolvedResourceSet | undefined
    const controller = new AbortController()
    setResources(undefined)
    setPreviewReady(false)

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
        if (active && !isRenderAbortError(reason)) {
          setError(reason instanceof Error ? reason.message : String(reason))
          setPhase('error')
        }
      })

    return () => {
      active = false
      controller.abort()
      resolved?.release()
    }
  }, [resolver, snapshot])

  useEffect(() => {
    if (!resources || snapshot === undefined) {
      setPreviewReady(false)
      return
    }

    let active = true
    const generation = readinessGeneration.current + 1
    readinessGeneration.current = generation
    const root = document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-oneimg-render-root]')
    if (!root) {
      setError('Studio did not mount a Canonical Render Root')
      setPhase('error')
      return
    }

    waitForCanonicalRenderReady(root, snapshot, resources, {
      isCurrent: () => active && readinessGeneration.current === generation,
    })
      .then(() => {
        if (!active) {
          return
        }
        root.dataset.renderReady = 'true'
        setPreviewReady(true)
        if (!meaningful && !cleanPreview) {
          document.querySelector<HTMLElement>('[data-testid="studio-editor"] [data-studio-empty-editor]')?.focus()
        }
      })
      .catch((reason: unknown) => {
        if (active && !isRenderAbortError(reason)) {
          setError(reason instanceof Error ? reason.message : String(reason))
          setPhase('error')
        }
      })

    return () => {
      active = false
    }
  }, [cleanPreview, meaningful, resources, snapshot])

  function persistCommit(nextRevision: DocumentRevision, transaction: Extract<DocumentCommitResult, { status: 'committed' }>['transaction']) {
    const localRepository = repository.current
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
        setDurableRevision(current => Math.max(current, receipt.revision))
        setRecentCount((await localRepository.listRecents()).length)
        window.localStorage.setItem(ACTIVE_DOCUMENT_HINT_KEY, nextRevision.id)
        setPhase('saved')
      })
      .catch((reason: unknown) => {
        if (!mounted.current) {
          return
        }
        setError(reason instanceof Error ? reason.message : String(reason))
        setPhase('unsaved')
      })
    saveTail.current = task.then(() => undefined, () => undefined)
  }

  function commitText(blockId: string | undefined, text: string) {
    const currentSession = session.current
    const currentRevision = revision
    if (!currentSession || currentRevision === undefined) {
      return
    }

    const nextDocument = createRichTextDocumentFromPlainText(text)
    const hasText = richTextDocumentHasMeaningfulText(nextDocument)
    const existingBlock = findBlock(currentRevision, blockId)
    let result: DocumentCommitResult
    if (!hasText && blockId !== undefined && existingBlock !== undefined) {
      result = currentSession.commit({ blockId, type: 'remove-block' }, { expectedRevision: currentRevision.revision })
    } else if (hasText && blockId !== undefined && existingBlock?.kind === 'rich-text') {
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

  async function exportPng() {
    if (!snapshot || !meaningful || !previewReady || exportController.current) {
      return
    }
    const controller = new AbortController()
    exportController.current = controller
    setError(undefined)
    setPhase('exporting')
    let exportResources: ResolvedResourceSet | undefined
    try {
      exportResources = await resolver.resolve(snapshot, 'local-export', { signal: controller.signal })
      const artifact = await adapter.exportPng({
        resources: exportResources,
        signal: controller.signal,
        snapshot,
      })
      if (controller.signal.aborted) {
        return
      }
      const url = URL.createObjectURL(artifact.blob)
      const anchor = document.createElement('a')
      anchor.download = `oneimg-general-long-image-r${revision?.revision ?? 0}.${artifact.format === 'zip' ? 'zip' : 'png'}`
      anchor.href = url
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      setPhase('saved')
    } catch (reason) {
      if (!isRenderAbortError(reason) && !controller.signal.aborted && mounted.current) {
        setError(reason instanceof Error ? reason.message : String(reason))
        setPhase('unsaved')
      }
    } finally {
      exportResources?.release()
      if (exportController.current === controller) {
        exportController.current = undefined
      }
    }
  }

  const state: StudioDocumentState = {
    documentId: revision?.id ?? '',
    durableRevision,
    meaningful,
    recentCount,
    restored,
    revision: revision?.revision ?? 0,
    status: phaseLabel(phase),
  }

  if (revision === undefined || snapshot === undefined || resources === undefined) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-900">
        <output aria-live="polite" data-testid="studio-status" className="mx-auto block max-w-3xl text-sm text-slate-600">
          {phaseLabel(phase)}
        </output>
        {error && <pre data-testid="studio-error" className="mx-auto mt-4 max-w-3xl whitespace-pre-wrap text-sm text-red-700">{error}</pre>}
        <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900 sm:px-10">
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
                aria-pressed={cleanPreview}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
                onClick={() => setCleanPreview(true)}
                type="button"
              >
                清爽预览
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!meaningful || !previewReady || phase === 'exporting'}
                onClick={() => {
                  exportPng().catch(() => undefined)
                }}
                type="button"
              >
                {phase === 'exporting' ? '导出中…' : '导出本地文件'}
              </button>
            </div>
          </header>
        )}

        <div className={`${cleanPreview ? 'hidden' : 'flex'} items-center justify-between text-sm text-slate-500`} data-testid="studio-editor-chrome">
          <p className="m-0" data-testid="studio-status" aria-live="polite">{phaseLabel(phase)}</p>
          {!meaningful && <p className="m-0" data-testid="studio-starter-hint">无需命名或创建项目，直接开始输入。</p>}
        </div>

        {error && <p data-testid="studio-error" className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div
          aria-busy={!previewReady}
          className="overflow-x-auto rounded-2xl shadow-[0_20px_60px_rgba(24,32,57,0.14)]"
          data-testid="studio-editor"
        >
          <CanonicalRenderSurface
            mode={cleanPreview ? 'preview' : 'edit'}
            onRichTextBlur={(blockId, text) => commitText(blockId, text)}
            onRichTextInput={() => {
              if (phase !== 'saving' && phase !== 'exporting') {
                setPhase('editing')
              }
            }}
            resources={resources}
            snapshot={snapshot}
          />
        </div>
        {!cleanPreview && <p className="m-0 text-center text-xs text-slate-500">内容默认保存在此设备。编辑会在离开正文后自动保存。</p>}
        <output data-testid="studio-document-state" hidden>{JSON.stringify(state)}</output>
      </div>
    </main>
  )
}
