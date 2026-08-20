# Migration and Legacy Import

OneIMG preserves authored content while moving from the current OneIMG and longpic representations into the common Document model. Import is isolated, non-destructive, and explicit about presentation approximations.

## Independent versions

OneIMG versions the OneIMG Package, Document model, each Block kind, Scene Binding, Template, Canonical Font pack, Renderer Revision, and local storage schema independently. A change in one does not force unrelated versions to advance.

Migrations are ordered, deterministic, idempotent transformations from one declared version to the next. They validate their complete result before making it visible and do not mutate the source object in place. Unknown valid fields and Unknown Blocks remain available for round trips where the current model cannot interpret them.

## Safe migration

A local storage migration writes new records and a migration checkpoint before switching the active pointer. Only a completely persisted and validated destination receives a success marker; failure leaves the source records active and produces a recovery action. Repeating the migration after interruption must not duplicate Documents, Assets, history, or Imported Drafts.

A OneIMG Package from a supported older version is parsed into an isolated candidate and migrated before any active work changes. A package from a newer unsupported version, or one whose useful records can be recovered but not safely edited, opens as a Recovery Draft with its original bytes preserved. A Recovery Draft may show validated Package Previews and metadata, extract understood Asset Originals, download the source, retry after an update, or explicitly salvage understood content into a new Imported Draft. It cannot edit, overwrite the source, or produce a Raster Export. OneIMG never saves an older interpretation back over newer source data.

## Import result

Every external or legacy import creates a new Imported Draft or an explicitly chosen Project. It never clears the Repository, replaces the active Draft, reuses source identifiers without collision handling, or silently adopts the imported presentation as an application-wide setting.

An Import Report lists counts and categories of exact mappings, presentation approximations, Unknown Blocks, Unresolved Assets, discarded unsafe presentation, and recovery actions without reproducing authored text. Import opens the resulting Canonical Preview first and shows a concise non-modal summary; the complete report appears only when useful, navigates to affected content, and remains folded with the Imported Draft after issues are resolved.

A successfully verified current OneIMG Package may release its original ZIP after all selected entries have committed because the normalized package representation is already recoverable. A Legacy Source remains associated locally with its Imported Draft until the user deliberately removes it or creates and verifies a current OneIMG Package. Storage pressure may recommend that cleanup but cannot silently discard a Legacy Source that still carries unique recovery value.

The WYSIWYG Contract begins with the new Canonical Preview after import. OneIMG preserves source content and intent but does not claim pixel equality with an obsolete renderer. It does not retain the old OneIMG or longpic renderer in the production rendering path.

## Current OneIMG Adapter

The current OneIMG JSON and local `ContentDB/contents` records map through a dedicated Legacy OneIMG Adapter:

- content and parent relationships become ordered Rich Text and one-level Section structures;
- sanitized editor HTML becomes semantic Rich Text nodes and marks;
- `uploadFiles` Base64 values become Asset Originals and Media Items through the Asset Pipeline;
- legacy theme content becomes the nearest supported Theme and Template Family without becoming a private Block kind;
- old numeric identifiers are recorded only for the Import Report while the destination receives stable opaque identities; and
- unsupported or malformed content remains visible as Unknown Block or Unresolved Asset recovery data.

On the first compatible application start, legacy local records are offered for one idempotent import. The old database remains untouched until the Imported Draft is validated and the user explicitly chooses cleanup. Opening a legacy `.oneimg` file follows the same Adapter and never invokes the old behavior of clearing all local content.

## Longpic Adapter

The longpic saved JSON maps through a dedicated Legacy Longpic Adapter:

- top-level modules become Sections and their one-level children become supported leaf Blocks without creating nested Sections;
- text blocks become semantic Rich Text;
- image blocks and ordered images become Media Groups and Media Items;
- single, grid, feature, sequence-like, masonry, and free legacy choices map to the nearest Auto, Featured, Balanced, Sequence, or Margin Album intent;
- scale and offset values are converted to the closest normalized Focal Point and zoom intent when deterministically possible;
- cover, title, caption, and explicit facts map to common Blocks and Scene Slots;
- old style values map to the nearest Template Family, Theme, Density, and Page Format; and
- Base64 media enters the Asset Pipeline rather than the Document model.

An unversioned JSON file is accepted as longpic only when its structural signature is unambiguous. Otherwise OneIMG asks the user to choose a legacy source type rather than guessing. Unsupported free coordinates, arbitrary styling, or crop geometry are preserved in recovery metadata and disclosed as approximations; they never create a free-layout path in the new editor.

## Verification

Golden fixtures cover every known current OneIMG and longpic schema shape, nested and malformed records, duplicate identifiers, large Base64 media, unsupported layouts, corrupt images, interrupted migration, repeated import, newer versions, and source-order preservation. Assertions compare semantic content and Import Reports; visual fixtures verify the resulting Canonical Preview and its own Raster Export, not equality with the legacy application.

The rollout uses a strangler migration with the old store retained as a read-only recovery source until the new destination validates. `longpic` remains a behavior and fixture reference rather than a source architecture. Implementation phases and default-route gates are recorded in [Architecture Migration and Implementation Roadmap](./implementation-roadmap.md).
