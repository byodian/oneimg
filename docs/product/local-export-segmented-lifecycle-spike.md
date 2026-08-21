# Segmented Local Export and Resource Lifecycle Spike

This note records the Slice 02 implementation for Issue #28. It extends the Issue #27 Canonical Renderer/local export spike with a bounded long-page path, cancellation, and observable cleanup ownership.

## Proven contract

- The long-page fixture contains twenty image resources with twenty distinct source aspect ratios. Preview and export still consume one Canonical Render Root, one Snapshot, one Reference Viewport, and one Resource Resolver fingerprint.
- `createSegmentedRenderPlan` keeps a single capture below both the height and pixel budgets. Larger output is split into contiguous logical `y`/`height` segments with a one-megapixel capture budget and a hard maximum of 64 segments. Each capture carries an 80 CSS-pixel bleed where possible, then crops back to its logical height; this covers the current Style Pack's largest shadow extent plus offset so adjacent segment boundaries do not clip a shadow or border at the seam. The plan exposes logical and capture coordinates in export diagnostics so there is no silent quality reduction or hidden crop.
- Each segment is serialized with the same full document height and a translated Canonical Root. A segmented artifact is a ZIP of cropped PNG segments; packaging is explicit rather than allocating another unsafe full-height bitmap.
- The Resource Resolver accepts an `AbortSignal`, passes it to URL fetches, checks it across Blob/hash/font work, and owns every Blob URL in an idempotent session ledger. A canceled or failed session revokes all URLs created before the late callback and decrements its active-session count.
- Rasterization attempts a Blob-backed Worker when the browser exposes `Worker` and `OffscreenCanvas`. The Worker URL is revoked immediately after construction, every Worker canvas is zeroed, transferred `ImageBitmap` instances are closed, and termination rejects pending work. Diagnostics distinguish Worker availability, request/fallback counts, and successful Worker encoding. Chromium currently rejects transfer of the foreign-object `ImageBitmap` used by this carrier, so the adapter records the attempted capability and falls back to the bounded main-thread canvas path for that specific browser constraint.
- Cancellation is threaded through serialization, Blob reads, SVG decode, Render Ready waits, rasterization, ZIP packaging, and the main-thread yield points. Browser Canvas and ZIP primitives remain cooperatively cancellable at their available checkpoints; the scenario sets the terminal canceled state before aborting, and the adapter publishes a final cleanup progress record after worker/root/host cleanup so late completion cannot publish an artifact.
- The export request has an optional cancellable stage hook for contract verification. The long-page scenario can hold `render-ready`, `serializing`, `encoding`, or `packaging` at its entry checkpoint; canceling while held rejects through the same `AbortSignal` path and exercises the same final cleanup. This is a deterministic checkpoint probe, not a claim that an already-running browser Canvas or ZIP primitive can be preempted.
- Cleanup diagnostics balance Worker-returned ArrayBuffers and temporary segmented PNG entries in addition to Worker URL, canvas, and ImageBitmap ownership. Local export resolves its own Resource Resolver session and releases those Blob URLs on completion/cancel; preview Resource Resolver URLs are intentionally retained while the visible preview still owns them and are revoked when the preview session is explicitly released.

## Verification surface

The scenario route `/scenario/canonical-long-export` verifies twenty distinct natural image dimensions, segmented ZIP output, logical/capture boundary coverage, cropped PNG dimensions, preview-versus-segment edge pixels, repeated-export timing samples, and cleanup balance for Worker canvases, ImageBitmaps, ArrayBuffers, and temporary segment entries. The test attaches `oneimg-long-resource-baseline.json` with fixture size, P50/P95 total time, browser heap samples when available, a deterministic peak raster-allocation estimate, Long Task totals, and the cleanup audit. Cancellation coverage includes repeated immediate cancellation, a three-sample `oneimg-cancel-baseline.json`, and `oneimg-stage-cancel-baseline.json` covering every cancellable stage checkpoint.

The route `/scenario/resource-resolver-lifecycle` delays one resource, cancels resolution, and verifies that active sessions and Blob URLs return to zero while created and revoked URL counts match.

These are browser-contract probes, not a device performance certification. The attached timing sample is a baseline for the current Playwright Chromium environment; supported-device P50/P95 and memory budgets still need to be established by the release performance matrix.

## Deliberate limits

- The bounded SVG data-URL carrier remains capped at 512 KiB per segment. An oversized segment fails with an actionable error instead of dropping images or degrading styles.
- Segmented output is currently a ZIP of PNG parts, not a reconstructed monolithic PNG. A future continuous-image consumer must stream or stitch under an independently measured allocation budget.
- Worker use is capability-driven. A browser that cannot transfer this carrier's non-origin-clean `ImageBitmap` uses the main-thread fallback and retains the same cancellation and cleanup contract.
