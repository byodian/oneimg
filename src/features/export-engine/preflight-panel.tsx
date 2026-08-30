'use client'

import type { PreflightAction, PreflightFinding, PreflightFindingKind } from './preflight'

export interface ExportPreflightPanelProps {
  readonly findings: readonly PreflightFinding[]
  readonly onAction?: (action: PreflightAction, finding: PreflightFinding) => void
}

const kindLabels: Record<PreflightFindingKind, string> = {
  'blocking-error': '必须处理',
  'content-suggestion': '内容建议',
  'quality-warning': '质量提醒',
}

const kindOrder: readonly PreflightFindingKind[] = [
  'blocking-error',
  'quality-warning',
  'content-suggestion',
]

function findingKey(finding: PreflightFinding, index: number) {
  return `${finding.code}:${finding.resourceId ?? ''}:${finding.targetId ?? ''}:${index}`
}

function ActionButton({
  action,
  finding,
  onAction,
}: {
  readonly action: PreflightAction
  readonly finding: PreflightFinding
  readonly onAction?: ExportPreflightPanelProps['onAction']
}) {
  return (
    <button
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500"
      onClick={() => onAction?.(action, finding)}
      type="button"
    >
      {action.label}
    </button>
  )
}
export function ExportPreflightPanel({ findings, onAction }: ExportPreflightPanelProps) {
  if (findings.length === 0) {
    return null
  }

  const groups = kindOrder
    .map(kind => ({
      findings: findings.filter(finding => finding.kind === kind),
      kind,
    }))
    .filter(group => group.findings.length > 0)

  return (
    <section
      aria-label="导出前检查"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="preflight-panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preflight</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">导出前检查</h2>
        </div>
        <p className="m-0 text-right text-xs leading-5 text-slate-500">
          {findings.filter(finding => finding.kind === 'blocking-error').length} 项必须处理
          {' · '}
          {findings.filter(finding => finding.kind === 'quality-warning').length} 项质量提醒
        </p>
      </div>

      <div aria-live="polite" className="mt-4 space-y-4">
        {groups.map(group => (
          <div key={group.kind}>
            <h3 className="m-0 text-sm font-semibold text-slate-800">{kindLabels[group.kind]}</h3>
            <ul className="mt-2 space-y-2">
              {group.findings.map((finding, index) => {
                const actions = [
                  ...(finding.action === undefined ? [] : [finding.action]),
                  ...(finding.alternatives ?? []),
                ]
                return (
                  <li className="rounded-xl bg-slate-50 p-3" key={findingKey(finding, index)}>
                    <p className="m-0 text-sm leading-6 text-slate-700">{finding.message}</p>
                    {(finding.resourceId !== undefined || finding.targetId !== undefined) && (
                      <p className="m-0 mt-1 font-mono text-[11px] text-slate-500">
                        {finding.resourceId ?? finding.targetId}
                      </p>
                    )}
                    {actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {actions.map(action => (
                          <ActionButton action={action} finding={finding} key={`${action.kind}:${action.resourceId ?? ''}`} onAction={onAction} />
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
