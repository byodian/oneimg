'use client'

import { createExportEngine } from './index'
import {
  type BrowserResourceDefinition,
  createBrowserResourceResolver,
} from '@/features/canonical-renderer/resource-resolver'
import { generalLongImageResourceDefinitions } from '@/features/general-long-image'
import { createLocalSvgAdapter } from '@/features/local-export/local-svg-adapter'

/**
 * The Studio composition root owns the certified local adapter choice.
 * Callers only receive the Export Engine boundary.
 */
export function createStudioExportEngine(
  resourceDefinitions: readonly BrowserResourceDefinition[] = generalLongImageResourceDefinitions,
) {
  return createExportEngine({
    localAdapter: createLocalSvgAdapter(),
    resolver: createBrowserResourceResolver(resourceDefinitions),
  })
}
