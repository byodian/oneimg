import { notFound } from 'next/navigation'
import { CanonicalLongExportEngineScenario } from '@/app/__scenario/canonical-long-export/scenario-client'

export const dynamic = 'force-dynamic'

export default function CanonicalLongExportEngineScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <CanonicalLongExportEngineScenario />
}
