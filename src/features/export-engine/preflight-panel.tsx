'use client'

import type { PreflightAction, PreflightFinding, PreflightFindingKind } from './preflight'

export interface ExportPreflightPanelProps {
  readonly compact?: boolean
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
      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500"
      onClick={() => onAction?.(action, finding)}
      type="button"
    >
      {action.label}
    </button>
  )
}
export function ExportPreflightPanel({ compact = false, findings, onAction }: ExportPreflightPanelProps) {
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
      className={compact
        ? 'rounded-xl border border-slate-200 bg-white p-3'
        : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'}
      data-testid="preflight-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-xs font-semibold text-slate-800">导出前检查</h2>
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">{findings.length} 项</span>
      </div>

      <div aria-live="polite" className={compact ? 'mt-3 space-y-3' : 'mt-4 space-y-4'}>
        {groups.map(group => (
          <div key={group.kind}>
            <h3 className="m-0 text-[11px] font-medium text-slate-500">{kindLabels[group.kind]}</h3>
            <ul className={compact ? 'mt-1.5 space-y-2' : 'mt-2 space-y-2'}>
              {group.findings.map((finding, index) => {
                const actions = [
                  ...(finding.action === undefined ? [] : [finding.action]),
                  ...(finding.alternatives ?? []),
                ]
                return (
                  <li className="rounded-lg bg-slate-50 p-2.5" key={findingKey(finding, index)}>
                    <p className="m-0 text-xs leading-5 text-slate-700">{finding.message}</p>
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
