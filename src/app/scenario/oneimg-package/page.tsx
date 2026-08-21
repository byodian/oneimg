import { notFound } from 'next/navigation'
import { OneImgPackageScenario } from '@/app/__scenario/oneimg-package/scenario-client'

export const dynamic = 'force-dynamic'

export default function OneImgPackageScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <OneImgPackageScenario />
}
