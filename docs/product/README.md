# OneIMG Product and Architecture Specification

Status: **Accepted design through round R29**

OneIMG helps people without design expertise turn text and images into polished practical visual documents. The design starts immediately in an editable Draft, uses Guided Layout rather than a Canva-style freeform artboard, preserves work locally, and treats preview-to-export equality as a release contract.

## Product foundation

- [Product Principles](../product-principles.md)
- [Domain Context and Ubiquitous Language](../../CONTEXT.md)
- [First-Run Experience](./first-run-experience.md)
- [Design Validation Register](./design-validation-register.md)
- [ADR Index](../adr/README.md)

## Content, editing, and persistence

- [Block Catalog](./block-catalog.md)
- [Block Editing and Media Groups](./block-editing-and-media-groups.md)
- [Editing Transactions and Accessibility](./editing-transactions-and-accessibility.md)
- [Document Core and Local Persistence](./document-core-and-local-persistence.md)
- [Document Core and Local Repository implementation slice](./document-core-persistence-spike.md)
- [Asset Pipeline](./asset-pipeline.md)
- [Offline and Local Data Boundaries](./offline-and-local-data-boundaries.md)
- [OneIMG Package](./oneimg-package.md)
- [Migration and Legacy Import](./migration-and-legacy-import.md)

## Rendering, templates, and output

- [Template and Output Foundations](./template-and-output-foundations.md)
- [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md)
- [WYSIWYG Contract](./wysiwyg-contract.md)
- [Export Engine](./export-engine.md)
- [Practical Scenes and Output](./practical-scenes-and-output.md)

## Scenes and guidance

- [Scene Contracts](./scene-contracts.md)
- [Initial Scenes](./scenes.md)
- [Scene Template Families](./scene-template-families.md)
- [Smart Paste, Scene Guidance, and Export Preflight](./smart-paste-and-preflight.md)
- [Scene Smart Paste Rules](./scene-smart-paste-rules.md)
- [AI Assist](./ai-assist.md)

## Trust and delivery

- [Trust, Localization, Accessibility, and Security](./trust-localization-accessibility-and-security.md)
- [Quality, Performance, and Release Gates](./quality-performance-and-release-gates.md)
- [Architecture Migration and Implementation Roadmap](./implementation-roadmap.md)

## Reading order for implementation

1. Product Principles and `CONTEXT.md`
2. Document Core, Block Catalog, Editing, Asset Pipeline, and Local Repository contracts
3. Renderer, WYSIWYG, Template Runtime, and Export Engine contracts
4. One complete vertical Scene slice and its fixtures
5. Quality gates and implementation roadmap before switching any default route

When an implementation convenience conflicts with these contracts, the design is changed explicitly through the affected validation identifiers and an ADR; the code does not silently redefine the product.
