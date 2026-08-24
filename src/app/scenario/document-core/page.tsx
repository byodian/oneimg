import { DocumentCoreScenarioClient } from '@/app/__scenario/document-core/scenario-client'

export default function DocumentCoreScenarioPage() {
  if (process.env.ONEIMG_ENABLE_SCENARIOS !== '1') {
    return null
  }
  return <DocumentCoreScenarioClient />
}
