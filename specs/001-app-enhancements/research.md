# Research: OneIMG Application Enhancements

**Feature**: 001-app-enhancements | **Date**: 2026-01-29  
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Research Questions

### 1. Testing Framework Selection

**Question**: What testing setup is appropriate for Next.js 14 + React 18 + TipTap editor?

**Decision**: **Vitest + React Testing Library + Playwright**

**Rationale**:
- **Vitest**: Fast, Vite-native, Jest-compatible API, excellent TypeScript support, built-in coverage
- **React Testing Library**: Industry standard for React component testing, encourages accessibility-first testing
- **Playwright**: Modern E2E framework with great Next.js support, parallel execution, visual regression testing

**Alternatives Considered**:
- Jest + Testing Library: Slower than Vitest, more configuration overhead
- Cypress: Good but Playwright has better TypeScript support and parallel execution
- Puppeteer: Lower-level than Playwright, less convenient APIs

**Best Practices**:
- Test component behavior, not implementation details
- Use data-testid for stable selectors
- Mock IndexedDB using fake-indexeddb package
- Test TipTap editor using ProseMirror test utilities
- E2E tests for critical paths: create content → style → export → import

---

### 2. Image Export Optimization (WebP, JPEG, PNG)

**Question**: How to implement client-side image format conversion with quality control?

**Decision**: **html2canvas → Canvas API → browser-image-compression**

**Rationale**:
- **html2canvas**: Converts DOM to canvas (existing dependency, mature, wide browser support)
- **Canvas API toBlob()**: Native browser support for PNG, JPEG, WebP with quality parameter
- **browser-image-compression**: Additional optimization layer for size reduction without visible quality loss

**Alternatives Considered**:
- dom-to-image-more: Better CSS support but slower and larger bundle
- Sharp (server-side): Conflicts with local-first architecture
- WASM image codecs: Adds complexity, native APIs sufficient

**Best Practices**:
- PNG: Lossless, use for text-heavy content, graphics, screenshots
- JPEG: 85-90% quality for photos, not suitable for text (artifacts)
- WebP: 85% quality balances size/quality, best for mixed content
- Scale multiplier: 1x (72 DPI), 2x (144 DPI for high-res displays), 3x (216 DPI for print)
- Progress tracking: Track stages (DOM→Canvas, Canvas→Blob, Compression, ZIP creation)

**Implementation**:
```typescript
// Quality recommendations by format
const FORMAT_QUALITY = {
  png: 1.0,        // Lossless
  jpeg: 0.90,      // High quality for photos
  webp: 0.85,      // Balanced for mixed content
};

// Canvas to Blob with format
canvas.toBlob((blob) => {
  // Further optimize with browser-image-compression if needed
}, `image/${format}`, quality);
```

---

### 3. ZIP-Based .oneimg File Format

**Question**: What is the optimal structure for .oneimg files to achieve 60-80% size reduction?

**Decision**: **ZIP archive with scene.json + images/ folder + metadata.json**

**Rationale**:
- Base64 embedding inflates size by 33% (4 bytes per 3 original bytes)
- Extracting images to separate files eliminates encoding overhead
- ZIP compression further reduces JSON and image sizes
- Standard format enables inspection with any ZIP tool
- Supports future extensibility (fonts, custom CSS, version migrations)

**Structure**:
```
my-design.oneimg (ZIP file)
├── scene.json          # All content with image path references
├── metadata.json       # Version, export date, app version
└── images/
    ├── 001.webp       # Extracted images (optimized)
    ├── 002.png
    └── 003.webp
```

**scene.json Format**:
```json
{
  "version": "1.0",
  "contents": [
    {
      "id": "1",
      "type": "card",
      "title": "My Title",
      "body": "<p>Content with <img src=\"images/001.webp\"/></p>",
      "template": "tech-template",
      "children": [
        { "id": "2", "type": "card", "title": "Child", "body": "..." }
      ]
    }
  ]
}
```

**Best Practices**:
- Use relative paths: `images/001.webp` not absolute paths
- Optimize images before adding to ZIP (WebP 85% quality)
- Include version in metadata.json for future migrations
- Validate ZIP structure on import (required files present)
- Handle missing images gracefully (placeholder or error)

**Size Reduction Calculation**:
- Original: 5 images × 2MB base64 = 10MB text → 15MB embedded JSON
- Optimized: 5 images × 1.5MB WebP = 7.5MB + 50KB JSON = 7.55MB ZIP compressed → ~5-6MB final
- Reduction: 60-65% size reduction

---

### 4. TipTap Editor Extensions for Rich Formatting

**Question**: What TipTap extensions are needed for advanced editor features (colors, fonts, alignment, indentation)?

**Decision**: **Use official TipTap extensions + custom extensions for missing features**

