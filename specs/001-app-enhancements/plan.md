# Implementation Plan: OneIMG Application Enhancements

**Branch**: `001-app-enhancements` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-app-enhancements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Comprehensive enhancement of OneIMG text-to-canvas PNG exporter with 11 user stories across 8 categories: (1) Export with progress indicators and WebP/JPEG format support, (2) Visual template editor for non-technical users, (3) Full-text content search and filtering, (4) Advanced editor formatting (colors, fonts, alignment, markdown import), (5) AI-powered content optimization with multi-provider free tier and pay-per-request premium models, (6) Local-first workspace export/import with ZIP-based file format optimization, (7) Platform-specific presets and auto-pagination, (8) Accessibility improvements including dark mode and keyboard navigation, (9) Landing page with testimonials and use cases, (10) Auto-pagination for long-form content, (11) Comprehensive help documentation.

**Technical Approach**: Local-first architecture with browser-based processing (no mandatory cloud dependencies), client-side image optimization using browser-image-compression and html2canvas, IndexedDB for content persistence, optional AI backend proxy for free model routing and pay-per-request billing, ZIP-based .oneimg file format with extracted images for 60-80% size reduction.

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript ES2020+  
**Primary Dependencies**: Next.js 14.2.5, React 18.3, TipTap 2.8 (ProseMirror editor), html2canvas 1.4.1, JSZip 3.10.1, Zustand 5.0 (state management), Zod 3.23 (validation), Tailwind CSS 3.4, shadcn/ui (Radix UI components), Vercel AI SDK (ai package for unified AI provider integration)  
**Storage**: IndexedDB (Dexie.js implied for abstraction), Browser File API for export/import, LocalStorage for preferences  
**Payment**: Stripe (credit card, Apple Pay, Google Pay) + Alipay for AI pay-per-request (guest checkout, no account required)  
**AI Integration**: Vercel AI SDK with provider adapters (@ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/groq, @ai-sdk/huggingface)  
**Testing**: NEEDS CLARIFICATION (Vitest/Jest for unit tests, Playwright/Cypress for E2E tests - no test setup detected in package.json)  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), PWA-capable, Cloudflare Pages deployment  
**Project Type**: Web application (Next.js SSG for landing page + client-side SPA for editor)  
**Performance Goals**: Export 5-image content in <10 seconds, search 50+ items in <5 seconds, UI interactions at 60fps, landing page load <2 seconds  
**Constraints**: Local-first architecture (all processing client-side), offline-capable core features, no mandatory user authentication, file size optimization (60-80% reduction via ZIP), WCAG 2.1 AA accessibility compliance  
**Scale/Scope**: Single-user local workspace, 100+ content items per user, 10+ custom templates, 50+ documentation pages, AI backend handles concurrent requests with rate limiting

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: No constitution file found (`.specify/memory/constitution.md` is template only). No architectural principles or constraints defined for this project.

**Initial Evaluation** (Before Phase 0): ✅ **PASS** - Proceeding with industry best practices for Next.js web applications:
- Component-based architecture (React best practices)
- Separation of concerns (UI/business logic/data)
- Local-first data ownership
- Progressive enhancement
- Accessibility standards (WCAG 2.1 AA)
- Type safety (TypeScript strict mode)

**Violations**: None - no constitution exists to violate.

**Phase 1 Re-evaluation** (After Design Complete): ✅ **PASS**

**Verification**:
- ✅ **Data Model**: Entities well-defined with validation rules, relationships clear, IndexedDB schema aligns with local-first principles
- ✅ **Contracts**: AI backend API uses standard REST patterns, clear error handling, transparent pricing, security considered (CORS, rate limiting)
- ✅ **Architecture**: Local-first core + optional AI backend maintains separation, browser APIs used appropriately, no mandatory cloud dependencies
- ✅ **Security**: CSS whitelist validation prevents XSS, ZIP file validation, API key encryption, no sensitive data logging
- ✅ **Performance**: Target metrics defined (export <10s, search <5s, landing page <2s), optimization strategies documented
- ✅ **Accessibility**: WCAG 2.1 AA compliance planned, keyboard navigation, screen reader support, reduced motion support

**Conclusion**: Design aligns with best practices. No constitution violations. Ready for Phase 2 (task breakdown via `/speckit.tasks`).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Next.js 14 App Router structure (existing + planned additions)

