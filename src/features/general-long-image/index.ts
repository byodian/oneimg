import { validateDocumentRevision } from '@/features/document-core'
import type {
  Block,
  Density,
  DocumentPresentation,
  DocumentRevision,
  PageFormat,
  RichTextDocument,
  RichTextNode,
} from '@/features/document-core'
import type { BrowserResourceDefinition } from '@/features/canonical-renderer/resource-resolver'
import type {
  CanonicalLocalCapability,
  CanonicalPresentation,
  CanonicalRenderSnapshot,
  CanonicalTheme,
} from '@/features/canonical-renderer/model'

export const GENERAL_LONG_IMAGE_STYLE_PACK_ID = 'oneimg-foundation@3'
export const GENERAL_LONG_IMAGE_FONT_PACK = {
  id: 'noto-sans-sc-variable@5.3.0-subset-117-119',
  resourceIds: [
    'font:noto-sans-sc@5.3.0/117',
    'font:noto-sans-sc@5.3.0/118',
    'font:noto-sans-sc@5.3.0/119',
  ],
  supportedWeights: [400, 700],
} as const

interface GeneralLongImageTemplateFamily {
  readonly description: string
  readonly id: string
  readonly label: string
  readonly localCapability: CanonicalLocalCapability
  readonly version: string
}

interface GeneralLongImageThemeDefinition {
  readonly description: string
  readonly id: string
  readonly label: string
  readonly localCapability: CanonicalLocalCapability
  readonly theme: CanonicalTheme
  readonly version: string
}

interface GeneralLongImageDensityDefinition {
  readonly description: string
  readonly label: string
  readonly localCapability: CanonicalLocalCapability
  readonly value: Density
}

interface GeneralLongImagePageFormatDefinition {
  readonly description: string
  readonly format: PageFormat
  readonly id: string
  readonly label: string
  readonly localCapability: CanonicalLocalCapability
}

export const GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES = [
  {
    description: '稳定的单列阅读结构，适合大多数长文内容。',
    id: 'clear-reading',
    label: '清晰阅读',
    localCapability: 'certified',
    version: 'clear-reading@1',
  },
  {
    description: '每段内容拥有清晰边界，适合教程、知识卡片和工作总结。',
    id: 'section-cards',
    label: '分区卡片',
    localCapability: 'certified',
    version: 'section-cards@1',
  },
  {
    description: '强化媒体节奏和标题层级，适合图文并重的编辑内容。',
    id: 'visual-editorial',
    label: '视觉编辑',
    localCapability: 'certified',
    version: 'visual-editorial@1',
  },
  {
    description: '突出摘要、清单和表格，适合信息汇总和工作简报。',
    id: 'summary-brief',
    label: '摘要简报',
    localCapability: 'certified',
    version: 'summary-brief@1',
  },
] as const satisfies readonly GeneralLongImageTemplateFamily[]

export type GeneralLongImageTemplateId = typeof GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES[number]['id']

export const GENERAL_LONG_IMAGE_THEMES = [
  {
    description: '中性的阅读底色与克制的钴蓝强调色。',
    id: 'clear-paper',
    label: '清晰纸张',
    localCapability: 'certified',
    theme: {
      accent: '#2f64d6',
      background: '#f6f8fb',
      foreground: '#17202a',
      muted: '#e7eefc',
      surface: '#ffffff',
    },
    version: 'clear-paper@1',
  },
  {
    description: '平静的青绿色调，适合旅行和日常内容。',
    id: 'tide',
    label: '潮汐',
    localCapability: 'certified',
    theme: {
      accent: '#147d78',
      background: '#f1f7f6',
      foreground: '#153a3d',
      muted: '#eef9f7',
      surface: '#ffffff',
    },
    version: 'tide@1',
  },
  {
    description: '温暖的金色强调，保持信息内容清楚易读。',
    id: 'pomelo-gold',
    label: '柚金',
    localCapability: 'certified',
    theme: {
      accent: '#8a5600',
      background: '#fff8e8',
      foreground: '#30261a',
      muted: '#f7e6b8',
      surface: '#ffffff',
    },
    version: 'pomelo-gold@1',
  },
  {
    description: '自然的松绿色调，适合知识和内部沟通。',
    id: 'pine-shade',
    label: '松影',
    localCapability: 'certified',
    theme: {
      accent: '#3d7b55',
      background: '#f3f7f2',
      foreground: '#1f3a2c',
      muted: '#eff8f0',
      surface: '#ffffff',
    },
    version: 'pine-shade@1',
  },
  {
    description: '正式克制的石墨灰，适合专业资料。',
    id: 'graphite',
    label: '石墨',
    localCapability: 'certified',
    theme: {
      accent: '#5d6876',
      background: '#f5f6f7',
      foreground: '#1b1d21',
      muted: '#e9edf1',
      surface: '#ffffff',
    },
    version: 'graphite@1',
  },
  {
    description: '深色照片优先的分享风格，保持正文对比度。',
    id: 'night-voyage',
    label: '夜航',
    localCapability: 'certified',
    theme: {
      accent: '#4ba7b6',
      background: '#111923',
      foreground: '#eef3f7',
      muted: '#20303d',
      surface: '#1d2a36',
    },
    version: 'night-voyage@1',
  },
] as const satisfies readonly GeneralLongImageThemeDefinition[]

