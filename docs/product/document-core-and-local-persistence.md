# Document Core and Local Persistence

OneIMG keeps one versioned semantic Document model independent of React, browser editors, storage records, preview DOM, and export artifacts. Local persistence follows committed Document Revisions without becoming another source of content truth.

## Document Core Module

The Document Core is an in-process deep Module. It creates a Document Session from one validated revision, exposes the current committed revision, accepts semantic intentions through the Editing Module, and returns a new revision or a stable rejection. It owns Page and Block invariants, stable identity, revision progression, selection recovery hints, undo and redo, Unknown Block preservation, and deterministic serialization.

The Interface does not expose mutable arrays, React setters, DOM nodes, IndexedDB transactions, Tiptap commands, Asset Blob URLs, or renderer details. Callers observe immutable revisions and Commit Results. The same revision feeds autosave, Canonical Renderer, Export Snapshot, OneIMG Package, Scene checks, and conversions.

Project, Document, Page, Block, Repeating Entry, Asset, and Edit Transaction identities are opaque and stable. Order is always explicit content, never inferred from identifier value or storage insertion order. Each accepted Edit Transaction advances a monotonically increasing Document Revision; an Asset content digest is only a local byte-deduplication key and never replaces semantic identity.

## Rich Text Adapter

Rich Text is stored as a versioned semantic tree containing supported nodes and marks rather than HTML. Tiptap may implement editing, selection, input methods, and browser normalization through a Rich Text Adapter, but it does not own the Document or an independent business-history stack. Its changes compile into semantic intentions handled by the common Editing Module.

Pasted or imported HTML is sanitized and parsed at an Adapter seam before entering the semantic tree. Rendering serializes from that tree rather than preserving arbitrary source HTML. Composition input, selection, and caret remain editor state and do not become persisted Document fields.

## Interface state

React and Zustand may hold ephemeral application state such as selected Block, open panel, pointer destination, current bottom sheet, temporary hover, and progress. They subscribe to committed Document Revisions and dispatch semantic intentions; they never mutate canonical content independently. A reload may discard this interface state without losing authored work.

## Local Repository Module

One Local Repository Module owns versioned origin-local persistence. Its Interface restores Documents, persists Commit Records, lists lightweight Recents, manages Trash and settings, and reports durable write receipts and storage findings. Callers do not know object-store names, transaction ordering, migration markers, or byte placement.

The initial implementation uses one versioned IndexedDB database with responsibility-specific object stores for Project and Document records, Asset metadata and Blob bytes, Asset Derivatives, Edit Transactions, checkpoints, Trash, settings, migration state, and Export Cache. Media uses Blob values rather than Base64. OPFS is not an initial external seam; an alternative byte implementation is justified only after repeatable benchmarks show IndexedDB Blob access is the bottleneck and a second production Adapter can pass the same Repository and Asset Pipeline tests.

`localStorage` may contain only disposable, non-sensitive boot hints that are safe to lose and are validated against the Repository. It is never the source of Document, presentation, account, migration, or Asset truth. Storage actions delete named OneIMG records and keys; broad `localStorage.clear()` and broad database clearing are forbidden outside an exact, strongly confirmed “清除所有本地数据” operation.

## Durable commit

An Edit Transaction commits immediately to the in-memory Document Session and renders without waiting for storage. The Repository persists Commit Records in order and returns a durable receipt for the exact Document Revision. The interface shows “已保存” only through the newest acknowledged revision; a failure retains the committed in-memory work, shows “未保存，正在重试”, and continues to allow Raster Export or OneIMG Package creation from that revision. A package made from an unacknowledged but committed revision does not falsely change the Repository status to saved.

Asset ingestion stages bytes before a Document can commit their references. The final storage operation makes the Document Revision, history record, Asset metadata, and ownership references consistent; incomplete staging never creates a committed broken reference. Temporary bytes with no committed owner are eligible for cleanup, while already shared Asset Originals remain untouched.

Autosave coalesces Repository scheduling but never changes Edit Transaction boundaries. Writes for one Document are serialized, stale receipts cannot mark a newer revision saved, and a failed older write cannot overwrite a later committed revision.

## One writer per Document

Each Document permits one active writer lease per browser profile while allowing other Documents to be edited in other tabs. A second tab opens the same revision in read-only Canonical Preview, shows the current writer's recent activity, and may explicitly request “接管编辑”. Losing a lease stops new commits before it can silently overwrite another branch.

Real-time field merging and CRDT state are outside the initial product. If a race or failure produces two valid committed branches, OneIMG preserves the non-winning branch as a Conflict Draft with its own identity and explains the split. It never silently chooses the last wall-clock write.

## Startup and recovery

The Repository indexes Meaningful Draft metadata by update time so startup can identify the most recent one without loading every Document or decoding every Asset. The application renders its shell and validated Document structure first; the Asset Pipeline resolves visible content by priority.

If restoration or migration is unsafe, the original records remain unchanged. OneIMG opens an unlisted temporary Untouched Draft and exposes the failed item through recovery rather than writing fallback content over it. A Recovery Draft preserves newer, unknown, or partly corrupt content read-only until the user exports it, updates the application, or performs an explicit supported repair.

## Storage pressure and garbage collection

OneIMG does not interrupt first use with a storage permission prompt. After a Meaningful Draft accumulates material local media, a non-modal “保护本地作品” action may request persistent browser storage and explain that local autosave is not an external backup. Refusal does not disable editing.

Garbage collection uses reachability from active Documents, retained Edit Transactions and checkpoints, Trash, in-progress package assembly, retained Legacy Sources, and staged committed operations instead of relying only on mutable reference counts. It evicts disposable Asset Derivatives and Export Cache first. An Asset Original becomes eligible only when no protected root reaches it. Storage settings report used, reclaimable, and protected categories and require exact scope confirmation.

## Verification

Tests cross the Document Core, Editing, Local Repository, and Asset Pipeline Interfaces. They cover stale revisions, reordered writes, failed autosave, duplicate Asset bytes, interrupted staging, reload with undo, lease loss, conflict preservation, corrupt records, migration rollback, storage pressure, Trash reachability, and broad-clear prevention. React components and IndexedDB object stores are not treated as independent content authorities.
