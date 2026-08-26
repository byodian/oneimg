# General Long Image Studio implementation slice

This note records Slice 05 for Issue #31. The new Studio is available at `/studio` only when `ONEIMG_ENABLE_STUDIO=1`; the existing root experience remains unchanged and can still be used as the rollback path.

## Delivered contract

- A first visit opens an unnamed, local-only General Long Image Draft without a Project, login, template gate, permission prompt, or setup wizard.
- The empty Starter is an editable surface in the production Canonical Render Root. Its prompt is editor chrome and does not create a meaningful Recent item or an export Block.
- Typing or pasting plain text into the empty surface creates one semantic Rich Text Block on blur or `Escape`. The completed intention goes through Document Core and is persisted through the IndexedDB Local Repository.
- The same Canonical Renderer and versioned Style Pack render the editable surface, Clean Preview, and the inert local PNG export path. Clean Preview hides the surrounding chrome and does not replace the Render Root.
- A successful commit records only the active Document identifier as a disposable local boot hint. Return visits restore the newest Meaningful Draft from the Repository; the Untouched Draft is never persisted as a Recent.
- The Studio exposes an accessible local export entry, while planning and the complete output matrix remain owned by the later Export Engine slices. The entry uses the adapter's actual extension, including a segmented ZIP for an oversized Continuous Page.

## Deliberate scope

This slice is text-first. Semantic Markdown/HTML paste, richer Block admission, Asset Originals, Smart Paste, presentation selection, persistent writer leases, and export preflight remain later slices. Plain-text editing currently preserves an existing heading's level when a user edits that Rich Text Block; richer structural paste is intentionally deferred to Slice 07.

## Verification

`tests/scenarios/studio.spec.ts` covers a cold start with no Recent, focus in the Canonical Render Root, first meaningful input, semantic commit and durable receipt, accessible export discovery, reload restoration, and Clean Preview preserving the same root and Document identity.