export type GeneralLongImageThemeId = typeof GENERAL_LONG_IMAGE_THEMES[number]['id']

export const GENERAL_LONG_IMAGE_DENSITIES = [
  { description: '更宽松的段落间距，适合舒缓阅读。', label: '舒适', localCapability: 'certified', value: 'comfortable' },
  { description: '内容密度与可读性的平衡默认值。', label: '标准', localCapability: 'certified', value: 'standard' },
  { description: '减少空间占用，适合信息量较大的内容。', label: '紧凑', localCapability: 'certified', value: 'compact' },
] as const satisfies readonly GeneralLongImageDensityDefinition[]

export const GENERAL_LONG_IMAGE_PAGE_FORMATS = [
  {
    description: '高度随内容增长，不改变固定阅读宽度。',
    format: { kind: 'continuous', preset: 'long-image', width: 640 },
    id: 'long-image',
    label: '连续长图',
    localCapability: 'certified',
  },
  {
    description: '适合方形分享，内容超出时仍保持可见。',
    format: { height: 640, kind: 'bounded', preset: 'square', width: 640 },
    id: 'square',
    label: '方形 1:1',
    localCapability: 'high-fidelity-required',
  },
  {
    description: '适合竖版社交分享的 4:5 比例。',
    format: { height: 800, kind: 'bounded', preset: 'portrait-4-5', width: 640 },
    id: 'portrait-4-5',
    label: '竖版 4:5',
    localCapability: 'high-fidelity-required',
  },
  {
    description: '适合照片分享的 3:4 比例。',
    format: { height: 853, kind: 'bounded', preset: 'photo-3-4', width: 640 },
    id: 'photo-3-4',
    label: '照片 3:4',
    localCapability: 'high-fidelity-required',
  },
  {
    description: '适合手机故事内容的 9:16 比例。',
    format: { height: 1138, kind: 'bounded', preset: 'story-9-16', width: 640 },
    id: 'story-9-16',
    label: '故事 9:16',
    localCapability: 'high-fidelity-required',
  },
  {
    description: '适合横向分享的 16:9 比例。',
    format: { height: 360, kind: 'bounded', preset: 'landscape-16-9', width: 640 },
    id: 'landscape-16-9',
    label: '横版 16:9',
    localCapability: 'high-fidelity-required',
  },
  {
    description: '适合 A4 竖版资料，按固定参考高度组合。',
    format: { height: 905, kind: 'bounded', preset: 'a4-portrait', width: 640 },
    id: 'a4-portrait',
    label: 'A4 竖版',
    localCapability: 'high-fidelity-required',
  },
] as const satisfies readonly GeneralLongImagePageFormatDefinition[]

export type GeneralLongImagePageFormatId = typeof GENERAL_LONG_IMAGE_PAGE_FORMATS[number]['id']

export const GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE = {
  adapterId: 'local-svg-foreign-object@1',
  conformanceFixtureIds: ['canonical-wysiwyg-fixture-v1', 'canonical-long-resource-fixture-v1'],
  densityValues: ['comfortable', 'standard', 'compact'],
  pageFormatIds: ['long-image'],
  rendererRevision: 'canonical-renderer@3',
  stylePackId: GENERAL_LONG_IMAGE_STYLE_PACK_ID,
  templateIds: ['clear-reading', 'section-cards', 'visual-editorial', 'summary-brief'],
  themeIds: ['clear-paper', 'tide', 'pomelo-gold', 'pine-shade', 'graphite', 'night-voyage'],
  version: 'general-long-image-local-profile@1',
} as const

export const GENERAL_LONG_IMAGE_THEME = GENERAL_LONG_IMAGE_THEMES[0].theme

export interface ResolvedGeneralLongImagePresentation {
  readonly density: (typeof GENERAL_LONG_IMAGE_DENSITIES)[number]
  readonly localCapability: CanonicalLocalCapability
  readonly pageFormat: (typeof GENERAL_LONG_IMAGE_PAGE_FORMATS)[number]
  readonly presentation: CanonicalPresentation
  readonly template: (typeof GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES)[number]
  readonly theme: (typeof GENERAL_LONG_IMAGE_THEMES)[number]
}

