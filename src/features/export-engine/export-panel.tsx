'use client'

import type { ChangeEvent } from 'react'
import type { ExportJobState, ExportOutputScale, ExportPlan } from './index'
import { Switch } from '@/components/ui/switch'

export interface ExportPanelProps {
  readonly availableSliceIndexes?: readonly number[]
  readonly diagnostics?: boolean
  readonly exportSlices: boolean
  readonly jobState?: ExportJobState
  readonly onCancel: () => void
  readonly onDownloadSlice: (index: number) => void
  readonly onOutputScaleChange: (scale: ExportOutputScale) => void
  readonly onExportSlicesChange: (enabled: boolean) => void
  readonly onRun: () => void
  readonly outputScale: ExportOutputScale
  readonly plan?: ExportPlan
}

function jobStatusLabel(state: ExportJobState | undefined) {
  if (state === undefined) {
    return ''
  }
  if (state.status === 'ready') {
    return '已下载'
  }
  if (state.status === 'canceled') {
    return '已取消'
  }
  if (state.status === 'failed') {
    return '导出失败'
  }
  switch (state.stage) {
    case 'encoding':
      return '正在生成图片…'
    case 'packaging':
      return '正在打包分片…'
    case 'preparing':
      return '正在准备…'
    case 'rendering':
      return '正在绘制…'
    case 'canceled':
      return '已取消'
    case 'failed':
      return '导出失败'
    case 'ready':
      return '已下载'
  }
}

export function ExportPanel({
  availableSliceIndexes = [],
  diagnostics = false,
  exportSlices,
  jobState,
  onCancel,
  onDownloadSlice,
  onOutputScaleChange,
  onExportSlicesChange,
  onRun,
  outputScale,
  plan,
}: ExportPanelProps) {
  const isRunning = jobState?.status === 'running'
  const page = plan?.pages[0]
  const sliceCount = plan?.pages.reduce((total, entry) => total + entry.semanticSlices.length, 0) ?? 0
  const isZip = (page?.segmented ?? false) && exportSlices
  const handleScaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScale = Number(event.currentTarget.value)
    if (nextScale === 1 || nextScale === 2 || nextScale === 3) {
      onOutputScaleChange(nextScale)
    }
  }
  // Content/resource findings already have actionable controls in the preflight panel.
  const outputFindings = plan?.findings.filter(finding => finding.code === 'invalid-page-measurement') ?? []

  return (
    <section
      aria-label="导出面板"
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"
      data-testid="studio-export-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-semibold text-slate-900">图片设置</h2>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">PNG</span>
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-slate-700">
        输出倍率
        <select
          aria-label="输出倍率"
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 sm:min-h-9"
          disabled={isRunning}
          onChange={handleScaleChange}
          value={outputScale}
        >
          <option value="1">1× · 标准</option>
          <option value="2">2× · 高清</option>
          <option value="3">3× · 超清</option>
        </select>
      </label>
      <p className="m-0 mt-2 text-right text-[11px] tabular-nums text-slate-500" data-testid="studio-export-dimensions">
        {page ? `${page.width.toLocaleString()} × ${page.height.toLocaleString()} px` : outputFindings.length > 0 ? '超出尺寸上限' : '等待预览就绪'}
      </p>

      <div className="my-3 border-t border-slate-100" />
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center text-xs font-medium text-slate-700 sm:min-h-6" htmlFor="studio-export-slices-toggle">分片导出</label>
        <Switch
          aria-label="分片导出"
          checked={exportSlices}
          className="data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-slate-200"
          disabled={isRunning}
          id="studio-export-slices-toggle"
          onCheckedChange={onExportSlicesChange}
        />
      </div>
      <p className="m-0 mt-2 text-[11px] leading-5 text-slate-500" data-testid="studio-export-slice-summary">
        {exportSlices
          ? isZip ? `分为 ${sliceCount} 张 PNG，打包为 ZIP 下载` : '长图按内容边界分片；短图保留为一张 PNG'
          : '导出一张完整 PNG'}
      </p>

      {outputFindings.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs leading-5 text-amber-900" role="alert">
          {outputFindings.map(finding => <p className="m-0" key={finding.code}>{finding.message}</p>)}
        </div>
      )}

      {diagnostics && <output hidden data-testid="studio-export-plan">{JSON.stringify(plan)}</output>}
      <div className="mt-4">
        {isRunning ? (
          <button className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button">
            取消导出
          </button>
        ) : (
          <button
            className="min-h-10 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!plan?.canRun}
            onClick={onRun}
            type="button"
          >
            {isZip ? '导出分片 ZIP' : '导出 PNG'}
          </button>
        )}
        <p aria-live="polite" className="m-0 mt-2 text-center text-xs text-slate-500 empty:hidden" data-testid="studio-export-job-status">
          {jobStatusLabel(jobState)}{isRunning ? ` ${jobState.completed}/${jobState.total}` : ''}
        </p>
      </div>

      {jobState?.error && jobState.status !== 'canceled' && (
        <p className="m-0 mt-3 rounded-lg bg-red-50 p-2.5 text-xs leading-5 text-red-800" data-testid="studio-export-job-error" role="alert">
          {jobState.error.nextStep}
        </p>
      )}

      {exportSlices && availableSliceIndexes.length > 1 && (
        <nav aria-label="单独下载分片" className="mt-4 border-t border-slate-100 pt-3" data-testid="studio-export-slices">
          <p className="m-0 text-xs font-medium text-slate-700">单独下载</p>
          <ul className="mt-2 grid max-h-40 list-none grid-cols-3 gap-1.5 overflow-y-auto p-0">
            {availableSliceIndexes.map(index => (
              <li className="min-w-0" key={index}>
                <button
                  aria-label={`下载第 ${index + 1} 张`}
                  className="min-h-8 w-full truncate rounded-md border border-slate-200 px-1.5 text-xs tabular-nums text-slate-600 hover:border-violet-300 hover:text-violet-700"
                  onClick={() => onDownloadSlice(index)}
                  type="button"
                >
                  第 {index + 1} 张
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  )
}
