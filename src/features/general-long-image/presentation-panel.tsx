'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import {
  GENERAL_LONG_IMAGE_DENSITIES,
  GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES,
  GENERAL_LONG_IMAGE_THEMES,
  type GeneralLongImagePresentationChange,
} from './index'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import type { CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'

export interface GeneralLongImagePresentationPanelProps {
  readonly compact?: boolean
  readonly disabled?: boolean
  readonly onChange: (change: GeneralLongImagePresentationChange) => void
  readonly resources: ResolvedResourceSet
  readonly snapshot: CanonicalRenderSnapshot
}

function choiceClass(selected: boolean) {
  return `min-w-0 rounded-lg border text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 ${selected
    ? 'border-violet-500 bg-violet-50 text-violet-800'
    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`
}

function TemplateThumbnail({ resources, snapshot }: Pick<GeneralLongImagePresentationPanelProps, 'resources' | 'snapshot'>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(112)
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none h-[66px] overflow-hidden rounded-t-[7px] bg-slate-50" data-template-preview-canvas ref={containerRef}>
      <div className="origin-top-left" style={{ transform: `scale(${width / snapshot.referenceViewport.width})`, width: snapshot.referenceViewport.width }}>
        <CanonicalRenderSurface mode="preview" resources={resources} snapshot={snapshot} />
      </div>
    </div>
  )
}

export function GeneralLongImagePresentationPanel({
  compact = false,
  disabled = false,
  onChange,
  resources,
  snapshot,
}: GeneralLongImagePresentationPanelProps) {
  return (
    <section
      aria-label="呈现选择"
      className={`min-w-0 rounded-xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'}`}
      data-testid="studio-presentation-panel"
    >
      <fieldset className="min-w-0" disabled={disabled}>
        <legend className="text-xs font-semibold text-slate-800">模板</legend>
        <div className="mt-2 grid grid-cols-2 gap-2" data-testid="studio-template-recommendations">
          {GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES.map((template) => {
            const selected = snapshot.presentation.templateId === template.id
            const previewSnapshot = {
              ...snapshot,
              presentation: { ...snapshot.presentation, templateId: template.id, templateVersion: template.version },
            }
            return (
              <button
                aria-label={template.label}
                aria-pressed={selected}
                className={`${choiceClass(selected)} overflow-hidden text-left`}
                data-template-preview
                data-testid={`studio-template-${template.id}`}
                disabled={disabled}
                key={template.id}
                onClick={() => onChange({ templateId: template.id })}
                title={template.description}
                type="button"
              >
                <TemplateThumbnail resources={resources} snapshot={previewSnapshot} />
                <span className="flex min-h-8 items-center justify-between gap-1 border-t border-inherit px-2">
                  <span className="truncate text-[11px] font-medium">{template.label}</span>
                  {selected && <Check aria-hidden="true" className="h-3 w-3 shrink-0" />}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="mt-4 min-w-0" disabled={disabled}>
        <legend className="text-xs font-semibold text-slate-800">主题</legend>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {GENERAL_LONG_IMAGE_THEMES.map(theme => (
            <button
              aria-pressed={snapshot.presentation.themeId === theme.id}
              className={`${choiceClass(snapshot.presentation.themeId === theme.id)} px-1.5 pb-1.5 pt-1`}
              key={theme.id}
              onClick={() => onChange({ themeId: theme.id })}
              title={theme.description}
              type="button"
            >
              <span aria-hidden="true" className="mb-1 flex h-5 items-center justify-center gap-1 rounded" style={{ backgroundColor: theme.theme.background }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.theme.accent }} />
                <span className="h-2.5 w-2.5 rounded-full opacity-70" style={{ backgroundColor: theme.theme.foreground }} />
                <span className="h-2.5 w-2.5 rounded-full border border-black/5" style={{ backgroundColor: theme.theme.surface }} />
              </span>
              <span className="block truncate text-[11px]">{theme.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4 min-w-0" disabled={disabled}>
        <legend className="text-xs font-semibold text-slate-800">内容间距</legend>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {GENERAL_LONG_IMAGE_DENSITIES.map(density => (
            <button
              aria-pressed={snapshot.presentation.density === density.value}
              className={`${choiceClass(snapshot.presentation.density === density.value)} min-h-11 truncate px-1.5 sm:min-h-8`}
              key={density.value}
              onClick={() => onChange({ density: density.value })}
              title={density.description}
              type="button"
            >
              {density.label}
            </button>
          ))}
        </div>
      </fieldset>
      {snapshot.localCapability !== 'certified' && (
        <p className="m-0 mt-3 rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900" role="status">
          当前页面格式暂不支持图片导出。
          <button className="ml-1 underline underline-offset-2" disabled={disabled} onClick={() => onChange({ pageFormatId: 'long-image' })} type="button">改为连续长图</button>
        </p>
      )}
    </section>
  )
}
