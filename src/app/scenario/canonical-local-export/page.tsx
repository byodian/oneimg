import { notFound } from 'next/navigation'
import { CanonicalLocalExportScenario } from '@/app/__scenario/canonical-local-export/scenario-client'

export const dynamic = 'force-dynamic'

export default function CanonicalLocalExportScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <CanonicalLocalExportScenario />
}
