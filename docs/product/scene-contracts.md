# OneIMG Scene Contracts

Scenes add practical guidance to the common Document model without becoming document types or specialized editors.

## Names and visible content

Project and Document names organize work, support search, and suggest filenames; they are never rendered automatically. A Visible Title is real Block content. Until the user explicitly renames a Document, its name may follow the first suitable Visible Title; after an explicit rename the two remain independent.

## Starters and examples

Selecting a Scene exposes Scene Prompts for its unfulfilled Slots. Prompts are editor guidance rather than empty Blocks, do not enter history as content, and never appear in preview or export. Entering content through a prompt creates the corresponding real Block.

A complete fictional example is an explicit action that creates a clearly labeled example Draft. Scene selection itself never inserts realistic-looking names, employers, dates, addresses, or other data that a user could export accidentally.

## Suggestions and preflight

Scene Slots are recommended or optional rather than mandatory. Missing recommended Slots produce contextual prompts and Export Preflight warnings, but a user may export incomplete content. Export is blocked only when no renderable output can be produced, such as an entirely empty Document, an unavailable required Asset, corrupt content, or a renderer failure.

## Shared Block contracts

Repeating Blocks use stable scene-neutral entry structures. Scenes adapt editor labels and examples but cannot add private fields to Timeline, Checklist, KeyValue, DataTable, TagList, or MediaGroup entries. Details that do not fit remain expressible in Rich Text or an additional KeyValue Block.

## Binding cardinality

A Document has exactly one Active Scene, using General Long Image by default. A Scene Slot maps zero or more ordered Block identifiers, while each Block may fulfill at most one Slot in the Active Scene. Blocks without a Slot binding remain fully editable, renderable, and exportable.

## Scene evolution

A Scene Binding records a Scene identifier and Scene Version. A newer Scene may advertise new or revised guidance but cannot mutate existing Documents. Choosing to upgrade creates a Conversion Draft, shows the proposed Slot mapping and Unmapped Content, and preserves the source Document.

The Slot definitions for the first five use cases are recorded in [Initial Scenes](./scenes.md).

Shared paste, prompt, and export-check behavior is recorded in [Smart Paste, Scene Guidance, and Export Preflight](./smart-paste-and-preflight.md).
