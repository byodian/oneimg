# Block Editing and Media Groups

OneIMG edits a rendered visual Document without exposing the mechanics of a general design tool. The interaction model makes semantic content easy to change while keeping layout decisions constrained, reversible, and compatible with the WYSIWYG Contract.

## Selection and contextual controls

The initial editor selects one Block at a time and does not offer general Block multi-selection. A single click inside Rich Text enters text editing; a click on another Block selects it. Repeating entries or Media Items may enter a nested editing state inside the selected Block. Escape leaves the nested state first and then clears Block selection.

A selected Block shows a light contextual toolbar containing a drag handle, its user-facing type, Duplicate, and More. It does not permanently cover the composition. Rich Text selections use a separate compact text-formatting bubble. Detailed semantic properties live in the contextual inspector rather than expanding the floating toolbar into a design console.

Editor chrome is outside the Canonical Render Root or rendered as a non-layout-affecting overlay. Selecting, hovering, or editing a Block must not move content or alter the Reference Viewport.

On mobile, ordinary vertical gestures belong to Document scrolling. A tap edits Rich Text directly and selects other Blocks or Media Items. Reordering starts only from a dedicated handle, while image pan and pinch become active only inside an explicit image-adjustment state. This prevents the same gesture from ambiguously scrolling, sorting, and cropping.

## Insertion, splitting, and ordering

A `+` affordance between Blocks and at the end of a container opens the same compact, task-language insertion menu. Typing `/` in an empty Rich Text position invokes that menu from the keyboard. The menu creates real content only after the user chooses or begins entering it; OneIMG does not persist empty placeholder Blocks.

Blocks reorder only from the dedicated drag handle and use explicit landing indicators. Reordering may cross Pages while preserving Page limits and the rule that Section owns only one level of leaf Blocks. Equivalent keyboard actions move a selected Block before, after, into, or out of a valid destination without requiring drag.

Rich Text uses medium granularity: a Block may hold several related paragraphs, headings, lists, quotations, and links. Enter creates a paragraph or the appropriate semantic sibling inside the Block; Cmd/Ctrl+Enter creates a new Block. Backspace at an empty start may merge with the preceding compatible Rich Text Block. Explicit Split and Merge actions cover cases where composition or Semantic Slice behavior needs a new boundary. Formatting stores semantic headings, lists, links, quotations, emphasis, and strong emphasis rather than arbitrary HTML or CSS.

## Common operations

Duplicate creates a new Block and new repeating-entry identities while reusing referenced Asset bytes. Ordinary Block or entry deletion happens immediately and is recoverable through persistent history. Confirmation is reserved for a larger scope whose impact is harder to infer, such as clearing an entire Media Group or removing multiple Pages.

Deleting the last Media Item removes its Media Group instead of preserving an unusable empty Block. Type changes and other transformations are offered only when they are lossless or explicitly reversible; content is never discarded to make a destination shape fit.

## Media Group model

A Media Group owns:

- one to nine ordered Media Items;
- an optional visible group Caption;
- one Media Arrangement: Auto, Featured, Balanced, Sequence, or Margin Album; and
- optional framing orientation intent when the Scene and Template support it.

Each Media Item has its own stable identity and owns:

- an `assetId` reference;
- an optional visible Caption;
- optional Alternative Text;
- normalized Focal Point coordinates;
- zoom intent;
- `cover` or `contain` fit;
- rotation correction in 90-degree increments; and
- optional Featured state, with at most one Featured Media Item in a group.

The model does not store arbitrary coordinates, layer order, free rotation, raw CSS, stickers, filters, or a Template-specific crop rectangle. Two Media Items may reference the same Asset bytes while retaining independent Captions, Alternative Text, focal choices, and framing intent.

## Media Arrangements

Media Arrangements are user intentions rather than geometry presets:

- Auto asks the active Template to choose a deterministic safe composition from count, aspect ratios, and declared Featured state.
- Featured gives one declared Media Item primary visual emphasis while retaining source order.
- Balanced gives the set similar visual weight without implying an exact grid.
- Sequence makes reading order and progression visually explicit.
- Margin Album reserves a deliberate annotation relationship between imagery and contextual text.

