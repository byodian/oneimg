import { notFound } from 'next/navigation'
import { AssetPipelineScenario } from '@/app/__scenario/asset-pipeline/scenario-client'

export const dynamic = 'force-dynamic'

export default function AssetPipelineScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <AssetPipelineScenario />
}
