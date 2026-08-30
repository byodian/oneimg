import { notFound } from 'next/navigation'
import { CanonicalExportEngineScenario } from '@/app/__scenario/canonical-local-export/scenario-client'

export const dynamic = 'force-dynamic'

export default function CanonicalExportEngineScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <CanonicalExportEngineScenario />
}