The interface uses these names instead of `grid-2`, masonry, or other implementation language. A desktop contextual inspector or mobile bottom sheet initially shows no more than three reasoned visual recommendations using the user's real media, with access to all compatible choices. Auto discloses its current resolution, such as “自动 · 突出主图”. A Template maps each arrangement to tested geometry for the current Page Format; users never manipulate that geometry directly.

Browsing arrangements is a Transient Edit. Applying one creates a single Edit Transaction; canceling restores the committed state. While an unapplied arrangement is visible, the recommended action reads “应用后导出” and cannot snapshot a different composition.

## Social collage and share sets

Social Smart Collage exposes two outcomes:

- “拼成一张” composes one to nine Media Items on one Bounded Page.
- “成组分享” creates a Social Share Set of same-format ordered Pages.

Adding more than nine images creates additional ordered Pages automatically. Users may move a Media Item between Pages or choose “从这里分页” to establish an intentional boundary. An ordered ZIP preserves Page order, and each Page remains available for individual copy or download.

The initial release supports multi-file add and group-level actions without introducing general multi-selection. Individual Media Items delete and reorder directly; “清空本组” confirms its larger scope. Desktop may drag across Pages, while mobile primarily uses “移到上一页”, “移到下一页”, “移动到第 N 页”, and “从这里分页”; short mobile drags reorder only within the current Page.

Import order is semantic and never changes silently. The first imported Media Item is Featured by default without being moved, and the user may assign that role elsewhere. Deterministic checks may suggest an arrangement from image count, aspect ratios, or resolution, but they do not silently reorder content, run face recognition, or invoke AI.

## Crop and image treatment

Cropping is direct and non-destructive on the Canonical Preview. Entering “调整图片” begins a Transient Edit from a fixed baseline. Drag and wheel on desktop or pan and pinch on mobile update the visible canonical parameters; “完成” commits the whole gesture sequence as one Edit Transaction, while “取消” restores the exact baseline. Intermediate gesture events do not enter history or autosave.

OneIMG stores Focal Point, zoom intent, and fit so a different Template or Page Format can compute a safe crop from the Render Source. The available treatment actions are Complete, Cancel, Reset, Replace, Delete, set Featured, switch Cover/Contain, and correct rotation in 90-degree increments.

Filters, retouching, perspective correction, decorative masks without Template support, and destructive pixel edits are outside the product boundary. Replace preserves the Media Item's semantic position and text unless the user explicitly resets them.

## Captions and accessibility text

Caption is visible authored context; Alternative Text is a non-visual semantic description. A filename is neither and is never promoted to visible content automatically. Missing Alternative Text does not block Raster Export, while an HTML or other semantic export may offer a non-blocking accessibility suggestion.

## Input compatibility and privacy

JPEG, PNG, and WebP are required image inputs. AVIF is available only after a local capability check. HEIC and HEIF require an isolated local conversion Adapter before Social Smart Collage reaches general availability. Animated GIF uses its first frame only and discloses that treatment. SVG is not accepted as an ordinary photo unless it is safely sanitized or rasterized first.

Asset Originals remain local by default. Raster Export strips EXIF and GPS metadata from its output. Asset storage may deduplicate identical bytes, but each Media Item remains semantically independent. An unavailable or corrupt source becomes an Unresolved Asset placeholder with recovery actions and is never silently dropped from the Document.

The shared transaction, repeating-content, keyboard, and focus rules are recorded in [Editing Transactions and Accessibility](./editing-transactions-and-accessibility.md). Media ingestion, normalization, progressive readiness, and memory behavior are recorded in [Asset Pipeline](./asset-pipeline.md).

## Explicit boundary

OneIMG is a guided visual-document composer for people who do not design professionally. Media editing exists only to help their content fit a tested design faithfully. Arbitrary placement, layers, unconstrained shape tools, free collage, and general photo editing would weaken that promise and are intentionally excluded.
