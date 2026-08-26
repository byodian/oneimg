import { notFound } from 'next/navigation'
import { StudioRecoveryScenarioClient } from '@/app/__scenario/studio-recovery/scenario-client'

export default function StudioRecoveryScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }
  return <StudioRecoveryScenarioClient />
}
