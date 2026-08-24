import { expect, test } from '@playwright/test'

interface DocumentCoreScenarioResult {
  readonly status: string
  readonly initialRevision: number
  readonly revisionAfterInsert: number
  readonly originalBlockCount: number
  readonly insertedBlockKinds: readonly string[]
  readonly staleCommit: {
    readonly code: string
    readonly status: string
  }
  readonly revisionAfterUndo: number
  readonly revisionAfterRedo: number
  readonly serializedEqual: boolean
  readonly unknownBlockRoundTrip: boolean
}

test.describe('Document Core contract', () => {
  test('commits semantic revisions without losing immutable or unknown content', async ({ page }) => {
    await page.goto('/scenario/document-core')

    const result = JSON.parse(
      await page.getByTestId('document-core-result').textContent() ?? '{}',
    ) as DocumentCoreScenarioResult

    expect(result.status).toBe('ready')
    expect(result.initialRevision).toBe(1)
    expect(result.revisionAfterInsert).toBe(2)
    expect(result.originalBlockCount).toBe(0)
    expect(result.insertedBlockKinds).toEqual(['rich-text', 'unknown'])
    expect(result.staleCommit).toEqual({
      code: 'stale-revision',
      status: 'rejected',
    })
    expect(result.revisionAfterUndo).toBe(3)
    expect(result.revisionAfterRedo).toBe(4)
    expect(result.serializedEqual).toBe(true)
    expect(result.unknownBlockRoundTrip).toBe(true)
  })
})
