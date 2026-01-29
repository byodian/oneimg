# Feature Specification: OneIMG Application Enhancements

**Feature Branch**: `001-app-enhancements`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "Comprehensive OneIMG Application Enhancements - Performance, UX, Templates, AI Features, and Platform Optimizations"

## Clarifications

### Session 2026-01-29

- Q: AI model selection and access mechanism? → A: Multi-provider free tier (Llama via Groq, Mistral via HuggingFace) + pay-per-request premium (GPT-4, Claude) + user API key support for advanced users
- Q: Auto-pagination breakpoint priority hierarchy? → A: Headings > Paragraphs > Sentences (hierarchical priority)
- Q: ZIP structure for parent-child content relationships? → A: Flat scene.json with nested children arrays
- Q: Pay-per-request pricing structure? → A: Pass-through actual API cost + 10% service fee (transparent but variable)
- Q: Custom template CSS security validation approach? → A: Whitelist-only CSS properties and values
- Q: Payment methods for AI pay-per-request? → A: Stripe (credit card, Apple Pay, Google Pay) + Alipay for Chinese users

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enhanced Export with Progress and Format Options (Priority: P1)

A content creator wants to export their styled content as images for WeChat and Instagram. They need to see export progress, choose between PNG/JPEG/WebP formats, and apply compression to reduce file sizes while maintaining visual quality.

**Why this priority**: Export is the core output feature of OneIMG. Poor export experience directly impacts user satisfaction and content delivery. This addresses the most common user pain point (slow exports with no feedback).

**Independent Test**: Can be fully tested by creating content, clicking export, observing progress indicators, selecting format options (PNG/JPEG/WebP), adjusting quality slider, and verifying exported files meet quality/size expectations.

**Acceptance Scenarios**:

1. **Given** a user has created styled content, **When** they click the export button, **Then** a progress bar shows the current export stage (preparing/rendering/compressing) with percentage completion
2. **Given** the export dialog is open, **When** the user selects WebP format with 85% quality, **Then** exported images are 40-60% smaller than equivalent PNG while maintaining visual quality
3. **Given** a user is exporting 5 content cards, **When** export is in progress, **Then** they see "Exporting 2 of 5 images..." with individual image status
4. **Given** export fails due to memory constraints, **When** the error occurs, **Then** user sees a clear error message with suggested actions (reduce scale, export fewer items)

---

### User Story 2 - Visual Template Editor for Non-Technical Users (Priority: P1)

A user without CSS knowledge wants to create custom templates to match their brand colors and style. They need a visual editor to adjust spacing, colors, fonts, and borders without writing code.

**Why this priority**: Only 3 templates currently exist, severely limiting creative expression. Enabling users to create templates democratizes design and increases platform stickiness. This directly addresses user feedback about limited template variety.

**Independent Test**: Can be fully tested by opening template editor, adjusting visual controls (color pickers, spacing sliders, font selectors), previewing changes in real-time, and exporting the custom template for later reuse.

**Acceptance Scenarios**:

1. **Given** a user opens the template builder, **When** they adjust the header background color using a color picker, **Then** the live preview updates immediately without requiring save/refresh
2. **Given** a user has customized spacing, colors, and fonts, **When** they export the template as `.oneimg` file, **Then** they can import it on another device and see identical styling
3. **Given** a user is editing a template, **When** they adjust padding from 20px to 40px using a slider, **Then** the preview shows increased spacing around content blocks
4. **Given** a user wants to revert changes, **When** they click "Reset to Default", **Then** all visual adjustments are cleared and template returns to original state

---

### User Story 3 - Content Search and Tagging System (Priority: P2)

A power user with 50+ saved content items needs to quickly find specific articles by title, tags, or creation date. They want to organize content into collections and apply bulk operations.

**Why this priority**: As users accumulate content, lack of organization becomes a major friction point. This enables scaling from casual use to professional content creation workflows.

**Independent Test**: Can be fully tested by creating multiple content items with tags, using search to filter by keywords, applying date range filters, and performing bulk operations (delete, export, tag) on selected items.

**Acceptance Scenarios**:

1. **Given** a user has 30 content items, **When** they type "marketing" in the search bar, **Then** only items with "marketing" in title, content, or tags appear
2. **Given** a user has tagged 10 items with "instagram-post", **When** they filter by this tag, **Then** only those 10 items display
3. **Given** a user selects 5 content items, **When** they choose "Add tag" from bulk actions menu, **Then** they can apply a new tag to all 5 items simultaneously
4. **Given** a user filters by date range "Last 7 days", **When** the filter is applied, **Then** only items created in that period show

---

### User Story 4 - Enhanced Editor with Rich Formatting (Priority: P2)

A blogger wants to create richly formatted content with custom text colors, font sizes, alignment options, and hyperlinks. They also want to paste content from Word documents without losing formatting.

**Why this priority**: Current editor supports basic formatting (bold/italic) but lacks features common in modern rich text editors. This increases content creation flexibility and reduces friction for users migrating from other tools.

