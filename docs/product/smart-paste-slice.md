# Smart Paste semantic Blocks

This note records Slice 07 for Issue #33. It extends the feature-flagged General Long Image Studio with a local, deterministic clipboard adapter while keeping the existing default entry unchanged.

## Delivered contract

- Clipboard HTML takes precedence over plain text and is interpreted through a semantic allowlist. Markdown and plain text are parsed locally when no usable HTML is available.
- Headings, paragraphs, ordered and unordered lists, quotations, inline and fenced code, emphasis, and safe links enter one or more RichText Blocks in source order.
- Semantic HTML tables, Markdown tables, and tab-separated text become DataTable Blocks with stable column and row identities. Explicit `- [ ]` / `- [x]` syntax and HTML checkbox lists become Checklist Blocks.
- Scripts, event handlers, classes, inline styles, fixed dimensions, external fonts, unsafe links, and unsupported executable or decorative elements never enter the Document. Unknown structure falls back to visible RichText text.
- The first paste into an Untouched Draft inserts the parsed batch as one semantic transaction. Later pastes insert one batch after the active Block. Undo and redo restore the whole paste as one history step and durable commit.
- No clipboard path invokes AI, fetches a network resource, or retains source HTML; the Canonical Renderer renders only the validated semantic Document model.

## Deliberate scope

This slice does not add media ingestion, Scene Suggestions, automatic Section conversion, or a general rich-text editing adapter. Pasted media remains for the later Asset Pipeline slice, while headings and other rich nodes remain editable through the existing text surface. DataTable and Checklist editing controls are also deferred to the shared repeating-entry work.

## Verification

`tests/scenarios/studio.spec.ts` covers mixed semantic HTML, Markdown, plain text, tables, explicit checklists, unsafe presentation and links, source order, later insertion, one-step undo/redo, and reload restoration through the production Studio and Canonical Renderer.
