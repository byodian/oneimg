# Quick Start Guide: OneIMG Enhancements Implementation

**Feature**: 001-app-enhancements | **Date**: 2026-01-29  
**Target Audience**: Developers implementing this specification

## Prerequisites

- Node.js 18+ and pnpm installed
- Familiarity with Next.js 14, React 18, TypeScript
- Understanding of TipTap/ProseMirror editor
- Basic knowledge of IndexedDB and Cloudflare Workers (for AI backend)

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd e:\code\personal\oneimg

# Add new dependencies
pnpm add @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-font-family @tiptap/extension-subscript @tiptap/extension-superscript @tiptap/extension-strike
pnpm add dexie fuse.js unified remark-parse remark-gfm remark-prosemirror
pnpm add browser-image-compression postcss

# Add Vercel AI SDK and provider adapters
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/groq

# Dev dependencies
pnpm add --save-dev vitest @testing-library/react @testing-library/jest-dom @playwright/test fake-indexeddb
```

### 2. Configure Testing

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
```

### 3. Update IndexedDB Schema

Edit `src/lib/indexed-db.ts`:
```typescript
import Dexie, { Table } from 'dexie';

// Import types from data-model.md
interface ContentItem {
  id?: number;
  title: string;
  body: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  templateId: string;
  collectionId: string | null;
  // ... see data-model.md for full definition
}

class OneIMGDatabase extends Dexie {
  contents!: Table<ContentItem>;
  templates!: Table<Template>;
  collections!: Table<Collection>;
  tags!: Table<Tag>;
  preferences!: Table<Preference>;
  aiSuggestions!: Table<AISuggestion>;

  constructor() {
    super('OneIMGDatabase');
    this.version(2).stores({
      contents: '++id, title, *tags, createdAt, updatedAt, templateId, collectionId, parentId',
      templates: '++id, &name, category, isCustom, isBuiltIn',
      collections: '++id, name, createdAt',
      tags: '++id, &name, usageCount',
      preferences: 'key',
      aiSuggestions: '++id, contentId, type, createdAt',
    });
  }
}

export const db = new OneIMGDatabase();
```

### 4. Create Core Utilities

**Export Pipeline** (`src/lib/export/image-exporter.ts`):
```typescript
import html2canvas from 'html2canvas';
import { compress } from 'browser-image-compression';

export async function exportToFormat(
  element: HTMLElement,
  format: 'png' | 'jpeg' | 'webp',
  quality: number = 0.85,
  scale: number = 2,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Stage 1: DOM → Canvas (40%)
  onProgress?.(0.1);
  const canvas = await html2canvas(element, { scale });
  onProgress?.(0.4);
  
  // Stage 2: Canvas → Blob (70%)
  const blob = await canvasToBlob(canvas, format, quality);
  onProgress?.(0.7);
  
  // Stage 3: Compression (100%)
  const compressed = await compress(blob, { maxSizeMB: 10 });
  onProgress?.(1.0);
  
  return compressed;
}

function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
      `image/${format}`,
      quality
    );
  });
}
```

**ZIP Builder** (`src/lib/export/zip-builder.ts`):
```typescript
import JSZip from 'jszip';

export async function createOneImgFile(
  content: ContentItem,
  template: Template,
  images: Blob[]
): Promise<Blob> {
  const zip = new JSZip();
  
  // Add scene.json
  const scene = {
    version: '1.0',
    content,
    template,
  };
  zip.file('scene.json', JSON.stringify(scene, null, 2));
  
  // Add metadata.json
  const metadata = {
    exportedAt: new Date().toISOString(),
    appVersion: '0.4.0',
    checksum: '', // Calculate SHA-256
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  
  // Add images
  const imagesFolder = zip.folder('images');
  images.forEach((blob, index) => {
    imagesFolder!.file(`${String(index + 1).padStart(3, '0')}.webp`, blob);
  });
  
  return zip.generateAsync({ type: 'blob' });
}
```

### 5. Enhance Editor

Add new TipTap extensions to `src/components/editor/editor-container.tsx`:
```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';

const editor = useEditor({
  extensions: [
    StarterKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    FontFamily,
    // ... more extensions
  ],
  content: initialContent,
});
```