**Independent Test**: Can be fully tested by typing content, selecting text to apply color/size/alignment, adding hyperlinks, pasting formatted text from external sources, and verifying formatting persists in preview and export.

**Acceptance Scenarios**:

1. **Given** a user selects text, **When** they choose a custom color from the toolbar color picker, **Then** the text appears in that color in both editor and preview
2. **Given** a user pastes content from Microsoft Word, **When** the paste completes, **Then** headings, bold text, and lists maintain their formatting
3. **Given** a user types a URL and presses space, **When** auto-link detection triggers, **Then** the URL becomes a clickable link
4. **Given** a user selects a paragraph, **When** they click the center-align button, **Then** text centers within the content block

---

### User Story 5 - AI-Powered Content Assistance (Priority: P3)

A social media manager wants AI to suggest improvements to their content, generate alternative headlines, recommend optimal templates based on content type, and auto-generate relevant hashtags for different platforms.

**Why this priority**: AI features are becoming table stakes in content tools. This differentiates OneIMG from simple text-to-image converters and adds intelligence layer. Lower priority as core functionality must work perfectly first.

**Independent Test**: Can be fully tested by writing content, clicking "AI Suggest" button, reviewing AI-generated alternatives, selecting a suggestion to apply, and verifying it integrates seamlessly into the content.

**Acceptance Scenarios**:

1. **Given** a user has written a headline, **When** they click "AI Suggest Alternatives" with free model, **Then** they receive 3-5 alternative headlines within 5 seconds at no cost
2. **Given** a user has completed content, **When** they click "Auto-generate Hashtags" and selects paid model, **Then** they see cost estimate ($0.02) and must confirm before request executes
3. **Given** a user starts typing content, **When** AI analyzes the text, **Then** template style recommendations appear (minimalist for short text, magazine for long-form, tech for code/technical)
4. **Given** a user enables content optimization, **When** they click "Optimize Text", **Then** AI suggests grammar fixes, clarity improvements, and tone adjustments with before/after comparison
5. **Given** a user clicks "Generate Template Style", **When** AI analyzes content (length, tone, images), **Then** system automatically creates custom template with appropriate colors, spacing, and layout
6. **Given** a user has no payment method configured, **When** they use free AI models, **Then** all features work without payment prompt or interruption

---

### User Story 6 - Local-First Data Export and Import (Priority: P2)

A user wants to backup their content, share designs with colleagues, and transfer data between devices without requiring cloud services or user accounts. They need export/import functionality for individual designs and full workspace backups while maintaining complete data ownership.

**Why this priority**: Aligns with local-first architecture philosophy - users own their data and control where it goes. Essential for professional users who need data portability and backup without vendor lock-in. Medium priority as it enables multi-device workflows without cloud infrastructure.

**Independent Test**: Can be fully tested by exporting workspace as JSON/ZIP file, importing on another device via file upload, sharing individual designs via file transfer, and verifying all content/templates/settings are preserved with zero data loss.

**Acceptance Scenarios**:

1. **Given** a user has 20 content items and 3 custom templates, **When** they export workspace, **Then** system generates a single .oneimg-workspace ZIP file containing all data with optimized images
2. **Given** a user receives a .oneimg design file from a colleague, **When** they import it, **Then** content loads with all formatting intact and no cloud account required
3. **Given** a user wants to transfer to new device, **When** they import workspace backup, **Then** all content, templates, preferences, and tags restore exactly as original
4. **Given** a user exports individual design, **When** recipient opens it on different OS/browser, **Then** design renders identically with proper fallback for missing fonts
5. **Given** a user exports design with 5 high-res images, **When** export completes, **Then** .oneimg file is 60-80% smaller than base64-embedded version and can be unzipped to inspect contents
6. **Given** a user imports .oneimg file, **When** system extracts ZIP archive, **Then** images load from separate files and scene reconstructs perfectly with zero quality loss

---

### User Story 7 - Template Gallery and Community File Sharing (Priority: P3)

A designer wants to share their custom templates with the community via file export and discover templates created by other users through community channels (GitHub, social media, forums). They need a curated gallery showcasing quality templates with easy import functionality.

**Why this priority**: Community-generated content multiplies template variety without requiring server infrastructure or moderation systems. Aligns with local-first principles where templates are files, not server data. Lower priority as core functionality comes first.

**Independent Test**: Can be fully tested by exporting custom template as .oneimg-template file, sharing via GitHub/Discord, importing templates from community sources, previewing before import, and verifying templates work across different devices.

**Acceptance Scenarios**:

1. **Given** a user has created custom template, **When** they export it, **Then** system generates .oneimg-template file with metadata (name, author, description, preview image)
2. **Given** a user receives template file from GitHub, **When** they drag-drop into app, **Then** template imports with preview and becomes available in template selector
3. **Given** landing page has curated template gallery, **When** user clicks download template, **Then** .oneimg-template file downloads and provides import instructions
4. **Given** a user imports template, **When** template uses custom fonts not on their system, **Then** app shows font substitution notice with web-safe fallbacks

---

### User Story 8 - Platform-Specific Optimization Presets (Priority: P2)