function findTemplate(id: string) {
  return GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES.find(template => template.id === id)
    ?? GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES[0]
}

function findTheme(id: string) {
  return GENERAL_LONG_IMAGE_THEMES.find(theme => theme.id === id)
    ?? GENERAL_LONG_IMAGE_THEMES[0]
}

function findDensity(value: Density) {
  return GENERAL_LONG_IMAGE_DENSITIES.find(density => density.value === value)
    ?? GENERAL_LONG_IMAGE_DENSITIES[1]
}

function findPageFormat(format: PageFormat) {
  return GENERAL_LONG_IMAGE_PAGE_FORMATS.find(candidate => (
    candidate.format.kind === format.kind && candidate.format.preset === format.preset
  )) ?? GENERAL_LONG_IMAGE_PAGE_FORMATS[0]
}

function combineLocalCapabilities(capabilities: readonly CanonicalLocalCapability[]): CanonicalLocalCapability {
  if (capabilities.includes('unsupported')) {
    return 'unsupported'
  }
  if (capabilities.includes('high-fidelity-required')) {
    return 'high-fidelity-required'
  }
  return 'certified'
}

function isInProfile(values: readonly string[], value: string) {
  return values.includes(value)
}

export function resolveGeneralLongImagePresentation(
  presentation: DocumentPresentation,
): ResolvedGeneralLongImagePresentation {
  const template = findTemplate(presentation.templateId)
  const theme = findTheme(presentation.themeId)
  const density = findDensity(presentation.density)
  const pageFormat = findPageFormat(presentation.pageFormat)
  const templateKnown = GENERAL_LONG_IMAGE_TEMPLATE_FAMILIES.some(candidate => candidate.id === presentation.templateId)
  const themeKnown = GENERAL_LONG_IMAGE_THEMES.some(candidate => candidate.id === presentation.themeId)
  const densityKnown = GENERAL_LONG_IMAGE_DENSITIES.some(candidate => candidate.value === presentation.density)
  const pageFormatKnown = GENERAL_LONG_IMAGE_PAGE_FORMATS.some(candidate => (
    candidate.format.kind === presentation.pageFormat.kind
      && candidate.format.preset === presentation.pageFormat.preset
  ))
  const canonicalPageFormat = pageFormatKnown
    ? pageFormat.format
    : {
        ...GENERAL_LONG_IMAGE_PAGE_FORMATS[0].format,
        preset: presentation.pageFormat.preset,
      }
  const declaredCapability = combineLocalCapabilities([
    templateKnown ? template.localCapability : 'unsupported',
    themeKnown ? theme.localCapability : 'unsupported',
    densityKnown ? density.localCapability : 'unsupported',
    pageFormatKnown ? pageFormat.localCapability : 'unsupported',
  ])
  const profileMatches = presentation.rendererRevision === GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.rendererRevision
    && presentation.fontPackId === GENERAL_LONG_IMAGE_FONT_PACK.id
    && GENERAL_LONG_IMAGE_STYLE_PACK_ID === GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.stylePackId
    && isInProfile(GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.templateIds, template.id)
    && isInProfile(GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.themeIds, theme.id)
    && isInProfile(GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.densityValues, density.value)
    && isInProfile(GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.pageFormatIds, pageFormat.id)
  return {
    density,
    localCapability: declaredCapability === 'unsupported'
      ? 'unsupported'
      : profileMatches
        ? declaredCapability
        : 'high-fidelity-required',
    pageFormat,
    presentation: {
      density: density.value,
      pageFormat: canonicalPageFormat,
      templateId: templateKnown ? template.id : presentation.templateId,
      templateVersion: templateKnown ? template.version : presentation.templateVersion,
      themeId: themeKnown ? theme.id : presentation.themeId,
      themeVersion: themeKnown ? theme.version : presentation.themeVersion,
    },
    template,
    theme,
  }
}

export type GeneralLongImagePresentationChange =
  | { readonly templateId: GeneralLongImageTemplateId }
  | { readonly themeId: GeneralLongImageThemeId }
  | { readonly density: Density }
  | { readonly pageFormatId: GeneralLongImagePageFormatId }

export function updateGeneralLongImagePresentation(
  current: DocumentPresentation,
  change: GeneralLongImagePresentationChange,
): DocumentPresentation {
  const resolved = resolveGeneralLongImagePresentation(current)
  if ('templateId' in change) {
    const template = findTemplate(change.templateId)
    return {
      ...current,
      templateId: template.id,
      templateVersion: template.version,
    }
  }
  if ('themeId' in change) {
    const theme = findTheme(change.themeId)
    return {
      ...current,
      themeId: theme.id,
      themeVersion: theme.version,
    }
  }
  if ('density' in change) {
    return { ...current, density: findDensity(change.density).value }
  }
  const pageFormat = GENERAL_LONG_IMAGE_PAGE_FORMATS.find(candidate => candidate.id === change.pageFormatId)
    ?? resolved.pageFormat
  return {
    ...current,
    pageFormat: pageFormat.format,
  }
}

