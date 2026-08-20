# OneIMG Architecture Decision Index

The short ADRs record durable choices and explicitly retain superseded history; detailed behavior lives in the linked product specifications and [Design Validation Register](../product/design-validation-register.md). Every entry is current unless its row says otherwise.

| ADR | Decision |
| --- | --- |
| [0001](./0001-versioned-documents-and-assets.md) | Use versioned Documents with separate Assets |
| [0002](./0002-separate-flow-and-canvas-layouts.md) | Separate flow and canvas layout modes — superseded by ADR-0005 |
| [0003](./0003-hybrid-raster-export.md) | Provide local and high-fidelity raster export |
| [0004](./0004-package-oneimg-files-with-separate-assets.md) | Package OneIMG files with separate Assets |
| [0005](./0005-guided-layout-over-general-purpose-design.md) | Prefer Guided Layout over a general-purpose design platform |
| [0006](./0006-model-pages-separately-from-export-slices.md) | Model Pages separately from export slices |
| [0007](./0007-restrict-user-templates-to-declarative-rules.md) | Restrict User Templates to declarative rules |
| [0008](./0008-use-a-finite-scene-neutral-block-catalog.md) | Use a finite scene-neutral Block Catalog |
| [0009](./0009-version-scene-guidance-without-mutating-documents.md) | Version Scene guidance without mutating Documents |
| [0010](./0010-keep-smart-paste-local-and-deterministic.md) | Keep Smart Paste local and deterministic |
| [0011](./0011-use-a-curated-canonical-font-inventory.md) | Use a curated Canonical Font inventory |
| [0012](./0012-group-format-variants-into-template-families.md) | Group Page Format variants into Template Families |
| [0013](./0013-centralize-export-planning-and-execution.md) | Centralize export planning and execution |
| [0014](./0014-send-minimal-ephemeral-export-snapshots.md) | Send minimal ephemeral Export Snapshots |
| [0015](./0015-isolate-hosted-export-behind-a-provider-neutral-service.md) | Isolate hosted export behind a provider-neutral service |
| [0016](./0016-certify-renderer-revisions-instead-of-promising-pinned-managed-chromium.md) | Certify Renderer Revisions instead of assuming a pinned managed browser |
| [0017](./0017-orchestrate-hosted-exports-with-workflows-and-per-job-durable-objects.md) | Orchestrate hosted exports with durable per-Job coordination |
| [0018](./0018-open-in-an-editable-draft-and-edit-the-rendered-document.md) | Open in an editable Draft and edit the rendered Document |
| [0019](./0019-enforce-wysiwyg-through-one-canonical-renderer.md) | Enforce WYSIWYG through one Canonical Renderer |
| [0020](./0020-use-intent-driven-media-composition-instead-of-freeform-layout.md) | Use intent-driven media composition instead of freeform layout |
| [0021](./0021-commit-editing-as-semantic-transactions.md) | Commit editing as semantic transactions |
| [0022](./0022-normalize-local-assets-behind-one-pipeline.md) | Normalize local Assets behind one Pipeline |
| [0023](./0023-make-document-core-the-only-content-authority.md) | Make Document Core the only content authority |
| [0024](./0024-persist-the-local-core-through-one-indexeddb-repository.md) | Persist the local core through one IndexedDB Repository |
| [0025](./0025-allow-one-active-writer-per-document.md) | Allow one active writer per Document |
| [0026](./0026-let-packages-exist-without-projects.md) | Let OneIMG Packages exist without Projects |
| [0027](./0027-migrate-legacy-meaning-instead-of-shipping-legacy-renderers.md) | Migrate legacy meaning instead of shipping legacy renderers |
| [0028](./0028-treat-oneimg-packages-as-unlinked-snapshots.md) | Treat OneIMG Packages as unlinked snapshots |
| [0029](./0029-stream-and-validate-oneimg-packages.md) | Stream and validate OneIMG Packages |
| [0030](./0030-keep-local-history-out-of-portable-packages.md) | Keep local history out of portable Packages |
| [0031](./0031-package-original-assets-and-only-required-render-sources.md) | Package Asset Originals and only required Render Sources |
| [0032](./0032-separate-block-semantics-from-template-composition.md) | Separate Block semantics from Template composition |
| [0033](./0033-isolate-canonical-css-in-versioned-style-packs.md) | Isolate Canonical CSS in versioned Style Packs |
| [0034](./0034-rasterize-locally-through-an-owned-svg-adapter.md) | Rasterize locally through an owned SVG Adapter |
| [0035](./0035-certify-local-css-with-analysis-probes-and-fixtures.md) | Certify Local CSS with analysis, probes, and fixtures |
| [0036](./0036-offer-style-presets-before-user-template-authoring.md) | Offer Style Presets before User Template authoring |
| [0037](./0037-build-faithful-pdf-from-canonical-page-artifacts.md) | Build Faithful PDF from canonical Page artifacts |
| [0038](./0038-keep-ai-explicit-proposal-based-and-nonessential.md) | Keep AI explicit, proposal-based, and nonessential |
| [0039](./0039-make-accessibility-privacy-and-security-release-contracts.md) | Make accessibility, privacy, and security release contracts |
| [0040](./0040-migrate-with-a-strangler-and-renderer-first-risk-spike.md) | Migrate with a strangler and renderer-first risk spike |
| [0041](./0041-release-through-risk-ordered-vertical-slices.md) | Release through risk-ordered vertical slices |