A social media manager creating content for multiple platforms (WeChat, Instagram, Xiaohongshu, Twitter) wants to automatically optimize exports for each platform's requirements (aspect ratios, file sizes, hashtag limits) without manual adjustments.

**Why this priority**: Users often create content for multiple platforms. Automating platform-specific optimizations saves significant time and reduces errors. Medium priority as it builds on core export functionality.

**Independent Test**: Can be fully tested by selecting a platform preset (Instagram 4:5 portrait), observing automatic sizing/formatting adjustments, exporting with platform-optimized settings, and verifying output meets platform specifications.

**Acceptance Scenarios**:

1. **Given** a user selects "Instagram Portrait" preset, **When** content renders, **Then** canvas automatically resizes to 1080×1350px and suggests 4:5 aspect ratio layouts
2. **Given** a user exports for Xiaohongshu, **When** export completes, **Then** a small watermark appears in bottom-right corner as per platform conventions
3. **Given** a user selects "WeChat Article" preset, **When** they export, **Then** system generates long-form vertical image optimized for mobile scrolling (1125px width)
4. **Given** a user exports for Twitter, **When** AI hashtag generator runs, **Then** it limits suggestions to 3-5 hashtags (Twitter best practice) versus 10-15 for Instagram

---

### User Story 9 - Automatic Pagination for Social Platform Exports (Priority: P1)

A content creator with long-form content wants to export it as multiple images that automatically fit within platform constraints (Instagram's 10-image carousel, WeChat's optimal mobile height). The system should intelligently split content at natural breakpoints.

**Why this priority**: Long content often exceeds single-image limits for social platforms. Manual splitting is tedious and error-prone. This is core export functionality that significantly improves user experience for common use cases.

**Independent Test**: Can be fully tested by creating long-form content (20+ paragraphs), selecting Instagram carousel export, and verifying system automatically splits content into 8-10 optimally-sized images with natural breaks between sections.

**Acceptance Scenarios**:

1. **Given** a user has content with 25 paragraphs, **When** they select "Instagram Carousel" export, **Then** system splits content into 8 images at section breaks, not mid-paragraph
2. **Given** a user exports for WeChat, **When** content exceeds optimal mobile scroll length (5000px), **Then** system suggests splitting into multiple images with clear "Part 1 of 3" indicators
3. **Given** a user has 15 content sections, **When** exporting to Instagram carousel (10 image max), **Then** system intelligently groups related sections to fit within limit
4. **Given** pagination creates awkward breaks, **When** user reviews preview, **Then** they can manually adjust breakpoints with drag-and-drop markers

---

### User Story 10 - Marketing Landing Page with Social Proof (Priority: P2)

A potential user visiting the website wants to quickly understand OneIMG's value proposition, see real user testimonials, view example use cases, and access help documentation before signing up or using the app.

**Why this priority**: First impressions drive conversion. A compelling landing page with social proof increases user trust and adoption. Help documentation reduces support burden. Medium priority as it supports growth but doesn't affect core product functionality.

**Independent Test**: Can be fully tested by accessing the landing page, reading user testimonials, clicking through use case examples, accessing help documentation, and measuring time-to-understanding (target: <2 minutes to grasp value proposition).

**Acceptance Scenarios**:

1. **Given** a visitor lands on homepage, **When** they scroll, **Then** they see 5-10 user testimonials with names, photos, and specific benefits mentioned
2. **Given** a visitor wants to see examples, **When** they click "Use Cases", **Then** they see 6+ categorized examples (blog posts, social media, presentations, infographics)
3. **Given** a user needs help, **When** they access help documentation, **Then** they find searchable guides organized by task (getting started, export options, template creation, troubleshooting)
4. **Given** a visitor reads testimonials, **When** they click "Try Now", **Then** they're taken directly to the editor with a sample template loaded

---

### User Story 11 - Advanced Editor Formatting and Markdown Import (Priority: P2)

A technical writer wants to import their existing markdown documentation, apply custom fonts, adjust text indentation for quotes and lists, and use advanced text styling (strikethrough, subscript, superscript) for rich content creation.

**Why this priority**: Many users have existing content in markdown format. Import eliminates manual retyping. Advanced formatting enables professional-quality output. Medium priority as it enhances content creation but isn't blocking for basic use.

**Independent Test**: Can be fully tested by importing a markdown file with headings/lists/quotes, applying custom fonts, adjusting indentation, adding strikethrough/subscript text, and verifying all formatting renders correctly in preview and export.

**Acceptance Scenarios**:

1. **Given** a user uploads a .md file, **When** import completes, **Then** headings convert to title styles, lists maintain hierarchy, code blocks preserve formatting, and links remain clickable
2. **Given** a user selects text, **When** they change font family from toolbar, **Then** text updates to selected font (from list of web-safe + Google Fonts)
3. **Given** a user types a blockquote, **When** they adjust indentation slider, **Then** quote indents 0-50px from left margin with live preview
4. **Given** a user needs strikethrough text, **When** they select text and click strikethrough button (or Cmd+Shift+X), **Then** text displays with line-through style
5. **Given** a user pastes markdown syntax directly into editor, **When** they enable "Detect Markdown" option, **Then** markdown automatically converts to formatted content

