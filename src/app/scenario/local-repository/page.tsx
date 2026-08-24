import { LocalRepositoryScenarioClient } from '@/app/__scenario/local-repository/scenario-client'

export default function LocalRepositoryScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    return null
  }
  return <LocalRepositoryScenarioClient />
}
