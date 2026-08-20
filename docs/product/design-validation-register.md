# Design Validation Register

Status: **Accepted**<br>
Accepted on: **2026-08-20**<br>
Scope: **Design rounds R19 through R29, all recommended outcomes, no exceptions**

This register records the user's acceptance of the remaining design tree after rounds R1 through R18 had already been accepted. It is an authorization to treat the decisions as the target design. It is not authorization for destructive migration, production deployment, source commit, deletion of legacy applications, or replacement of the current default route without the gates in the implementation roadmap.

The accepted tree contains 119 decision identifiers. The earlier conversational footer that said 104 was an arithmetic error; the identifiers themselves and their recommendations were complete.

| Round | Accepted identifiers | Decision area | Authoritative specification |
| --- | --- | --- | --- |
| R19 | R19-Q1–R19-Q11 | Renderer ownership, CSS isolation, Style Presets, Local SVG Adapter, Resource Resolver, readiness, lazy export, Page reuse, scale semantics, deterministic templates | [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md) |
| R20 | R20-Q1–R20-Q12 | CSS capability classes, build analysis, runtime probes, Blob resources, sRGB, fonts, fallback, browser matrix, performance | [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md) and [WYSIWYG Contract](./wysiwyg-contract.md) |
| R21 | R21-Q1–R21-Q12 | Template schema, layout vocabulary, trusted composer, Style Presets, branding, fallback, upgrades, recommendations, complexity limits | [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md) |
| R22 | R22-Q1–R22-Q14 | Detailed initial Scenes, QR Code, sensitivity, Scene switching, future Scene admission, delivery order | [Practical Scenes and Output](./practical-scenes-and-output.md) |
| R23 | R23-Q1–R23-Q11 | Faithful PDF, Platform HTML boundary, copy/share behavior, lossy preview, metadata, filename, excluded formats, no watermark | [Practical Scenes and Output](./practical-scenes-and-output.md) |
| R24 | R24-Q1–R24-Q10 | Optional explicit AI, proposal workflow, factual boundaries, provider and quota separation, telemetry, deferred OCR and image generation | [AI Assist](./ai-assist.md) |
| R25 | R25-Q1–R25-Q11 | Locale, CJK and Emoji, accessibility, contrast, sensitivity, telemetry, crash reports, external resources, permissions, threat model | [Trust, Localization, Accessibility, and Security](./trust-localization-accessibility-and-security.md) |
| R26 | R26-Q1–R26-Q11 | Module tests, conformance corpus, browser/device matrix, performance, safety limits, cancellation, migrations, revision rollout, release blockers, usability | [Quality, Performance, and Release Gates](./quality-performance-and-release-gates.md) |
| R27 | R27-Q1–R27-Q12 | Strangler migration, longpic reference role, route coexistence, module map, shared renderer artifact, adapters, data rollout, dependency and deployment boundaries | [Architecture Migration and Implementation Roadmap](./implementation-roadmap.md) |
| R28 | R28-Q1–R28-Q10 | Risk-spike order, vertical slices, Scene sequence, Package and managed export timing, MVP, switch gates, success metrics, rollout | [Architecture Migration and Implementation Roadmap](./implementation-roadmap.md) |
| R29 | R29-Q1–R29-Q5 | Required artifacts, prototypes, implementation start, longpic retirement, commit discipline | [Architecture Migration and Implementation Roadmap](./implementation-roadmap.md) |

## Interpretation

If a future proposal conflicts with an accepted decision, it must identify the affected decision identifiers, explain the reason, update the authoritative specification, and record an ADR when the architectural tradeoff changes. Silence or implementation convenience does not supersede this register.

The next authorized delivery activity is documentation verification followed by the isolated Renderer/Export risk spike described in Phase 0. Switching the production route or migrating user data remains separately gated.
