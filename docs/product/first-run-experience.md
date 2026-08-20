# OneIMG First-Run Experience

OneIMG earns attention by turning the user's own content into a polished visual result immediately. It opens in an editable Document, not a dashboard, template catalog, marketing page, or Project-creation flow.

## Opening behavior

When a Meaningful Draft exists, OneIMG restores the most recently edited one directly. Otherwise it creates or restores the single Untouched Draft and focuses its Document editing surface. IndexedDB restoration must not require a full-screen gate; the editor shell becomes interactive as soon as it can safely accept input.

Projects, Recents, import, Help, GitHub, sponsorship, and storage management remain available through the Document or application menu but do not precede typing, pasting, adding images, or Local Export.

## Untouched and Meaningful Drafts

An Untouched Draft has no user-authored non-whitespace content and no usable Asset. It may remember a selected Scene, Theme, or other non-content starter preference across refreshes but never appears in Recents. OneIMG keeps only one such starter and reuses or replaces it instead of accumulating empty documents.

A Draft becomes Meaningful when the user enters non-whitespace content or adds a usable Asset. It then enters Recents and the normal autosave, history, duplication, deletion, and Project organization lifecycle. Selecting a Scene, Template, Theme, or Page Format by itself does not make a Draft Meaningful.

Document Name initially follows the first suitable Visible Title. Explicitly renaming the Document breaks that link. Creating another Draft is immediate and never asks for a name or requires the current Draft to be saved first.

## Empty editing surface

The empty state occupies the same Document surface that will contain the result. It presents non-exported guidance equivalent to:

```text
Paste text, start typing, or drop images.
OneIMG will organize the structure and compose the design.
```

The ordinary default is General Long Image and needs no selection. Secondary shortcuts expose Social Smart Collage, Internal Notice, Travel Guide, and Resume using task language such as “拼图片”, “发通知”, “做攻略”, and “写简历”. Choosing one applies its guidance and safe presentation defaults immediately without opening a setup wizard.

“Open .oneimg” and “Try an example” are secondary text actions. The surface states that content remains on this device by default. Prompts, shortcuts, privacy text, drop targets, and abstract empty-state decoration are editor chrome: they create no Blocks, enter no history, and never render or export.

## First content action

Typing creates or edits Rich Text in place without a form submission. First paste replaces the Untouched Draft prompt and runs deterministic local Smart Paste. Plain text remains in General Long Image unless the user accepts a Scene Suggestion.

One pasted or dropped image creates a single-item Media Group. Two to nine images receive an Auto Media Arrangement without silently changing the Active Scene; explicitly using “拼图片” selects Social Smart Collage. The first imported image becomes Featured by default but is not moved. More than nine images create a Social Share Set of ordered Pages containing at most nine Media Items each. Mixed text and images preserve their meaningful source order instead of collecting all media at the end.

Multi-image ingestion establishes fixed-geometry placeholders quickly and then resolves local Asset Derivatives without changing order, crop, or layout. A partial failure retains an Unresolved Asset in its source position and summarizes the result instead of failing the whole batch or silently skipping content.

After the first useful composition, OneIMG may show one content-free acknowledgement such as “已整理为 5 个内容块”, at most two reasoned Scene Suggestions, and no more than three recommended Template Families. None is modal and none changes content or presentation without acceptance.

## Direct result editing

The rendered Document is the primary editor and implements the WYSIWYG Contract. Text edits in place; media supports replacement, crop, focal point, and allowed presentation adjustments on the result itself. Block insertion handles and controls appear only near the selection. Each completed user intention enters history and autosave as one Edit Transaction without a save or submit button; intermediate gestures and temporary previews do not.

On desktop, the Document remains central while a Document or structure navigator on the left and a contextual Block or Style inspector on the right are collapsed by default; at most one is open when space is constrained. Clean Preview only hides editor chrome around the same Canonical Render Root. On mobile, the Document is the full-screen working surface and add, style, structure, and export controls use contextual bottom sheets rather than separate Editor, Preview, and Settings tabs. Ordinary swipes scroll, reordering begins from a dedicated handle, and image pan or pinch is reserved for explicit image adjustment.

