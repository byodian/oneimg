import type { CanonicalRenderReadiness } from '@/features/canonical-renderer/render-ready'
import { type CanonicalRenderSnapshot, collectSnapshotResourceIds } from '@/features/canonical-renderer/model'

export type PreflightFindingKind = 'blocking-error' | 'content-suggestion' | 'quality-warning'

export type PreflightActionKind =
  | 'apply-compatible-presentation'
  | 'authorize-high-fidelity'
  | 'focus-content'
  | 'remove-resource'
  | 'relink-resource'
  | 'retry-render-ready'

export interface PreflightAction {
  readonly kind: PreflightActionKind
  readonly label: string
  readonly resourceId?: string
  readonly targetId?: string
}

export interface PreflightFinding {
  readonly action?: PreflightAction
  readonly alternatives?: readonly PreflightAction[]
  readonly code: string
  readonly kind: PreflightFindingKind
  readonly message: string
  readonly resourceId?: string
  readonly targetId?: string
}

export interface PreflightImageObservation {
  readonly blockId?: string
  readonly naturalHeight: number
  readonly naturalWidth: number
  readonly renderedHeight: number
  readonly renderedWidth: number
  readonly resourceId: string
}

export interface PreflightSceneSlotObservation {
  readonly id: string
  readonly label: string
  readonly recommended: boolean
  readonly satisfied: boolean
  readonly targetId?: string
}

export interface LocalCapabilityProbeObservation {
  readonly reason?: string
  readonly status: 'failed' | 'passed' | 'pending'
}

export interface ExportPreflightInput {
  readonly contentError?: string
  readonly fontFallbackIds?: readonly string[]
  readonly highFidelityAvailable: boolean
  readonly images?: readonly PreflightImageObservation[]
  readonly localCapabilityProbe: LocalCapabilityProbeObservation
  readonly meaningful: boolean
  readonly readiness?: CanonicalRenderReadiness
  readonly renderReady: boolean
  readonly rendererAvailable: boolean
  readonly resourceResolutionPending?: boolean
  readonly resolvedResourceIds?: readonly string[]
  readonly sceneSlots?: readonly PreflightSceneSlotObservation[]
  readonly snapshot?: CanonicalRenderSnapshot
  readonly unresolvedResourceIds?: readonly string[]
}

export interface ExportPreflightResult {
  readonly blockingErrorCount: number
  readonly canExport: boolean
  readonly contentSuggestionCount: number
  readonly findings: readonly PreflightFinding[]
  readonly localRoute: 'cannot-export' | 'high-fidelity-required' | 'local-eligible'
  readonly qualityWarningCount: number
}

function action(kind: PreflightActionKind, label: string, options: Pick<PreflightAction, 'resourceId' | 'targetId'> = {}) {
  return { kind, label, ...options } satisfies PreflightAction
}

function isSensitive(snapshot: CanonicalRenderSnapshot | undefined) {
  return snapshot?.sensitive === true
}

function pushFinding(findings: PreflightFinding[], finding: PreflightFinding) {
  findings.push(finding)
}

function resourceTargetId(snapshot: CanonicalRenderSnapshot | undefined, resourceId: string) {
  return snapshot?.document.sections.find(section => (
    (section.kind === 'media' && section.image.resourceId === resourceId)
      || (section.kind === 'media-group' && section.items.some(item => item.assetId === resourceId || item.resourceId === resourceId))
  ))?.id
}