**Required Extensions**:
- **Existing**: Bold, Italic, Underline, Lists, Image, Code, Link, History
- **Add Official**:
  - `@tiptap/extension-text-align`: Left, center, right, justify
  - `@tiptap/extension-text-style`: Base for color/font customization
  - `@tiptap/extension-color`: Text color picker
  - `@tiptap/extension-font-family`: Font selection
  - `@tiptap/extension-subscript`: Subscript text
  - `@tiptap/extension-superscript`: Superscript text
  - `@tiptap/extension-strike`: Strikethrough
- **Custom Extensions**:
  - Font size adjustment (small, medium, large, custom px)
  - Indentation (0-50px for blockquotes, paragraphs, lists)

**Rationale**:
- Official extensions are maintained, tested, well-documented
- Custom extensions only for missing functionality
- Extensions are composable and type-safe

**Best Practices**:
- Keep editor lightweight (lazy-load extensions)
- Provide keyboard shortcuts for all formatting (Cmd+B, Cmd+K, etc.)
- Show formatting toolbar on text selection (bubble menu)
- Persist editor content as JSON (ProseMirror document format)
- Sanitize HTML on paste to prevent XSS

**Implementation**:
```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    FontFamily.configure({
      types: ['textStyle'],
    }),
    // Custom font size extension
    FontSize.configure({
      types: ['textStyle'],
    }),
  ],
});
```

---

### 5. Markdown Import (CommonMark + GFM)

**Question**: How to parse markdown and convert to TipTap/ProseMirror format?

**Decision**: **Unified.js (remark + remark-parse + remark-prosemirror)**

**Rationale**:
- **Unified.js**: Industry standard for markdown processing, plugin ecosystem
- **remark-parse**: Parses markdown to MDAST (Markdown Abstract Syntax Tree)
- **remark-gfm**: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **remark-prosemirror**: Converts MDAST to ProseMirror JSON (TipTap format)

**Alternatives Considered**:
- Marked.js: Converts to HTML, not ProseMirror format (requires additional conversion)
- Showdown: Older, less extensible than Unified
- Custom parser: Reinventing the wheel, hard to maintain

**Best Practices**:
- Support CommonMark + GFM extensions
- Validate markdown syntax before import (show clear errors)
- Preview converted content before inserting into editor
- Preserve formatting: headings (h1-h6), lists, links, code blocks, blockquotes, images
- Handle unsupported syntax gracefully (convert to plain text)

**Implementation**:
```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkProsemirror from 'remark-prosemirror';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkProsemirror, { schema: editor.schema });

const doc = processor.processSync(markdownText).result;
editor.commands.setContent(doc);
```

---

### 6. Auto-Pagination Algorithm

**Question**: How to intelligently split long content across multiple images?

**Decision**: **Hierarchical breakpoint detection + height calculation**

**Algorithm**:
1. **Measure content height**: Render full content off-screen, measure height
2. **Calculate page capacity**: Based on platform preset (e.g., Instagram 1350px height)
3. **Identify breakpoints**: 
   - Priority 1: Section headings (h1, h2, h3)
   - Priority 2: Paragraph boundaries
   - Priority 3: Sentence endings (last resort)
4. **Assign content to pages**: Greedy algorithm - fill page until next breakpoint exceeds capacity
5. **Manual adjustment**: Allow users to drag breakpoints in visual editor

**Rationale**:
- Hierarchical priority prevents awkward splits (mid-paragraph)
- Height-based calculation ensures images fit platform constraints
- Manual override provides flexibility for edge cases

**Best Practices**:
- Add margin/padding buffer (50px) to prevent clipping
- Preview all pages before export
- Add page indicators (1/5, 2/5) when pagination enabled
- Maintain consistent styling across pages (headers, footers, margins)

**Implementation**:
```typescript
function detectBreakpoints(contentNode: HTMLElement, maxHeight: number) {
  const breakpoints = [];
  let currentHeight = 0;
  
  // Walk DOM tree, measure each element
  for (const child of contentNode.children) {
    const childHeight = child.getBoundingClientRect().height;
    
    if (currentHeight + childHeight > maxHeight) {
      // Need breakpoint before this element
      const priority = getBreakpointPriority(child);
      breakpoints.push({ element: child, priority, height: currentHeight });
      currentHeight = childHeight;
    } else {
      currentHeight += childHeight;
    }
  }
  
  return breakpoints;
}
```

---

### 7. CSS Security Validation (Template Import)

**Question**: How to prevent XSS attacks from malicious imported templates?

**Decision**: **Whitelist-only CSS parser with PostCSS**

**Rationale**:
- **PostCSS**: Industry standard CSS parser, AST-based validation
- **Whitelist approach**: Only allow safe properties, reject dangerous ones
- **Zero executable code**: Block `url()`, `@import`, `expression()`, `calc()` with URLs

