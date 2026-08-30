import { validateDocumentRevision } from '@/features/document-core'
import type {
  Block,
  DocumentRevision,
  RichTextDocument,
  RichTextNode,
} from '@/features/document-core'
import type { BrowserResourceDefinition } from '@/features/canonical-renderer/resource-resolver'
import type { CanonicalRenderSnapshot, CanonicalTheme } from '@/features/canonical-renderer/model'

export const GENERAL_LONG_IMAGE_STYLE_PACK_ID = 'oneimg-foundation@2'
export const GENERAL_LONG_IMAGE_FONT_PACK = {
  id: 'noto-sans-sc-variable@5.3.0-subset-117-119',
  resourceIds: [
    'font:noto-sans-sc@5.3.0/117',
    'font:noto-sans-sc@5.3.0/118',
    'font:noto-sans-sc@5.3.0/119',
  ],
  supportedWeights: [400, 700],
} as const

export const GENERAL_LONG_IMAGE_THEME: CanonicalTheme = {
  accent: '#3267d6',
  background: '#f5f7fb',
  foreground: '#182039',
  muted: '#e8edf7',
  surface: '#ffffff',
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
  return {
    direction: 'ltr',
    document: {
      id: revision.id,
      sections,
    },
    fontPack: GENERAL_LONG_IMAGE_FONT_PACK,
    locale: 'zh-CN',
    referenceViewport: {
      width: page.format.width,
    },
    rendererRevision: revision.presentation.rendererRevision,
    schemaVersion: 1,
    snapshotId: `general-long-image:${revision.id}:r${revision.revision}`,
    stylePackId: GENERAL_LONG_IMAGE_STYLE_PACK_ID,
    theme: GENERAL_LONG_IMAGE_THEME,
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
    id: block.id,
    kind: 'unknown-block' as const,
    originalKind: block.originalKind,
    ...(block.originalVersion === undefined ? {} : { originalVersion: block.originalVersion }),
  }
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
