import { notFound } from 'next/navigation'
import { ResourceResolverLifecycleScenario } from '@/app/__scenario/resource-resolver-lifecycle/scenario-client'

export const dynamic = 'force-dynamic'

export default function ResourceResolverLifecycleScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    notFound()
  }

  return <ResourceResolverLifecycleScenario />
}
