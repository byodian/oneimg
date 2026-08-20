# OneIMG WYSIWYG Contract

OneIMG treats “what users see is what they export” as a release-blocking product contract. A Raster Export with user-visible differences from its Canonical Preview is an invalid result, not a successful lower-fidelity output.

## Scope of equality

The contract requires the same content order, text metrics and wrapping, typography, spacing, colors, borders, radii, shadows, backgrounds, image orientation and focal crop, overflow, Page boundaries, and Semantic Slice positions. It does not require byte-identical files or identical physical appearance on every monitor. Display Zoom, explicit Output Scale, target pixel dimensions, and disclosed JPEG or WebP compression may change representation without changing composition or style.

Default PNG output must be visually indistinguishable from the Canonical Preview at equivalent scale. Browser and operating-system text antialiasing noise may be diagnosed separately, but it cannot excuse changed line breaks, element geometry, color treatment, crop, or pagination.

## Canonical Renderer Module

One versioned Canonical Renderer is the authority for editing, Clean Preview, Local Export, and High-Fidelity Export. Its conceptual Interface is deliberately small:

```text
mount(snapshot, host, interaction) -> Render Session
Render Session.whenReady() -> Render Readiness
Render Session.update(snapshot)
Render Session.dispose()
```

`interaction` is either editable or inert and may change event handling, focus, and `contenteditable`; it cannot change semantic nodes, computed layout, or presentation. Display Zoom and editor overlays live outside this Interface. Font loading, Asset decoding, direction, locale, overflow, pagination, animation freezing, and layout stabilization remain implementation details behind the Module.

The editor and each Rasterizer Adapter may mount separate Canonical Render Roots for isolation, but all consume the same versioned renderer bundle and Snapshot. There is no export mode available to Templates, Themes, Blocks, or Scenes, no export-only component tree, and no reconstructed layout stylesheet.

Canonical CSS is a versioned Style Pack scoped beneath `[data-oneimg-render-root]`. Application CSS, global `:root`, runtime-generated application classes, stylesheet scraping, arbitrary CSS, ambient network Resources, and editor styles cannot become implicit Renderer inputs. The detailed ownership contract is recorded in [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md).

## Reference Viewport and Display Zoom

Each Page composes at a Reference Viewport in CSS pixels. A Bounded Page has a fixed reference width and height; a Continuous Page has a fixed width and content-derived height. Page Format and Template rules determine that viewport.

The application fits the root to a screen through an outer Display Zoom. Browser-window dimensions, mobile shell, side-panel visibility, inspector width, and application chrome cannot alter line breaks, Block geometry, crop, overflow, or pagination. Template composition uses the Reference Viewport and container-owned rules rather than application-window media queries.

Output Scale rasterizes the same root at a greater or smaller pixel density. It cannot re-run responsive layout, alter CSS sizes, or change Page height in reference coordinates.

## Editor chrome and direct editing

Caret, selection, focus, drag handles, insertion controls, prompts, findings, drop targets, and crop controls are overlays, portals, outlines, or siblings outside the Canonical Render Root's layout. Entering edit mode cannot add layout-affecting wrappers, borders, margins, or padding. Rich Text uses the same semantic nodes and computed styles in editable and inert sessions.

Clean Preview hides editor chrome around the existing Canonical Render Root. It is not a preview route, tab-specific renderer, read-only clone, or reflow. Media crop and focal-point controls update canonical content parameters so the root always displays the exact exported crop.

## Render readiness

A Render Session becomes Render Ready only after:

- every Canonical Font has loaded or its declared fallback is visibly active;
- every referenced Asset has an available Render Source with resolved orientation, intrinsic size, color handling, and focal metadata, with no Unresolved Asset in the target Pages;
- Template, Theme, Density, Page Format, locale, direction, and renderer versions are fixed;
- layout-affecting asynchronous work has settled;
- overflow, pagination, and optional slice boundaries are final; and
- animation, transition, caret, selection, and other time-dependent presentation has a deterministic capture state.

Readiness also requires Resource Resolver completion, convergence of layout-affecting MutationObserver and ResizeObserver activity, and two consecutive animation frames with stable geometry. Every layout-affecting update advances a generation token; readiness or output from an older generation is discarded.

Progressive placeholders and Asset Derivatives may appear before readiness, but the UI identifies them as preparing rather than calling them the final preview. They must already preserve final geometry, orientation, color interpretation, and focal crop so replacement cannot shift layout or composition. The recommended export action reports that resources are being prepared and cannot snapshot an unseen state. A failed font first becomes a visible canonical fallback and triggers a reflow plus Quality Warning; export then uses that same fallback. An Unresolved Asset blocks readiness until relinked or explicitly removed from the Document.

## Snapshot stability