**Dangerous CSS Features**:
- `url()` with external resources (data exfiltration, CORS bypass)
- `@import` (load external stylesheets)
- `expression()` (IE-only, JavaScript execution)
- `-moz-binding` (XBL injection)
- `behavior` (HTC files in IE)

**Allowed Properties** (whitelist):
- Layout: `display`, `position`, `top`, `left`, `width`, `height`, `margin`, `padding`
- Typography: `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`, `color`
- Visual: `background-color`, `border`, `border-radius`, `box-shadow`, `opacity`
- Animation: `transition`, `transform` (limited)

**Best Practices**:
- Parse CSS with PostCSS, walk AST
- Reject any property not in whitelist
- Reject any value containing `url()`, `calc()`, `attr()`
- Sanitize color values (hex, rgb, rgba, hsl only)
- Validate numeric values (no negative values for size/spacing)

**Implementation**:
```typescript
import postcss from 'postcss';

const ALLOWED_PROPERTIES = new Set([
  'color', 'background-color', 'font-size', 'font-family',
  'margin', 'padding', 'border', 'border-radius',
  // ... more safe properties
]);

function validateCSS(css: string): ValidationResult {
  const root = postcss.parse(css);
  const errors = [];
  
  root.walkDecls((decl) => {
    if (!ALLOWED_PROPERTIES.has(decl.prop)) {
      errors.push(`Property '${decl.prop}' not allowed`);
    }
    if (decl.value.includes('url(') || decl.value.includes('import')) {
      errors.push(`Value '${decl.value}' contains dangerous function`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}
```

---

### 8. AI Backend Proxy Architecture

**Question**: How to implement multi-provider AI routing with transparent pay-per-request billing?

**Decision**: **Cloudflare Workers + Vercel AI SDK + Stripe + Alipay**

**Architecture**:
```
Client → Cloudflare Worker (AI SDK) → AI Providers
                ↓
         Stripe API / Alipay API (pay-per-request)
```

**Rationale**:
- **Cloudflare Workers**: Serverless, low latency, pay-per-request pricing aligns with usage model
- **Vercel AI SDK**: Unified API for all providers, type-safe, streaming support, automatic retries, provider abstraction
- **Stripe Instant Checkout**: Guest checkout for international users, credit card/Apple Pay/Google Pay support
- **Alipay**: Native payment method for Chinese users, QR code support, CNY currency
- **Multi-provider via AI SDK**: Groq (Llama), HuggingFace (Mistral), OpenAI, Anthropic with consistent interface

