# Template and Output Foundations

OneIMG selects a safe default presentation immediately so that choosing a Template never blocks creation. Page Formats, Templates, Themes, Density, and output encoding remain distinct choices with deliberately small interfaces.

## Page Formats

The initial Page Format presets are:

- Continuous
- Square 1:1
- Portrait 4:5
- Photo 3:4
- Story 9:16
- Landscape 16:9
- A4 Portrait, following [ISO 216](https://www.iso.org/standard/36631.html)

Stable ratios and standards are canonical; platform-specific names may appear only as updateable aliases. Custom dimensions live in advanced controls and remain within renderer safety limits.

Page Format determines composition. Output Scale changes raster pixel density without changing layout or implying greater Visual Fidelity.

## WYSIWYG composition contract

Every Page composes at a Reference Viewport expressed in CSS pixels. The editor may apply Display Zoom outside that viewport to fit the Document on screen, but window size, side-panel visibility, browser width, and Output Scale cannot change line breaks, Block geometry, image crop, overflow, or pagination.

Editing, Clean Preview, Local Export, and High-Fidelity Export use one versioned Canonical Renderer and the same Template, Theme, font bytes, Asset decoding rules, locale, direction, and Snapshot values. They may instantiate separate Canonical Render Roots for isolation, but they cannot maintain separate component trees, export-only layout CSS, or reconstructed style logic. Editor chrome is an overlay or sibling outside the Canonical Render Root, so hiding it never causes reflow.

The WYSIWYG Contract covers all user-visible composition and style: content order, text metrics and line wrapping, spacing, colors, borders, radii, shadows, image orientation and focal crop, backgrounds, overflow, Page boundaries, and Semantic Slice positions. Output Scale changes only pixel density. Display Zoom changes only on-screen size. A lossy format may add disclosed compression artifacts, but it cannot alter geometry or styling.

An Adapter is eligible only when its capability probe and certified fixtures show that it can satisfy this contract for the current Snapshot. If no Adapter can do so, export is blocked with a compatible Template or effect-removal action; OneIMG never emits a visibly different image and labels it successful.

The complete readiness, interaction, Adapter, format, and verification rules are recorded in [WYSIWYG Contract](./wysiwyg-contract.md).

## Choosing presentation

Every Scene applies a default Template and Theme before the user types. The editor shows no more than three recommended Template previews inline, with a separate route to the full catalog. Template selection is never a creation gate.

The main presentation controls are Template, Theme, Page Format, and Density. Density is constrained to comfortable, standard, or compact. Blocks expose only meaningfully bounded choices such as Callout tone, media focal point, or curated Smart Collage arrangement rather than arbitrary font size, margin, width, or color controls.

## Template capabilities and fallback

Each Template declares supported Page Formats, Block kinds, and output features. Compatibility is shown before a change. Valid content that lacks a specialized treatment uses a common safe fallback style and is never hidden or discarded; a Conversion Draft is required only when the destination genuinely cannot compose the content.

The Block Catalog owns semantic accessible DOM and base behavior. The Template Runtime owns layout recipes, Format Adapters, Block Variants, semantic token application, and safe fallback composition. Scenes do not render. Built-in CSS ships as a versioned, root-scoped Style Pack rather than global application CSS, and the initial product offers constrained Style Presets instead of a Template Builder or arbitrary CSS.

The complete ownership, Template Definition, Style Preset, CSS isolation, Resource Resolver, and Local Capability contracts are recorded in [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md).

## Fonts

OneIMG ships a small versioned inventory of redistribution-approved Canonical Fonts available to local preview and High-Fidelity Export. Projects reference stable font identifiers instead of bundling duplicate font files. A missing font uses a deterministic fallback and produces a Quality Warning.

Arbitrary font uploads are outside the initial product while licensing, package size, offline caching, and remote-render consent remain unresolved.

## Raster formats

- Text and mixed-content Scenes default to PNG.
- Photo-dominant Smart Collage defaults to high-quality JPEG.
- WebP is an advanced option enabled only after runtime capability detection.
- Unsupported requested encodings fall back explicitly to PNG; file extensions always match encoded bytes.
- Transparency is available only in formats that support it, never JPEG.

Custom JPEG or WebP quality is previewed from the encoded Blob when compression could be visible. The default PNG path requires no separate approximation because the decoded result must match the Canonical Preview apart from pixel density and normal display scaling.

Browsers are required to support PNG through `canvas.toBlob()`, while additional formats such as JPEG and WebP require capability handling ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)).

## Copy and multi-output behavior

A single-Page Document copies that Page as PNG. In a multi-Page Document, Copy Image targets the selected Page and identifies its sequence. The action is shown only when the secure-context Clipboard API and PNG image writing are supported; otherwise OneIMG offers download instead ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/ClipboardItem)).

Exporting multiple Pages or Semantic Slices creates an Export Bundle with stable ordered filenames such as `resume-01.png`. Individual outputs remain downloadable separately.

Page edges and optional Semantic Slice boundaries are shown on the Canonical Preview before those outputs are requested. Each exported file is a crop or encoding of the same composition rather than a newly flowed layout.

Resume, notice, and guide workflows also offer Faithful PDF. It embeds the same canonical Page artifacts without introducing a second layout engine. Platform HTML remains a separate content-preserving Adapter with a disclosed visual-degradation contract. The complete output matrix is recorded in [Practical Scenes and Output](./practical-scenes-and-output.md).

## Template quality gate

Trusted and User Templates must meet the same baseline:

- Normal text contrast of at least 4.5:1 and large-text contrast of at least 3:1, following [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- A Page-Format-specific minimum readable body size
- A reliable backing treatment when text overlaps complex imagery
- No clipped, hidden, overlapping, or out-of-safe-area content
- No user-visible difference between the Clean Preview and decoded Raster Export at equivalent scale
- Export snapshots covering typical content, extreme length, missing media, long titles, multiple scripts, Local Export, and High-Fidelity Export

The initial visual directions and Scene defaults are recorded in [Scene Template Families](./scene-template-families.md).
