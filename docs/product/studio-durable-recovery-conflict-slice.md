# Studio durable commit, restart recovery, and conflict protection

This note records Slice 06 for Issue #32. It extends the feature-flagged General Long Image Studio without changing the existing default entry.

## Delivered contract

- The Local Repository acknowledges a Document Revision only through a durable receipt. Studio keeps the newest acknowledged Revision separately from an in-memory but unacknowledged edit.
- Studio schedules a durable commit after plain-text input settles for 400 ms, while leaving the body or pressing `Escape` flushes the pending commit immediately.
- A failed local write keeps the current content usable and exposes both `重试保存` and `恢复已提交版本`. Retrying the same Edit Transaction remains idempotent if the browser committed the write before the failure was reported.
- Restart recovery reads the newest valid Meaningful Draft and preserves its Document identity, Page identity, Block identity, presentation, and committed revision.
- Concurrent branches based on an older committed Revision never replace the current Document. The non-winning branch is stored as a Conflict Draft with its own Document identity and can be restored independently.
- Studio conflict recovery rereads the current repository Revision before restoring, so a second writer does not fall back to an outdated local baseline.

## Deliberate scope

This slice uses optimistic Revision conflict detection. Real-time merging, CRDT state, automatic field-level reconciliation, and a persistent writer lease with a read-only second tab remain later work. Conflict Draft preservation is the safe fallback when two valid branches cannot be merged without changing user content. A separately listed read-only Recovery Draft for corrupt or newer-than-supported records also remains a later recovery slice; startup leaves those records untouched and skips them when selecting the active Draft.

## Verification

- `tests/scenarios/local-repository.spec.ts` exercises in-memory and IndexedDB commit ordering, stale replay, conflict preservation, conflict restore, and meaningful Recent filtering.
- `tests/scenarios/studio.spec.ts` opens two Studio pages against one local Draft and verifies that the main branch remains intact while the competing branch becomes a Conflict Draft.
- `tests/scenarios/studio-recovery.spec.ts` injects one failed local write and verifies retry plus restoration to the durable baseline.
