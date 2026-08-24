# Document Core and Local Repository implementation slice

This note records the next implementation slice after the renderer/export and OneIMG Package risk spikes. It establishes the first content-authority seam without changing the existing root experience.

## Delivered contract

- `Document Core` accepts validated immutable revisions and semantic intentions rather than DOM, React setters, or serialized HTML.
- A successful intention produces one new monotonically numbered `Document Revision` and one `Edit Transaction`.
- Insert, replace, remove, move, presentation, and document-name intentions are validated at the same seam; batch Block insertion remains one transaction.
- Undo and redo restore prior semantic states as new committed revisions, so autosave can persist every visible state without writing an older revision over a newer one.
- Rich Text is represented as a bounded semantic tree. Unsupported content is carried as an explicit `Unknown Block` with its original JSON payload.
- Serialization sorts object keys while preserving authored array order, making a revision deterministic for persistence, export snapshots, and package adapters.
- `Local Repository` persists a revision and its transaction together, serializes writes per Document, returns `saved`, `already-saved`, or `stale` receipts, and restores only the newest accepted revision.
- Recents are derived from repository metadata and exclude the initial Untouched Draft until it contains meaningful semantic content.
- The first two adapters are an in-memory implementation for deterministic seam tests and an IndexedDB implementation using responsibility-specific `documents` and `transactions` stores.

## Deliberate scope

This slice does not switch the current application entry page, migrate the legacy `ContentDB`, implement Asset Originals or leases, or expose a new editor. Those are later vertical slices that can consume the same revision and repository interfaces. A failed repository write must leave the in-memory session usable; callers decide when to retry and display the durable receipt.

## Verification

The browser scenarios cover semantic batch insertion, immutable source revisions, stale expected-revision rejection, undo/redo progression, deterministic serialization, Unknown Block round-trip, ordered repository writes, stale persistence rejection, idempotent retry, restoration, and Meaningful Draft Recents through both adapters.