Export freezes the visible Document revision, Template, Theme, font and renderer versions, Reference Viewport, locale, direction, timezone, resolved QRCode content, image orientation and crop, generated sequence values, and any date-like value. Templates cannot read current time, random values, ambient window dimensions, or remote live data during rendering.

Editing may continue after Snapshot creation. A completed artifact from an older revision remains internally valid but is labeled “基于较早版本” and offers a new export of the current revision.

## Local Adapter eligibility

The Local Adapter uses the same Canonical Renderer and Reference Viewport with embedded Canonical Font bytes and an explicitly certified local CSS capability profile. `html2canvas` is not an eligible canonical implementation because reconstructing CSS independently creates a second interpretation path.

The web platform does not expose a universal native screenshot operation for arbitrary DOM, so local export is deliberately narrower than preview CSS. DOM and SVG foreign-object capture is offered only for Template capabilities and browser features that pass runtime probes and preview-versus-output fixtures. Unsupported effects select High-Fidelity Export or require a compatible presentation first. There is no “ignore differences and continue” path.

The owned local path serializes only an inert Canonical Render Root, its scoped Style Pack, and Resource Resolver outputs into Blob-backed SVG foreign-object input. Canvas or OffscreenCanvas is used only to rasterize, resize, clip, color-normalize, and encode. It never clones the application page, scrapes global stylesheets, or serializes large Resources as Data URLs.

## High-Fidelity Adapter and Proof Preview

High-Fidelity Export runs the same Canonical Renderer bundle with the same Snapshot, Reference Viewport, Canonical Font bytes, locale, direction, color mode, animation state, and declared device scale. Its managed browser revision must belong to a certified Renderer Revision before it can export directly.

A provider update or unusual environment without current certification is quarantined. If rendering remains otherwise valid, OneIMG may create a Proof Preview from the final encoded artifact. The client decodes that Blob for inspection, and acceptance or download reuses the exact bytes; no second render can diverge. Proof Preview is used only when certification cannot establish the ordinary direct path.

## Pages, segmentation, and slices

Bounded Page edges and overflow Pages are visible in the Canonical Preview. Continuous Documents may display optional Semantic Slice boundaries before sliced output is requested. Slicing crops one established composition and cannot reflow individual outputs.

Segmented Render changes only capture allocation. Ordered clips use shared coordinates and overlap-safe stitching so the decoded whole or slices match the continuous root. If renderer limits require multiple files, the Export Plan shows their count and boundaries before execution.

## Formats and color

Raster output normalizes orientation and writes a declared sRGB result. PNG is the default strict path for text and mixed content. JPEG and WebP preserve composition and style but may introduce only the explicitly chosen lossy artifacts; when custom quality can be visible, the UI previews the decoded encoded Blob rather than simulating compression.

Transparency uses editor-only checkerboard or backing indicators that never enter the artifact. Differences introduced later by another application's color management or a physical display are outside layout equality, but OneIMG must emit standard color metadata and avoid route-specific color transformations.

## Transient previews and edits

A hover or temporary Template, Theme, Media Arrangement, crop, or other Transient Edit may update the Canonical Render Root without committing history. Export cannot snapshot a Transient Edit. A presentation trial changes the action to “应用后导出”; a crop or drag must be completed or canceled. The user must commit the visible state before Snapshot creation, preventing an intermediate result from disagreeing with the output.

## Verification and release gate

Every Adapter and Template passes the same production-renderer corpus. Tests mount a Clean Preview, export through the target Adapter, decode the real artifact, normalize equivalent scale and color space, and compare:

- exact Block order, text content, line wrapping, font selection, Page count, overflow, crop, and slice boundaries;
- layout geometry in Reference Viewport coordinates;
- colors, backgrounds, borders, radii, shadows, imagery, and transparency; and
- PNG, JPEG, WebP, copy, multi-Page, and Segmented Render behavior where supported.

Structural mismatches have zero tolerance. Pixel comparison may mask a narrowly calibrated antialiasing fringe, but cannot waive geometry or style changes. Any human-visible mismatch blocks the Template, Adapter, or Renderer Revision release.

Fixtures cover browser zoom, several Display Zoom levels, narrow and wide application shells, opened inspectors, mobile shells, slow fonts and images, Asset Derivative replacement, unresolved and relinked Assets, fallback fonts, long multilingual content, transparent media, EXIF rotation, provider eviction, and renderer upgrades.

## Runtime mismatch outcome

When the current environment cannot honor the Canonical Preview, OneIMG does not download a best-effort artifact. It reports:

> 当前效果无法在此设备上无差别导出。

Valid next actions are High-Fidelity authorization, applying and first viewing a compatible Template, replacing the unsupported effect, or retaining an unchanged Sensitive Document. Every adjustment becomes visible and Render Ready before export is re-enabled.
