'use client'

import { useEffect, useState } from 'react'
import type { MediaItem } from '@/features/document-core'

export interface MediaGroupEditorProps {
  readonly disabled?: boolean
  readonly items: readonly MediaItem[]
  readonly onImportFiles: (files: readonly File[]) => void | Promise<void>
  readonly onRelinkItem?: (itemId: string, file: File) => void | Promise<void>
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

export function MediaGroupEditor({
  disabled = false,
  items,
  onImportFiles,
  onRelinkItem,
  onUpdateItem,
  unresolvedItemIds = [],
}: MediaGroupEditorProps) {
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
      className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
      data-testid="studio-media-inspector"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-900">图片</p>
          <p className="m-0 mt-1 text-xs text-slate-500">导入后预览和导出共用规范化图片源，不会把文件名写进正文。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {items.length}/9 张
        </span>
      </div>
      <label className="mt-4 block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-800">
        <span className="block">选择 JPEG、PNG 或 WebP</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-sm"
          data-testid="studio-asset-input"
          disabled={disabled || items.length >= 9}
          multiple
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? [])
            event.currentTarget.value = ''
            Promise.resolve(onImportFiles(files)).catch(() => undefined)
          }}
          type="file"
        />
      </label>
      {items.length >= 9 && <p className="m-0 mt-2 text-xs text-slate-500">一个 Media Group 最多保留 9 张图片。</p>}

      {items.length > 0 && (
        <ul className="mt-4 grid gap-3" data-testid="studio-media-items">
          {items.map((item, index) => {
            const textDraft = textDrafts[item.id] ?? {
              alternativeText: item.alternativeText ?? '',
              caption: item.caption ?? '',
            }
            return (
              <li className="rounded-xl border border-slate-200 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">图片 {index + 1}</span>
                  <span className="text-xs text-slate-500">{item.featured ? 'Featured' : '按导入顺序'}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Caption
                    <input
                      aria-label={`Caption ${index + 1}`}
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
                    Alternative Text
                    <input
                      aria-label={`Alternative Text ${index + 1}`}
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
                <div className="mt-2 flex flex-wrap gap-2">
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
          <p className="m-0 mt-1 text-xs text-slate-600">拖动、触摸或使用键盘调整焦点；按 Escape 取消，完成后只记录一笔编辑事务。</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
              缩放意图
              <input
                aria-label="缩放意图"
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
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
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
