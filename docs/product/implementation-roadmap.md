# Architecture Migration and Implementation Roadmap

This roadmap closes design rounds R27 through R29. It authorizes a risk-first incremental implementation after the design package is verified; it does not require a big-bang rewrite or an immediate replacement of the current entry page.

## Migration strategy

OneIMG uses a strangler migration inside the existing application. New behavior enters through deep modules and end-to-end vertical slices. The existing editor and export remain available behind a temporary route or feature flag until the replacement satisfies data, fidelity, performance, and rollback gates.

The legacy `longpic` application remains a read-only behavior reference. Its useful interaction ideas, sample content, layouts, and export cases become specifications and fixtures. Its single-file architecture, global mutable state, full-document snapshot history, global stylesheet scraping, Base64-heavy persistence, and export implementation are not copied into the new core.

## Initial module map

The frontend begins as one deployable application with explicit internal module boundaries:

```text
app-shell
  -> scenes
  -> editing
  -> export
  -> package

scenes -> document-core
editing -> document-core
repository -> document-core
assets -> document-core resource references
templates -> block-catalog + presentation schema
renderer -> document-core + block-catalog + templates + assets
export -> renderer + assets
package -> document-core + assets + presentation registry
```

Recommended source boundaries are `document-core`, `editing`, `repository`, `assets`, `renderer`, `templates`, `scenes`, `export`, `package`, and `app-shell`. React, Zustand, Tiptap, IndexedDB, Canvas, workers, and cloud services are Adapters behind these boundaries rather than content authorities.

The application does not become a multi-package monorepo merely to mirror this diagram. A separate package is justified when there is an actual build or deployment boundary, particularly the shared Renderer Bundle and remote Export Service.

## Shared renderer artifact

Local and remote rendering consume the same versioned Document and presentation schema, Template Runtime, Style Pack, Canonical Font pack, fixtures, and Renderer Bundle. A remote Job identifies the exact Renderer Revision and cannot quietly use a different Template or font artifact.

The existing Web application deployment remains independent of the Export Service. The App Worker owns the product UI and authorization entry point; the provider-neutral service owns optional managed rendering and its ephemeral infrastructure.

## Existing technology adapters

- Tiptap becomes the Rich Text editing Adapter for one RichText Block and does not own Document history or serialized truth.
- Zustand stores interface and Render Session state only; authored content enters Document Core through semantic commands.
- IndexedDB is accessed through the single Local Repository and never directly by components.
- `html2canvas` remains only on the legacy export path until the Local SVG Adapter passes certification, then is removed after the declared transition window.
- Canvas and OffscreenCanvas are permitted internal rasterization and encoding mechanisms; the product boundary rejects a Canva-style freeform design surface, not browser graphics APIs.

Critical dependencies such as streaming ZIP, image decoding, encoding, PDF assembly, and remote browser control are selected through maintained-candidate review, security review, realistic benchmarks, and an ADR. The architecture does not bind itself to an unmeasured library.

## Legacy data rollout

The legacy `ContentDB` migration copies records into the new Repository, validates the complete destination, writes a checkpoint, and only then switches the active pointer. The old store remains a read-only recovery source during the support window. Failure returns to the prior experience and provides an import or OneIMG Package recovery path; it never calls broad storage clearing.

Feature flags isolate schema migration, new Renderer, Local Adapter, Package import, each Scene, and High-Fidelity Adapter. Rollback disables a consumer without reinterpreting already committed Document Revisions.

## Phase 0 — risk spikes

Build isolated, discardable prototypes for:

1. Canonical Render Root plus owned Local SVG Adapter across representative modern CSS, Chinese and English fonts, images, QR, pagination, and sRGB encoding;
2. Resource Resolver memory ownership with twenty photos, Blob URLs, workers, cancellation, and cleanup;
3. provider-neutral High-Fidelity Adapter using the same Renderer Bundle and ephemeral Snapshot; and
4. streaming OneIMG Package creation and hostile import validation.