---

### Edge Cases

- **Export Failure Handling**: What happens when user tries to export extremely long content (50+ sections) that exceeds browser memory limits? System should detect size, warn user, and suggest exporting in segments.

- **Template Compatibility**: How does system handle importing a template created with custom fonts that aren't installed on user's device? System should fall back to web-safe fonts and notify user of missing fonts.

- **Concurrent Editing**: What happens when user has same content open in two browser tabs and edits both? System should detect conflict using last-modified timestamp and show merge dialog or last-write-wins with notification.

- **Offline Operation**: How does system handle all operations when user has no internet connection? All core functionality (edit, export, template management) works offline; only AI features and Google Fonts loading require connectivity.

- **Large Image Uploads**: What happens when user uploads 50MB image to editor? System should compress/resize images above threshold (e.g., 5MB) with user notification.

- **Cross-Browser Compatibility**: How does export quality vary across Chrome, Firefox, Safari? System should detect browser capabilities and adjust export method accordingly (html2canvas vs native APIs).

- **Template Migration**: What happens when app updates with breaking template changes? System should include version checking and migration scripts for backward compatibility.

- **Workspace File Corruption**: What happens when user imports corrupted or partially downloaded workspace file? System should validate file integrity, show specific errors, and allow partial recovery of valid content sections.

- **Browser Storage Limits**: What happens when IndexedDB quota is exceeded (5GB+ of content/images)? System should warn at 80% capacity and provide workspace export/cleanup tools.

- **Large Embedded Images**: What happens when .oneimg file contains multiple high-resolution images resulting in 50MB+ file size? System should compress images, extract to separate files in ZIP archive, and use references instead of base64 embedding.

- **Image Format Compatibility**: What happens when imported .oneimg file contains images in unsupported formats or corrupted image data? System should validate image headers, attempt format conversion, and provide clear error messages with recovery options.

- **Pagination Break Logic**: What happens when content has no natural breakpoints (single giant paragraph)? System should warn user and suggest adding section breaks or split at sentence boundaries.

- **Markdown Parsing Errors**: How does system handle malformed markdown with unclosed code blocks or broken tables? System should show validation errors with line numbers and continue importing valid sections.

- **Custom Font Loading**: What happens when user selects Google Font but has no internet connection? System should fall back to web-safe font and cache previously loaded fonts for offline use.

- **AI Payment Failures**: What happens when pay-per-request payment fails (card declined, network timeout)? System should show clear error, not charge user, and offer fallback to free models without losing user's content or context.

- **Free AI Rate Limits**: What happens when user exceeds free model rate limits (e.g., 100 requests/hour)? System should show remaining quota, suggest waiting or upgrading to pay-per-request, and cache recent AI responses to avoid duplicate requests.

- **Landing Page Performance**: How does website handle testimonial images that fail to load or are slow? Use lazy loading, placeholder images, and progressive enhancement.

## Requirements *(mandatory)*

### Functional Requirements

#### Export Enhancement (P1)

- **FR-001**: System MUST display real-time export progress showing current stage (preparing/rendering/compressing) and percentage completion
- **FR-002**: System MUST support export in multiple formats (PNG, JPEG, WebP) with user-selectable quality levels (25%, 50%, 75%, 90%, 100%)
- **FR-003**: System MUST allow users to export individual content cards or entire preview as single long-form image
- **FR-004**: System MUST compress exported images based on selected quality setting while maintaining visual fidelity
- **FR-005**: System MUST handle export failures gracefully with clear error messages and recovery suggestions
- **FR-006**: System MUST allow users to cancel ongoing exports without browser freeze
- **FR-007**: System MUST preserve EXIF metadata in exported images when original images contain metadata
- **FR-008**: System MUST automatically paginate long content based on selected platform constraints (Instagram: 10 images max, optimal height per image)
- **FR-009**: System MUST detect natural content breakpoints using hierarchical priority: section headings (highest priority) > paragraph boundaries > sentence endings (last resort)
- **FR-010**: System MUST allow users to manually adjust pagination breakpoints with visual preview of each resulting image
- **FR-011**: System MUST add page indicators ("1/5", "2/5", etc.) to paginated exports when enabled by user
- **FR-012**: System MUST maintain consistent styling across all paginated images (headers, footers, margins)

#### Template System (P1)

- **FR-008**: System MUST provide visual template editor with controls for colors, spacing, borders, fonts, and shadows
- **FR-009**: System MUST preview template changes in real-time without requiring save/apply actions
- **FR-010**: System MUST allow users to export custom templates as `.oneimg` JSON files
- **FR-011**: System MUST allow users to import `.oneimg` template files created on other devices
- **FR-012**: System MUST validate imported templates using whitelist-only approach: allow safe CSS properties (color, font-size, margin, padding, border, background-color, text-align, etc.) while blocking url(), @import, expression(), and any JavaScript-related CSS to prevent XSS attacks
- **FR-013**: System MUST include template gallery with preview thumbnails for all available templates
- **FR-014**: System MUST support template categories (minimalist, tech, cartoon, magazine, gradient, dark mode)

