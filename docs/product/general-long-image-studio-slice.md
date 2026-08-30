# General Long Image Studio implementation slice

This note records Slice 05 for Issue #31. The new Studio is available at `/studio` only when `ONEIMG_ENABLE_STUDIO=1`; the existing root experience remains unchanged and can still be used as the rollback path.

## Delivered contract

- A first visit opens an unnamed, local-only General Long Image Draft without a Project, login, template gate, permission prompt, or setup wizard.
- The empty Starter is an editable surface in the production Canonical Render Root. Its prompt is editor chrome and does not create a meaningful Recent item or an export Block.
- Typing or pasting plain text into the empty surface creates one semantic Rich Text Block on blur or `Escape`. The completed intention goes through Document Core and is persisted through the IndexedDB Local Repository.
- The same Canonical Renderer and versioned Style Pack render the editable surface, Clean Preview, and the local PNG Export Engine path. Clean Preview hides the surrounding chrome and does not replace the Render Root. Slice 08 pins a versioned local certification profile to the `canonical-renderer@3`, `oneimg-foundation@3`, and `local-svg-foreign-object@1` revisions; Slice 10 adds the browser capability probe while the complete export conformance matrix remains a later gate.
- The Studio exposes the Slice 08 presentation surface: three real-content Template Family previews are inline, while the complete Template, Theme, Density, and Page Format catalog remains secondary. The default continuous presentation and all inline Template/Theme/Density combinations are declared Local Certified; bounded Page Formats remain visible as explicit, disabled High-Fidelity Required options until bounded pagination lands. Slice 10 adds Preflight for the certified continuous path. A manual choice is committed as presentation data through Document Core and survives later content edits and reloads without changing authored Blocks.
- Unknown Blocks stay in authored order and render a visible, bounded inert fallback excerpt in addition to their type/version metadata. Unknown presentation identifiers retain their pinned IDs in the Snapshot and are marked Unsupported, so they cannot be silently exported as a different certified presentation.
- A successful commit records only the active Document identifier as a disposable local boot hint. Return visits restore the newest Meaningful Draft from the Repository; the Untouched Draft is never persisted as a Recent.
- The Studio exposes an accessible local export entry backed by an explicit Export Plan and Export Job. The entry uses the adapter's actual extension, including a segmented ZIP for an oversized Continuous Page.

## Deliberate scope

This slice is text-first. Semantic Markdown/HTML paste, richer Block admission, Asset Originals, persistent writer leases, bounded-page pagination, and a full Scene-specific slot catalog remain later slices. Presentation selection is delivered by Slice 08. Plain-text editing currently preserves an existing heading's level when a user edits that Rich Text Block; richer structural paste is intentionally deferred to Slice 07.

## Slice 09 — Explicit Export Plan and WYSIWYG PNG

The Studio now separates planning from execution through the `Export Engine` interface:

- Opening the export panel and changing the PNG output scale (1× or 2×) only creates an immutable `Export Plan`. It does not resolve a second Resource Session, mount an inert Render Root, rasterize a Page, or create a download.
- An explicit `导出 PNG` action creates an `Export Job` from a cloned and deeply frozen Canonical Snapshot. The job owns local Resource resolution, Render Ready waiting, the production Canonical Renderer, the Local SVG Adapter, progress stages, cancellation, and cleanup.
- A normal-size Page is rasterized once per cache key. The key covers the Snapshot content and presentation, resolved resource fingerprint, Reference Viewport and measured Page boundaries, output format and scale, Adapter revision, and encoder revision. Repeated compatible runs reuse the immutable encoded artifact.
- The visible job status reports preparation, rendering, encoding, packaging, and terminal cancellation or failure. A completed artifact records its Snapshot and Document Revision; if editing advances afterward, the receipt is labeled as based on an earlier revision and offers a current re-export.
- The Studio Scenario Harness decodes the downloaded PNG and compares it with the visible Canonical Render Root at the same 1× scale. 2× output changes only encoded pixel allocation; it does not change Reference Viewport composition.

The current local output matrix is deliberately limited to certified continuous General Long Image PNG. Bounded Page Formats remain visible as High-Fidelity Required choices, and the remote Adapter, complete Scene-specific Preflight inference, multi-Page export matrix, and broader encoder/bundle reuse remain later slices.

## Slice 10 — Render Ready and Export Preflight

The Studio now holds Local Export behind the Render Ready and Preflight gates. Render Ready waits for fonts, decoded media, layout observer convergence, two stable frames, final pagination diagnostics, and the active generation token. Preflight surfaces Blocking Errors for empty/corrupt content, unresolved resources, unavailable rendering, unsafe overflow, and failed local capability probes; it surfaces media/font/presentation quality risks and non-blocking content suggestions separately. Recovery actions can focus affected content or apply the certified continuous General Long Image presentation. Ordinary Documents may expose an explicit High-Fidelity authorization alternative, while Sensitive Documents never cross the local-only boundary.

The delivered probe covers the current certified SVG foreign-object transport and is cached per browser capability key. Bounded pagination, multi-Page output, and complete Scene-specific slot inference remain explicitly deferred.

## Verification

`tests/scenarios/studio.spec.ts` covers a cold start with no Recent, focus in the Canonical Render Root, first meaningful input, semantic commit and durable receipt, accessible export discovery, reload restoration, Clean Preview preserving the same root and Document identity, three real-content Template Family previews, complete-catalog access, independent presentation choices, and persistence of those choices across later edits.

## Remote metadata note

GitHub issues #27, #31, and #35 are still marked OPEN remotely. This checkout has verified their local prerequisites through the Canonical Renderer/local PNG, Studio meaningful-draft, and Studio Export Plan/WYSIWYG scenarios; no remote issue state was changed during this implementation.
