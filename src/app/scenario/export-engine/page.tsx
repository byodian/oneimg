import { notFound } from 'next/navigation'
import { ExportEngineScenario } from '@/app/__scenario/export-engine/scenario-client'

export const dynamic = 'force-dynamic'

export default function ExportEngineScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <ExportEngineScenario />
}
