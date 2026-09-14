import {
  type Block,
  type DocumentRevision,
  type Page,
  type PageFormat,
  cloneValue,
  createImportedDocumentRevision,
  validateDocumentRevision,
} from '@/features/document-core'
import type { GeneralLongImageSnapshotOptions } from '@/features/general-long-image'
import { GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE, GENERAL_LONG_IMAGE_THEMES, createGeneralLongImageSnapshot } from '@/features/general-long-image'

export const SOCIAL_SHARE_FORMATS = [
  { id: 'square', label: '方形 1:1', width: 640, height: 640 },
  { id: 'portrait-4-5', label: '竖版 4:5', width: 640, height: 800 },
  { id: 'story-9-16', label: '故事 9:16', width: 630, height: 1120 },
] as const
export type SocialShareFormat = typeof SOCIAL_SHARE_FORMATS[number]['id']
export type SocialShareMode = 'together' | 'set'
export const SOCIAL_SHARE_STYLE_PACK_ID = 'oneimg-social-collage@1'

export function createSocialShareConversion(
  source: DocumentRevision,
  options: { readonly mode: SocialShareMode, readonly format: SocialShareFormat, readonly documentId: string },
): DocumentRevision {
  validateDocumentRevision(source)
  if (options.documentId === source.id) {
    throw new Error('分享副本需要独立的文档标识。')
  }
  const selected = SOCIAL_SHARE_FORMATS.find(format => format.id === options.format)
  if (!selected || !['together', 'set'].includes(options.mode)) {
    throw new Error('请选择支持的分享格式。')
  }
  const format: PageFormat = { kind: 'bounded', preset: selected.id, width: selected.width, height: selected.height }
  const blocks = source.pages.flatMap(page => page.blocks)
  const imageCount = blocks.reduce((count, block) => count + (block.kind === 'media-group' ? block.items.length : 0), 0)
  if (!imageCount) {
    throw new Error('先添加照片，再创建分享副本。')
  }
  if (options.mode === 'together' && imageCount > 9) {
    throw new Error('拼成一张最多支持 9 张照片，请选择成组分享。')
  }
  const groups: Block[][] = []
  if (options.mode === 'together') {
    groups.push([...blocks])
  } else if (source.presentation.sceneId === 'social-smart-collage' && source.pages.length > 1) {
    groups.push(...source.pages.map(page => [...page.blocks]))
  } else {
    let pending: Block[] = []
    const usedIds = new Set(blocks.map(block => block.id))
    for (const block of blocks) {
      if (block.kind !== 'media-group') {
        pending.push(block)
        continue
      }
      block.items.forEach((item, index) => {
        let id = block.id
        if (index > 0) {
          const base = `${block.id}:share:${index + 1}`
          id = base
          let suffix = 1
          while (usedIds.has(id)) {
            id = `${base}:${suffix++}`
          }
          usedIds.add(id)
        }
        const { caption, ...group } = block
        groups.push([...pending, {
          ...group,
          ...(index === 0 && caption !== undefined ? { caption } : {}),
          id,
          items: [item],
        }])
        pending = []
      })
    }
    if (pending.length) {
      groups[groups.length - 1]!.push(...pending)
    }
  }
  const pages: Page[] = groups.map((pageBlocks, index) => ({
    id: `${options.documentId}:page-${index + 1}`,
    format,
    blocks: cloneValue(pageBlocks),
  }))
  return createImportedDocumentRevision({
    ...source,
    pages,
    presentation: {
      ...source.presentation,
      pageFormat: format,
      sceneId: 'social-smart-collage',
      sceneVersion: 'social-smart-collage@1',
      templateId: 'social-collage',
      templateVersion: 'social-collage@1',
    },
  }, options.documentId)
}

export function createSocialShareSnapshot(
  revision: DocumentRevision,
  pageId: string,
  options: GeneralLongImageSnapshotOptions = {},
) {
  const page = revision.pages.find(candidate => candidate.id === pageId)
  if (!page || revision.presentation.sceneId !== 'social-smart-collage') {
    throw new Error('无法找到分享页。')
  }
  const theme = GENERAL_LONG_IMAGE_THEMES.find(candidate => candidate.id === revision.presentation.themeId && candidate.version === revision.presentation.themeVersion)
  if (!theme || revision.presentation.sceneVersion !== 'social-smart-collage@1' || !['standard', 'comfortable', 'compact'].includes(revision.presentation.density) || revision.presentation.templateId !== 'social-collage' || revision.presentation.templateVersion !== 'social-collage@1'
    || revision.presentation.rendererRevision !== GENERAL_LONG_IMAGE_LOCAL_CERTIFICATION_PROFILE.rendererRevision
    || revision.presentation.fontPackId !== 'noto-sans-sc-variable@5.3.0-subset-117-119') {
    throw new Error('此分享副本的呈现版本尚未通过本地验证。')
  }
  const format = SOCIAL_SHARE_FORMATS.find(candidate => candidate.id === page.format.preset)
  if (!format || page.format.kind !== 'bounded' || page.format.width !== format.width || page.format.height !== format.height) {
    throw new Error('分享页格式与声明不一致。')
  }
  const snapshot = createGeneralLongImageSnapshot({ ...revision, pages: [page] }, options)
  return {
    ...snapshot,
    localCapability: 'certified' as const,
    referenceViewport: { width: format.width },
    snapshotId: `${snapshot.snapshotId}:${page.id}:social@1`,
    stylePackId: SOCIAL_SHARE_STYLE_PACK_ID,
    presentation: {
      ...snapshot.presentation,
      pageFormat: page.format,
      templateId: 'social-collage',
      templateVersion: 'social-collage@1',
    },
  }
}