## Application shell

The primary header contains the Logo and Document Name, Recent access, undo and redo, Active Scene and autosave state, Style, Clean Preview, and the recommended export action. Template, Theme, Page Format, and Density live together in Style. Help, feedback, source code, sponsorship, import, OneIMG Package export, and storage management live in the application menu. Unavailable future services are not displayed as disabled primary choices.

## Presentation suggestions

A safe default Template and Theme already apply when the Draft opens, but the empty surface does not show a template marketplace. Once content is Meaningful, OneIMG may present at most three recommendations with content-based reasons. Hover or temporary preview does not enter history; applying a choice does. OneIMG never silently replaces a user's chosen Template, Theme, Page Format, or Density.

While a temporary Template or Theme preview is visible, the recommended export action becomes “应用后导出”. Export never uses the committed presentation while the screen is showing an uncommitted one.

## Files, deletion, and storage safety

Opening a `.oneimg` package parses and migrates it into a new Imported Draft or optional Project before changing visible state. Import failure leaves the active work untouched. Any Draft can create a single-Document OneIMG Package without first becoming a Project. Routine persistence remains autosave; package creation is an explicit portability action rather than ordinary “Save”.

Opening a Package never creates a persistent live-file binding or writes back to its source. “保存 .oneimg 副本” creates an explicit immutable snapshot of a committed revision. A single-Document Package opens directly as an Imported Draft; a multi-Document Package shows a lightweight selection summary and defaults to importing all selected Documents into a new Project.

When the latest Meaningful Draft cannot be restored safely, OneIMG preserves its stored records, opens a temporary Untouched Draft, and offers a visible recovery entry. It never saves the empty fallback over the damaged revision. A newer or partially corrupt package may open as a Recovery Draft instead of pretending migration succeeded.

Deleted Documents enter a local Trash for seven days before orphaned Assets become eligible for garbage collection. Clearing all local data exists only in Storage settings, states the exact scope, and requires strong confirmation; ordinary Document operations never call a broad browser-storage clear.

OneIMG does not ask for a portable backup during first use. After a Meaningful Draft contains material authored content and local Assets without a recent package snapshot, it may show one non-modal “保存可携带副本” suggestion. Dismissing it never limits editing; it returns only after substantial new work or a long interval and never implies that local autosave is an external backup.

## Recommended export action

The primary split button names the planned result, such as “导出 PNG” or “导出 ZIP”. Its main segment starts the compatible recommended Export Plan and downloads the result; its menu exposes formats, Output Scale, slicing, copy, and advanced options. The button remembers the last successful choice only while it remains compatible. Progress is non-modal, and only Remote Export Authorization may interrupt the flow.

## Guidance and examples

OneIMG does not open a product tour, template wizard, or instructional video automatically. It may expose at most three progressive contextual hints, retiring each once the user demonstrates the behavior. A complete example always creates a clearly named example Draft separate from the user's work. Full help and video remain explicitly invoked from the Help menu.

## Attention and acceptance targets

- The cold-start editor accepts input within 1.5 seconds on the reference device.
- A typical 2,000-character paste responds within 100 milliseconds and reaches an initial composed result within 700 milliseconds.
- Five local images display layout placeholders within 300 milliseconds and a usable preview within 1.5 seconds.
- The first automatic composition uses only a subtle transition of roughly 180 milliseconds.
- At least eight of ten first-time usability participants can create and export a usable result within 60 seconds without reading instructions.
- Median time from opening OneIMG to seeing a satisfactory composition is at most 15 seconds.
- No mandatory dialog appears before the first content action.

The visual direction is a quiet editorial studio: a restrained neutral workspace, a clear paper-like Document, strong typography, deliberate whitespace, and one brand accent. The interface avoids a template-marketplace card wall, ornamental dashboard, large gradient hero, and persistent floating controls. Attention comes from the visible transformation of the user's content.