### 6. Configure Payment Integration (AI Backend)

**Stripe Setup**:
```bash
# Install Stripe SDK
cd backend
pnpm add stripe

# Set environment variables
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Alipay Setup**:
```bash
# Install Alipay SDK
pnpm add alipay-sdk

# Set environment variables
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...
ALIPAY_PUBLIC_KEY=...
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

**Backend Configuration** (`backend/src/config/payment.ts`):
```typescript
export const paymentConfig = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY,
    gateway: process.env.ALIPAY_GATEWAY,
  },
  currency: {
    default: 'USD',
    supported: ['USD', 'CNY'],
    exchangeRateAPI: 'https://api.exchangerate-api.com/v4/latest/USD',
  },
};
```

**AI SDK Configuration** (`backend/src/config/ai.ts`):
```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';

export const aiProviders = {
  free: {
    'llama-3.1': groq('llama-3.1-8b-instant', {
      apiKey: process.env.GROQ_API_KEY,
    }),
    'mistral-7b': groq('mixtral-8x7b-32768', {
      apiKey: process.env.GROQ_API_KEY, // Groq hosts Mixtral
    }),
  },
  paid: {
    'gpt-4': openai('gpt-4-turbo', {
      apiKey: process.env.OPENAI_API_KEY,
    }),
    'claude-opus': anthropic('claude-3-opus-20240229', {
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  },
};

export function getAIProvider(providerId: string, userApiKey?: string) {
  if (userApiKey) {
    // User's own API key
    if (providerId.startsWith('gpt')) {
      return openai(providerId, { apiKey: userApiKey });
    } else if (providerId.startsWith('claude')) {
      return anthropic(providerId, { apiKey: userApiKey });
    }
  }
  
  // Use configured providers
  return aiProviders.free[providerId] || aiProviders.paid[providerId];
}
```

### 7. Implement AI Integration with SDK

**Backend Route** (`backend/src/routes/ai.ts`):
```typescript
import { generateText } from 'ai';
import { getAIProvider } from '../config/ai';

export async function handleAIRequest(request: Request) {
  const { type, text, provider, apiKey } = await request.json();
  
  const aiModel = getAIProvider(provider, apiKey);
  
  const prompt = buildPrompt(type, text); // headline, hashtag, grammar, etc.
  
  const { text: generatedText, usage } = await generateText({
    model: aiModel,
    prompt,
    maxTokens: 150,
  });
  
  return Response.json({
    suggestions: parseResponse(generatedText, type),
    provider,
    usage,
    costUSD: calculateCost(provider, usage.totalTokens),
  });
}
```

**Frontend Client** (`src/lib/ai/ai-client.ts`):
```typescript
export async function generateAISuggestions({
  type,
  text,
  provider = 'free',
  apiKey,
}: {
  type: 'headline' | 'hashtag' | 'grammar' | 'template';
  text: string;
  provider?: string;
  apiKey?: string;
}) {
  const response = await fetch('/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, text, provider, apiKey }),
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  return response.json();
}
```

## Development Workflow

### Phase 1: Export Enhancement (P1)
1. Create export progress UI component
2. Implement format selector (PNG/JPEG/WebP)
3. Add quality slider
4. Test with 5-image content (<10s target)

**Test**:
```typescript
// tests/export.test.ts
import { describe, it, expect } from 'vitest';
import { exportToFormat } from '@/lib/export/image-exporter';

describe('Image Export', () => {
  it('exports to WebP with 60% size reduction', async () => {
    const element = document.createElement('div');
    element.innerHTML = '<h1>Test</h1>';
    
    const webp = await exportToFormat(element, 'webp', 0.85);
    const png = await exportToFormat(element, 'png', 1.0);
    
    expect(webp.size).toBeLessThan(png.size * 0.6);
  });
});
```

### Phase 2: Visual Template Editor (P1)
1. Create template editor UI with color pickers
2. Add real-time preview
3. Implement template import/export
4. Add CSS validation (whitelist-only)

