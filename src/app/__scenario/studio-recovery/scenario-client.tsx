'use client'

import { useMemo } from 'react'
import { StudioClient } from '@/app/studio/studio-client'
import {
  LocalRepositoryError,
  createInMemoryLocalRepository,
} from '@/features/local-repository'

export function StudioRecoveryScenarioClient() {
  const repository = useMemo(() => {
    let failNextWrite = true
    return createInMemoryLocalRepository({
      beforePersistCommit: () => {
        if (!failNextWrite) {
          return
        }
        failNextWrite = false
        throw new LocalRepositoryError('write-failed', 'Scenario injected a failed local write')
      },
    })
  }, [])

  return <StudioClient createRepository={() => repository} />
}
