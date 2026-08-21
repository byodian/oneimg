'use client'

import { CanonicalLocalExportHarness } from '@/app/__scenario/canonical-local-export/scenario-client'
import {
  longCanonicalFixtureResources,
  longCanonicalSnapshot,
} from '@/features/canonical-renderer/long-fixture'

export function CanonicalLongExportScenario() {
  return (
    <CanonicalLocalExportHarness
      resourceDefinitions={longCanonicalFixtureResources}
      scenarioLabel="STUDIO SCENARIO HARNESS · ISSUE #28"
      snapshot={longCanonicalSnapshot}
    />
  )
}
