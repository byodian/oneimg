# OneIMG Creation

OneIMG turns structured text and media into well-designed, shareable visual documents for people without design expertise. Its language favors guided composition and automatic layout over freeform graphic design.

## Work

**Draft**:
The immediately editable working state that is created or restored without requiring the user to name or save anything first.
_Avoid_: Project, file, workspace

**Untouched Draft**:
The single auto-created starter state that contains no user-authored text or usable Asset; it may remember non-content choices across refreshes but never appears in Recents.
_Avoid_: Empty project, new-document record, template draft

**Meaningful Draft**:
A Draft containing user-authored non-whitespace content or at least one usable Asset, making it eligible for Recents and normal document lifecycle behavior.
_Avoid_: Saved file, named project, touched UI state

**Project**:
A named collection used to organize, save, or transfer one or more Documents and their Assets. A Project is not required before editing can begin.
_Avoid_: Draft, document

**Document**:
One independently renderable piece of content with one or more ordered Pages, presentation choices, and exportable outputs.
_Avoid_: Project, page, poster

**Document Revision**:
An immutable committed state of one Document identified by a monotonically increasing revision within that Document.
_Avoid_: App version, autosave, Edit Transaction, history index

**Document Name**:
A non-rendered label used to organize and find a Document and suggest export filenames. It may initially follow the Visible Title but becomes independent after an explicit rename.
_Avoid_: Visible title, heading, filename

**Visible Title**:
Title content rendered through a Block as part of the Document, independent of its Document Name.
_Avoid_: Document name, project name, browser title

**Page**:
An ordered authoring surface inside a Document that owns Blocks and a Page Format. A Page is part of the editable content model, unlike an output-only Semantic Slice.
_Avoid_: Artboard, export slice

**Asset**:
A reusable media resource, such as an image, logo, QR code, or font, referenced by a Document without being part of its content structure.
_Avoid_: Attachment, upload, Base64 image

**Asset Original**:
The immutable media bytes first accepted from the user and retained locally for recovery, portability, and future derivation.
_Avoid_: Render Source, preview image, export copy

**Render Source**:
The normalized visual representation of an Asset whose orientation, color interpretation, intrinsic dimensions, and coordinate space are shared by Canonical Preview and Raster Export.
_Avoid_: Asset Original, thumbnail, temporary bitmap

**Asset Derivative**:
A disposable representation derived from a Render Source for a particular display or processing need without becoming Document content.
_Avoid_: Asset Original, edited image, duplicate Asset

**Sensitive Document**:
A local-only data-flow designation that prevents a Document and its Assets from being sent to High-Fidelity Export or remote AI Assist, without claiming that browser storage is encrypted at rest.
_Avoid_: Private project, encrypted document, hidden document

**OneIMG Package**:
An immutable portable snapshot of one or more committed Documents and their Assets that may include Project organization but is never a live file binding or prerequisite for editing.
_Avoid_: Project Package, linked file, JSON dump, backup archive, exported image

**Package Manifest**:
The versioned index of a OneIMG Package describing its Documents, required entries, compatibility requirements, byte sizes, media types, and integrity values without becoming authored content.
_Avoid_: Document, Project metadata, database schema, file listing

**Package Preview**:
An optional low-resolution, non-authoritative raster included only to identify or recover a packaged Document when its Canonical Renderer is unavailable.
_Avoid_: Canonical Preview, Proof Preview, Raster Export, thumbnail source of truth

**Imported Draft**:
A new Draft created from external or legacy content without replacing the active work, carrying an Import Report and recovery reference to its source.
_Avoid_: Opened file, restored project, overwritten document

**Import Report**:
A content-free explanation of what an import mapped, approximated, preserved as unknown, or could not resolve.
_Avoid_: Migration log, error toast, Document content

**Legacy Source**:
The unchanged original bytes of a legacy OneIMG or longpic input retained with an Imported Draft until a verified current OneIMG Package replaces its recovery role or the user explicitly removes it.
_Avoid_: Asset Original, OneIMG Package, imported Document

**Recovery Draft**:
A protected read-only representation used when content is newer than the application, partly corrupt, or otherwise unsafe to migrate, preserving recoverable data without pretending it is normally editable.
_Avoid_: Imported Draft, Unknown Block, failed import

