'use client'

import { useEffect, useRef, useState } from 'react'
import type { MediaArrangement, MediaItem } from '@/features/document-core'

export interface MediaGroupEditorProps {
  readonly pageNavigation?: {
    readonly currentPageId: string
    readonly canSplitFirst: boolean
    readonly feedback?: { readonly focusItemId: string, readonly pendingFocus: boolean, readonly message: string }
    readonly onFocusHandled: () => void
    readonly pages: readonly { readonly id: string, readonly label: string, readonly full: boolean }[]
    readonly onMove: (itemId: string, pageId: string) => boolean
    readonly onSplit: (itemId: string) => boolean
  }
  readonly arrangement: MediaArrangement
  readonly disabled?: boolean
  readonly items: readonly MediaItem[]
  readonly onImportFiles: (files: readonly File[]) => void | Promise<void>
  readonly onMoveItem: (itemId: string, index: number) => boolean
  readonly onRemoveItem: (itemId: string) => boolean
  readonly onRelinkItem?: (itemId: string, file: File) => void | Promise<void>
  readonly onSetFeaturedItem: (itemId: string) => boolean
  readonly onUpdateArrangement: (arrangement: MediaArrangement) => boolean
  readonly onUpdateItem: (item: MediaItem) => boolean
  readonly unresolvedItemIds?: readonly string[]
}

interface AdjustmentDraft {
  readonly item: MediaItem
}

function cloneMediaItem(item: MediaItem): MediaItem {
  return {
    ...item,
    focalPoint: { ...item.focalPoint },
  }
}

function updateAdjustment(
  adjustment: AdjustmentDraft,
  changes: Partial<MediaItem>,
): AdjustmentDraft {
  return {
    item: {
      ...adjustment.item,
      ...changes,
    },
  }
}

function createTextDrafts(items: readonly MediaItem[]) {
  return Object.fromEntries(items.map(item => [item.id, {
    alternativeText: item.alternativeText ?? '',
    caption: item.caption ?? '',
  }]))
}

const ARRANGEMENT_OPTIONS: readonly { readonly label: string; readonly value: MediaArrangement }[] = [
  { label: '自动（推荐）', value: 'auto' },
  { label: '精选主图', value: 'featured' },
  { label: '均衡网格', value: 'balanced' },
  { label: '顺序长列', value: 'sequence' },
  { label: '边距相册', value: 'margin-album' },
]