**Request Flow**:
1. **Free models**: Client → Worker → Groq/HF → Response (rate-limited, no billing)
2. **Paid models (Stripe)**: Client → Worker → Stripe checkout → Worker → OpenAI/Claude → Response
3. **Paid models (Alipay)**: Client → Worker → Alipay QR code → Worker → OpenAI/Claude → Response
4. **User keys**: Client → Worker (passthrough) → Provider (user's key) → Response

**Best Practices**:
- Store no user data (stateless proxy)
- Rate limit free tier: 10 requests/hour per IP
- Transparent costs: Show actual API cost + 10% fee before payment
- Currency conversion: Automatic USD↔CNY conversion at current exchange rate
- Timeout handling: 30s timeout, fallback to free models
- Error handling: Clear messages (rate limited, payment failed, API error)
- Payment verification: Webhook callbacks for Stripe, polling for Alipay

**Implementation**:
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';

// Cloudflare Worker with AI SDK
export default {
  async fetch(request: Request, env: Env) {
    const { provider, prompt, apiKey, paymentMethod } = await request.json();
    
    // Configure AI SDK provider
    let aiProvider;
    if (provider === 'gpt-4') {
      aiProvider = openai('gpt-4', { apiKey: apiKey || env.OPENAI_API_KEY });
    } else if (provider === 'claude-opus') {
      aiProvider = anthropic('claude-opus-20240229', { apiKey: apiKey || env.ANTHROPIC_API_KEY });
    } else if (provider === 'llama-3.1' || provider === 'free') {
      aiProvider = groq('llama-3.1-8b-instant', { apiKey: env.GROQ_API_KEY });
    }
    
    if (apiKey) {
      // User's own key - direct generation
      const { text } = await generateText({
        model: aiProvider,
        prompt: prompt,
      });
      return Response.json({ text, provider, costUSD: 0 });
    }
    
    if (provider === 'free') {
      // Check rate limit
      const limited = await checkRateLimit(request);
      if (limited) return errorResponse('Rate limited');
      
      // Use free provider with AI SDK
      const { text } = await generateText({
        model: aiProvider,
        prompt: prompt,
      });
      return Response.json({ text, provider: 'groq', costUSD: 0 });
    }
    
    // Pay-per-request
    const cost = calculateCost(provider, prompt);
    const currency = detectUserRegion(request) === 'CN' ? 'CNY' : 'USD';
    
    const paymentVerified = paymentMethod === 'alipay'
      ? await verifyAlipayPayment(request)
      : await verifyStripePayment(request);
      
    if (paymentVerified) {
      const { text, usage } = await generateText({
        model: aiProvider,
        prompt: prompt,
      });
      
      return Response.json({
        text,
        provider,
        costUSD: cost,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      });
    }
    
    return errorResponse('Payment failed');
  }
};
```

---

### 9. IndexedDB Schema for Enhanced Content Management

**Question**: How to structure IndexedDB for full-text search, tags, collections, and bulk operations?

**Decision**: **Dexie.js with compound indexes**

**Schema**:
```typescript
const db = new Dexie('OneIMGDatabase');

db.version(2).stores({
  contents: '++id, title, *tags, createdAt, updatedAt, templateId, collectionId',
  templates: '++id, name, category, isCustom',
  collections: '++id, name, createdAt',
  preferences: 'key',
});
```

**Rationale**:
- **Dexie.js**: Modern IndexedDB wrapper, TypeScript support, compound indexes, transactions
- **Compound indexes**: Enable efficient filtering by multiple criteria
- **Multi-entry index** (`*tags`): Enables tag-based queries
- **Version migrations**: Structured schema updates

**Best Practices**:
- Index fields used in queries: `title`, `tags`, `createdAt`, `templateId`
- Use transactions for bulk operations (delete, export, tag)
- Implement full-text search with client-side index (Fuse.js or Lunr.js)
- Backup strategy: Export to .oneimg-workspace file
- Quota management: Monitor storage usage, warn at 80% capacity

**Full-Text Search**:
```typescript
import Fuse from 'fuse.js';

const contents = await db.contents.toArray();
const fuse = new Fuse(contents, {
  keys: ['title', 'body', 'tags'],
  threshold: 0.3,
});

const results = fuse.search(query);
```

---

### 10. Platform Preset Configurations

**Question**: What are the optimal dimensions and constraints for major social platforms?

**Decision**: **Research-based presets with validation rules**

**Platform Specifications** (2026):

| Platform | Dimensions | Aspect Ratio | Max Images | Format | File Size |
|----------|-----------|--------------|-----------|--------|-----------|
| WeChat | 1125×1125 | 1:1 | 9 | JPEG/PNG | <20MB |
| Instagram (Feed) | 1080×1080 | 1:1 | 10 | JPEG/PNG | <30MB |
| Instagram (Story) | 1080×1920 | 9:16 | 1 | JPEG/PNG | <30MB |
| Instagram (Carousel) | 1080×1350 | 4:5 | 10 | JPEG/PNG | <30MB |
| Xiaohongshu | 1242×1660 | 3:4 | 9 | JPEG/PNG | <20MB |
| Twitter/X | 1600×900 | 16:9 | 4 | JPEG/PNG | <5MB |
| LinkedIn | 1200×627 | 1.91:1 | 1 | JPEG/PNG | <5MB |

**Best Practices**:
- Validate dimensions before export
- Warn users if file size exceeds platform limit
- Suggest format based on platform (Twitter: JPEG, Instagram: PNG or JPEG)
- Provide "safe zone" overlays for text placement
- Test exports on actual platforms

**Implementation**:
```typescript
export const PLATFORM_PRESETS = {
  instagram: {
    name: 'Instagram Carousel',
    dimensions: { width: 1080, height: 1350 },
    aspectRatio: 4 / 5,
    maxImages: 10,
    formats: ['jpeg', 'png'],
    maxFileSize: 30 * 1024 * 1024, // 30MB
  },
  // ... more presets
};

function validateExport(preset, exportConfig) {
  if (exportConfig.images.length > preset.maxImages) {
    throw new Error(`Max ${preset.maxImages} images for ${preset.name}`);
  }
  // ... more validations
}
```

---

## Summary

All technical unknowns resolved. Key decisions:
1. **Testing**: Vitest + React Testing Library + Playwright
2. **Image Export**: html2canvas → Canvas API → browser-image-compression
3. **File Format**: ZIP with scene.json + images/ + metadata.json
4. **Editor**: TipTap official extensions + custom font-size/indent
5. **Markdown**: Unified.js (remark-prosemirror)
6. **Pagination**: Hierarchical breakpoints (headings > paragraphs > sentences)
7. **Security**: PostCSS whitelist-only CSS validation
8. **AI Backend**: Cloudflare Workers + Stripe instant checkout
9. **Storage**: Dexie.js + Fuse.js for full-text search
10. **Platforms**: Research-based presets with validation

**Next Phase**: Generate data-model.md and contracts/
