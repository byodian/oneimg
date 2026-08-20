# Renderer, Template Runtime, and Local Export

This specification closes the rendering and template decisions accepted in design rounds R19 through R21. It refines the WYSIWYG Contract without creating a second renderer or a freeform design surface.

## Ownership boundaries

Rendering is divided by meaning rather than by screen:

- the Block Catalog owns semantic and accessible DOM, content behavior, base interaction semantics, and the safe fallback representation for each Block kind;
- the Template Runtime owns Page composition, layout recipes, Slot placement, Block Variants, Format Adapters, and application of semantic design tokens;
- a Scene owns starters, Slot guidance, Smart Paste mapping, suggestions, checks, and output presets, but no rendering code; and
- the Canonical Renderer combines those declarations into one Canonical Render Root for editing, Clean Preview, Local Export, and High-Fidelity Export.

No Scene, editor panel, Rasterizer Adapter, or export format may maintain a private component tree or stylesheet that independently interprets Document meaning.

## Template Definition

A versioned Template Definition contains:

- stable identity, origin, version, migration metadata, and localization metadata;
- supported Scenes, Page Formats, Block kinds, locales, directions, and output capabilities;
- one or more deterministic layout recipes and Page-Format-specific Format Adapters;
- supported Scene Slots, Block Variants, safe fallback variants, and overflow behavior;
- semantic design-token bindings and a versioned Style Pack reference;
- trusted decorative Resource identifiers rather than arbitrary URLs;
- Local Capability requirements, High-Fidelity requirements, and explicit degradation rules for non-raster outputs; and
- complexity budgets for DOM nodes, nesting, selectors, fonts, images, and decorative resources.

Unknown or unsupported Blocks render through a common safe fallback and remain visible. A Template cannot discard, conceal, or reorder authored content merely because it lacks a specialized variant.

## Deterministic layout vocabulary

Trusted Templates compose through a bounded vocabulary such as Stack, Cluster, Split, Grid, Frame, Rail, Media Arrangement, Keep Together, and Page Break. These primitives can calculate geometry from the immutable Snapshot and Reference Viewport but cannot expose arbitrary user coordinates or unrestricted layers.

The Trusted Template Composer is a pure transformation from a versioned Snapshot and Template Definition to a layout description. It cannot read the current time, random values, ambient window dimensions, application state, global DOM, user-authored executable code, or the network.

Animation, transition, video frames, live data, and time-dependent presentation are excluded from initial Canonical Templates. Application motion and editor feedback remain outside the Canonical Render Root.

## Canonical Style Pack

Canonical CSS is a renderer-owned, prebuilt, versioned Style Pack. It uses cascade layers with an explicit order and scopes every selector beneath `[data-oneimg-render-root]`. Canonical variables live on that root rather than global `:root`.

The Canonical Render Root cannot depend on:

- application Tailwind utilities or editor component styles;
- TSS or other runtime-generated class names whose identity is not part of the Renderer Revision;
- global stylesheet discovery or scraping;
- arbitrary imported CSS, browser extensions, or ambient page styles;
- Shadow DOM as an alternate layout implementation; or
- relative or network resource URLs outside the Resource Resolver.

Editing and inert Render Sessions use the same semantic nodes, classes, Style Pack, and computed layout. Interaction changes event handling and focus only.

## Style Presets instead of a template builder

The initial product does not expose a Template Builder, arbitrary CSS, free positioning, or User Template authoring. It offers a Style Preset that can save:

- Template Family and exact Template version policy;
- Theme, Density, and Page Format;
- constrained brand colors and compatible token choices;
- Logo and organization identity Asset references; and
- bounded decorative preferences declared by the selected Template.

Brand values apply only to declared compatible Slots. An incompatible Template retains the values as unrendered preset data and explains why they are not visible. Contrast checking reports status and proposes a one-click correction; it does not silently alter an ordinary user choice. Clearly unreadable combinations cannot become certified built-in presentations.

The schema reserves Template origin, permission, and signature fields for a future declarative User Template capability, but the initial interface does not expose it.

## Template selection and upgrades

Every Scene starts with a Local Certified Template and complete Theme. No initial default or recommended Template may require High-Fidelity Export.

Inline recommendations show no more than three Template Families selected from the Active Scene, content shape, Page Format, and compatibility findings. They render the user's current content. The complete catalog is secondary and does not block creation.

Initial deterministic composition may choose a suitable recipe. Once a user explicitly changes an arrangement or presentation, that value becomes an override and is not silently replaced by later content changes.

A Document pins its Template version. A newer version is offered through a migration preview and becomes one Edit Transaction only after acceptance. Compatible old versions remain available during the declared support window; otherwise the Package and migration rules produce a Recovery Draft rather than pretending the new layout is identical.

## Resource Resolver

The Resource Resolver is the only way a Canonical Render Root obtains media, fonts, icons, QR graphics, and Template decoration:

```text
resolve(resourceId, snapshot, target) -> Resolved Resource
release(renderSessionId)
```

Documents and Templates reference stable Resource identifiers. Local sessions resolve them to Blob-backed object URLs; remote Jobs resolve the exact same bytes to short-lived, Job-scoped internal URLs. Canonical Fonts and trusted Template assets are versioned packs. Preview and export therefore consume identical bytes rather than repeating ambient fetches.

