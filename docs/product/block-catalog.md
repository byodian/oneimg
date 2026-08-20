# OneIMG Block Catalog

The Block Catalog is the shared semantic vocabulary from which every Scene is composed. It keeps the number of concepts a user must learn small while allowing Templates to produce substantially different visual results from the same content.

## Initial catalog

| Block | Intended content | Important constraint |
| --- | --- | --- |
| Section | A titled group of related content | May contain leaf Blocks; cannot contain another Section |
| RichText | Headings, paragraphs, lists, quotations, and links | One Block may hold several related text nodes and may be split or merged |
| MediaGroup | One to nine ordered Media Items with Captions, Alternative Text, and reusable framing intent | Two to nine items may use a constrained Media Arrangement; larger sets flow across Pages or use multiple Blocks |
| Identity | A person or organization with an avatar or logo, name, subtitle, and contact information | Represents one identity rather than a freeform header composition |
| KeyValue | Labeled facts such as time, place, price, duration, or contact details | Preserves label-value meaning independently of visual columns |
| Timeline | Ordered events such as itinerary stops, work history, or education | Entry order is content; visual line and markers belong to the Template |
| Checklist | Preparation items, materials, skills, or reminders | Supports meaningful item state without becoming a task-management workflow |
| Callout | A highlighted tip, warning, conclusion, or important notice | Semantic tone is content; colors and decoration belong to Theme and Template |
| DataTable | Structured comparisons, budgets, schedules, or parameters | Must remain readable in narrow and paged output formats |
| TagList | Skills, destinations, categories, or keywords | Tags are semantic labels, not manually placed stickers |
| QRCode | Encoded text or URL with an optional label | Generates a visual code but preserves the encoded value as content |

Spacer, Divider, Columns, Background, Button, and decorative shapes are not Blocks. They are Template presentation rules or are omitted because they have no stable content meaning.

## Document structure

A Page owns an ordered list of Blocks. Section is the only container Block and may own leaf Blocks, but never another Section. Repeating entries inside Timeline, Checklist, DataTable, TagList, KeyValue, and MediaGroup are values owned by that Block rather than nested Blocks.

This deliberately prevents arbitrary recursive trees and layout containers from turning Guided Layout into a general-purpose design editor.

## Content and presentation

Blocks store semantic content and only the user intent that changes its meaning or necessary treatment, such as a Callout tone, Media Item Focal Point, checklist state, or item order. Coordinates, widths, margins, fonts, colors, columns, borders, and decorative effects belong to Templates and Themes.

Curated presentation choices may be exposed when they remain safe across Templates. A Media Arrangement, for example, expresses Auto, Featured, Balanced, Sequence, or Margin Album intent while the active Template computes concrete geometry. It does not become arbitrary per-Block CSS, coordinates, or layers.

Repeating Blocks have fixed scene-neutral entry structures. A Scene may relabel a field for its audience—for example, presenting the same Timeline time field as “在职时间” or “出发时间”—but cannot add private fields. Unusual details remain expressible through Rich Text or KeyValue content.

## Scenes

Scenes do not own private Block types. A Scene declares advisory Slots and a Scene Binding maps those Slots to Block identifiers so that prompts, checks, Smart Paste, and transformations can understand the document without changing the common content model. A Document has one Active Scene; a Slot may map zero or more ordered Blocks, a Block may fulfill at most one Slot, and unbound Blocks remain legal.

Changing Scene creates a Conversion Draft, previews the new Slot mapping, preserves the source, and keeps any unmatched Blocks as Unmapped Content.

## Rich Text granularity

A RichText Block may contain multiple related paragraphs, headings, lists, quotations, and links. Smart Paste should normally use major headings to create Sections and place related text in RichText Blocks. Users may split or merge RichText Blocks when they need different composition or slicing behavior.

Paragraph-per-Block editing is too noisy, while one RichText Block for an entire Document gives Templates and semantic slicing too little structure.

## Bounded Page overflow

When content exceeds a Bounded Page, Guided Layout flows it into another Page while honoring keep-together rules where possible. A user may insert an explicit page break. A one-page target such as a resume is an advisory goal: OneIMG may suggest concise content or a denser Template, but must not silently clip content or shrink it below the supported readability threshold.

## Editing model

The rendered Document is the primary editing surface. Users edit content in place, while a structure panel handles insertion, ordering, and grouping and a property panel exposes only meaningful settings for the selected Block. Editing controls are excluded from the Canonical Preview and every export.

Only one Block is selected at a time in the initial editor. Repeating values inside a Block, including Media Items, may have their own nested editing state without becoming selected Blocks or enabling general multi-selection. The detailed interaction and Media Group contract is recorded in [Block Editing and Media Groups](./block-editing-and-media-groups.md).

## Catalog module

The Block Catalog forms one deep module whose interface resolves a Block kind and version into the behavior needed to create, normalize, migrate, validate, edit, and render it. Callers should not duplicate type switches or scene-specific rendering logic.

User Templates may arrange only supported Block kinds. If a OneIMG Package contains an unsupported kind or version, the catalog returns an Unknown Block representation that preserves the original data for round trips and makes the unsupported state visible instead of discarding content.