**Conflict Draft**:
A separate Draft preserving a competing committed branch when two writers cannot be reconciled without risking silent overwrite.
_Avoid_: Duplicate Document, autosave copy, merged Draft

## Composition

**Scene**:
A non-restrictive creation assistant for an intended use, such as a resume, travel guide, internal notice, or social-media share. It may suggest structure, prompts, checks, and export presets without changing which Blocks the Document may contain.
_Avoid_: Template, theme, tool

**Active Scene**:
The single Scene currently providing guidance for a Document; Blocks that are not associated with it remain valid content.
_Avoid_: Document type, editor mode, template

**Scene Version**:
The revision of a Scene's guidance and Slots used by a Scene Binding, allowing newer guidance to be offered without silently changing an existing Document.
_Avoid_: Document version, template version, app version

**Block**:
An ordered semantic content unit selected from the Block Catalog, such as Rich Text, a Media Group, a Timeline, a Data Table, or a Callout.
_Avoid_: Module, card, section

**Block Catalog**:
The finite set of Block kinds supported across all Scenes, with shared meaning and behavior independent of any one use case.
_Avoid_: Widget library, scene schema, plugin catalog

**Repeating Entry**:
An ordered, stably identified value owned by a repeating Block such as Timeline, Data Table, Checklist, Key Value, Tag List, or Media Group; it is not itself a Block.
_Avoid_: Child Block, row component, nested document

**Section**:
A container Block with an optional heading that may own one level of leaf Blocks but never another Section.
_Avoid_: Folder, arbitrary group, nested layout

**Rich Text**:
Textual content whose paragraphs, headings, lists, links, and marks retain their meaning independently of any rendered HTML.
_Avoid_: HTML source, markup string, text blob

**Media Group**:
A Block containing one to nine ordered Media Items, an optional group Caption, a Media Arrangement, and optional framing intent.
_Avoid_: Attachment list, freeform collage, image layer

**Media Item**:
An independently editable occurrence inside a Media Group that references an Asset while owning its Caption, Alternative Text, Focal Point, zoom intent, fit, rotation correction, and Featured state. Multiple Media Items may reference the same Asset without sharing those choices.
_Avoid_: Asset, image layer, uploaded file

**Media Arrangement**:
A constrained, semantic instruction for how a Media Group should communicate the relationship among its Media Items: Auto, Featured, Balanced, Sequence, or Margin Album. The selected Template computes the safe geometry.
_Avoid_: Template Family, grid preset, free layout, coordinates

**Featured Media Item**:
The optional Media Item intended to receive primary visual emphasis without changing the semantic order of the group.
_Avoid_: First image, cover layer, reordered item

**Focal Point**:
A normalized point identifying the important visual subject of a Media Item so different Templates and Page Formats can crop it safely without storing layout-specific crop coordinates.
_Avoid_: Crop rectangle, face detection, absolute position

**Caption**:
Visible authored context associated with a Media Group or Media Item and eligible to render in the Document.
_Avoid_: Filename, Alternative Text, placeholder

**Alternative Text**:
A non-visual description of a Media Item used by semantic outputs and assistive interfaces, independent of its visible Caption.
_Avoid_: Caption, filename, tooltip

**Edit Transaction**:
One committed, reversible Document revision representing a single user intention, such as a paste, reorder, crop, arrangement change, or continuous text edit.
_Avoid_: Keystroke, autosave, UI event, database transaction

**Transient Edit**:
An uncommitted interaction state used to preview a drag, crop, or presentation choice against a committed Document revision before applying or canceling it.
_Avoid_: Draft, Edit Transaction, autosaved change

**Smart Paste**:
The local, deterministic conversion of pasted text, rich content, and media into semantic Blocks while preserving the user's words and meaningful order.
_Avoid_: Plain paste, AI Assist, content rewrite

**AI Assist**:
An explicitly requested transformation for ambiguous or creative work whose proposed changes are reviewed before entering a Draft and separately authorized if content leaves the device.
_Avoid_: Smart Paste, automatic rewrite, background AI

