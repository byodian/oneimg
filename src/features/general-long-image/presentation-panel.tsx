'use client'

import { useState } from 'react'
import {
  GENERAL_LONG_IMAGE_DENSITIES,
  GENERAL_LONG_IMAGE_PAGE_FORMATS,
  GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES,
  GENERAL_LONG_IMAGE_THEMES,
  type GeneralLongImagePresentationChange,
} from './index'
import { CanonicalRenderSurface } from '@/features/canonical-renderer/canonical-renderer'
import type { CanonicalLocalCapability, CanonicalRenderSnapshot } from '@/features/canonical-renderer/model'
import type { ResolvedResourceSet } from '@/features/canonical-renderer/resource-resolver'

export interface GeneralLongImagePresentationPanelProps {
  readonly disabled?: boolean
  readonly onChange: (change: GeneralLongImagePresentationChange) => void
  readonly resources: ResolvedResourceSet
  readonly snapshot: CanonicalRenderSnapshot
}

function choiceClass(selected: boolean, disabled: boolean) {
  return `rounded-xl border px-3 py-2 text-left text-sm transition ${selected
    ? 'border-slate-900 bg-slate-900 text-white'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`
}

function capabilityLabel(capability: CanonicalLocalCapability) {
  switch (capability) {
    case 'certified':
      return 'Local Certified'
    case 'high-fidelity-required':
      return 'High-Fidelity Required'
    case 'unsupported':
      return 'Unsupported'
  }
}

function capabilityClass(capability: CanonicalLocalCapability) {
  switch (capability) {
    case 'certified':
      return 'bg-emerald-50 text-emerald-700'
    case 'high-fidelity-required':
      return 'bg-amber-50 text-amber-800'
    case 'unsupported':
      return 'bg-red-50 text-red-700'
  }
}

function templatePreviewSnapshot(
  snapshot: CanonicalRenderSnapshot,
  template: (typeof GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES)[number],
) {
  return {
    ...snapshot,
    presentation: {
      ...snapshot.presentation,
      templateId: template.id,
      templateVersion: template.version,
    },
  }
}

export function GeneralLongImagePresentationPanel({
  disabled = false,
  onChange,
  resources,
  snapshot,
}: GeneralLongImagePresentationPanelProps) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const inlineTemplates = GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES.slice(0, 3)
  const selectedTemplate = snapshot.presentation.templateId
  const selectedTheme = snapshot.presentation.themeId
  const selectedDensity = snapshot.presentation.density
  const selectedPageFormat = snapshot.presentation.pageFormat.preset

  return (
    <section
      aria-label="呈现选择"
      className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
      data-testid="studio-presentation-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-900">呈现方案</p>
          <p className="m-0 mt-1 text-xs text-slate-500">基于当前内容的本地保真预览</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${capabilityClass(snapshot.localCapability)}`}
          data-testid="studio-local-capability"
        >
          {capabilityLabel(snapshot.localCapability)}
        </span>
      </div>
      {snapshot.localCapability !== 'certified' && (
        <p className="m-0 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          当前组合可以继续编辑和预览，但本地适配器尚未通过此页面格式的保真认证；本地导出将在后续兼容适配完成后开放。
        </p>
      )}

      <fieldset className="mt-4" disabled={disabled}>
        <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">模板建议</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-3" data-testid="studio-template-recommendations">
          {inlineTemplates.map((template) => {
            const previewSnapshot = templatePreviewSnapshot(snapshot, template)
            return (
              <div
                aria-label={`${template.label}预览`}
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2"
                data-template-preview
                key={template.id}
              >
                <div className="h-32 overflow-hidden rounded-lg bg-slate-200" data-template-preview-canvas>
                  <div
                    aria-hidden="true"
                    className="origin-top-left"
                    style={{ transform: 'scale(0.25)', width: snapshot.referenceViewport.width }}
                  >
                    <CanonicalRenderSurface
                      mode="preview"
                      resources={resources}
                      snapshot={previewSnapshot}
                    />
                  </div>
                </div>
                <button
                  aria-pressed={selectedTemplate === template.id}
                  className={`${choiceClass(selectedTemplate === template.id, disabled)} mt-2 w-full`}
                  data-testid={`studio-template-${template.id}`}
                  onClick={() => onChange({ templateId: template.id })}
                  type="button"
                >
                  <span className="block font-medium">{template.label}</span>
                  <span className={`mt-1 block text-xs ${selectedTemplate === template.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {template.description}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </fieldset>

      <details
        className="mt-4 border-t border-slate-100 pt-3"
        data-testid="studio-presentation-catalog"
        onToggle={event => setCatalogOpen(event.currentTarget.open)}
        open={catalogOpen}
      >
        <summary className="cursor-pointer text-sm font-medium text-slate-700">查看全部呈现选项</summary>
        <div className="mt-4 grid gap-5">
          <fieldset disabled={disabled}>
            <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">全部模板</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES.map(template => (
                <button
                  aria-pressed={selectedTemplate === template.id}
                  className={choiceClass(selectedTemplate === template.id, disabled)}
                  key={template.id}
                  onClick={() => onChange({ templateId: template.id })}
                  type="button"
                >
                  <span className="block font-medium">{template.label}</span>
                  <span className={`mt-1 block text-xs ${selectedTemplate === template.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={disabled}>
            <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">主题</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {GENERAL_LONG_IMAGE_THEMES.map(theme => (
                <button
                  aria-pressed={selectedTheme === theme.id}
                  className={choiceClass(selectedTheme === theme.id, disabled)}
                  key={theme.id}
                  onClick={() => onChange({ themeId: theme.id })}
                  type="button"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.theme.accent }} />
                    {theme.label}
                  </span>
                  <span className={`mt-1 block text-xs ${selectedTheme === theme.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {theme.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={disabled}>
            <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">密度</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {GENERAL_LONG_IMAGE_DENSITIES.map(density => (
                <button
                  aria-pressed={selectedDensity === density.value}
                  className={choiceClass(selectedDensity === density.value, disabled)}
                  key={density.value}
                  onClick={() => onChange({ density: density.value })}
                  type="button"
                >
                  <span className="block font-medium">{density.label}</span>
                  <span className={`mt-1 block text-xs ${selectedDensity === density.value ? 'text-slate-300' : 'text-slate-500'}`}>
                    {density.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={disabled}>
            <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">页面格式</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GENERAL_LONG_IMAGE_PAGE_FORMATS.map((pageFormat) => {
                const selectable = pageFormat.localCapability === 'certified'
                const choiceDisabled = disabled || !selectable
                return (
                  <button
                    aria-pressed={selectedPageFormat === pageFormat.format.preset}
                    className={choiceClass(selectedPageFormat === pageFormat.format.preset, choiceDisabled)}
                    disabled={choiceDisabled}
                    key={pageFormat.id}
                    onClick={() => onChange({ pageFormatId: pageFormat.id })}
                    type="button"
                  >
                    <span className="block font-medium">{pageFormat.label}</span>
                    <span className={`mt-1 block text-xs ${selectedPageFormat === pageFormat.format.preset ? 'text-slate-300' : 'text-slate-500'}`}>
                      {pageFormat.description}
                    </span>
                    {!selectable && <span className="mt-1 block text-xs font-medium text-amber-700">需后续分页适配</span>}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>
      </details>
    </section>
  )
}
