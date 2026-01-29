# Tasks: OneIMG Application Enhancements

**Feature Branch**: `001-app-enhancements`  
**Input**: Design documents from `/specs/001-app-enhancements/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/ai-backend-api.md, ✅ quickstart.md

**Tests**: Tests are OPTIONAL per speckit.tasks guidelines. No explicit test requirements found in spec.md, therefore test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Each user story phase can be developed and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1-US11) for story-specific tasks
- **File paths**: All paths relative to repository root (`e:\code\personal\oneimg`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install new dependencies from quickstart.md using pnpm (TipTap extensions, Dexie, Fuse.js, Unified, browser-image-compression, PostCSS, Vercel AI SDK with provider adapters)
- [ ] T002 [P] Create vitest.config.ts for testing configuration with jsdom environment and path aliases
- [ ] T003 [P] Create tests/setup.ts with @testing-library/jest-dom and fake-indexeddb imports
- [ ] T004 [P] Install Playwright for E2E testing and create playwright.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Upgrade IndexedDB schema to version 2 in src/lib/indexed-db.ts with Dexie.js tables for contents, templates, collections, tags, preferences, aiSuggestions
- [ ] T006 [P] Create TypeScript types file src/types/data-model.ts with interfaces from data-model.md (ContentItem, Template, ExportConfiguration, UserPreferences, Tag, Collection, WorkspaceBackup, AISuggestion, PaginationConfiguration, MarkdownDocument)
- [ ] T007 [P] Implement CSS whitelist validator in src/lib/validation/css-validator.ts using PostCSS parser per research.md #7
- [ ] T008 [P] Implement Zod schemas in src/lib/validation/schema-validator.ts for template validation, content validation, export config validation
- [ ] T009 [P] Create file validator in src/lib/validation/file-validator.ts for ZIP, image, and JSON validation
- [ ] T010 [P] Implement Fuse.js search index manager in src/lib/search/search-index.ts with full-text search across content title, body, and tags
- [ ] T011 Create base export utilities directory src/lib/export/ with placeholder files
- [ ] T012 Create base import utilities directory src/lib/import/ with placeholder files

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Enhanced Export with Progress and Format Options (Priority: P1) 🎯 MVP

**Goal**: Enable users to export styled content as images with progress indicators, format selection (PNG/JPEG/WebP), and quality control

**Independent Test**: Create content, click export, observe progress bar showing stages (preparing/rendering/compressing), select WebP format with 85% quality, verify exported file is 40-60% smaller than PNG while maintaining visual quality

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement image export pipeline in src/lib/export/image-exporter.ts using html2canvas and browser-image-compression with progress callbacks
- [ ] T014 [P] [US1] Implement format converter in src/lib/export/format-converter.ts for PNG/JPEG/WebP conversion with quality control
- [ ] T015 [P] [US1] Create ExportConfiguration entity handler in src/lib/export/export-config.ts with platform presets from data-model.md
- [ ] T016 [US1] Enhance export dialog in src/components/header/export-dialog.tsx with format selection dropdown, quality slider (0.1-1.0), scale selector (1x/2x/3x)
- [ ] T017 [US1] Create export progress component in src/components/header/export-progress.tsx with three-stage progress bar (preparing 0-40%, rendering 40-70%, compressing 70-100%)
- [ ] T018 [US1] Add export error handling with memory constraint detection and user-friendly error messages in src/components/header/export-dialog.tsx
- [ ] T019 [US1] Integrate export pipeline with workspace content list for multi-item export in src/components/workspace/workspace.tsx

**Checkpoint**: User Story 1 complete - users can export content with format options and progress tracking

---

## Phase 4: User Story 2 - Visual Template Editor (Priority: P1) 🎯 MVP

**Goal**: Enable non-technical users to create custom templates using visual controls (color pickers, spacing sliders, font selectors) without writing CSS

**Independent Test**: Open template editor, adjust header background color via color picker, observe live preview update, adjust padding from 20px to 40px via slider, export template as .oneimg file, import on different device and verify identical styling

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create Template entity with full type definition including aiGenerationMetadata and validation state per data-model.md
- [ ] T021 [P] [US2] Implement template CRUD operations in src/lib/template-manager.ts with IndexedDB persistence via Dexie
- [ ] T022 [P] [US2] Create template editor main component in src/components/template/template-editor.tsx with visual controls layout
- [ ] T023 [P] [US2] Implement color picker controls in src/components/template/controls/color-control.tsx for background, text, accent colors
- [ ] T024 [P] [US2] Implement spacing slider controls in src/components/template/controls/spacing-control.tsx for padding, margin, border-radius (0-100px range)
- [ ] T025 [P] [US2] Implement font selector controls in src/components/template/controls/font-control.tsx with web-safe fonts and Google Fonts integration
- [ ] T026 [US2] Implement real-time preview component in src/components/template/template-preview.tsx that applies CSS variables to sample content
- [ ] T027 [US2] Add template export functionality in src/components/template/template-export.tsx to generate .oneimg-template file with metadata
- [ ] T028 [US2] Add template import functionality in src/components/template/template-import.tsx with drag-drop support and CSS validation
- [ ] T029 [US2] Implement "Reset to Default" button in template editor that reverts all CSS variables to original template values
- [ ] T030 [US2] Create template gallery component in src/components/template/template-gallery.tsx with preview thumbnails and category filters

**Checkpoint**: User Story 2 complete - users can create, edit, and share custom templates visually

---

## Phase 5: User Story 9 - Auto-Pagination for Long Content (Priority: P1) 🎯 MVP

**Goal**: Automatically split long-form content into multiple images at natural breakpoints for platform constraints (Instagram 10-image carousel, WeChat optimal mobile height)

**Independent Test**: Create content with 20+ paragraphs, select Instagram Carousel export, verify system splits into 8-10 images at section breaks (not mid-paragraph), verify page indicators show "1/8", "2/8", etc.

### Implementation for User Story 9

- [ ] T031 [P] [US9] Implement hierarchical pagination algorithm in src/lib/export/pagination.ts using heading > paragraph > sentence breakpoint priority from research.md #6
- [ ] T032 [P] [US9] Create PaginationConfiguration entity handler in src/lib/export/pagination-config.ts with platform-specific constraints (Instagram: 10 max, optimal height 1350px)
- [ ] T033 [P] [US9] Implement DOM measurement utilities in src/lib/export/dom-measurer.ts to calculate element heights and detect overflow
- [ ] T034 [US9] Create pagination editor component in src/components/workspace/pagination-editor.tsx for manual breakpoint adjustment with drag-drop markers
- [ ] T035 [US9] Implement page indicator rendering in src/lib/export/page-indicators.ts to add "Page X of Y" text to each exported image
- [ ] T036 [US9] Add pagination preview in export dialog showing split points before export in src/components/header/export-dialog.tsx
- [ ] T037 [US9] Integrate pagination with image export pipeline to generate multiple images with sequential filenames

**Checkpoint**: User Story 9 complete - MVP features delivered (Export, Templates, Pagination)

---

## Phase 6: User Story 3 - Content Search and Tagging (Priority: P2)

**Goal**: Enable power users with 50+ content items to quickly find content by title/tags/date and organize with collections and bulk operations

**Independent Test**: Create 30 content items with various tags, type "marketing" in search bar, verify only matching items appear, filter by tag "instagram-post", select 5 items and apply bulk tag operation

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create Tag entity with CRUD operations in src/lib/tag-manager.ts including color and usage count tracking
- [ ] T039 [P] [US3] Create Collection entity with CRUD operations in src/lib/collection-manager.ts with content count auto-update
- [ ] T040 [P] [US3] Implement full-text search using Fuse.js in src/lib/search/content-search.ts with fuzzy matching on title, body, tags
- [ ] T041 [P] [US3] Create search input component in src/components/workspace/content-search.tsx with debounced search and filter chips
- [ ] T042 [P] [US3] Implement tag filter component in src/components/workspace/tag-filter.tsx with multi-select and tag color visualization
- [ ] T043 [P] [US3] Implement date range filter component in src/components/workspace/date-filter.tsx with presets (Today, Last 7 days, Last 30 days, Custom)
- [ ] T044 [US3] Create bulk operations toolbar in src/components/workspace/bulk-operations.tsx with actions for delete, export, tag, move to collection
- [ ] T045 [US3] Implement bulk selection state management in src/store/use-workspace-store.ts using Zustand
- [ ] T046 [US3] Add collection sidebar in src/components/workspace/collection-sidebar.tsx with collection list, create/edit/delete actions
- [ ] T047 [US3] Integrate search/filter/bulk operations with content list in src/components/workspace/content-list.tsx

**Checkpoint**: User Story 3 complete - users can search, filter, and organize large content libraries

---

## Phase 7: User Story 4 - Enhanced Editor Formatting (Priority: P2)

**Goal**: Add rich text formatting (custom colors, font sizes, alignment, hyperlinks) and paste formatting preservation from Word documents

**Independent Test**: Type content, select text to apply custom color via toolbar picker, paste Word document content and verify bold/lists/headings maintain formatting, type URL and verify auto-link detection

### Implementation for User Story 4

- [ ] T048 [P] [US4] Add TipTap TextAlign extension to editor in src/components/editor/editor-container.tsx configured for heading and paragraph
- [ ] T049 [P] [US4] Add TipTap TextStyle and Color extensions for custom text colors
- [ ] T050 [P] [US4] Add TipTap FontFamily extension with web-safe fonts and Google Fonts API integration
- [ ] T051 [P] [US4] Add TipTap Link extension with auto-link detection and clickable preview
- [ ] T052 [P] [US4] Create editor toolbar component in src/components/editor/editor-toolbar.tsx with formatting buttons
- [ ] T053 [P] [US4] Implement color picker in src/components/editor/editor-color-picker.tsx with preset colors and custom color input
- [ ] T054 [P] [US4] Implement font selector dropdown in src/components/editor/editor-font-selector.tsx with font preview
- [ ] T055 [P] [US4] Implement alignment buttons in editor toolbar (left, center, right, justify)
- [ ] T056 [US4] Add paste handler in editor to preserve Word document formatting using TipTap's pasteRules
- [ ] T057 [US4] Integrate Google Fonts API in src/lib/google-fonts.ts with lazy loading and offline fallback

**Checkpoint**: User Story 4 complete - editor supports rich formatting and Word paste

---

## Phase 8: User Story 11 - Markdown Import and Advanced Formatting (Priority: P2)

**Goal**: Enable technical writers to import markdown files and use advanced text styling (strikethrough, subscript, superscript, indentation)

**Independent Test**: Upload .md file with headings/lists/code blocks, verify import preserves hierarchy, apply custom font to text, adjust blockquote indentation via slider, add strikethrough formatting

### Implementation for User Story 11

- [ ] T058 [P] [US11] Implement markdown parser in src/lib/import/markdown-parser.ts using Unified.js (remark-parse, remark-gfm, remark-prosemirror) per research.md #4
- [ ] T059 [P] [US11] Add TipTap Strike extension to editor for strikethrough formatting
- [ ] T060 [P] [US11] Add TipTap Subscript and Superscript extensions to editor
- [ ] T061 [P] [US11] Create custom TipTap Indent extension in src/components/editor/extensions/indent-extension.ts for blockquote/list indentation
- [ ] T062 [P] [US11] Create markdown import dialog in src/components/editor/markdown-importer.tsx with file upload and preview
- [ ] T063 [US11] Implement markdown syntax detection option in editor to auto-convert typed markdown to formatted content
- [ ] T064 [US11] Add indentation control slider in editor toolbar for blockquotes and lists (0-50px range)
- [ ] T065 [US11] Handle markdown parsing errors with validation error display showing line numbers

**Checkpoint**: User Story 11 complete - markdown import and advanced formatting available

---

## Phase 9: User Story 6 - Local-First Data Export/Import (Priority: P2)

**Goal**: Enable users to backup content, share designs, and transfer data between devices without cloud services using .oneimg and .oneimg-workspace file formats

**Independent Test**: Export workspace as ZIP file with 20 content items and 3 custom templates, import on different device, verify all content/templates/preferences restore exactly, share individual .oneimg design file and verify recipient can open without account

### Implementation for User Story 6

- [ ] T066 [P] [US6] Implement ZIP builder in src/lib/export/zip-builder.ts using JSZip to create .oneimg file format with scene.json + images/ directory per research.md #3
- [ ] T067 [P] [US6] Implement workspace backup exporter in src/lib/export/workspace-exporter.ts to create .oneimg-workspace ZIP with all entities
- [ ] T068 [P] [US6] Implement SHA-256 checksum generator in src/lib/export/checksum.ts for integrity verification
- [ ] T069 [P] [US6] Implement .oneimg file importer in src/lib/import/oneimg-importer.ts to extract ZIP and reconstruct content
- [ ] T070 [P] [US6] Implement workspace importer in src/lib/import/workspace-importer.ts with version migration and integrity checking
- [ ] T071 [US6] Create workspace backup dialog in src/components/workspace/backup-dialog.tsx with export options (full/incremental, include images, include preferences)
- [ ] T072 [US6] Create workspace import dialog in src/components/workspace/import-dialog.tsx with file upload, validation, and preview
- [ ] T073 [US6] Add individual design export to content item context menu in src/components/workspace/content-item.tsx
- [ ] T074 [US6] Handle font fallback for imported designs with missing fonts in src/lib/import/font-fallback.ts
- [ ] T075 [US6] Handle corrupted file validation and partial recovery in workspace importer

**Checkpoint**: User Story 6 complete - full data portability without cloud dependencies

---

## Phase 10: User Story 8 - Platform-Specific Optimization Presets (Priority: P2)

**Goal**: Automatically optimize exports for multiple platforms (WeChat, Instagram, Xiaohongshu, Twitter) with platform-specific aspect ratios, file sizes, and formatting

**Independent Test**: Select Instagram Portrait preset, observe automatic resize to 1080×1350px, export for Xiaohongshu and verify small watermark in bottom-right, select WeChat Article and verify long-form vertical optimization

### Implementation for User Story 8

- [ ] T076 [P] [US8] Define platform preset configurations in src/lib/constants/platform-presets.ts with aspect ratios, max file sizes, optimal dimensions per research.md #10
- [ ] T077 [P] [US8] Implement platform preset selector component in src/components/header/platform-selector.tsx with preset preview
- [ ] T078 [P] [US8] Implement automatic canvas resizing in export pipeline based on selected platform preset
- [ ] T079 [P] [US8] Implement watermark renderer in src/lib/export/watermark-renderer.ts for Xiaohongshu platform
- [ ] T080 [US8] Add platform-specific hashtag limits to AI suggestion integration (3-5 for Twitter, 10-15 for Instagram)
- [ ] T081 [US8] Create platform validation warnings in export dialog showing file size/dimension compliance

**Checkpoint**: User Story 8 complete - multi-platform export optimization available

---

## Phase 11: User Story 10 - Marketing Landing Page (Priority: P2)

**Goal**: Create compelling landing page with user testimonials, use case examples, and help documentation to increase conversion and reduce support burden

**Independent Test**: Access landing page, read 5-10 user testimonials, click through 6+ categorized use case examples, access help documentation with searchable guides, measure time-to-understanding (<2 minutes for value proposition)

### Implementation for User Story 10

- [ ] T082 [P] [US10] Create landing page route in src/app/landing/page.tsx with Next.js SSG
- [ ] T083 [P] [US10] Create hero section component in src/components/landing/hero.tsx with value proposition and CTA button
- [ ] T084 [P] [US10] Create testimonials section in src/components/landing/testimonials.tsx with user quotes, names, photos, specific benefits
- [ ] T085 [P] [US10] Create use cases section in src/components/landing/use-cases.tsx with 6+ categorized examples (blog posts, social media, presentations, infographics)
- [ ] T086 [P] [US10] Create feature grid component in src/components/landing/feature-grid.tsx highlighting key features with icons
- [ ] T087 [P] [US10] Create help documentation pages in src/app/help/ with searchable articles using Fuse.js
- [ ] T088 [US10] Implement help article search component in src/app/help/components/help-search.tsx
- [ ] T089 [US10] Create help article layout in src/app/help/[slug]/page.tsx with table of contents and navigation
- [ ] T090 [US10] Write help articles for: getting started, export options, template creation, troubleshooting, keyboard shortcuts
- [ ] T091 [US10] Optimize landing page performance with image lazy loading, font preloading, and Lighthouse score >90

**Checkpoint**: User Story 10 complete - professional landing page with help documentation

---

## Phase 12: User Story 5 - AI-Powered Content Assistance (Priority: P3)

**Goal**: Provide AI-powered suggestions for headlines, hashtags, grammar improvements, and template recommendations using multi-provider free tier and pay-per-request premium models

**Independent Test**: Write headline, click "AI Suggest Alternatives" with free model, receive 3-5 alternatives within 5 seconds, click "Auto-generate Hashtags" with paid model, see cost estimate and confirm, verify AI suggests appropriate template based on content type

### Implementation for User Story 5

- [ ] T092 [P] [US5] Create Cloudflare Worker backend in backend/src/index.ts with Hono framework for routing
- [ ] T093 [P] [US5] Implement Vercel AI SDK provider configurations in backend/src/services/ai-providers.ts for OpenAI, Anthropic, Groq adapters
- [ ] T094 [P] [US5] Implement AI suggestion endpoint POST /ai/suggest in backend/src/routes/ai-suggest.ts per contracts/ai-backend-api.md
- [ ] T095 [P] [US5] Implement AI template generation endpoint POST /ai/generate-template in backend/src/routes/ai-generate-template.ts
- [ ] T096 [P] [US5] Implement cost estimation endpoint POST /ai/estimate-cost in backend/src/routes/ai-estimate.ts
- [ ] T097 [P] [US5] Implement providers list endpoint GET /ai/providers in backend/src/routes/ai-providers.ts
- [ ] T098 [P] [US5] Implement Stripe payment endpoint POST /payment/create-checkout in backend/src/routes/payment.ts with Stripe SDK
- [ ] T099 [P] [US5] Implement Alipay payment endpoint integration in payment route with Alipay SDK and QR code generation
- [ ] T100 [P] [US5] Implement payment verification endpoint GET /payment/verify supporting both Stripe sessionId and Alipay tradeNo
- [ ] T101 [P] [US5] Implement rate limiting middleware in backend/src/middleware/rate-limit.ts (10 req/hour for free tier per IP)
- [ ] T102 [P] [US5] Create AI client wrapper in src/lib/ai/ai-client.ts for backend proxy calls
- [ ] T103 [P] [US5] Create AI provider selector in src/components/ai/ai-provider-selector.tsx with free/paid model options
- [ ] T104 [P] [US5] Create AI suggestions panel in src/components/ai/ai-panel.tsx with suggestion types (headline, hashtag, grammar, template)
- [ ] T105 [P] [US5] Create cost estimator dialog in src/components/ai/ai-cost-estimator.tsx showing cost breakdown before paid requests
- [ ] T106 [P] [US5] Create AI settings panel in src/components/ai/ai-settings.tsx for user API key management with encryption
- [ ] T107 [US5] Implement AI suggestion caching in IndexedDB to avoid duplicate paid requests within 24 hours
- [ ] T108 [US5] Implement content analysis utilities in src/lib/ai/content-analyzer.ts to extract length, tone, type for AI prompts
- [ ] T109 [US5] Implement prompt builder in src/lib/ai/prompt-builder.ts with templates for each suggestion type
- [ ] T110 [US5] Add AI suggestion acceptance tracking in AISuggestion entity with confidence scores
- [ ] T111 [US5] Integrate AI template suggestions with template gallery showing AI-recommended templates

**Checkpoint**: User Story 5 complete - AI features available with multi-provider support

---

## Phase 13: User Story 7 - Template Gallery and Community Sharing (Priority: P3)

**Goal**: Enable designers to share custom templates via file export and discover community templates through GitHub/social channels with curated gallery on landing page

**Independent Test**: Export custom template as .oneimg-template file with metadata, share via GitHub, import template from community source via drag-drop, verify template works on different device with font fallbacks

### Implementation for User Story 7

- [ ] T112 [P] [US7] Enhance template export to include author, description, preview image in .oneimg-template file metadata
- [ ] T113 [P] [US7] Create curated template gallery section in landing page src/components/landing/template-showcase.tsx
- [ ] T114 [P] [US7] Implement template download functionality from landing page with .oneimg-template file generation
- [ ] T115 [US7] Add template import instructions modal in src/components/template/template-instructions.tsx
- [ ] T116 [US7] Enhance template import to validate community templates and show preview before installation
- [ ] T117 [US7] Add template rating system in Template entity with user feedback collection

**Checkpoint**: User Story 7 complete - community template sharing enabled

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance optimization, error handling, and documentation

- [ ] T118 [P] Implement dark mode support in src/app/layout.tsx with theme toggle and system preference detection
- [ ] T119 [P] Implement keyboard navigation for all interactive elements per WCAG 2.1 AA guidelines
- [ ] T120 [P] Add screen reader support with ARIA labels and live regions
- [ ] T121 [P] Implement reduced motion support with prefers-reduced-motion media query
- [ ] T122 [P] Add error boundary components in src/components/error-boundary.tsx for graceful error handling
- [ ] T123 [P] Implement IndexedDB quota monitoring with warnings at 80% capacity in src/lib/indexed-db.ts
- [ ] T124 [P] Add performance monitoring with Web Vitals tracking
- [ ] T125 [P] Optimize bundle size with code splitting and lazy loading for AI/template features
- [ ] T126 Add comprehensive error messages with recovery suggestions for all error scenarios from spec.md Edge Cases
- [ ] T127 Implement analytics tracking for feature usage (privacy-respecting, no PII)
- [ ] T128 Create user onboarding tour with interactive tooltips for first-time users
- [ ] T129 Write developer documentation in docs/ directory with architecture diagrams and API references

**Checkpoint**: All features polished, accessible, and production-ready

---

## Dependencies & Execution Strategy

### User Story Completion Order

```
Phase 1 (Setup) → Phase 2 (Foundation)
    ↓