#### Content Management (P2)

- **FR-015**: System MUST provide full-text search across all content (titles, body text, tags)
- **FR-016**: System MUST allow users to apply multiple tags to each content item
- **FR-017**: System MUST support filtering content by tags, date ranges, and template types
- **FR-018**: System MUST enable bulk operations on selected content items (delete, export, tag, duplicate)
- **FR-019**: System MUST display content statistics (word count, creation date, last modified, template used)
- **FR-020**: System MUST allow users to organize content into collections/folders
- **FR-021**: System MUST support sorting content by date, title, or word count in ascending/descending order

#### Editor Enhancement (P2)

- **FR-022**: System MUST support text color customization via color picker
- **FR-023**: System MUST support font size adjustment (small, medium, large, custom)
- **FR-024**: System MUST support text alignment (left, center, right, justify)
- **FR-025**: System MUST support hyperlink insertion with URL validation
- **FR-026**: System MUST auto-detect URLs in plain text and convert to clickable links
- **FR-027**: System MUST preserve formatting when pasting from external sources (Word, Google Docs, web pages)
- **FR-028**: System MUST support keyboard shortcuts for common formatting actions (Cmd+B for bold, Cmd+K for link, etc.)
- **FR-029**: System MUST provide undo/redo functionality with visual indicators showing history depth
- **FR-030**: System MUST support drag-and-drop image upload with automatic compression for large files
- **FR-031**: System MUST support font family selection from web-safe fonts and curated Google Fonts collection
- **FR-032**: System MUST support text indentation adjustment (0-50px) for blockquotes, paragraphs, and list items
- **FR-033**: System MUST support strikethrough, subscript, and superscript text formatting
- **FR-034**: System MUST import markdown files (.md) and convert to formatted content preserving headings, lists, links, code blocks, and blockquotes
- **FR-035**: System MUST detect and auto-convert markdown syntax when pasted into editor (optional toggle)
- **FR-036**: System MUST export content as markdown file with proper syntax for all formatting elements
- **FR-037**: System MUST validate markdown files before import and show clear error messages for malformed syntax

#### AI Features (P3)

- **FR-065**: System MUST use AI to analyze and optimize text content (grammar, clarity, tone improvement, length adjustment)
- **FR-066**: System MUST automatically generate visual template styles based on content analysis (tone, length, purpose)
- **FR-067**: System MUST generate alternative headlines/titles (3-5 options) based on user's original text
- **FR-068**: System MUST generate platform-specific hashtags (Instagram: 10-15, Twitter: 3-5, LinkedIn: 5-7)
- **FR-069**: System MUST provide access to multiple free AI model providers (Llama 3.1 via Groq, Mistral 7B via HuggingFace) with automatic failover if one provider is unavailable
- **FR-070**: System MUST support pay-per-request access to premium AI models (GPT-4, Claude Opus) with transparent per-request pricing showing actual API cost + 10% service fee
- **FR-071**: System MUST allow users to choose between free models (faster, lower quality), paid models (better quality), or their own API keys for each request
- **FR-072**: System MUST display detailed cost breakdown (API cost + service fee) before executing paid AI requests with explicit user confirmation required
- **FR-073**: System MUST support three AI access modes: (1) free models via proxy (no cost, rate-limited), (2) pay-per-request via instant checkout (guest mode), (3) user's own API keys (bring-your-own, unlimited)
- **FR-074**: System MUST work without AI features if user chooses not to use any AI option (AI is optional enhancement, not core functionality)
- **FR-089**: System MUST store AI generation metadata (model used, prompt, content analysis, cost, regeneration count) for AI-generated templates
- **FR-090**: System MUST allow users to regenerate AI templates with modified prompts (e.g., "make it more colorful", "use warmer tones") while preserving original for comparison
- **FR-091**: System MUST preserve AI generation provenance when users manually edit AI-generated templates (update source to 'user-created' but retain AI metadata)
- **FR-092**: System MUST allow users to rate AI-generated templates (1-5 stars) to improve future recommendations and track quality

#### Local-First Data Portability (P2)

- **FR-071**: System MUST export entire workspace (content, templates, preferences) as single .oneimg-workspace file
- **FR-072**: System MUST import workspace files with validation and zero data loss
- **FR-073**: System MUST export individual designs as .oneimg files shareable via any file transfer method
- **FR-074**: System MUST import designs from .oneimg files without requiring user account or internet connection
- **FR-075**: System MUST preserve all formatting, styling, and metadata during export/import cycles
- **FR-076**: System MUST support incremental export (only changed content since last export)
- **FR-077**: System MUST validate imported files for security (no executable code injection)
- **FR-083**: System MUST optimize .oneimg file size by extracting images to separate files within ZIP archive instead of base64 embedding
- **FR-084**: System MUST use JSON for scene data (text, layout, styling) with image references (paths) rather than inline data
- **FR-085**: System MUST compress images during export using efficient formats (WebP for photos, PNG for graphics) with quality optimization
- **FR-086**: System MUST structure .oneimg files as ZIP archives containing: scene.json (flat structure with nested children arrays for parent-child relationships), images/ folder, and metadata.json
- **FR-087**: System MUST reconstruct complete design from ZIP archive on import by resolving image references and rebuilding scene
- **FR-088**: System MUST achieve 60-80% file size reduction compared to base64-embedded format for designs with 3+ images