Large images, fonts, and generated SVG use Blob URLs. Base64 is reserved for tiny, trusted constants whose inclusion is measured and versioned. Object URL ownership belongs to a Render Session or Export Job and is released on completion, cancellation, invalidation, or disposal.

## Render readiness and invalidation

In addition to fonts, Assets, pagination, overflow, and fixed Snapshot values, Render Ready requires:

- all Resource Resolver promises to have settled;
- MutationObserver and ResizeObserver activity to have converged;
- two consecutive animation frames with stable layout geometry;
- caret, selection, transition, animation, and other dynamic presentation to be frozen outside the captured state; and
- the Render Session generation token still to match the current Snapshot.

Every layout-affecting update increments the generation token. A readiness result, local raster, or cache entry from an earlier generation is discarded rather than published.

## Owned Local SVG Adapter

The canonical local path is an owned SVG foreign-object Adapter rather than `html2canvas` or the legacy longpic global-style capture:

1. mount an inert Canonical Render Root from the immutable Export Snapshot at the exact Reference Viewport;
2. wait for the renderer's full Render Ready contract;
3. resolve the versioned Style Pack and every referenced Resource through the Resource Resolver;
4. serialize only the Canonical Render Root and its owned CSS into an SVG `foreignObject`;
5. load that SVG through a Blob URL into an image/bitmap;
6. use Canvas or OffscreenCanvas only for rasterization, bounded resizing, color-normalized encoding, and derived clips; and
7. release all temporary DOM, Blob URLs, bitmaps, canvases, and buffers.

The Adapter never clones the application DOM, scrapes `document.styleSheets`, reconstructs CSS features, or serializes large documents as Data URLs.

## One rasterization per Page

An Export Job rasterizes each normal-size Page once. PNG, JPEG, WebP, Copy Image, faithful PDF pages, ordered downloads, and Semantic Slices reuse or derive from that Page artifact where their encoding requirements allow it. A Page fingerprint includes the Document and Asset revisions, presentation versions, Reference Viewport, Output Scale, Adapter and encoder revisions, format options, locale, direction, and color policy.

Changing one Bounded Page invalidates that Page only. A changed Continuous Page invalidates its raster but can reuse unchanged Assets, fonts, and independent Pages. Oversized output uses Segmented Render before unsafe allocation and retains the same composition coordinates.

Opening the export panel performs `plan()` only. Rasterization begins only after the user requests `run()`. Proof Preview and lossy compression preview display decoded final encoded bytes; ordinary option changes do not eagerly rerender the entire Document.

## Local CSS capability profile

CSS is classified independently of ordinary browser preview support:

- **Local Certified** — the current Template, browser environment, and Local Adapter have passed preview-versus-artifact conformance;
- **High-Fidelity Required** — the presentation is valid but cannot currently satisfy the local WYSIWYG Contract; and
- **Unsupported or Non-deterministic** — no eligible route may claim the result.

Initial built-in Templates use only Local Certified features. Newer features such as masks, filters, blend modes, backdrop effects, container-dependent behavior, or advanced text shaping remain capability-gated until production fixtures prove them. No feature is admitted from a browser-support table alone.

Template capability declarations are checked against a build-time analysis of the actual Style Pack and layout recipes. An undeclared requirement fails the build. Runtime micro-fixtures probe relevant SVG foreign-object, font, color, image, and encoder behavior. Results are cached by browser engine revision, Local Adapter version, Renderer Revision, and capability fixture version; any change invalidates the cache.

The supported-browser matrix is a measured release artifact rather than an architectural assumption. Outside the declared matrix, editing remains available, while Local Export is eligible only after its runtime probes pass.

## Fonts and color

The initial Canonical pipeline uses declared sRGB throughout preview normalization and raster output. Display-P3 and professional print color are separate future capabilities and never activate implicitly.

Canonical Fonts resolve to pinned font bytes and explicit supported weights. Initial certification prefers static weights and forbids synthetic bold or italic. A system-font fallback is eligible only after that exact fallback is visible in Canonical Preview and represented in the Export Plan.

Emoji cannot rely on uncontrolled system glyphs for certified output. It uses a versioned supported font or a declared fallback representation shared by preview and export.

## Failure and fallback

If local probes or conformance fail, an ordinary Document may explicitly authorize High-Fidelity Export. A Sensitive Document receives only local repairs: apply and preview a compatible Template, replace an unsupported effect, or keep the Document unchanged. There is no best-effort mismatch override.

Visible structural differences have zero tolerance. Geometry may use a one-CSS-pixel diagnostic threshold, while antialiasing and color noise are evaluated separately; no tolerance can excuse changed line wrapping, pagination, crop, content, or human-visible styling.

## Verification

Every built-in Template is tested with all supported Blocks, long multilingual content, empty and extreme values, each declared Page Format and Density, all Media Arrangements, missing and fallback Resources, Local and High-Fidelity Adapters, and supported encoders. Complexity and performance budgets are release-blocking.

Performance acceptance includes cold and repeated Page export, ten-Page Documents, twenty-photo Documents, long Continuous Pages, cancellation latency, peak memory, and resource cleanup on representative mobile and desktop devices. Quality cannot be reduced silently to pass a performance budget.
