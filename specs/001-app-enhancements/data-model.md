# Data Model: OneIMG Application Enhancements

**Feature**: 001-app-enhancements | **Date**: 2026-01-29

## Entity Definitions

### Content Item

Represents a piece of user-created content in the workspace.

**Fields**:
- `id`: string (auto-increment, primary key)
- `title`: string (max 200 chars, required)
- `body`: string (TipTap JSON format, required)
- `images`: ImageRef[] (references to embedded images)
- `tags`: string[] (multi-entry index)
- `createdAt`: Date (ISO 8601, indexed)
- `updatedAt`: Date (ISO 8601, indexed)
- `templateId`: string (foreign key → Template.id, indexed)
- `collectionId`: string | null (foreign key → Collection.id, indexed)
- `parentId`: string | null (foreign key → ContentItem.id, for nested content)
- `isFavorite`: boolean (default: false)
- `wordCount`: number (computed from body)
- `metadata`: ContentMetadata (see below)

**ContentMetadata**:
```typescript
{
  exportCount: number;           // Times exported
  lastExportedAt: Date | null;
  platformTags: string[];        // Platform associations
  aiAssisted: boolean;           // Used AI features
}
```

**Validation Rules**:
- Title: Non-empty, ≤200 chars
- Body: Valid TipTap JSON (schema validation)
- Tags: Lowercase, alphanumeric + hyphens, ≤50 chars each, max 10 tags
- Images: Valid path references, files must exist in IndexedDB blobs

**Relationships**:
- Many-to-one: ContentItem → Template
- Many-to-one: ContentItem → Collection (optional)
- Many-to-one: ContentItem → ContentItem (parent-child for nested sections)

---

### Template

Represents a styling configuration with CSS variables and layout rules.

**Fields**:
- `id`: string (UUID, primary key)
- `name`: string (unique, max 100 chars, required)
- `description`: string (max 500 chars)
- `category`: TemplateCategory (enum: minimalist, tech, cartoon, magazine, gradient, dark)
- `cssVariables`: Record<string, string> (validated CSS properties)
- `layoutRules`: LayoutConfig (see below)
- `previewThumbnail`: string (data URL or path, max 100KB)
- `source`: TemplateSource (enum: 'built-in', 'user-created', 'ai-generated', 'imported')
- `isBuiltIn`: boolean (true for system templates, cannot be deleted)
- `createdAt`: Date
- `updatedAt`: Date
- `author`: string (for custom templates, user name or "AI Assistant")
- `version`: string (semver, e.g., "1.0.0")
- `usageCount`: number (times used)
- `rating`: number | null (user rating 1-5 stars, for imported/AI templates)
- `aiGenerationMetadata`: AIGenerationMetadata | null (only present if source is 'ai-generated')
- `metadata`: TemplateMetadata (see below)

**LayoutConfig**:
```typescript
{
  cardPadding: string;      // e.g., "20px"
  cardMargin: string;
  borderRadius: string;
  maxWidth: string;
  headerHeight: string;
}
```

**TemplateMetadata**:
```typescript
{
  platform: string[];       // Target platforms (e.g., ['wechat', 'instagram'])
  colorScheme: 'light' | 'dark' | 'auto';
  accessibility: {
    contrastRatio: number;  // WCAG AA: ≥4.5:1
    fontSize: string;       // Minimum readable size
  };
  tags: string[];           // Searchable tags (e.g., ['professional', 'minimal'])
  isPublic: boolean;        // If true, available for community gallery export
}
```

