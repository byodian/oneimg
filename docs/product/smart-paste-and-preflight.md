# Smart Paste, Scene Guidance, and Export Preflight

Smart Paste gives immediate structure to clipboard content without requiring a project, network connection, or AI service. Scene guidance helps users improve a practical document without turning creation into a mandatory form.

## Supported input

Smart Paste accepts semantic HTML, Markdown, plain text, files, images, and native OneIMG Blocks. It preserves headings, paragraphs, meaningful line breaks, ordered and unordered lists, emphasis, links, tables, explicit checkboxes, images, and source order when those concepts are present.

External fonts, colors, backgrounds, borders, fixed dimensions, positioning, floats, classes, inline styles, scripts, event handlers, and unsupported decorative markup are removed. Templates and Themes provide the destination presentation.

Smart Paste recovers structure but does not rewrite, summarize, translate, or invent facts. Ambiguous content falls back to Rich Text so that nothing is silently discarded.

## AI Assist

AI Assist is separate from Smart Paste and is never required for core editing. The user must explicitly invoke it, inspect the proposed result, and accept it before the change enters a Draft. If a remote provider receives Document content or Assets, OneIMG obtains authorization specific to that request rather than reusing High-Fidelity Export consent.

AI output enters a Conversion Draft and accepted changes commit as one Edit Transaction. Sensitive Documents cannot use remote AI in the initial product, pasted content cannot invoke AI automatically, and the product cannot invent resume, notice, or travel facts. The complete provider, proposal, quota, and telemetry boundary is recorded in [AI Assist](./ai-assist.md).

## Scene suggestions

Pasted content may produce up to two high-confidence Scene Suggestions with short explanations. OneIMG never switches the Active Scene automatically. Accepting a suggestion creates a Conversion Draft and mapping preview; uncertain content remains in General Long Image.

## Applying a paste

- The first meaningful paste replaces an untouched Starter and is undoable in one step.
- Later pastes insert at the current position and are undoable in one step.
- Rebuilding a whole Document for a Scene creates a Conversion Draft and mapping preview.
- AI-assisted transformations always create a preview before application.

Ordinary deterministic insertion does not open a confirmation dialog.

## Media ingestion

Pasted image bytes enter the local Asset Pipeline and become locally owned Assets rather than remote hotlinks. If clipboard HTML exposes only a remote source that cannot be read, OneIMG creates an Unresolved Asset with a visible recovery action to authorize retrieval or select a replacement. Offline editing, OneIMG Packages, and export must never silently depend on the source website remaining available.

## OCR scope

Automatic OCR is outside the initial merge because export performance and fidelity have higher priority. A future explicit image-to-text import may use local OCR and produce a Conversion Draft; ordinary image paste never replaces an image with extracted text.

## Scene prompts

The editor shows at most three high-value Scene Prompts at once, near the location where their content would be useful. Prompts are progressive, dismissible, non-exported, and never presented as a blocking setup wizard.

## Export preflight

Preflight checks run incrementally so the export action does not start with an avoidable full-document scan. Findings are grouped as:

- **Blocking Error** — no valid output can be produced, such as an empty Document, any referenced Unresolved Asset in the target Pages, or renderer failure.
- **Quality Warning** — output is possible but visually at risk, such as a low-resolution image, overflow risk, font substitution, or an effect outside Local Export capability.
- **Content Suggestion** — a recommended Scene Slot is absent or content appears incomplete for its intended use.

Every Finding navigates to the affected content when possible. Quality Warnings and Content Suggestions never prevent export.

Deterministic mappings and Scene-specific prompts and Findings are recorded in [Scene Smart Paste Rules](./scene-smart-paste-rules.md).