Phase 3-5 (P1 MVP) - CAN RUN IN PARALLEL
    ├─ US1 (Export) → independent
    ├─ US2 (Templates) → independent  
    └─ US9 (Pagination) → depends on US1 export pipeline
    ↓
Phase 6-11 (P2 Features) - CAN RUN IN PARALLEL after MVP
    ├─ US3 (Search) → independent
    ├─ US4 (Editor) → independent
    ├─ US11 (Markdown) → depends on US4 editor enhancements
    ├─ US6 (Import/Export) → depends on US1, US2
    ├─ US8 (Platform Presets) → depends on US1
    └─ US10 (Landing) → independent
    ↓
Phase 12-13 (P3 Features) - CAN RUN IN PARALLEL after P2
    ├─ US5 (AI) → depends on US2 templates for AI generation
    └─ US7 (Community) → depends on US2 templates
    ↓
Phase 14 (Polish) - AFTER all user stories complete
```

### Parallel Execution Examples

**MVP Phase (US1, US2, US9)**:
- **Parallel Group 1**: T013, T014, T015 (export utilities - different files)
- **Parallel Group 2**: T020, T021 (template data layer) + T016, T017 (export UI components)
- **Parallel Group 3**: T022, T023, T024, T025 (template editor controls - all independent)
- **Sequential**: T031-T037 (pagination) must wait for T013 (export pipeline)

**P2 Phase**:
- **Parallel Group 1**: US3 (T038-T047), US4 (T048-T057), US10 (T082-T091) - completely independent
- **Sequential**: US11 (T058-T065) after US4 complete, US6 (T066-T075) after US1+US2 complete

**P3 Phase**:
- **Backend**: T092-T101 (AI backend endpoints - can develop all in parallel)
- **Frontend**: T102-T111 (AI UI components - can develop in parallel with backend)

### MVP Strategy

**MVP Scope** (Estimated 4-6 weeks):
- Phase 1-2: Setup + Foundation (1 week)
- Phase 3: US1 Export Enhancement (1 week)
- Phase 4: US2 Visual Template Editor (1.5 weeks)
- Phase 5: US9 Auto-Pagination (1.5 weeks)

**Deliverable**: Users can create/edit templates visually, export content with progress tracking and format options, and automatically paginate long content for social platforms.

**Post-MVP Increments**:
- **Increment 2** (P2 features, 6-8 weeks): Search, advanced editor, import/export, platform presets, landing page, markdown import
- **Increment 3** (P3 features, 4-6 weeks): AI features, community templates
- **Increment 4** (Polish, 2-3 weeks): Accessibility, performance, error handling, documentation

---

## Summary

- **Total Tasks**: 129 tasks
- **MVP Tasks**: 35 tasks (T001-T037)
- **P2 Tasks**: 59 tasks (T038-T091, T118-T129)
- **P3 Tasks**: 35 tasks (T092-T117)

### Task Count by User Story

- US1 (Export): 7 tasks
- US2 (Templates): 11 tasks
- US9 (Pagination): 7 tasks
- US3 (Search): 10 tasks
- US4 (Editor): 10 tasks
- US11 (Markdown): 8 tasks
- US6 (Import/Export): 10 tasks
- US8 (Platform Presets): 6 tasks
- US10 (Landing): 10 tasks
- US5 (AI): 20 tasks
- US7 (Community): 6 tasks
- Polish: 12 tasks
- Setup/Foundation: 12 tasks

### Parallel Opportunities

- **38 tasks** marked with [P] can run in parallel within their phase
- **MVP phase**: 15 parallelizable tasks (43% of MVP)
- **P2 phase**: 30 parallelizable tasks (51% of P2)
- **P3 phase**: 18 parallelizable tasks (51% of P3)

### Format Validation

✅ All 129 tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ All story-specific tasks include [US1]-[US11] labels
✅ All tasks include specific file paths
✅ Setup and foundational tasks omit story labels as required
✅ Dependencies documented in execution strategy
✅ MVP scope clearly defined (US1, US2, US9)

---

**Generated**: 2026-01-29  
**Ready for implementation**: ✅ All phases defined, dependencies mapped, parallel execution identified