#### Platform Optimization (P2)

- **FR-078**: System MUST provide preset configurations for major platforms (WeChat, Instagram, Xiaohongshu, Twitter, LinkedIn)
- **FR-079**: System MUST automatically adjust canvas dimensions based on selected platform preset
- **FR-080**: System MUST apply platform-specific optimizations (watermark position, aspect ratios, file size limits)
- **FR-081**: System MUST validate exported content against platform requirements (size, dimensions, format)
- **FR-082**: System MUST generate preview of how content will appear on selected platform

#### Accessibility & UX (P2)

- **FR-047**: System MUST provide dark mode for editor UI that persists across sessions
- **FR-048**: System MUST support keyboard-only navigation throughout entire application
- **FR-049**: System MUST provide command palette (Cmd+K) for quick access to all features
- **FR-050**: System MUST include comprehensive keyboard shortcuts with discoverable help panel
- **FR-051**: System MUST provide ARIA labels and semantic HTML for screen reader compatibility
- **FR-052**: System MUST respect user's reduced motion preferences for animations
- **FR-053**: System MUST optimize editor for mobile and tablet devices with touch-friendly controls

#### Landing Page & Documentation (P2)

- **FR-054**: Website MUST display landing page with hero section explaining value proposition emphasizing local-first, privacy-focused approach
- **FR-055**: Landing page MUST showcase 5-10 user testimonials with attribution (name, role, photo)
- **FR-056**: Landing page MUST highlight key benefits: no login required, complete data ownership, works offline, no vendor lock-in
- **FR-057**: Landing page MUST include use cases section with 6+ categorized examples (social media, blog, presentation, infographic, newsletter, documentation)
- **FR-058**: Each use case MUST include before/after preview and brief description of benefits
- **FR-059**: System MUST provide searchable help documentation organized by user tasks
- **FR-060**: Help documentation MUST include quick start guide completable in under 5 minutes
- **FR-061**: Help documentation MUST cover all major features (editor, templates, export, file sharing) with screenshots
- **FR-062**: Help pages MUST include troubleshooting section with common issues and solutions
- **FR-063**: Landing page MUST load in under 2 seconds with optimized images and lazy loading
- **FR-064**: System MUST provide in-app help tooltips for first-time users with option to dismiss permanently

### Key Entities

- **Content Item**: Represents a piece of user-created content with title, body text, images, tags, creation date, last modified date, template reference, parent-child relationships (for nested sections), and favorite status.

- **Template**: Represents a styling configuration with CSS variables for colors, fonts, spacing, borders, shadows, layout rules, preview thumbnail, source type (built-in/user-created/ai-generated/imported), metadata (author, category, tags, rating, platform compatibility), and optional AI generation metadata (model used, prompt, content analysis, regeneration capability, generation cost, user feedback).

- **Export Configuration**: Represents settings for image export including format (PNG/JPEG/WebP), quality percentage, scale multiplier, target platform, color profile, and metadata inclusion preferences.

- **User Preferences**: Represents user's application settings including default template, default export format, theme (light/dark), cloud sync enabled/disabled, keyboard shortcuts customization, and AI features consent.

- **Tag**: Represents categorical label applied to content items for organization and filtering, with name, color, creation date, and usage count.

- **Workspace Backup**: Represents exportable snapshot of entire user workspace with all content items, custom templates, user preferences, tags, and metadata - structured as ZIP archive (.oneimg-workspace) containing multiple .oneimg design files and workspace.json manifest.

- **Design Share File**: Represents individual design exported as standalone .oneimg ZIP archive containing: scene.json (flat structure with all content items and nested children arrays for hierarchical relationships, text, layout, styling with image path references), images/ folder (optimized WebP/PNG files), metadata.json (version, export date, app version) - shareable via any file transfer method (email, USB, cloud storage, chat). Images are extracted from scene data to reduce file size by 60-80%.

- **AI Suggestion**: Represents AI-generated recommendations with suggestion type (headline/hashtag/template/grammar), original text, suggested alternatives, confidence score, and user acceptance status.

- **Pagination Configuration**: Represents settings for automatic content splitting with target platform, maximum images per set, optimal height per image, breakpoint detection rules (section/paragraph/sentence), and user-defined custom breakpoints.

- **Markdown Document**: Represents imported markdown file with original source text, parsed AST (abstract syntax tree), conversion errors/warnings, and mapping between markdown elements and editor nodes.

