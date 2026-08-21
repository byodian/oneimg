import { notFound } from 'next/navigation'
import { CanonicalLongExportScenario } from '@/app/__scenario/canonical-long-export/scenario-client'

export const dynamic = 'force-dynamic'

export default function CanonicalLongExportScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <CanonicalLongExportScenario />
}
