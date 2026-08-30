import { notFound } from 'next/navigation'
import { SegmentedRenderScenario } from '@/app/__scenario/segmented-render/scenario-client'

export const dynamic = 'force-dynamic'

export default function SegmentedRenderScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <SegmentedRenderScenario />
}