**Scene Suggestion**:
A non-binding recommendation to convert content to a Scene when multiple independent signals make that use case likely.
_Avoid_: Automatic scene switch, document classification, required mode

**Guided Layout**:
OneIMG's content-driven composition model in which ordered Blocks and constrained presentation choices determine placement and sizing. It excludes arbitrary coordinates, unrestricted layers, and blank-artboard composition.
_Avoid_: Canva-style editor, free layout, blank artboard

**Page Format**:
The structural output constraint of a Page: Continuous when height follows content, or Bounded when dimensions or aspect ratio are preset. It determines composition but not output resolution or Visual Fidelity.
_Avoid_: Layout Mode, Output Scale, image quality

**Reference Viewport**:
The CSS-pixel width and, for Bounded Pages, height under which a Page is composed consistently in editing, Clean Preview, Local Export, and High-Fidelity Export, independent of window size and output resolution.
_Avoid_: Browser viewport, image dimensions, Display Zoom

**Display Zoom**:
A visual-only scaling of the Reference Viewport used to fit the Document on screen without changing layout, line breaks, crop, pagination, or Raster Export dimensions.
_Avoid_: Output Scale, browser zoom, responsive breakpoint

**Smart Collage**:
A Guided Layout presentation for a Media Group that automatically arranges two to nine images through constrained, reusable placement rules.
_Avoid_: Media Group, manual collage editor, photo editor

**Social Share Set**:
An ordered sequence of same-format Bounded Pages intended to be shared together, downloadable as an ordered Export Bundle or one Page at a time.
_Avoid_: Media Group, carousel service, Project, Semantic Slice

**Scene Slot**:
A recommended or optional semantic expectation used by a Scene for suggestions and checks, such as work experience or meeting location; it is neither a Block kind nor a mandatory field.
_Avoid_: Required field, custom block, template region

**Scene Binding**:
An advisory mapping from a Scene's Slots to existing Blocks, keeping scene-specific guidance separate from the Document's common content model.
_Avoid_: Scene schema, block ownership, document type

**Scene Prompt**:
Non-exported guidance shown for an unfulfilled Scene Slot that creates real content only when the user starts entering it.
_Avoid_: Empty block, sample content, placeholder text

**Unknown Block**:
A preserved Block whose kind or version the current OneIMG cannot interpret, remaining part of the Document even when only a fallback representation is available.
_Avoid_: Invalid block, deleted content, import error

**Unresolved Asset**:
An Asset reference whose media cannot currently be found or decoded, preserving its semantic place and recovery information without depending on a remote hotlink or silently omitting it from export.
_Avoid_: Broken image, remote asset, deleted attachment

**Conversion Draft**:
A new Draft created by changing a Document's Scene, Template, or Page Format while preserving the source and previewing how its content maps to the destination.
_Avoid_: In-place conversion, mode switch

**Unmapped Content**:
Content preserved during a conversion but not assigned to the destination's suggested structure, remaining available for the user to place or remove.
_Avoid_: Lost content, invalid block, unplaced layer

## Presentation

**Template**:
Reusable composition rules that arrange supported Blocks through Guided Layout.
_Avoid_: Scene, theme, example

**Template Runtime**:
The renderer-owned Module that applies a versioned Template Definition, layout recipes, Format Adapters, Block Variants, and semantic tokens to common Blocks without owning their content meaning.
_Avoid_: Scene renderer, CSS framework, editor component library

**Template Family**:
A user-facing design concept whose tested Templates adapt the same structural idea across supported Page Formats without appearing as duplicate choices.
_Avoid_: Template category, color variant, Scene

**Format Adapter**:
The Page-Format-specific composition of a Template Family that preserves its design intent under a different supported ratio or pagination rule.
_Avoid_: Responsive breakpoint, duplicate template, image resize

**Template Capability**:
A declaration of the Page Formats, Block kinds, and output features a Template can intentionally compose, including the safe fallback behavior for other valid content.
_Avoid_: Browser support, feature flag, template category

**Local Capability Profile**:
The versioned set of CSS, font, image, color, and encoder behaviors proven by build analysis, runtime probes, and preview-versus-artifact fixtures for a particular Local Adapter environment.
_Avoid_: General browser support, Template Capability, best effort

