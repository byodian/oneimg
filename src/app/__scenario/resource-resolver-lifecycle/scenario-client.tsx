'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  controlledCanonicalSnapshot,
  controlledFixtureResources,
} from '@/features/canonical-renderer/controlled-fixture'
import {
  type ResourceResolverDiagnostics,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import { isRenderAbortError } from '@/features/rendering/cancellation'

const slowResourceDefinitions = controlledFixtureResources.map(definition => definition.id === 'image:fixture-landscape@1'
  ? {
      ...definition,
      source: {
        href: '/scenario/slow-resource.svg',
        type: 'url' as const,
      },
    }
  : definition)

export function ResourceResolverLifecycleScenario() {
  const resolver = useMemo(() => createBrowserResourceResolver(slowResourceDefinitions), [])
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const [status, setStatus] = useState<'canceled' | 'failed' | 'resolving'>('resolving')
  const [audit, setAudit] = useState<ResourceResolverDiagnostics>(resolver.getDiagnostics())

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    let active = true

    resolver.resolve(controlledCanonicalSnapshot, 'preview', { signal: controller.signal })
      .then((resources) => {
        resources.release()
        if (active) {
          setStatus('failed')
          setAudit(resolver.getDiagnostics())
        }
      })
      .catch((reason) => {
        if (active && !isRenderAbortError(reason)) {
          setStatus('failed')
        } else if (active) {
          setStatus('canceled')
        }
        if (active) {
          setAudit(resolver.getDiagnostics())
        }
      })

    return () => {
      active = false
      controller.abort()
      controllerRef.current = undefined
    }
  }, [resolver])

  return (
    <main style={{ padding: 32 }}>
      <button
        disabled={status !== 'resolving'}
        onClick={() => {
          setStatus('canceled')
          controllerRef.current?.abort()
        }}
        type="button"
      >
        取消资源解析
      </button>
      <p data-testid="resolver-status">{status === 'resolving' ? '正在解析' : status === 'canceled' ? '已取消' : '失败'}</p>
      <pre data-testid="resource-audit">{JSON.stringify(audit)}</pre>
    </main>
  )
}