### Phase 3: Content Search (P2)
1. Initialize Fuse.js search index
2. Create search UI component
3. Add tag filtering
4. Implement bulk operations

### Phase 4: Editor Enhancement (P2)
1. Add text color picker
2. Add font size/family selectors
3. Implement markdown import
4. Add keyboard shortcuts

### Phase 5: AI Features (P3)
1. Create AI backend (Cloudflare Worker)
2. Implement frontend AI panel
3. Add cost estimator
4. Test multi-provider routing

### Phase 6: Local-First Export/Import (P2)
1. Implement workspace export (ZIP)
2. Implement workspace import
3. Test file size optimization
4. Validate data fidelity

### Phase 7: Auto-Pagination (P2)
1. Implement breakpoint detection
2. Add manual adjustment UI
3. Test with platform presets

### Phase 8: Accessibility (P2)
1. Add dark mode toggle
2. Implement keyboard navigation
3. Add command palette (Cmd+K)
4. Test with screen readers

### Phase 9: Landing Page (P2)
1. Create hero section
2. Add testimonials component
3. Build use cases section
4. Optimize for <2s load time

### Phase 10: Help Documentation (P2)
1. Create help page structure
2. Write quick start guide
3. Add searchable docs
4. Include troubleshooting

## Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm playwright test

# Coverage
pnpm test --coverage
```

## Deployment

### Frontend (Cloudflare Pages)
```bash
pnpm build
pnpm deploy
```

### AI Backend (Cloudflare Worker)
```bash
cd backend
pnpm build
wrangler deploy
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/indexed-db.ts` | Database schema and operations |
| `src/lib/export/image-exporter.ts` | Image export pipeline |
| `src/lib/export/zip-builder.ts` | .oneimg file creation |
| `src/lib/import/oneimg-importer.ts` | .oneimg file parsing |
| `src/lib/validation/css-validator.ts` | Template security |
| `src/lib/ai/ai-client.ts` | AI SDK client wrapper |
| `src/lib/ai/providers.ts` | AI SDK provider configurations |
| `src/components/editor/editor-toolbar.tsx` | Rich formatting UI |
| `src/components/template/template-editor.tsx` | Visual template editor |
| `src/components/ai/ai-panel.tsx` | AI suggestions UI |
| `backend/src/routes/ai-free.ts` | Free model routing with AI SDK |
| `backend/src/routes/ai-paid.ts` | Pay-per-request billing with AI SDK |
| `backend/src/services/ai-providers.ts` | Vercel AI SDK setup |
| `backend/src/services/stripe-service.ts` | Stripe payment integration |
| `backend/src/services/alipay-service.ts` | Alipay payment integration |
| `backend/src/config/ai.ts` | AI SDK provider configuration |

## Common Pitfalls

❌ **Don't**: Embed images as base64 in JSON (bloats size)  
✅ **Do**: Extract images to separate files in ZIP

❌ **Don't**: Allow arbitrary CSS in imported templates  
✅ **Do**: Validate with whitelist-only parser

❌ **Don't**: Block UI during export  
✅ **Do**: Use Web Workers or chunked processing

❌ **Don't**: Store user API keys in plain text  
✅ **Do**: Encrypt before storing in IndexedDB

❌ **Don't**: Hardcode platform dimensions  
✅ **Do**: Use configurable presets that can be updated

## Success Metrics

After implementation, verify:
- ✅ Export 5-image content in <10s
- ✅ WebP reduces size by 40-60% vs PNG
- ✅ Search 50+ items in <5s
- ✅ Landing page loads in <2s
- ✅ .oneimg files 60-80% smaller than base64
- ✅ AI suggestions in <5s (free tier)
- ✅ Zero WCAG critical violations

## Next Steps

1. Read [research.md](research.md) for detailed technical decisions
2. Review [data-model.md](data-model.md) for schema definitions
3. Check [contracts/ai-backend-api.md](contracts/ai-backend-api.md) for API specs
4. Run `/speckit.tasks` to generate implementation tasks

## Support

- **Spec Questions**: Review clarifications in [spec.md](spec.md)
- **Technical Issues**: Check research.md for implementation guidance
- **Architecture Decisions**: See plan.md for structure
