'use client'

import type { ChangeEvent } from 'react'
import type { ExportJobState, ExportOutputScale, ExportPlan } from './index'

export interface ExportPanelProps {
  readonly availableSliceIndexes?: readonly number[]
  readonly jobState?: ExportJobState
  readonly onCancel: () => void
  readonly onClose: () => void
  readonly onDownloadSlice: (index: number) => void
  readonly onOutputScaleChange: (scale: ExportOutputScale) => void
  readonly onRun: () => void
  readonly outputScale: ExportOutputScale
  readonly plan?: ExportPlan
}

function jobStatusLabel(state: ExportJobState | undefined) {
  if (state === undefined) {
    return '尚未运行'
  }
  if (state.status === 'ready') {
    return '已完成'
  }
  if (state.status === 'canceled') {
    return '已取消'
  }
  if (state.status === 'failed') {
    return '失败'
  }
  switch (state.stage) {
    case 'encoding':
      return '正在编码'
    case 'packaging':
      return '正在打包'
    case 'preparing':
      return '正在准备'
    case 'rendering':
      return '正在渲染'
    case 'canceled':
      return '已取消'
    case 'failed':
      return '失败'
    case 'ready':
      return '已完成'
  }
}

function planSummary(plan: ExportPlan | undefined) {
  if (plan === undefined) {
    return { status: 'planning' }
  }
  return {
    authorization: plan.authorization,
    cacheReuse: plan.cacheReuse,
    canRun: plan.canRun,
    findings: plan.findings,
    outputFormat: plan.outputFormat,
    outputScale: plan.outputScale,
    pages: plan.pages.map(page => ({
      height: page.height,
      id: page.id,
      segmentCount: page.segmentCount,
      semanticSlices: page.semanticSlices,
      segmented: page.segmented,
      width: page.width,
    })),
    route: plan.route,
    routeReason: plan.routeReason,
    snapshotId: plan.snapshot.snapshotId,
  }
}

export function ExportPanel({
  availableSliceIndexes = [],
  jobState,
  onCancel,
  onClose,
  onDownloadSlice,
  onOutputScaleChange,
  onRun,
  outputScale,
  plan,
}: ExportPanelProps) {
  const isRunning = jobState?.status === 'running'
  const handleScaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScale = Number(event.currentTarget.value)
    if (nextScale === 1 || nextScale === 2) {
      onOutputScaleChange(nextScale)
    }
  }

  return (
    <section
      aria-label="导出面板"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="studio-export-panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Export Plan</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">导出当前 Canonical Preview</h2>
        </div>
        <button
          aria-label="关闭导出面板"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          onClick={onClose}
          type="button"
        >
          关闭
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          输出格式
          <select aria-label="输出格式" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5" disabled value="png">
            <option value="png">PNG</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          输出倍率
          <select
            aria-label="输出倍率"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
            disabled={isRunning}
            onChange={handleScaleChange}
            value={outputScale}
          >
            <option value="1">1× 标准</option>
            <option value="2">2× 高清</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        <p className="m-0" data-testid="studio-export-route">{plan?.routeReason ?? '正在生成 Export Plan…'}</p>
        {plan && <p className="m-0 mt-1" data-testid="studio-export-plan-status">{plan.canRun ? '可以显式运行' : '当前不能运行本地导出'}</p>}
        {plan && (
          <p className="m-0 mt-1" data-testid="studio-export-slice-summary">
            预计输出 {plan.pages.reduce((total, page) => total + page.semanticSlices.length, 0)} 个 Slice；边界来自当前 Canonical Preview
          </p>
        )}
      </div>

      {plan && plan.findings.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-amber-900">
          {plan.findings.map(finding => <li key={finding.code}>{finding.message}</li>)}
        </ul>
      )}

      <output className="mt-3 block max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100" data-testid="studio-export-plan">
        {JSON.stringify(planSummary(plan))}
      </output>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="m-0 text-sm text-slate-500" data-testid="studio-export-job-status">
          {jobStatusLabel(jobState)}{jobState?.status === 'running' ? ` · ${jobState.completed}/${jobState.total}` : ''}
        </p>
        {isRunning ? (
          <button
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700"
            onClick={onCancel}
            type="button"
          >
            取消导出
          </button>
        ) : (
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!plan?.canRun}
            onClick={onRun}
            type="button"
          >
            导出 PNG
          </button>
        )}
      </div>

      {jobState?.error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950" data-testid="studio-export-job-error">
          <p className="m-0 font-semibold">{jobState.error.message}</p>
          <p className="m-0 mt-1">失败分类：{jobState.error.code} · 阶段：{jobState.error.stage}</p>
          <p className="m-0 mt-1">恢复动作：{jobState.error.recoveryAction}</p>
          <p className="m-0 mt-1">下一步：{jobState.error.nextStep}</p>
        </div>
      )}

      {availableSliceIndexes.length > 0 && (
        <nav aria-label="Semantic Slice 下载" className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3" data-testid="studio-export-slices">
          <p className="m-0 text-sm font-semibold text-indigo-950">Semantic Slice 已生成，可单独下载</p>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {availableSliceIndexes.map(index => (
              <li key={index}>
                <button
                  aria-label={`下载 Slice ${index + 1}`}
                  className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-900"
                  onClick={() => onDownloadSlice(index)}
                  type="button"
                >
                  下载 Slice {index + 1}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  )
}