**AIGenerationMetadata** (only present when source is 'ai-generated'):
```typescript
{
  modelUsed: string;           // AI model identifier (e.g., 'gpt-4', 'claude-opus')
  generationDate: Date;        // When template was generated
  prompt: string;              // User's generation request
  contentAnalysis: {           // What AI analyzed to generate template
    contentLength: number;     // Character count
    contentType: string;       // 'article', 'quote', 'technical', 'marketing'
    tone: string;              // 'professional', 'casual', 'playful'
    hasImages: boolean;
  };
  generationCost: number;      // USD cost of generation
  regenerationCount: number;   // How many times user regenerated
  acceptedOnFirstTry: boolean; // Quality indicator
  userFeedback: string | null; // Optional feedback ("too colorful", "perfect")
  canRegenerate: boolean;      // If true, user can regenerate with modified prompt
}
```

**Validation Rules**:
- Name: Unique, non-empty, ≤100 chars
- CSS variables: Whitelist-only properties (see research.md #7)
- Preview thumbnail: Valid image, ≤100KB
- Version: Valid semver format
- Source: Must be one of 'built-in', 'user-created', 'ai-generated', 'imported'
- AIGenerationMetadata: Required if source is 'ai-generated', must be null otherwise
- Rating: If present, must be integer 1-5

**State Transitions**:
- Draft → Published (custom and AI-generated templates)
- Published → Archived (when deprecated)
- AI-generated → User-edited (updates source to 'user-created', preserves AI metadata for provenance)
- Built-in templates cannot be deleted, only hidden

**Regeneration Workflow** (AI templates only):
1. User clicks "Regenerate" on AI-generated template
2. System retrieves original prompt and contentAnalysis from aiGenerationMetadata
3. User can modify prompt (e.g., "make it more colorful", "use warmer tones")
4. System calls AI with updated prompt + content context
5. New template created with incremented regenerationCount
6. Original template preserved (not overwritten) for comparison

---

### Export Configuration

Represents settings for image export.

**Fields**:
- `format`: ExportFormat (enum: 'png', 'jpeg', 'webp')
- `quality`: number (0.1-1.0, default: 0.85 for webp/jpeg, 1.0 for png)
- `scale`: number (1, 2, or 3 for DPI scaling, default: 2)
- `targetPlatform`: PlatformPreset | null (enum: wechat, instagram, xiaohongshu, twitter, linkedin)
- `includeMetadata`: boolean (preserve EXIF data, default: true)
- `enablePagination`: boolean (auto-split long content, default: false)
- `paginationConfig`: PaginationConfig | null (see below)
- `colorProfile`: string (default: 'sRGB')
- `backgroundColor`: string (hex color, default: transparent)

**PaginationConfig**:
```typescript
{
  maxImagesPerSet: number;      // Platform constraint (e.g., 10 for Instagram)
  optimalHeightPerImage: number; // px (e.g., 1350 for Instagram)
  showPageIndicators: boolean;   // Add "1/5", "2/5"
  pageIndicatorPosition: 'top' | 'bottom';
  manualBreakpoints: number[];   // User-defined split points (content indices)
}
```

**Validation Rules**:
- Quality: 0.1 ≤ quality ≤ 1.0
- Scale: Must be 1, 2, or 3
- Format: Must be 'png', 'jpeg', or 'webp'
- Target platform: If set, validate dimensions and file size against preset

---

### User Preferences

Represents application settings persisted across sessions.

**Fields**:
- `key`: string (primary key, e.g., 'editor', 'export', 'ai')
- `value`: PreferenceValue (polymorphic JSON)

**PreferenceValue Types**:
```typescript
// key: 'editor'
{
  defaultTemplateId: string;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  showFormatToolbar: boolean;
  enableMarkdownShortcuts: boolean;
}

// key: 'export'
{
  defaultFormat: ExportFormat;
  defaultQuality: number;
  defaultScale: number;
  lastUsedPlatform: string;
}

// key: 'theme'
{
  mode: 'light' | 'dark' | 'auto';
  accentColor: string;
}

// key: 'ai'
{
  preferredProvider: 'free' | 'paid' | 'own-keys';
  apiKeys: Record<string, string>; // Encrypted
  freeModelUsageCount: number;
  lastRequestAt: Date | null;
}

// key: 'accessibility'
{
  reducedMotion: boolean;
  keyboardShortcuts: Record<string, string>; // Customizable
  screenReaderMode: boolean;
}
```

**Validation Rules**:
- Key: Must be one of predefined preference types
- Value: Must match schema for the key type
- API keys: Must be encrypted before storage

---

### Tag

Represents a categorical label for content organization.

**Fields**:
- `id`: string (UUID, primary key)
- `name`: string (unique, lowercase, max 50 chars)
- `color`: string (hex color, default: '#3b82f6')
- `createdAt`: Date
- `usageCount`: number (number of content items with this tag)
- `lastUsedAt`: Date | null

**Validation Rules**:
- Name: Lowercase, alphanumeric + hyphens, ≤50 chars, unique
- Color: Valid hex color (#RRGGBB)
- Usage count: Auto-updated on tag assignment/removal

**Relationships**:
- Many-to-many: Tag ↔ ContentItem (via tags array in ContentItem)

---

### Collection

Represents a user-defined folder for organizing content.

**Fields**:
- `id`: string (UUID, primary key)
- `name`: string (max 100 chars, required)
- `description`: string (max 500 chars)
- `color`: string (hex color, default: '#3b82f6')
- `icon`: string (icon name, default: 'folder')
- `createdAt`: Date
- `updatedAt`: Date
- `contentCount`: number (auto-computed)

**Validation Rules**:
- Name: Non-empty, ≤100 chars
- Color: Valid hex color
- Content count: Auto-updated when items added/removed

**Relationships**:
- One-to-many: Collection → ContentItem

---

### Workspace Backup

Represents an exportable snapshot of the entire user workspace.

**Fields**:
- `version`: string (workspace format version, e.g., "1.0")
- `exportedAt`: Date (ISO 8601)
- `appVersion`: string (OneIMG version, e.g., "0.4.0")
- `contents`: ContentItem[] (all content items)
- `templates`: Template[] (custom templates only, built-ins excluded)
- `collections`: Collection[]
- `tags`: Tag[]
- `preferences`: Record<string, PreferenceValue>
- `metadata`: WorkspaceMetadata (see below)

**WorkspaceMetadata**:
```typescript
{
  totalItems: number;
  totalSize: number;          // bytes
  includesCustomTemplates: boolean;
  exportType: 'full' | 'incremental';
  checksum: string;           // SHA-256 hash for integrity
}
```

**File Format**: ZIP archive (.oneimg-workspace)
```
my-workspace.oneimg-workspace
├── workspace.json          # All data above
└── images/                 # All embedded images
    ├── content-1-img-1.webp
    ├── content-2-img-1.png
    └── ...
```

**Validation Rules**:
- Version: Must match supported format versions
- Checksum: Must match computed SHA-256 hash
- Images: All referenced images must exist in images/ folder
- Size: Warn if >100MB

---

### Design Share File (.oneimg)

Represents a single exportable design with all assets.

**Fields**:
- `version`: string (file format version, e.g., "1.0")
- `exportedAt`: Date
- `appVersion`: string
- `content`: ContentItem (single content item with children)
- `template`: Template (used template)
- `images`: ImageAsset[] (see below)
- `metadata`: DesignMetadata (see below)

**ImageAsset**:
```typescript
{
  id: string;
  filename: string;           // e.g., "001.webp"
  format: string;             // 'png', 'jpeg', 'webp'
  width: number;
  height: number;
  size: number;               // bytes
  optimized: boolean;         // true if compressed
}
```

**DesignMetadata**:
```typescript
{
  title: string;
  description: string;
  tags: string[];
  platform: string;
  checksum: string;
}
```

**File Format**: ZIP archive (.oneimg)
```
my-design.oneimg
├── scene.json              # Content + template + metadata
├── metadata.json           # Design metadata
└── images/
    ├── 001.webp
    ├── 002.png
    └── ...
```

**Validation Rules**:
- Version: Must match supported format versions
- Images: All `src` attributes in content.body must reference files in images/
- Checksum: Must match computed SHA-256 hash
- Image paths: Must be relative (images/001.webp), not absolute

---

### AI Suggestion

Represents AI-generated recommendations.

**Fields**:
- `id`: string (UUID, primary key)
- `contentId`: string (foreign key → ContentItem.id)
- `type`: SuggestionType (enum: headline, hashtag, template, grammar)
- `originalText`: string (user's original text)
- `suggestions`: string[] (AI-generated alternatives, 3-5 items)
- `provider`: string (ai provider used: 'groq', 'hf', 'openai', 'claude')
- `model`: string (specific model: 'llama-3.1-8b', 'gpt-4', etc.)
- `confidenceScore`: number (0.0-1.0, optional)
- `costUSD`: number (cost in USD, 0 for free models)
- `acceptedSuggestion`: string | null (which suggestion user selected)
- `createdAt`: Date
- `acceptedAt`: Date | null

**Validation Rules**:
- Type: Must be one of: headline, hashtag, template, grammar
- Suggestions: Array length 3-5
- Confidence score: 0.0 ≤ score ≤ 1.0
- Cost: ≥0

**Relationships**:
- Many-to-one: AISuggestion → ContentItem

---

## Schema Diagrams

### IndexedDB Schema (Dexie.js)

```typescript
import Dexie, { Table } from 'dexie';

interface ContentItem {
  id?: number;
  title: string;
  body: string;
  images: ImageRef[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  templateId: string;
  collectionId: string | null;
  parentId: string | null;
  isFavorite: boolean;
  wordCount: number;
  metadata: ContentMetadata;
}

interface Template {
  id?: string;
  name: string;
  description: string;
  category: string;
  cssVariables: Record<string, string>;
  layoutRules: LayoutConfig;
  previewThumbnail: string;
  isCustom: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: string;
  usageCount: number;
  metadata: TemplateMetadata;
}

interface Collection {
  id?: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  contentCount: number;
}

interface Tag {
  id?: string;
  name: string;
  color: string;
  createdAt: Date;
  usageCount: number;
  lastUsedAt: Date | null;
}

interface Preference {
  key: string;
  value: any;
}

interface AISuggestion {
  id?: string;
  contentId: string;
  type: string;
  originalText: string;
  suggestions: string[];
  provider: string;
  model: string;
  confidenceScore: number | null;
  costUSD: number;
  acceptedSuggestion: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
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

### Entity Relationships

```
ContentItem ──────┐
    │             │
    │ M:1         │ M:1
    ▼             ▼
Template      Collection
    
ContentItem ──── M:1 ────▶ ContentItem (parent-child)

ContentItem ──── M:M ────▶ Tag (via tags array)

ContentItem ──── 1:M ────▶ AISuggestion

Preference (key-value, no relationships)
```

### File Format Relationships

```
.oneimg-workspace (ZIP)
├── workspace.json
│   ├── contents[]          ──────▶ ContentItem
│   ├── templates[]         ──────▶ Template (custom only)
│   ├── collections[]       ──────▶ Collection
│   ├── tags[]              ──────▶ Tag
│   └── preferences{}       ──────▶ Preference
└── images/                 ──────▶ All embedded images

.oneimg (ZIP)
├── scene.json
│   ├── content             ──────▶ Single ContentItem
│   └── template            ──────▶ Template (embedded)
├── metadata.json           ──────▶ DesignMetadata
└── images/                 ──────▶ Referenced images only
```

---

## Data Operations

### Create Content
1. Validate title, body, tags
2. Generate unique ID
3. Set createdAt, updatedAt
4. Calculate wordCount from body
5. Insert into IndexedDB
6. Update collection.contentCount if collectionId set
7. Update tag.usageCount for each tag

### Update Content
1. Validate changes
2. Update updatedAt timestamp
3. Recalculate wordCount if body changed
4. Update IndexedDB
5. Update collection/tag counts if changed

### Delete Content
1. Check for children (prevent orphans)
2. Remove from IndexedDB
3. Decrement collection.contentCount
4. Decrement tag.usageCount for each tag
5. Delete related AISuggestions

### Export to .oneimg
1. Read ContentItem + children (recursive)
2. Read Template
3. Extract images from body HTML
4. Optimize images (WebP 85%)
5. Build scene.json with relative image paths
6. Create ZIP: scene.json + metadata.json + images/
7. Calculate checksum (SHA-256)
8. Generate download

### Import from .oneimg
1. Validate ZIP structure (required files present)
2. Verify checksum
3. Parse scene.json
4. Validate against schema
5. Extract images to Blob storage
6. Rewrite image src paths in body
7. Insert ContentItem + Template into IndexedDB

### Full-Text Search
1. Build search index on app load (Fuse.js)
2. Index fields: title, body (plain text), tags
3. Update index on CRUD operations
4. Search with fuzzy matching (threshold: 0.3)
5. Return ranked results

### Export Workspace
1. Read all contents, templates, collections, tags, preferences
2. Read all image blobs
3. Optimize images
4. Build workspace.json manifest
5. Create ZIP: workspace.json + contents/ + templates/ + images/
6. Calculate checksum
7. Generate download

### Import Workspace
1. Validate ZIP structure
2. Verify checksum
3. Parse workspace.json
4. Validate against schema
5. Import templates (validate CSS security)
6. Import contents with image resolution
7. Import collections, tags, preferences
8. Rebuild search index

### AI Template Generation
1. Analyze content (length, tone, type, images, purpose)
2. Build AI prompt with content analysis + template requirements
3. Call AI model via Vercel AI SDK (generateText)
4. Parse AI response (CSS variables, layout rules, color scheme)
5. Validate CSS properties (whitelist-only)
6. Generate preview thumbnail (render sample content)
7. Create Template entity with source='ai-generated'
8. Store AIGenerationMetadata (model, prompt, analysis, cost)
9. Insert into IndexedDB
10. Return template ID and preview

### Regenerate AI Template
1. Load existing template's AIGenerationMetadata
2. Extract original prompt and contentAnalysis
3. Combine with user's modification request (e.g., "more colorful")
4. Call AI with updated prompt + content context
5. Parse and validate new template
6. Increment regenerationCount
7. Create new template (do NOT overwrite original)
8. Link to original via metadata.parentTemplateId
9. Return both templates for comparison

### Rate AI Template
1. Validate rating (1-5 stars)
2. Update template.rating
3. Optionally collect userFeedback text
4. Update AIGenerationMetadata.userFeedback
5. Track acceptedOnFirstTry if rating on first generation
6. Use ratings to improve future recommendations

### Edit AI-Generated Template (User Modification)
1. User modifies AI template via visual editor
2. Detect manual edits to CSS variables or layout
3. Update template.source from 'ai-generated' to 'user-created'
4. Preserve AIGenerationMetadata for provenance tracking
5. Set metadata.basedOnAI = true
6. Update updatedAt timestamp
7. Save modified template
4. Build workspace.json
5. Create ZIP: workspace.json + images/
6. Calculate checksum
7. Generate download

### Import Workspace
1. Validate ZIP structure
2. Verify checksum
3. Merge strategy: Keep existing + add new (no overwrites)
4. Handle ID conflicts (regenerate IDs for imported items)
5. Insert all entities into IndexedDB
6. Update counts (collection, tag usage)

---

## Migration Strategy

### Version 1.0 → 2.0 (Example)
```typescript
db.version(2).stores({
  // New schema
}).upgrade(tx => {
  return tx.table('contents').toCollection().modify(content => {
    // Migrate old format to new
    content.metadata = {
      exportCount: 0,
      lastExportedAt: null,
      platformTags: [],
      aiAssisted: false,
    };
  });
});
```

**Next Phase**: Generate API contracts
