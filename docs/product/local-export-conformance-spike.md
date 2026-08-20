# Local Export Conformance Spike

This note records the first renderer/export risk spike for Issue #27. It is intentionally narrower than the final Export Engine: it proves that one controlled Snapshot can drive both the visible Canonical Preview and a local PNG Adapter while preserving the product's WYSIWYG promise.

## Proven contract

- The scenario mounts the production `CanonicalRenderSurface`; the test does not replace it with a test renderer.
- The preview and the inert export session consume the same Snapshot, Style Pack, Reference Viewport, and Resource Resolver fingerprint.
- Both sessions use the shared Render Ready probe. Fonts are loaded, images are decoded, and block geometry remains stable for two animation frames before sampling.
- Preview readiness carries a generation guard so a superseded resource session cannot publish `Render Ready` after a newer session has mounted.
- The Adapter serializes only the Canonical Render Root and its owned CSS. Editor chrome never enters the export surface.
- The PNG is decoded and compared with the actual preview screenshot. The conformance fixture covers Chinese and English text, the canonical font pack, a local image, Grid, Flex, radius, shadow, color mixing, and multiple sections.
- The scenario also performs one cold export and three repeated exports, recording render-ready time, rasterization time, total time, SVG transport size, selected raster path, and the best observed browser heap sample when `performance.memory` is available.

The browser Canvas/OffscreenCanvas APIs are only rasterization primitives here. They are unrelated to the product concept of a freeform design-company “Canvas”; OneIMG remains a guided, template-driven tool for people who do not want to design from scratch.

## Chromium capability finding

The first browser probe found a Chromium-specific constraint: drawing an SVG containing `foreignObject` from a Blob URL or a same-origin HTTP URL into Canvas/OffscreenCanvas produces a tainted canvas, even when the SVG has no external image or font. The same serialized SVG loaded as an outer `data:image/svg+xml` URL remains origin-clean.

The current local Adapter therefore uses a bounded compatibility carrier:

1. It creates the canonical SVG from a Blob-backed serialization.
2. It embeds image bytes from the Resource Resolver Blob into the serialization. Leaving a nested `blob:` image URL would make the image fail inside the outer data URL.
3. It loads the serialized SVG through a bounded UTF-8 data URL and rasterizes it with OffscreenCanvas when available, otherwise DOM Canvas. Diagnostics report this as `source: canonical-svg-foreign-object` plus `svgTransport: bounded-data-url` so the SVG representation and its browser carrier are not conflated.
4. It rejects the transport when the encoded SVG exceeds 512 KiB. It does not silently truncate, omit assets, or fall back to a best-effort image.

The fixture remains small (the outer encoded SVG is well below the cap), but this is not yet a universal long-document strategy. The result is a measured, explicit capability boundary rather than a claim that every modern CSS feature is locally exportable in every browser.

Font sources remain Blob URLs in the owned CSS. A probe that converted the font sources to nested data URLs caused text to disappear in the Chromium foreign-object image, so that transformation is not accepted as a fidelity improvement. The Resource Resolver fingerprint still covers the exact font bytes used by both sessions.

## Pixel interpretation

HTML screenshot capture and SVG foreign-object rasterization use different Chromium compositor paths. They can produce anti-aliasing differences at glyph edges while preserving the same layout, colors, images, radius, and shadow. The acceptance therefore combines:

- exact output dimensions and Reference Viewport width;
- structural and computed-style assertions;
- stable Render Ready geometry;
- a material-pixel ratio no greater than 5% at a channel delta above 32;
- a mean channel delta no greater than 4 across the decoded images.

These thresholds are intentionally a conformance tolerance for rasterization noise, not permission to move blocks or change styles. A future renderer revision must keep the same fixture and compare attached preview/export/diff artifacts before changing the thresholds.

## Follow-up decisions

Before claiming broad local-export support, the next slice should benchmark long documents and representative local media on the supported browser matrix. If the bounded carrier becomes a bottleneck, choose and benchmark a native browser capture path or a dedicated rendering runtime under a new Adapter contract; do not remove the cap or reintroduce `html2canvas` as an implicit fallback.
