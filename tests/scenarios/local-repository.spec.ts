import { expect, test } from '@playwright/test'

interface RepositoryCheck {
  readonly conflictDraftCount: number
  readonly conflictDraftSourceDocumentId: string
  readonly conflictDraftRevision: number
  readonly duplicateStatus: string
  readonly recentIds: readonly string[]
  readonly restoredRevision: number
  readonly staleStatus: string
  readonly staleRevisionAfterWrite: number
}

interface LocalRepositoryScenarioResult {
  readonly indexedDb: RepositoryCheck
  readonly memory: RepositoryCheck
  readonly status: string
}

test.describe('Local Repository contract', () => {
  test('serializes commits, restores the newest revision, and keeps recents meaningful', async ({ page }) => {
    await page.goto('/scenario/local-repository')

    const result = JSON.parse(
      await page.getByTestId('local-repository-result').textContent() ?? '{}',
    ) as LocalRepositoryScenarioResult

    expect(result.status).toBe('ready')
    for (const adapter of [result.memory, result.indexedDb]) {
      expect(adapter).toEqual({
        conflictDraftCount: 1,
        conflictDraftRevision: 3,
        conflictDraftSourceDocumentId: 'document:repository-fixture',
        duplicateStatus: 'already-saved',
        recentIds: ['document:repository-fixture'],
        restoredRevision: 3,
        staleRevisionAfterWrite: 3,
        staleStatus: 'stale',
      })
    }
  })
})