export function MediaGroupEditor({
  arrangement,
  disabled = false,
  items,
  onImportFiles,
  onMoveItem,
  pageNavigation,
  onRemoveItem,
  onRelinkItem,
  onSetFeaturedItem,
  onUpdateArrangement,
  onUpdateItem,
  unresolvedItemIds = [],
}: MediaGroupEditorProps) {
  const host = useRef<HTMLElement>(null)
  const [adjustment, setAdjustment] = useState<AdjustmentDraft>()
  const [textDrafts, setTextDrafts] = useState<Record<string, { alternativeText: string; caption: string }>>(() => createTextDrafts(items))

  useEffect(() => {
    setTextDrafts(createTextDrafts(items))
    setAdjustment(current => current !== undefined && items.some(item => item.id === current.item.id) ? current : undefined)
  }, [items])

  useEffect(() => {
    if (adjustment === undefined) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      setAdjustment(undefined)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [adjustment])

  useEffect(() => {
    const feedback = pageNavigation?.feedback
    if (!pageNavigation || !feedback?.pendingFocus || disabled) {
      return
    }
    const row = Array.from(host.current?.querySelectorAll<HTMLElement>('[data-inspector-item]') ?? []).find(element => element.dataset.inspectorItem === feedback.focusItemId)
    const target = row?.querySelector<HTMLElement>('input:not(:disabled)') ?? host.current?.querySelector<HTMLElement>('input:not(:disabled)')
    if (target) {
      target.focus()
      pageNavigation.onFocusHandled()
    }
  }, [disabled, items, pageNavigation])

  function saveText(item: MediaItem) {
    const draft = textDrafts[item.id] ?? {
      alternativeText: item.alternativeText ?? '',
      caption: item.caption ?? '',
    }
    const updated = {
      ...item,
      alternativeText: draft.alternativeText.trim() === '' ? undefined : draft.alternativeText,
      caption: draft.caption.trim() === '' ? undefined : draft.caption,
    }
    if (onUpdateItem(updated)) {
      setTextDrafts(current => ({ ...current, [item.id]: draft }))
    }
  }

  function applyAdjustment() {
    if (adjustment === undefined) {
      return
    }
    if (onUpdateItem(adjustment.item)) {
      setAdjustment(undefined)
    }
  }

  return (
    <section
      aria-label="图片导入与编辑"
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"
      data-testid="studio-media-inspector"
      ref={host}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-900">图片</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {items.length}/9 张
        </span>
      </div>
      <label className="mt-4 block text-xs font-medium text-slate-700">
        图片布局
        <select
          aria-label="图片布局"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          disabled={disabled || items.length === 0}
          onChange={event => onUpdateArrangement(event.target.value as MediaArrangement)}
          value={arrangement}
        >
          {ARRANGEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span className="mt-1 block font-normal text-slate-500">自动布局会根据图片数量与比例调整。</span>
      </label>
      <label className="mt-3 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-700 hover:border-violet-400 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <span className="block">添加图片</span>
        <span className="mt-1 text-[10px] font-normal text-slate-400">JPEG、PNG、WebP · {pageNavigation ? '每页最多 9 张，超出自动分页' : '最多 9 张'}</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-label="添加图片"
          className="sr-only"
          data-testid="studio-asset-input"
          disabled={disabled || (!pageNavigation && items.length >= 9)}
          multiple
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? [])
            event.currentTarget.value = ''
            Promise.resolve(onImportFiles(files)).catch(() => undefined)
          }}
          type="file"
        />
      </label>
      {!pageNavigation && items.length >= 9 && <p className="m-0 mt-2 text-xs text-slate-500">最多添加 9 张图片。</p>}

      {items.length > 0 && (
        <ul className="mt-4 grid gap-3" data-testid="studio-media-items">
          {items.map((item, index) => {
            const textDraft = textDrafts[item.id] ?? {
              alternativeText: item.alternativeText ?? '',
              caption: item.caption ?? '',
            }
            return (
              <li className="rounded-xl border border-slate-200 p-3" data-inspector-item={item.id} key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">图片 {index + 1}</span>
                  <span className="text-xs text-slate-500">{item.featured ? '主图' : '按导入顺序'}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  <label className="text-xs text-slate-600">
                    图片说明
                    <input
                      aria-label={`图片说明 ${index + 1}`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                      disabled={disabled}
                      onChange={event => setTextDrafts(current => ({
                        ...current,
                        [item.id]: { ...textDraft, caption: event.target.value },
                      }))}
                      value={textDraft.caption}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    替代文字
                    <input
                      aria-label={`替代文字 ${index + 1}`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                      disabled={disabled}
                      onChange={event => setTextDrafts(current => ({
                        ...current,
                        [item.id]: { ...textDraft, alternativeText: event.target.value },
                      }))}
                      value={textDraft.alternativeText}
                    />
                  </label>
                </div>
                {pageNavigation && <div className="mt-2 flex flex-wrap gap-2">
                  <select aria-label={`移动图片 ${index + 1} 到另一页`} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs" disabled={disabled} value="" onChange={event => pageNavigation.onMove(item.id, event.target.value)}>
                    <option value="" disabled>移动到第 N 页</option>
                    {pageNavigation.pages.filter(page => page.id !== pageNavigation.currentPageId).map(page => <option disabled={page.full} value={page.id} key={page.id}>{page.label}{page.full ? '（已满）' : ''}</option>)}
                  </select>
                  {([-1, 1] as const).map((direction) => {
                    const target = pageNavigation.pages[pageNavigation.pages.findIndex(page => page.id === pageNavigation.currentPageId) + direction]
                    return <button className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs disabled:opacity-40" disabled={disabled || !target || target.full} key={direction} onClick={() => target && pageNavigation.onMove(item.id, target.id)} type="button">{direction < 0 ? '移到上一页' : '移到下一页'}</button>
                  })}
                  <button aria-label={`从图片 ${index + 1} 开始分页`} className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs disabled:opacity-40" disabled={disabled || (index === 0 && !pageNavigation.canSplitFirst)} onClick={() => pageNavigation.onSplit(item.id)} type="button">从这里分页</button>
                </div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    aria-label={`设为主图 ${index + 1}`}
                    aria-pressed={item.featured}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || item.featured}
                    onClick={() => onSetFeaturedItem(item.id)}
                    type="button"
                  >
                    {item.featured ? '当前主图' : '设为主图'}
                  </button>
                  <button
                    aria-label={`上移图片 ${index + 1}`}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || index === 0}
                    onClick={() => onMoveItem(item.id, index - 1)}
                    type="button"
                  >
                    上移
                  </button>
                  <button
                    aria-label={`下移图片 ${index + 1}`}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || index === items.length - 1}
                    onClick={() => onMoveItem(item.id, index + 1)}
                    type="button"
                  >
                    下移
                  </button>
                  <button
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => saveText(item)}
                    type="button"
                  >
                    保存图片文本
                  </button>
                  <button
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => setAdjustment({ item: cloneMediaItem(item) })}
                    type="button"
                  >
                    调整图片 {index + 1}
                  </button>
                  <button
                    aria-label={`删除图片 ${index + 1}`}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => onRemoveItem(item.id)}
                    type="button"
                  >
                    删除
                  </button>
                  {onRelinkItem !== undefined && unresolvedItemIds.includes(item.id) && (
                    <label className="cursor-pointer rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
                      重新链接
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        data-asset-id={item.assetId}
                        data-testid={`studio-relink-input-${index + 1}`}
                        disabled={disabled}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0]
                          event.currentTarget.value = ''
                          if (file !== undefined) {
                            Promise.resolve(onRelinkItem(item.id, file)).catch(() => undefined)
                          }
                        }}
                        type="file"
                      />
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {adjustment && (
        <section
          aria-label="图片调整"
          className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
          data-testid="studio-media-adjustment"
        >
          <h2 className="text-sm font-semibold text-slate-900">调整图片</h2>
          <p className="m-0 mt-1 text-xs text-slate-600">调整焦点与缩放，按 Esc 取消。</p>
          <div className="mt-3 grid gap-3">
            <label className="text-xs text-slate-700">
              焦点横向
              <input
                aria-label="焦点横向"
                className="mt-1 w-full"
                disabled={disabled}
                max="1"
                min="0"
                onChange={event => setAdjustment(updateAdjustment(adjustment, { focalPoint: { ...adjustment.item.focalPoint, x: Number(event.target.value) } }))}
                step="0.01"
                type="range"
                value={adjustment.item.focalPoint.x}
              />
            </label>
            <label className="text-xs text-slate-700">
              焦点纵向
              <input
                aria-label="焦点纵向"
                className="mt-1 w-full"
                disabled={disabled}
                max="1"
                min="0"
                onChange={event => setAdjustment(updateAdjustment(adjustment, { focalPoint: { ...adjustment.item.focalPoint, y: Number(event.target.value) } }))}
                step="0.01"
                type="range"
                value={adjustment.item.focalPoint.y}
              />
            </label>
            <label className="text-xs text-slate-700">
              图片缩放
              <input
                aria-label="图片缩放"
                className="mt-1 w-full"
                disabled={disabled}
                max="4"
                min="1"
                onChange={event => setAdjustment(updateAdjustment(adjustment, { zoom: Number(event.target.value) }))}
                step="0.1"
                type="range"
                value={adjustment.item.zoom}
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-slate-700">
            适配方式
            <select
              aria-label="适配方式"
              className="mt-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              disabled={disabled}
              onChange={event => setAdjustment(updateAdjustment(adjustment, { fit: event.target.value as MediaItem['fit'] }))}
              value={adjustment.item.fit}
            >
              <option value="cover">填满画面</option>
              <option value="contain">完整显示</option>
            </select>
          </label>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={applyAdjustment}
              type="button"
            >
              完成调整
            </button>
            <button
              className="rounded-full border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={() => setAdjustment(undefined)}
              type="button"
            >
              取消调整
            </button>
          </div>
        </section>
      )}
    </section>
  )
}
