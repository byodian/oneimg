import { notFound } from 'next/navigation'
import { PreflightScenario } from '@/app/__scenario/preflight/scenario-client'

export const dynamic = 'force-dynamic'

export default function PreflightScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <PreflightScenario />
}