src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx               # Editor workspace (existing)
│   ├── layout.tsx             # Root layout (existing)
│   ├── globals.css            # Global styles (existing)
│   ├── about/                 # About page (existing)
│   ├── blog/                  # Blog pages (existing)
│   ├── sponsor/               # Sponsor page (existing)
│   └── help/                  # NEW: Help documentation pages
│       ├── page.tsx           # Help home with search
│       ├── [slug]/            # Individual help articles
│       └── components/        # Help-specific components
│
├── components/                 # React components
│   ├── editor/                # Editor components (existing + enhancements)
│   │   ├── editor-container.tsx       # Main editor (ENHANCE)
│   │   ├── editor-toolbar.tsx         # NEW: Rich formatting toolbar
│   │   ├── editor-color-picker.tsx    # NEW: Color selection
│   │   ├── editor-font-selector.tsx   # NEW: Font family picker
│   │   └── markdown-importer.tsx      # NEW: Markdown import dialog
│   │
│   ├── header/                # Header components (existing + enhancements)
│   │   ├── export-dialog.tsx          # Export modal (ENHANCE)
│   │   └── export-progress.tsx        # NEW: Progress indicator
│   │
│   ├── preview/               # Preview components (existing)
│   │
│   ├── workspace/             # Workspace components (existing + enhancements)
│   │   ├── content-search.tsx         # NEW: Search and filter UI
│   │   ├── bulk-operations.tsx        # NEW: Bulk action toolbar
│   │   └── pagination-editor.tsx      # NEW: Manual breakpoint adjustment
│   │
│   ├── template/              # NEW: Template editor components
│   │   ├── template-editor.tsx        # Visual template editor
│   │   ├── template-gallery.tsx       # Template selection gallery
│   │   ├── template-import.tsx        # Template import/export
│   │   └── template-preview.tsx       # Real-time preview
│   │
│   ├── ai/                    # NEW: AI feature components
│   │   ├── ai-panel.tsx               # AI suggestions panel
│   │   ├── ai-provider-selector.tsx   # Model selection UI
│   │   ├── ai-cost-estimator.tsx      # Cost preview dialog
│   │   └── ai-settings.tsx            # API key management
│   │
│   ├── landing/               # NEW: Landing page components
│   │   ├── hero.tsx                   # Hero section
│   │   ├── testimonials.tsx           # User testimonials
│   │   ├── use-cases.tsx              # Use case examples
│   │   └── feature-grid.tsx           # Feature highlights
│   │
│   └── ui/                    # shadcn/ui components (existing)
│
├── lib/                        # Utilities and core logic
│   ├── indexed-db.ts          # IndexedDB wrapper (ENHANCE)
│   ├── export/                # NEW: Export logic
│   │   ├── image-exporter.ts          # Image export pipeline
│   │   ├── format-converter.ts        # PNG/JPEG/WebP conversion
│   │   ├── zip-builder.ts             # .oneimg ZIP creation
│   │   └── pagination.ts              # Auto-pagination algorithm
│   │
│   ├── import/                # NEW: Import logic
│   │   ├── markdown-parser.ts         # Markdown to TipTap
│   │   ├── oneimg-importer.ts         # .oneimg file reader
│   │   └── workspace-importer.ts      # Workspace restore
│   │
│   ├── validation/            # NEW: Security and validation
│   │   ├── css-validator.ts           # Whitelist CSS validation
│   │   ├── schema-validator.ts        # Zod schemas
│   │   └── file-validator.ts          # File upload validation
│   │
│   ├── ai/                    # NEW: AI integration (Vercel AI SDK)
│   │   ├── ai-client.ts               # Backend proxy client
│   │   ├── providers.ts               # AI SDK provider configs
│   │   └── prompt-builder.ts          # Prompt templates
│   │
│   ├── search/                # NEW: Search functionality
│   │   ├── full-text-search.ts        # Client-side search engine
│   │   └── search-index.ts            # Search index builder
│   │
│   └── platform/              # NEW: Platform presets
│       ├── presets.ts                 # Platform configurations
│       └── validators.ts              # Platform requirement checks
│
├── store/                      # Zustand state management
│   ├── use-editor-store.ts    # Editor state (existing)
│   ├── use-theme-store.ts     # Theme/template state (existing)
│   ├── use-search-store.ts    # NEW: Search state
│   ├── use-ai-store.ts        # NEW: AI feature state
│   └── use-export-store.ts    # NEW: Export configuration state
│
├── theme/                      # Template definitions
│   ├── index.ts               # Template registry (existing)
│   ├── templates/             # Template implementations (existing)
│   └── validator.ts           # NEW: Template security validator
│
├── types/                      # TypeScript types
│   ├── common.ts              # Shared types (existing)
│   ├── template.ts            # Template types (existing)
│   ├── export.ts              # NEW: Export types
│   ├── ai.ts                  # NEW: AI types
│   └── workspace.ts           # NEW: Workspace types
│
└── hooks/                      # Custom React hooks
    ├── use-platform.ts        # Platform detection (existing)
    ├── use-export.ts          # NEW: Export orchestration
    ├── use-search.ts          # NEW: Search functionality
    └── use-ai.ts              # NEW: AI integration

# Backend (optional AI proxy - separate deployment)
backend/
├── src/
│   ├── routes/
│   │   ├── ai-free.ts         # Free model routing (AI SDK)
│   │   └── ai-paid.ts         # Pay-per-request billing (AI SDK)
│   ├── services/
│   │   ├── ai-providers.ts    # Vercel AI SDK provider configs
│   │   ├── stripe-service.ts  # Stripe payment integration
│   │   └── alipay-service.ts  # Alipay payment integration
│   ├── middleware/
│   │   ├── rate-limiter.ts    # Rate limiting
│   │   └── cost-calculator.ts # Transparent pricing (USD/CNY)
│   └── config/
│       ├── ai.ts              # AI SDK configuration
│       └── payment.ts         # Payment provider configs
└── tests/

