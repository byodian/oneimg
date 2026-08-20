# OneIMG Package

A OneIMG Package is an explicit immutable snapshot for portability and recovery, not the live persistence mechanism of the editor. It contains validated declarative content and binary media in a streamable ZIP representation without requiring the user to create a Project.

## Snapshot behavior

“保存 .oneimg 副本” captures one or more committed Document Revisions. Opening a package creates an Imported Draft or a newly chosen Project in the Local Repository; later edits autosave locally and never write back to the source file. OneIMG does not retain a file handle as Document identity, monitor external mutations, or describe Repository autosave as updating a package.

The user may deliberately choose the same filesystem filename for a later snapshot, but that is one explicit write operation. Every successfully created snapshot receives a new Package identity while packaged Documents retain source identities for local duplicate detection and import reporting.

## Entry layout

The initial logical layout is:

```text
manifest.json
documents/{documentId}.json
assets/{assetId}/original.{ext}
assets/{assetId}/render.{ext}       # only when required
templates/{templateId}.json         # User Templates only
previews/{documentId}.{ext}         # optional Package Preview
```

Entry paths use normalized ASCII-safe opaque identifiers, never Document names, original local paths, remote URLs, account identifiers, content digests, `.` or `..` segments. Ordering is stable for inspection and streaming but ZIP byte identity is not a product promise.

## Package Manifest

The versioned Package Manifest declares:

- Package format version, Package identity, producing application version, and creation time;
- included Documents and optional Project organization;
- every required entry's normalized path, role, media type, uncompressed byte length, and SHA-256;
- Document model and Block versions;
- Scene, Template, Theme, Canonical Font pack, and Canonical Renderer compatibility requirements;
- Asset Original and conditional Render Source relationships;
- Package Preview relationships;
- Unresolved Asset and Unknown Block counts without copying authored text; and
- required capabilities and safe recovery status.

The Manifest is an index and compatibility declaration, not a database dump or content model. Package entries remain individually parseable and verifiable. No local Repository schema, browser origin, storage key, account identifier, Export Receipt, or telemetry appears in it.

## Included Document state

Each Document entry contains one committed semantic Document Revision with stable Pages, Blocks, Repeating Entries, presentation choices, Scene Binding, and Asset references. A Package may include an Unresolved Asset reference because preserving incomplete work is valid; its Manifest and opening summary disclose the missing entry. Raster Export remains blocked until the target Document resolves or explicitly removes it.

A Transient Edit cannot enter a package. An arrangement or presentation trial must be applied or canceled, and crop or drag must be completed. Repository acknowledgement is not required when the in-memory revision is committed, but any referenced Asset staging operation must finish before snapshot assembly.

## Included media

Every resolved referenced raster Asset contributes its immutable Asset Original. A Render Source is additionally included only when a declared minimum reader cannot deterministically reproduce the current orientation, color interpretation, alpha, dimensions, and pixels from that Original, including conversions such as required HEIC or HEIF handling. The Manifest identifies the canonical entry and its conversion revision.

Asset Derivatives, decoded bitmaps, object URLs, unrelated media, EXIF and GPS output copies, local paths, and remote hotlinks remain outside the package. Generated QR codes and other deterministic media may store semantic source plus versioned generation intent instead of redundant raster bytes when the Package compatibility contract guarantees reconstruction.

## Presentation dependencies

Documents pin stable Scene, Template, Theme, Block, Canonical Font, and renderer-compatibility versions. A User Template or custom Theme contributes its sanitized declarative definition. Trusted Template executable implementation and application code never enter the package; the application retains a supported version, migrates explicitly, or opens a Recovery Draft.

Canonical Fonts are referenced through versioned identifiers from the redistribution-approved offline inventory rather than duplicated in every package. The initial package does not carry arbitrary user font bytes. A missing required version cannot silently switch Template or font and call the Document compatible.

## Deliberately excluded state

OneIMG Packages exclude Edit Transactions, checkpoints, undo and redo position, Trash, Asset Derivatives, Export Cache, Export Jobs and Receipts, account identity, quota, authorizations, local settings, interface state, writer leases, analytics, and remote-service configuration. Opening a package establishes one new local history baseline.

This exclusion prevents deleted content and local implementation details from becoming a permanent compatibility or privacy burden. A Package is portable current work, not a forensic clone of the browser profile.

## Package Preview

