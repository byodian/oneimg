# General Long Image Studio implementation slice

This note records Slice 05 for Issue #31. The new Studio is available at `/studio` only when `ONEIMG_ENABLE_STUDIO=1`; the existing root experience remains unchanged and can still be used as the rollback path.

## Delivered contract

- A first visit opens an unnamed, local-only General Long Image Draft without a Project, login, template gate, permission prompt, or setup wizard.
- The empty Starter is an editable surface in the production Canonical Render Root. Its prompt is editor chrome and does not create a meaningful Recent item or an export Block.
- Typing or pasting plain text into the empty surface creates one semantic Rich Text Block on blur or `Escape`. The completed intention goes through Document Core and is persisted through the IndexedDB Local Repository.
- The same Canonical Renderer and versioned Style Pack render the editable surface, Clean Preview, and the inert local PNG export path. Clean Preview hides the surrounding chrome and does not replace the Render Root. Slice 08 pins a versioned local certification profile to the `canonical-renderer@3`, `oneimg-foundation@3`, and `local-svg-foreign-object@1` revisions; runtime browser probes and the complete export conformance matrix remain later gates.
- The Studio exposes the Slice 08 presentation surface: three real-content Template Family previews are inline, while the complete Template, Theme, Density, and Page Format catalog remains secondary. The default continuous presentation and all inline Template/Theme/Density combinations are declared Local Certified; bounded Page Formats remain visible as explicit, disabled High-Fidelity Required options until pagination and preflight land in the later Export Engine slices. A manual choice is committed as presentation data through Document Core and survives later content edits and reloads without changing authored Blocks.
- Unknown Blocks stay in authored order and render a visible, bounded inert fallback excerpt in addition to their type/version metadata. Unknown presentation identifiers retain their pinned IDs in the Snapshot and are marked Unsupported, so they cannot be silently exported as a different certified presentation.
- A successful commit records only the active Document identifier as a disposable local boot hint. Return visits restore the newest Meaningful Draft from the Repository; the Untouched Draft is never persisted as a Recent.
- The Studio exposes an accessible local export entry, while planning and the complete output matrix remain owned by the later Export Engine slices. The entry uses the adapter's actual extension, including a segmented ZIP for an oversized Continuous Page.

## Deliberate scope

This slice is text-first. Semantic Markdown/HTML paste, richer Block admission, Asset Originals, persistent writer leases, bounded-page pagination, runtime capability probes, and export preflight remain later slices. Presentation selection is delivered by Slice 08, but the complete output matrix and export planning remain owned by later Export Engine slices. Plain-text editing currently preserves an existing heading's level when a user edits that Rich Text Block; richer structural paste is intentionally deferred to Slice 07.

## Verification

`tests/scenarios/studio.spec.ts` covers a cold start with no Recent, focus in the Canonical Render Root, first meaningful input, semantic commit and durable receipt, accessible export discovery, reload restoration, Clean Preview preserving the same root and Document identity, three real-content Template Family previews, complete-catalog access, independent presentation choices, and persistence of those choices across later edits.

## Remote metadata note

GitHub issues #27 and #31 are still marked OPEN remotely. This checkout has verified their local prerequisites through the Canonical Renderer/local PNG and Studio meaningful-draft scenarios; no remote issue state was changed during this implementation.