- **Landing Page Content**: Represents marketing website content with testimonials collection (user info, quote, rating, date), use case examples (category, title, description, preview images), help articles (title, content, category, search keywords), and analytics data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can export a 5-section content piece as WebP with progress indicator completing in under 10 seconds on standard hardware (i5 processor or equivalent)

- **SC-002**: Users can create a custom template using visual editor without CSS knowledge and apply it to content within 3 minutes

- **SC-003**: Users with 50+ content items can find specific content using search and filters within 5 seconds

- **SC-004**: 80% of users successfully complete their first export with new format options without requiring help documentation

- **SC-005**: Export file sizes reduce by 40-60% when using WebP format at 85% quality compared to PNG, while maintaining visual quality score above 90% (SSIM index)

- **SC-006**: Users can paste formatted content from Word/Google Docs with 95% formatting accuracy (bold, italic, lists, headings preserved)

- **SC-007**: Workspace export/import maintains 100% data fidelity with zero formatting loss across all content types

- **SC-008**: Users can export and import workspace containing 100+ items in under 10 seconds

- **SC-009**: AI-generated hashtag suggestions achieve 70% user acceptance rate (users keep at least 5 of 10 suggestions)

- **SC-010**: Platform-specific exports meet platform requirements (size, format, dimensions) with 100% compliance, eliminating upload errors

- **SC-011**: Mobile editor provides equivalent functionality to desktop with task completion times within 20% of desktop performance

- **SC-012**: Application scores 90+ on Lighthouse Accessibility audit with zero critical WCAG violations

- **SC-013**: Support tickets related to "export failed" or "export too slow" reduce by 70% after progress indicator and format options implementation

- **SC-014**: 60% of power users (10+ exports per week) adopt WebP or JPEG formats over PNG after understanding file size benefits

- **SC-015**: Template editor usage increases average templates per user from 1.2 to 4.5 within first month of availability

- **SC-016**: 85% of users with long-form content (15+ sections) successfully use auto-pagination without manual adjustment

- **SC-017**: Landing page achieves 40%+ conversion rate from visitor to first export within 10 minutes of arrival

- **SC-018**: Help documentation reduces support tickets by 50% for common issues (export problems, template questions, formatting help)

- **SC-019**: Users can import a 50-paragraph markdown document with 95% formatting accuracy (headings, lists, links, code preserved) in under 5 seconds

- **SC-020**: Advanced formatting features (custom fonts, indentation, strikethrough) are used by 30% of active users within first month

- **SC-021**: Paginated exports maintain visual consistency with less than 5% variation in styling across all generated images

- **SC-022**: User testimonials on landing page achieve 70%+ credibility rating in user surveys

- **SC-023**: Shared design files (.oneimg) open successfully on 95% of target browsers/devices without data corruption

- **SC-024**: .oneimg file with 5 images (2MB each) reduces from 15MB (base64) to under 6MB (ZIP with extracted images)

- **SC-025**: Export and import operations maintain 100% image quality fidelity with lossless compression options

- **SC-026**: Users can inspect .oneimg file contents by unzipping to access scene.json and images separately

- **SC-027**: AI-generated template styles match content tone and purpose with 75%+ user approval rating

- **SC-028**: Content optimization (grammar, clarity) improves readability scores by 30% on average

- **SC-029**: Free AI models provide responses within 5 seconds for 90% of requests

- **SC-030**: Users understand pay-per-request costs before confirmation with 95% cost transparency satisfaction

- **SC-031**: 60% of users try free AI models, 20% use pay-per-request for premium quality when needed

## Assumptions

- Users have modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with HTML5 canvas support
- Target users are content creators for social media, not enterprise marketing automation
- **Local-first architecture**: All data processing occurs client-side in browser (no server-side rendering, no user accounts, no cloud dependencies)
- Image processing occurs client-side in browser using HTML5 canvas and Web APIs
- Users understand basic image concepts (quality vs file size tradeoff)
- **Data ownership**: Users fully own their data - stored in browser IndexedDB with export/import for backup and sharing
- AI features include multiple free model providers (Llama 3.1 via Groq, Mistral 7B via HuggingFace) with automatic failover, plus optional pay-per-request premium models
- Free AI models use provider free tiers with rate limits (may queue requests during high traffic)
- Pay-per-request charges actual API costs + 10% service fee with full cost transparency (e.g., GPT-4 request: $0.03 API cost + $0.003 service fee = $0.033 total)
- Advanced users can bring their own API keys (OpenAI, Anthropic, etc.) for unlimited usage without proxy costs
- Payment processed via Stripe (credit card, Apple Pay, Google Pay) or Alipay (for Chinese users) without requiring account signup
- Currency: USD for international users, CNY for Alipay transactions (automatic conversion at current exchange rate)
- Template sharing occurs via file exchange, not centralized marketplace (no moderation infrastructure needed)
- Platform preset requirements are based on 2026 specifications and may need periodic updates
- Export quality is limited by html2canvas library capabilities and browser rendering engines
- Markdown import supports CommonMark spec with GitHub Flavored Markdown extensions
- Custom fonts are limited to Google Fonts API free tier (1000+ families available)
- Pagination algorithm prioritizes readability over exact equal-size splits
- Landing page testimonials are manually curated, not user-generated content (moderation required)
- Help documentation is maintained as markdown files in repository for easy updates
- File sharing between users uses existing channels (email, file hosting, chat) rather than built-in sharing system
- .oneimg files are ZIP archives (mimetype application/zip) containing structured data, not monolithic JSON
- Image optimization targets 80% quality WebP for photos, lossless PNG for graphics/screenshots
- ZIP format enables future extensibility (fonts, custom CSS, version metadata) without breaking changes