**Presentation Suggestion**:
A non-binding recommendation to change Template, Theme, Density, or Page Format when the current content would benefit, always showing its reason and preview.
_Avoid_: Automatic style change, migration, warning

**User Template**:
A user-created declarative Template limited to supported structure and presentation choices, without executable code or unrestricted styles.
_Avoid_: Custom code, plugin, stylesheet

**Trusted Template**:
An application-supplied, versioned Template that may use advanced rendering rules unavailable to User Templates.
_Avoid_: User template, imported CSS, theme

**Style Pack**:
The versioned, prebuilt, renderer-owned CSS used beneath a Canonical Render Root, isolated from application and editor styles and included in Renderer certification.
_Avoid_: Global stylesheet, Theme, arbitrary CSS, scraped styles

**Theme**:
A reusable set of visual choices such as colors, typography, spacing, corners, and shadows that does not change document meaning.
_Avoid_: Template, scene, style name

**Style Preset**:
A reusable constrained presentation choice combining Template Family, Theme, Density, Page Format, compatible brand values, and identity Assets without becoming editable CSS or a freeform Template.
_Avoid_: User Template, Document, brand stylesheet

**Density**:
A constrained presentation choice—comfortable, standard, or compact—that changes spatial rhythm without changing content or Page Format.
_Avoid_: Zoom, font size, custom spacing

**Canonical Font**:
A versioned, redistribution-approved font available to both local preview and the canonical rendering environment under a stable identifier.
_Avoid_: System font, uploaded font, font filename

## Output

**Canonical Renderer**:
The versioned composition authority that turns the common Document model into the same layout and style for editing, Clean Preview, and every eligible Raster Export route.
_Avoid_: Preview component, export renderer, template engine

**Resource Resolver**:
The sole renderer boundary that turns stable Resource identifiers into the exact owned bytes used by local and remote Render Sessions, with explicit lifetime and cleanup.
_Avoid_: URL fetcher, Asset Pipeline, network loader, Base64 converter

**Canonical Render Root**:
The renderer-owned Document subtree produced from a versioned Snapshot at its Reference Viewport, excluding editor chrome and shared by editing, Clean Preview, and every Rasterizer Adapter rather than reimplemented for export.
_Avoid_: Preview clone, screenshot element, editor DOM

**Canonical Preview**:
The user-visible appearance of the Canonical Render Root after its approved Template, Theme, Assets, fonts, and Reference Viewport are ready, against which every Raster Export is judged.
_Avoid_: Editor zoom, thumbnail, platform HTML

**Clean Preview**:
The Canonical Preview shown with selection, caret, insertion handles, guidance, and other editor chrome hidden without switching to another renderer or layout tree.
_Avoid_: Preview tab, export mockup, read-only copy

**Render Ready**:
The state in which Canonical Fonts, referenced Assets, fixed dynamic values, overflow, pagination, and all other layout-affecting inputs have settled for the current Document revision.
_Avoid_: Page loaded, images visible, export started

**WYSIWYG Contract**:
The product guarantee that a Raster Export has no user-visible layout or style difference from its Canonical Preview; Display Zoom, explicit Output Scale, slicing boundaries, and disclosed lossy encoding do not permit composition to change.
_Avoid_: Best effort, similar output, high quality

**Proof Preview**:
The decoded final Raster Export artifact shown when an otherwise valid route lacks current WYSIWYG certification; accepting or downloading it reuses those exact bytes rather than starting another render.
_Avoid_: Estimated preview, export mockup, Canonical Preview

**Visual Fidelity**:
The degree to which exported layout, text, color, imagery, and visual effects match the Canonical Preview; it does not mean higher resolution or lower compression.
_Avoid_: Image quality, DPI, file size

**Output Scale**:
The pixel-density multiplier used to rasterize a Page without changing its composition, Page Format, or promised Visual Fidelity.
_Avoid_: Zoom, Page Format, high-fidelity mode

**Raster Export**:
An image output whose primary promise is Visual Fidelity to the Canonical Preview.
_Avoid_: Screenshot, download