The Renderer/Export spike is first. Its outcome is a benchmark and conformance report plus a refined interface; prototype code is promoted only when it already satisfies production boundaries.

## Phase 1 — local vertical slice

Deliver a no-login, no-Project-gate path that:

- opens or restores an editable Meaningful Draft;
- models a General Long Image through Document Core and the initial Block subset;
- persists through the new Local Repository;
- edits the actual Canonical Render Root;
- applies one complete Local Certified Template, Theme, Density, and Page Format;
- plans without rendering when the export panel opens; and
- exports a WYSIWYG PNG locally through the owned Adapter.

The current root experience is not replaced until migration, recovery, accessibility, fidelity, and performance gates pass.

## Phase 2 — media and portability

Add Asset Originals and Render Sources, MediaGroup, one through nine Media Items, focal/crop transactions, Smart Collage, Social Share Set, ordered Export Bundle, OneIMG Package, and legacy import. This phase proves that the common model serves text and media without freeform layers.

## Phase 3 — practical documents

Add Internal Notice, Travel Guide, and Resume in that order, then QR Code and Faithful PDF where not already exercised. Each Scene uses common Blocks, starters, Template Families, Style Presets, suggestions, and preflight rather than a private editor.

## Phase 4 — managed high fidelity

Release High-Fidelity Export as a regional Beta after Local Export is stable. It adds explicit authorization, one anonymous trial, lightweight account quota, Workflow and per-Job coordination, private ephemeral objects, Proof Preview recovery, receipts, cancellation, and cleanup. It cannot become a dependency of the local core.

## MVP, default switch, and general availability

MVP requires anonymous offline-capable creation, General Long Image, Social Smart Collage, Local Repository, WYSIWYG local PNG, safe migration, and no forced Project creation. Managed export is not an MVP dependency.

The new experience becomes the default only after:

- old data migrates without loss and has a verified rollback path;
- default Templates pass Local conformance;
- General Long Image and Smart Collage complete target-user usability tasks;
- export performance, cancellation, memory, and cleanup meet supported-device budgets;
- OneIMG Package provides a portable recovery path; and
- critical accessibility, privacy, and security gates pass.

General availability adds the complete initial Scene set, Faithful PDF, certified remote recovery for unsupported local capabilities, regional performance evidence, and an operational rollback switch. Rollout proceeds through internal use, limited opt-in Beta, and gradual default activation rather than one irreversible launch.

## Success measures

Product success is measured by time to first meaningful content, time to first valid artifact, successful export rate, preview-to-output conformance, recovery success, useful Template adoption without manual spacing repair, and completion by people without design expertise. Project count, arbitrary object count, and time spent adjusting coordinates are not success metrics.

Telemetry remains content-free and cannot be used to weaken the privacy contract.

## Required design and delivery artifacts

Before the default switch, maintain:

- the consolidated product and architecture specifications;
- Document, Block, Template, Style Preset, Export Snapshot, and OneIMG Package schemas;
- module interfaces and dependency rules;
- ADR index and decision validation register;
- conformance, performance, accessibility, migration, security, and usability plans;
- a renderer/export risk and benchmark report;
- interactive prototypes for first run, direct Block editing, Smart Collage, export planning, Proof Preview, and recovery; and
- a phased implementation backlog with small independently verifiable changes.

## Commit and change discipline

Implementation uses small vertical commits. Schema and migration, core model, renderer, Local Adapter, Template Runtime, Scene behavior, export outputs, and UI migration remain reviewable separately. Existing user changes are preserved. No broad storage clearing, destructive migration, root-page switch, legacy deletion, remote deployment, or source commit is inferred merely from acceptance of this design.

`longpic` stays available until its meaningful behaviors exist as automated fixtures and the new product reaches the accepted comparison threshold. It can then be archived explicitly rather than silently deleted.