An ordinary Render Ready Document includes one low-resolution Package Preview by default for multi-Document selection and recovery. It is generated from the Canonical Preview, identified as non-authoritative, and cannot satisfy Raster Export or WYSIWYG certification. Its absence does not invalidate the Package.

Sensitive Documents omit Package Previews by default and may include them only after explicit choice. Every preview obeys bounded pixel limits and contains no editor chrome. A Recovery Draft may display a validated preview without claiming it can render or edit the underlying newer Document.

## Package Module

The Package Module inspects an input without changing local state, writes a selected committed snapshot, and imports a validated selection. It returns bounded progress, compatibility findings, an Import Report, or stable failure information. ZIP library behavior, stream mechanics, entry hashing, path normalization, resource limits, candidate storage, and Local Repository coordination remain hidden behind its Interface.

Package writing and reading are incremental. Entries stream in stable order, SHA-256 and compression update as bytes pass, and progress reports actual entries and bytes. Cancellation stops pending I/O, discards uncommitted candidate records, and preserves shared Assets. When direct writable streaming is unavailable, the implementation uses a bounded fallback with preflighted memory cost; the existing whole-archive JSZip Blob path is not eligible for media-heavy OneIMG Packages.

## Validation and hostile input

Inspection validates the Manifest and every selected entry before committing an import. The Package Module rejects:

- absolute, parent-traversing, non-normalized, duplicate, or symlink-like paths;
- undeclared, missing, digest-mismatched, length-mismatched, or media-signature-mismatched entries;
- excessive compressed or expanded bytes, expansion ratio, entry count, nesting, JSON depth, text length, decoded pixels, or Document complexity;
- executable HTML, JavaScript, event handlers, unrestricted CSS, executable Template content, and ambient network dependencies; and
- identifiers, references, Block versions, or graph relationships that violate the declared model.

SHA-256 detects corruption and entry substitution relative to the Manifest; it does not authenticate an author or publisher. The initial product provides no package signature and never labels a checksum as trust verification.

## Import selection and duplicates

A single-Document Package creates and opens one Imported Draft. A multi-Document Package shows a lightweight validated summary with Document names, compatible Package Previews, Asset size, and findings. The default imports all selected Documents into a new Project, while the user may select individual standalone Drafts.

Exact Package identity and complete digest matches offer “打开已有副本” by default or “再导入一份”. A Package with source Document identities already known but different content is labeled a same-source different revision and imported as a separate Draft. Initial import never merges versions, overwrites local work, or creates synchronization semantics.

## Import Report and source retention

After commit, OneIMG opens the real Canonical Preview and gives a non-modal summary of exact mappings, approximations, Unknown Blocks, and Unresolved Assets. The full Import Report appears only when useful, groups actionable items first, links to affected content, and remains available in collapsed form.

The raw ZIP of a fully supported Package may be released after all selected entries pass integrity checks and commit durably. A Legacy Source remains protected until a verified current OneIMG Package replaces its recovery value or the user explicitly removes it. Storage pressure may suggest but never silently perform that removal.

## Recovery Draft

A newer, partly corrupt, or not safely migratable Package opens as a Recovery Draft when useful content can be preserved. It may inspect metadata and validated Package Previews, download the unchanged source, extract understood Asset Originals, retry after an application update, or explicitly salvage understood content into a separate Imported Draft.

A Recovery Draft cannot edit the source, overwrite it, substitute a fallback Template, or create a Raster Export. Salvage never claims completeness and records every omitted or approximated item in a new Import Report.

## Portable-copy reminder

OneIMG does not prompt for a package before first use. A non-modal reminder becomes eligible only when meaningful authored work and local Assets lack a recent package snapshot. Dismissal does not limit the product, and the reminder returns only after substantial further change or a long interval. It never triggers an automatic download or upload and never calls local autosave an external backup.

## Verification

Fixtures cover single and multi-Document packages, common and conditionally normalized media, User Templates, Sensitive preview omission, Unresolved Assets, Unknown Blocks, duplicate imports, same-source revisions, stream cancellation, partial writes, memory limits, every rejected path shape, duplicate entries, digest failures, media spoofing, expansion bombs, newer versions, migration interruption, Legacy Source retention, and Recovery Draft salvage. Round trips compare semantic Documents, Asset identity, presentation versions, and subsequent Canonical Preview-to-Raster conformance rather than ZIP byte identity.
