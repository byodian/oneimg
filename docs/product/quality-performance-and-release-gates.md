# Quality, Performance, and Release Gates

This specification closes design round R26 and turns the product promises into measurable delivery gates.

## Module-level verification

Tests target deep interfaces rather than incidental UI implementation:

- Document Core validates schema, revisions, invariants, unknown content, and deterministic serialization;
- Editing validates semantic transactions, transient state, history, focus recovery, and equivalent pointer, touch, keyboard, and menu outcomes;
- Local Repository validates durable commits, one-writer conflicts, recovery, Trash, storage pressure, and migration checkpoints;
- Asset Pipeline validates decode, orientation, color normalization, Resource resolution, focal coordinates, derivatives, memory, and cleanup;
- Template Runtime validates pure composition, fallback variants, version upgrades, capability declarations, and complexity budgets;
- Canonical Renderer validates Reference Viewport composition, Render Ready, generation invalidation, locale, pagination, and Clean Preview;
- Export Engine validates planning, one-raster-per-Page reuse, route eligibility, cancellation, encoders, bundles, PDF, and remote lifecycle; and
- Package Module validates streaming, integrity, duplicate handling, hostile input, Recovery Drafts, and round trips.

## Conformance corpus

Each production fixture mounts a Clean Preview from the production Canonical Renderer, executes the target Rasterizer Adapter, decodes the final artifact, normalizes declared scale and sRGB interpretation, and compares both representations.

The corpus includes all supported Blocks and initial Scenes, every built-in Template Family, declared Page Formats and Density values, all Media Arrangements, multi-Page and Continuous output, Semantic Slices, Segmented Render, supported encoders, Faithful PDF, and copy behavior.

Content fixtures include empty and minimal values, long Chinese and English text, mixed scripts, long unbroken words, punctuation boundaries, Emoji and fallback glyphs, all font weights, transparent media, damaged media, EXIF orientation, extreme aspect ratios, one through nine Media Items, missing and relinked Assets, long tables, Keep Together pressure, and overflow.

Structural content, order, line wrapping, font selection, pagination, crop, slice boundaries, and resource identity have zero tolerance. Geometry may use an approximately one-CSS-pixel diagnostic threshold. Antialiasing and bounded color noise are evaluated separately and cannot excuse a human-visible change.

## Browser and device matrix

The official support matrix is established by benchmark evidence and published with each major Renderer Revision. It includes representative low or mid-range Android hardware, a current iPhone class, an ordinary office laptop, and desktop environments across the browsers OneIMG claims to support.

Outside that matrix, editing remains available when the application runs, but Local Export depends on runtime probes. The hosted route is benchmarked separately on representative North, East, and South mainland China networks and an East Asia location rather than inferred from a provider's global claim.

## Performance suites

Performance baselines include:

- first application load into an editable Meaningful Draft;
- local paste and Smart Paste into a long document;
- sustained typing and selection in long Rich Text;
- one and twenty-photo ingestion, decode, collage composition, and crop;
- cold and repeated export of the reference long image;
- ten-Page export and packaging;
- oversized Continuous output and Segmented Render;
- Faithful PDF and lossy quality preview;
- High-Fidelity authorization, upload, rendering, download, and deletion; and
- cancellation and disposal from every expensive stage.

The current reference Export Engine targets remain applicable. Additional P50 and P95 latency, interaction responsiveness, decoded-pixel pressure, and peak-memory budgets are set from the representative device matrix before a feature exits prototype. No test passes by silently lowering Output Scale, encoder quality, font fidelity, content completeness, or Template effects.

## Safety limits

Page count, Block count, Asset count, source bytes, decoded pixels, Page dimensions, aggregate output pixels, Package entries, expanded Package bytes, and render duration have measured soft and hard limits. Approaching a soft limit produces a split or cleanup suggestion. Crossing a hard safety limit blocks only the unsafe operation and preserves the Document.

The exact values are release configuration derived from device and service benchmarks, not Document schema. Export Plan exposes any partition or route change before execution.

## Cancellation and cleanup

Rasterization, decoding, resizing, encoding, packaging, upload, remote browser work, and download each expose cancellation points. Cancellation commits terminal state before late callbacks can publish. Object URLs, ImageBitmaps, canvases, workers, buffers, temporary objects, remote browser sessions, and ephemeral storage are then released idempotently.

Fault injection covers cancellation races, duplicate requests, stale generation tokens, quota reservation, IndexedDB failure, storage exhaustion, network interruption, remote eviction, deletion failure, alarm recovery, and application reload.

## Migration and package durability

Golden stores cover every supported local schema, including the legacy `ContentDB`. Tests execute successful migration, interrupted migration, repeat after interruption, validation failure, active-pointer rollback, collision handling, and verified Package recovery. A migration cannot delete or overwrite its source before the destination commits and validates.

Package property and fuzz tests cover entry order, Unicode paths, traversal attempts, duplicate paths, malformed manifest values, unsupported versions, damaged media, decompression ratios, integrity failures, unknown Blocks, Unresolved Assets, and import-selection combinations.

## Renderer Revision rollout

A Renderer Revision runs the complete conformance and performance corpus before promotion. Browser-provider, Playwright, Style Pack, Template pack, Canonical Font pack, Local Adapter, encoder, and capability-fixture changes all create a new certification input.

A changed revision is quarantined until it passes CI and limited production validation. Failures can disable one Template capability, browser route, encoder, or remote Adapter without disabling local editing. Completed artifacts retain their recorded revision semantics.

## Accessibility and security verification

Automated accessibility checks supplement keyboard, screen-reader, touch, focus, reduced-motion, zoom, and contrast sessions on real devices. Security checks follow the release gate in [Trust, Localization, Accessibility, and Security](./trust-localization-accessibility-and-security.md).

## Usability acceptance

Target users without design expertise complete at least three tasks: create and export a text long image, assemble and share a photo collage, and produce a practical notice. Sessions measure time to first meaningful content, time to first valid artifact, help requests, accidental data loss, Template reversals, and preview-versus-output confidence.

The product is not ready merely because a trained operator can use it. Forced Project creation, blank-artboard confusion, unexplained compatibility routing, and the need to manually fix ordinary design spacing are usability failures.

## Release blockers

The following block release:

- lost, silently changed, or unrecoverable authored content;
- migration or Package import that can overwrite active work;
- certified Template output with changed content, wrapping, crop, pagination, or visible style;
- unresolved Resource omission or silent font substitution;
- an eligible route that exports after failed capability certification;
- uncancellable work that retains material memory or remote content beyond its lifecycle;
- critical keyboard, screen-reader, contrast, or focus failure;
- content leakage through logs, telemetry, crash reports, URLs, or shared browser sessions; and
- performance or memory regression beyond the declared supported-device budget.