# Testing (to be added)
tests/
├── unit/                       # Unit tests
├── integration/                # Integration tests
└── e2e/                        # End-to-end tests

# Public assets
public/
├── images/                     # Existing images
├── help/                       # NEW: Help documentation assets
└── testimonials/               # NEW: Testimonial photos
```

**Structure Decision**: Using Next.js 14 App Router structure with clear separation between features. Landing page and help docs use SSG, editor workspace runs fully client-side. Optional AI backend is separate deployment (Cloudflare Workers or similar serverless). No shared code between frontend/backend except TypeScript types.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - no complexity tracking required.

---

## Phase Summary

### Phase 0: Research ✅ COMPLETE
**Output**: [research.md](research.md)

Resolved 10 technical unknowns:
1. Testing framework: Vitest + React Testing Library + Playwright
2. Image optimization: html2canvas → Canvas API → browser-image-compression
3. File format: ZIP with scene.json + images/ folder
4. Editor extensions: TipTap official + custom font-size/indent
5. Markdown import: Unified.js (remark-prosemirror)
6. Pagination algorithm: Hierarchical breakpoints (headings > paragraphs > sentences)
7. CSS validation: PostCSS whitelist-only approach
8. AI backend: Cloudflare Workers + Stripe instant checkout
9. IndexedDB: Dexie.js + Fuse.js for full-text search
10. Platform presets: Research-based configurations with validation

**Key Decisions**:
- Local-first architecture with optional AI backend
- Multi-provider AI (Groq/HF free + OpenAI/Claude paid + user keys)
- Transparent pay-per-request pricing (API cost + 10% fee)
- 60-80% file size reduction via ZIP format

---

### Phase 1: Design ✅ COMPLETE
**Outputs**: 
- [data-model.md](data-model.md) - 11 entities with validation rules and relationships
- [contracts/ai-backend-api.md](contracts/ai-backend-api.md) - REST API specification
- [quickstart.md](quickstart.md) - Developer onboarding guide
- [.github/agents/copilot-instructions.md](../../.github/agents/copilot-instructions.md) - Updated

**Data Model Highlights**:
- ContentItem: Core entity with parent-child relationships, tags, collections
- Template: CSS-based styling with security validation
- Export Configuration: Platform presets with pagination support
- Workspace Backup: Full export/import with integrity checking
- AI Suggestion: Multi-provider support with cost tracking

**API Contracts**:
- 5 REST endpoints for AI features
- Rate limiting (10 req/hour free tier)
- Transparent pricing with cost estimates
- Multi-provider routing with failover
- Security: CORS, request validation, token expiration

**Constitution Re-check**: ✅ PASS - Design aligns with local-first principles and best practices

---

### Phase 2: Tasks (Next Step)
**Command**: `/speckit.tasks`

This will generate [tasks.md](tasks.md) breaking down the 11 user stories into concrete implementation tasks with:
- Task sequencing and dependencies
- Effort estimates (story points)
- Acceptance criteria
- File paths and code locations
- Testing requirements

---

## Implementation Roadmap

### Priority P1 (MVP - 4-6 weeks)
1. **Export Enhancement** - Progress indicators, WebP/JPEG support, quality control
2. **Visual Template Editor** - No-code template customization
3. **Auto-Pagination** - Intelligent content splitting for platforms

### Priority P2 (Enhancement - 6-8 weeks)
4. **Content Search** - Full-text search, tags, filtering, bulk operations
5. **Editor Enhancement** - Rich formatting, markdown import, font customization
6. **Local-First Export/Import** - Workspace backup, ZIP optimization
7. **Platform Optimization** - Presets, validation, dimension helpers
8. **Accessibility** - Dark mode, keyboard navigation, command palette
9. **Landing Page** - Marketing site, testimonials, use cases
10. **Help Documentation** - Quick start, feature guides, troubleshooting

### Priority P3 (Advanced - 4-6 weeks)
11. **AI Features** - Content optimization, multi-provider routing, pay-per-request

**Total Estimated Effort**: 14-20 weeks (3.5-5 months)

---

## Success Criteria

After implementation, the following must be true:
- ✅ Export 5-image content completes in <10 seconds
- ✅ WebP format reduces file sizes by 40-60% vs PNG
- ✅ Search across 50+ items returns results in <5 seconds
- ✅ Landing page loads in <2 seconds (Lighthouse score 90+)
- ✅ .oneimg files are 60-80% smaller than base64 embedded format
- ✅ AI suggestions return in <5 seconds (free tier)
- ✅ Template imports are validated with zero XSS vulnerabilities
- ✅ Workspace export/import maintains 100% data fidelity
- ✅ Accessibility audit shows zero WCAG 2.1 critical violations
- ✅ All 31 success criteria from spec.md are met

---

## Next Steps

Run `/speckit.tasks` to generate the detailed implementation task list.