## Dependencies

- **html2canvas library**: Core dependency for canvas-to-image conversion. Considering migration to dom-to-image-more for better CSS support.
- **TipTap editor**: Current rich text editor. Extensions needed for color, font size, alignment features.
- **IndexedDB**: Browser storage for local-first content persistence. All data remains client-side.
- **Vercel AI SDK**: Unified AI integration framework (ai package) providing type-safe, streaming-capable interface for multiple providers (OpenAI, Anthropic, Groq, HuggingFace). Handles provider abstraction, error handling, and response streaming.
- **AI Providers**: Multiple free providers (Llama 3.1 via Groq API, Mistral 7B via HuggingFace Inference API) and premium models (OpenAI GPT-4, Anthropic Claude) integrated through AI SDK. User API keys supported for bring-your-own access.
- **Payment processing**: Stripe instant checkout (credit card, Apple Pay, Google Pay) + Alipay for Chinese market. All methods support guest checkout (no account required). Displays transparent cost breakdown (API cost + 10% service fee).
- **AI backend proxy**: Minimal Cloudflare Worker using Vercel AI SDK to handle free model routing with failover, paid model access with transparent per-request billing via Stripe/Alipay, and user API key passthrough.
- **Image compression libraries**: browser-image-compression for client-side optimization.
- **Template validation**: Schema validation library (e.g., Zod) for structure validation, plus CSS parser with whitelist-only property filtering to prevent XSS attacks (blocks url(), @import, expression()).
- **Markdown parser**: Unified.js or Marked.js for markdown to HTML conversion with syntax tree manipulation.
- **Google Fonts API**: Web font loading service for custom typography (free tier, no API key needed for basic usage).
- **Pagination algorithm**: Custom logic for intelligent content splitting based on natural breakpoints and platform constraints.
- **Landing page framework**: Next.js static site generation for fast loading and SEO optimization.
- **Help documentation**: Static site with client-side search (no external search service dependencies).
- **File I/O APIs**: Browser File API for workspace export/import and design sharing without server involvement.
- **ZIP library**: JSZip (already in use) for creating/extracting .oneimg archive files with scene data and images.
- **Image optimization**: Client-side image compression (browser-image-compression) for reducing file sizes during export.

## Out of Scope

- **Video export**: Converting content to video format or animated GIFs (future consideration)
- **Real-time audio**: Voice narration or text-to-speech in exported content
- **Blockchain/NFT**: Minting templates or content as NFTs
- **Subscription model**: No monthly/yearly recurring payments (only instant pay-per-request for AI)
- **User accounts for core features**: No authentication required for editing, export, templates (account-free remains core principle)
- **Print optimization**: CMYK color profiles, bleed margins, high-DPI printing requirements
- **Multi-language AI**: AI features initially support English and Chinese only
- **User authentication system**: No user accounts, login, or authentication required (local-first principle)
- **Cloud sync**: Real-time synchronization across devices via cloud services (conflicts with local-first architecture)
- **Real-time collaboration**: Multiple users editing same document simultaneously (requires server infrastructure)
- **Online template marketplace**: Centralized template hosting and distribution (templates shared via file export/import)
- **Enterprise SSO**: SAML, LDAP, or enterprise authentication
- **Advanced analytics**: Detailed usage tracking, A/B testing infrastructure, cohort analysis
- **Mobile apps**: Native iOS/Android apps (web-first, PWA considered for Phase 2)
- **Plugin system**: Third-party extension API for community developers
- **Whiteboard mode**: Freeform canvas with drawing tools (focused on structured content)
- **Version control**: Git-like branching and merging for content (simple version history only)

## Open Questions

These questions require stakeholder input to finalize specification:

1. **AI Model Selection**: ✅ RESOLVED - Using multi-provider approach with Llama 3.1 via Groq + Mistral 7B via HuggingFace for free tier, with automatic failover. User API keys supported for advanced users.

2. **Pay-Per-Request Pricing**: ✅ RESOLVED - Using transparent pass-through model (actual API cost + 10% service fee) with detailed cost breakdown shown before confirmation.

3. **Template Moderation**: Should community templates go live immediately or require approval? Option A: Immediate publishing with post-moderation. Option B: Pre-moderation review. Option C: Automated quality checks + community reporting.

4. **Export Watermark**: Should exports include small OneIMG watermark? Option A: No watermark (maintains trust). Option B: Optional watermark (helps attribution). Option C: Watermark removed for users who make any payment (AI requests).