**Local Export**:
A Raster Export completed entirely on the user's device, promising privacy, offline availability, low latency, and the WYSIWYG Contract whenever the Local Adapter is declared eligible.
_Avoid_: Fast export, offline screenshot

**Local SVG Adapter**:
The owned Local Adapter that serializes an inert Canonical Render Root, scoped Style Pack, and resolved Resources into Blob-backed SVG foreign-object input, using Canvas or OffscreenCanvas only for rasterization and encoding.
_Avoid_: html2canvas, page screenshot, global DOM clone, Canva editor

**High-Fidelity Export**:
A Raster Export produced by a certified Renderer Revision, promising the WYSIWYG Contract within that revision for supported content and requiring explicit authorization when Document content or Assets leave the device.
_Avoid_: Cloud export, server screenshot

**Renderer Revision**:
The auditable identity of a High-Fidelity rendering environment, combining the renderer engine, Template, Canonical Font, CSS capability, provider adapter, and observed browser versions that passed the export conformance suite.
_Avoid_: App version, browser latest, template version

**High-Fidelity Adapter**:
The provider-neutral internal boundary through which the Export Engine requests certified remote rendering, allowing a managed browser service or pinned container to implement the same contract.
_Avoid_: Cloudflare integration, export endpoint, rasterizer choice

**Export Service**:
The optional remote service that authorizes and orchestrates High-Fidelity Export without owning Drafts, Projects, history, or unrelated Assets.
_Avoid_: Cloud sync, project backend, account workspace

**Remote Export Authorization**:
The user's explicit permission to send one minimal Export Snapshot and its referenced Render Sources to an Export Service under a stated retention policy; authorization is distinct from account authentication.
_Avoid_: Login, privacy policy acceptance, project sync

**Export Receipt**:
A content-free user-facing record of what categories and counts were transferred for a High-Fidelity Export, which Renderer Revision handled them, and when remote inputs and outputs were deleted.
_Avoid_: Export log, analytics event, invoice

**Semantic Slice**:
A partition of a Continuous Page Raster Export that prefers meaningful Block and heading boundaries over equal pixel heights. It is an output artifact, not an editable Page.
_Avoid_: Equal slice, crop, page

**Export Bundle**:
An ordered ZIP output used when an export contains multiple Pages or Semantic Slices, with stable filenames that preserve their sequence.
_Avoid_: OneIMG Package, backup, multiple downloads

**Export Snapshot**:
An immutable capture of exactly the Document content, referenced Render Sources and Asset metadata, presentation versions, and output intent used by one export, unaffected by later editing.
_Avoid_: Draft, OneIMG Package, autosave

**Export Plan**:
The pre-execution decision describing an Export Snapshot's route, outputs, required authorization, compatibility findings, expected partitions, and cache reuse.
_Avoid_: Export settings, progress state, server request

**Export Job**:
One cancellable execution of an Export Plan with observable stages, findings, terminal result, and stable failure information.
_Avoid_: Download, loading spinner, background save

**Segmented Render**:
A safety strategy that renders an oversized Page in meaningful ordered regions before any unsafe monolithic bitmap is allocated, while preserving continuous presentation.
_Avoid_: Semantic Slice, equal chunking, low-resolution export

**Platform HTML Export**:
Editable HTML adapted to a target publishing platform's constraints, preserving content while allowing documented visual degradation.
_Avoid_: Raster export, lossless HTML

**Faithful PDF**:
A Page-based PDF assembled from canonical Page raster artifacts so its visible composition matches Canonical Preview without claiming selectable text, semantic accessibility, ATS compatibility, or professional print production.
_Avoid_: Semantic PDF, OneIMG Package, print source, Raster Export bundle

**Export Preflight**:
A pre-export assessment that reports missing Scene suggestions and technical rendering problems, blocking export only when no valid output can be produced.
_Avoid_: Required-field validation, approval, export dialog

**Preflight Finding**:
An actionable result of Export Preflight classified as a Blocking Error, Quality Warning, or Content Suggestion according to whether valid output is impossible, visually at risk, or merely incomplete for the Active Scene.
_Avoid_: Form error, required field, generic alert