function fontResource(subset: 117 | 118 | 119): BrowserResourceDefinition {
  return {
    id: `font:noto-sans-sc@5.3.0/${subset}`,
    kind: 'font',
    mimeType: 'font/woff2',
    source: {
      type: 'url',
      href: `/canonical-resources/noto-sans-sc-${subset}-wght-normal.woff2`,
    },
    font: {
      family: `OneIMG Noto Sans SC ${subset}`,
      style: 'normal',
      weight: '100 900',
    },
  }
}

export const generalLongImageResourceDefinitions = [
  fontResource(117),
  fontResource(118),
  fontResource(119),
] as const satisfies readonly BrowserResourceDefinition[]

export function createGeneralLongImageSnapshot(
  revision: DocumentRevision,
): CanonicalRenderSnapshot {
  validateDocumentRevision(revision)
  const sections = revision.pages.flatMap(page => page.blocks.map(blockToSection))
  const page = revision.pages[0]!
  const resolvedPresentation = resolveGeneralLongImagePresentation({
    ...revision.presentation,
    pageFormat: page.format,
  })
  return {
    direction: 'ltr',
    document: {
      id: revision.id,
      sections,
    },
    fontPack: GENERAL_LONG_IMAGE_FONT_PACK,
    locale: 'zh-CN',
    localCapability: resolvedPresentation.localCapability,
    referenceViewport: {
      width: resolvedPresentation.pageFormat.format.width,
    },
    presentation: resolvedPresentation.presentation,
    rendererRevision: revision.presentation.rendererRevision,
    schemaVersion: 1,
    snapshotId: `general-long-image:${revision.id}:r${revision.revision}`,
    stylePackId: GENERAL_LONG_IMAGE_STYLE_PACK_ID,
    theme: resolvedPresentation.theme.theme,
  }
}

function blockToSection(block: Block) {
  if (block.kind === 'rich-text') {
    return {
      content: block.content,
      id: block.id,
      kind: 'rich-text' as const,
    }
  }
  if (block.kind === 'checklist') {
    return {
      id: block.id,
      items: block.items,
      kind: 'checklist' as const,
    }
  }
  if (block.kind === 'data-table') {
    return {
      columns: block.columns,
      id: block.id,
      kind: 'data-table' as const,
      rows: block.rows,
    }
  }
  return {
    fallbackText: unknownBlockFallbackText(block.raw),
    id: block.id,
    kind: 'unknown-block' as const,
    originalKind: block.originalKind,
    ...(block.originalVersion === undefined ? {} : { originalVersion: block.originalVersion }),
  }
}

function unknownBlockFallbackText(raw: Extract<Block, { kind: 'unknown' }>['raw']) {
  const serialized = JSON.stringify(raw)
  const maxLength = 480
  return serialized.length <= maxLength
    ? serialized
    : `${serialized.slice(0, maxLength - 1)}…`
}

export function createRichTextDocumentFromPlainText(text: string): RichTextDocument {
  const lines = text
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
  while (lines.at(-1) === '') {
    lines.pop()
  }
  return {
    children: lines.map(line => ({
      text: line,
      type: 'paragraph' as const,
    })),
    type: 'doc',
  }
}

export function updateRichTextDocumentText(
  previous: RichTextDocument,
  text: string,
): RichTextDocument {
  const next = createRichTextDocumentFromPlainText(text)
  return {
    children: next.children.map((node, index) => {
      const previousNode = previous.children[index]
      if (previousNode?.type === 'heading') {
        return {
          ...node,
          level: previousNode.level,
          type: 'heading' as const,
        }
      }
      return node
    }),
    type: 'doc',
  }
}

export function richTextDocumentToEditableText(document: RichTextDocument) {
  return document.children.map(node => richTextNodeToEditableText(node)).join('\n')
}

export function richTextDocumentHasMeaningfulText(document: RichTextDocument) {
  return collectRichTextText(document.children).trim().length > 0
}

function collectRichTextText(nodes: readonly RichTextNode[]): string {
  return nodes.map(node => [
    node.text ?? '',
    ...(node.children === undefined ? [] : [collectRichTextText(node.children)]),
  ].join('')).join('')
}

function richTextNodeToEditableText(node: RichTextNode): string {
  if (node.text !== undefined) {
    return node.text
  }
  if (node.children === undefined) {
    return ''
  }
  const separator = node.type === 'paragraph' || node.type === 'heading' ? '' : '\n'
  return node.children.map(child => richTextNodeToEditableText(child)).join(separator)
}