export function evaluateExportPreflight(input: ExportPreflightInput): ExportPreflightResult {
  const findings: PreflightFinding[] = []
  const snapshot = input.snapshot
  const sensitive = isSensitive(snapshot)
  const probe = input.localCapabilityProbe
  const compatiblePresentationAction = probe.status === 'passed'
    ? action('apply-compatible-presentation', '应用兼容呈现')
    : undefined
  const highFidelityAction = sensitive || !input.highFidelityAvailable
    ? undefined
    : action('authorize-high-fidelity', '授权 High-Fidelity Export')

  if (input.contentError !== undefined || snapshot === undefined) {
    pushFinding(findings, {
      action: action('focus-content', '打开恢复内容'),
      code: 'corrupt-content',
      kind: 'blocking-error',
      message: '当前内容无法安全读取，不能创建 Export Snapshot；请恢复或重新载入文档。',
    })
  }

  if (!input.rendererAvailable) {
    pushFinding(findings, {
      ...(compatiblePresentationAction === undefined ? {} : { action: compatiblePresentationAction }),
      code: 'renderer-unavailable',
      kind: 'blocking-error',
      message: '当前 Canonical Renderer 不可用，不能生成可信的导出结果。',
    })
  }

  if (snapshot !== undefined && !input.meaningful) {
    pushFinding(findings, {
      action: action('focus-content', '开始输入或粘贴内容'),
      code: 'empty-document',
      kind: 'blocking-error',
      message: 'Document 为空；开始输入或粘贴内容后才能导出。',
    })
  }

  const unresolvedResourceIds = Array.from(new Set([
    ...(input.unresolvedResourceIds ?? []),
    ...(snapshot?.unresolvedResourceIds ?? []),
  ]))
  if (unresolvedResourceIds.length > 0) {
    for (const resourceId of unresolvedResourceIds) {
      const targetId = resourceTargetId(snapshot, resourceId)
      pushFinding(findings, {
        action: action('relink-resource', '重新链接资源', { resourceId, targetId }),
        alternatives: [action('remove-resource', '移除该资源', { resourceId, targetId })],
        code: 'unresolved-asset',
        kind: 'blocking-error',
        message: `资源 ${resourceId} 尚未解析；导出不会省略它。`,
        resourceId,
        targetId,
      })
    }
  } else if (!input.resourceResolutionPending && input.snapshot && input.resolvedResourceIds) {
    const resolved = new Set(input.resolvedResourceIds)
    for (const resourceId of collectSnapshotResourceIds(input.snapshot)) {
      if (resolved.has(resourceId)) {
        continue
      }
      const targetId = resourceTargetId(input.snapshot, resourceId)
      pushFinding(findings, {
        action: action('relink-resource', '重新链接资源', { resourceId, targetId }),
        alternatives: [action('remove-resource', '移除该资源', { resourceId, targetId })],
        code: 'unresolved-asset',
        kind: 'blocking-error',
        message: `资源 ${resourceId} 尚未解析；导出不会省略它。`,
        resourceId,
        targetId,
      })
    }
  }

  if (!input.renderReady && input.contentError === undefined && input.rendererAvailable && unresolvedResourceIds.length === 0) {
    pushFinding(findings, {
      action: action('retry-render-ready', '等待预览稳定'),
      code: 'render-not-ready',
      kind: 'blocking-error',
      message: 'Canonical Preview 尚未 Render Ready；字体、资源、分页或布局仍在稳定。',
    })
  }

  for (const image of input.images ?? []) {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      pushFinding(findings, {
        action: action('relink-resource', '重新链接图片', { resourceId: image.resourceId }),
        alternatives: [action('remove-resource', '移除该图片', { resourceId: image.resourceId })],
        code: 'unresolved-asset',
        kind: 'blocking-error',
        message: `图片 ${image.resourceId} 尚未完成解码；导出不会使用占位图。`,
        resourceId: image.resourceId,
        targetId: image.blockId,
      })
      continue
    }
    if (image.naturalWidth + 1 < image.renderedWidth || image.naturalHeight + 1 < image.renderedHeight) {
      pushFinding(findings, {
        action: action('focus-content', '定位低分辨率图片', { resourceId: image.resourceId, targetId: image.blockId }),
        code: 'low-resolution-media',
        kind: 'quality-warning',
        message: `图片 ${image.resourceId} 的原始尺寸小于当前呈现尺寸，放大后可能影响清晰度。`,
        resourceId: image.resourceId,
        targetId: image.blockId,
      })
    }
  }

  const fontFallbackIds = Array.from(new Set([
    ...(input.fontFallbackIds ?? []),
    ...(input.readiness?.fontFallbackIds ?? []),
  ]))
  for (const resourceId of fontFallbackIds) {
    pushFinding(findings, {
      action: action('focus-content', '查看字体回退', { resourceId }),
      code: 'font-fallback',
      kind: 'quality-warning',
      message: `字体资源 ${resourceId} 未完成加载；预览和导出会使用同一个声明的回退字体。`,
      resourceId,
    })
  }

  if (input.readiness?.overflow.horizontal || (
    input.readiness?.overflow.vertical
    && input.snapshot?.presentation.pageFormat.kind === 'bounded'
  )) {
    pushFinding(findings, {
      ...(compatiblePresentationAction === undefined ? {} : { action: compatiblePresentationAction }),
      code: 'overflow-risk',
      kind: 'blocking-error',
      message: '当前内容超出已声明的页面边界；导出前必须分页或应用兼容的连续长图呈现。',
    })
  }

  if (probe.status === 'pending') {
    pushFinding(findings, {
      action: action('retry-render-ready', '等待本地能力验证'),
      code: 'local-capability-probe-pending',
      kind: 'blocking-error',
      message: '正在验证当前浏览器的本地导出能力；验证完成前不会生成未经验证的成品。',
    })
  }
  if (probe.status === 'failed') {
    pushFinding(findings, {
      ...(highFidelityAction === undefined ? {} : { action: highFidelityAction }),
      code: 'local-capability-probe-failed',
      kind: 'blocking-error',
      message: probe.reason === undefined
        ? '当前设备未通过本地导出能力验证。'
        : `当前设备未通过本地导出能力验证：${probe.reason}`,
    })
  }

  if (snapshot?.localCapability === 'unsupported') {
    pushFinding(findings, {
      ...(compatiblePresentationAction === undefined ? {} : { action: compatiblePresentationAction }),
      ...(highFidelityAction === undefined ? {} : { alternatives: [highFidelityAction] }),
      code: 'unsupported-local-presentation',
      kind: 'blocking-error',
      message: '当前呈现没有已验证的本地导出路径。',
    })
  } else if (snapshot?.localCapability === 'high-fidelity-required') {
    pushFinding(findings, {
      ...(compatiblePresentationAction === undefined ? {} : { action: compatiblePresentationAction }),
      ...(highFidelityAction === undefined ? {} : { alternatives: [highFidelityAction] }),
      code: 'presentation-risk',
      kind: sensitive ? 'blocking-error' : 'quality-warning',
      message: sensitive
        ? '当前呈现需要 High-Fidelity Export，但 Sensitive Document 只能留在本地；请应用兼容呈现。'
        : '当前呈现尚未通过本地保真认证；可应用兼容呈现或选择 High-Fidelity Export。',
    })
  }

  for (const slot of input.sceneSlots ?? []) {
    if (!slot.recommended || slot.satisfied) {
      continue
    }
    pushFinding(findings, {
      action: action('focus-content', `补充${slot.label}`, { targetId: slot.targetId }),
      code: 'missing-scene-slot',
      kind: 'content-suggestion',
      message: `场景建议补充“${slot.label}”，但这不会阻止当前可渲染内容导出。`,
      targetId: slot.targetId,
    })
  }

  const blockingErrorCount = findings.filter(finding => finding.kind === 'blocking-error').length
  const contentSuggestionCount = findings.filter(finding => finding.kind === 'content-suggestion').length
  const qualityWarningCount = findings.filter(finding => finding.kind === 'quality-warning').length
  const readinessFinal = input.readiness === undefined
    || (input.readiness.pagination.final && input.readiness.stableFrames >= 2)
  const presentationRequiresHighFidelity = snapshot?.localCapability === 'high-fidelity-required'
    || snapshot?.localCapability === 'unsupported'
  const localRoute = probe.status === 'pending'
    ? 'cannot-export'
    : probe.status === 'failed'
      ? sensitive || highFidelityAction === undefined ? 'cannot-export' : 'high-fidelity-required'
      : presentationRequiresHighFidelity
        ? sensitive ? 'cannot-export' : 'high-fidelity-required'
        : blockingErrorCount > 0
          ? 'cannot-export'
          : 'local-eligible'

  return {
    blockingErrorCount,
    canExport: blockingErrorCount === 0 && input.renderReady && readinessFinal,
    contentSuggestionCount,
    findings,
    localRoute,
    qualityWarningCount,
  }
}

export function readPreflightImageObservations(root: HTMLElement): readonly PreflightImageObservation[] {
  return Array.from(root.querySelectorAll<HTMLImageElement>('img')).map((image) => {
    const rect = image.getBoundingClientRect()
    const owner = image.closest<HTMLElement>('[data-block-id]')
    return {
      blockId: owner?.dataset.blockId,
      naturalHeight: image.naturalHeight,
      naturalWidth: image.naturalWidth,
      renderedHeight: rect.height,
      renderedWidth: rect.width,
      resourceId: image.dataset.resourceId ?? image.alt,
    }
  })
}
