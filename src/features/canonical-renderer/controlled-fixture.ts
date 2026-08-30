import type { CanonicalRenderSnapshot } from './model'
import type { BrowserResourceDefinition } from './resource-resolver'

export const controlledCanonicalSnapshot = {
  schemaVersion: 1,
  snapshotId: 'canonical-wysiwyg-fixture-v1',
  rendererRevision: 'canonical-renderer@3',
  stylePackId: 'oneimg-foundation@3',
  localCapability: 'certified',
  locale: 'zh-CN',
  direction: 'ltr',
  referenceViewport: { width: 640 },
  fontPack: {
    id: 'noto-sans-sc-variable@5.3.0-subset-117-119',
    resourceIds: [
      'font:noto-sans-sc@5.3.0/117',
      'font:noto-sans-sc@5.3.0/118',
      'font:noto-sans-sc@5.3.0/119',
    ],
    supportedWeights: [400, 700],
  },
  presentation: {
    density: 'standard',
    pageFormat: { kind: 'continuous', preset: 'long-image', width: 640 },
    templateId: 'clear-reading',
    templateVersion: 'clear-reading@1',
    themeId: 'fixture-sunset',
    themeVersion: 'fixture-sunset@1',
  },
  theme: {
    accent: '#ff5c35',
    background: '#f7f8fb',
    foreground: '#182039',
    muted: '#e8ecf5',
    surface: '#ffffff',
  },
  document: {
    id: 'document:canonical-export-fixture',
    sections: [
      {
        id: 'section:hero',
        kind: 'hero',
        eyebrow: 'ONEIMG · LOCAL EXPORT',
        title: '所见即所得',
        body: 'Canonical preview, local PNG. 中文内容与 English 共享同一结果。',
      },
      {
        id: 'section:grid',
        kind: 'feature-grid',
        label: '同一内容 · 同一排版',
        items: [
          {
            id: 'feature:renderer',
            title: '同一渲染器',
            body: '预览和导出读取同一个固定 Snapshot。',
          },
          {
            id: 'feature:resources',
            title: '固定资源',
            body: '字体与图片由 Resource Resolver 提供。',
          },
          {
            id: 'feature:layout',
            title: '现代排版',
            body: 'Grid、Flex 与颜色混合保持一致。',
          },
          {
            id: 'feature:local',
            title: '本地导出',
            body: '内容无需离开当前设备。',
          },
        ],
      },
      {
        id: 'section:media',
        kind: 'media',
        label: '图片资源',
        title: '清晰预览，准确导出',
        body: '圆角、阴影、裁切和色彩都属于 Canonical Style Pack。',
        image: {
          resourceId: 'image:fixture-landscape@1',
          alt: '蓝色山峰与橙色日光',
        },
      },
      {
        id: 'section:summary',
        kind: 'summary',
        title: '从预览到 PNG',
        body: '结构必须完全相同，几何差异不超过一个 CSS 像素。',
        facts: ['640 px', 'sRGB', '本地处理'],
      },
      {
        fallbackText: '{"entries":[{"id":"entry:1","label":"保留内容"}],"kind":"timeline","version":"timeline@2"}',
        id: 'section:unknown',
        kind: 'unknown-block',
        originalKind: 'timeline',
        originalVersion: 'timeline@2',
      },
    ],
  },
} as const satisfies CanonicalRenderSnapshot

const fixtureLandscapeSvg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="904" height="680" viewBox="0 0 904 680">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#183b72"/>
      <stop offset="1" stop-color="#6ca8da"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffcf70"/>
      <stop offset="1" stop-color="#ff7045"/>
    </linearGradient>
  </defs>
  <rect width="904" height="680" fill="url(#sky)"/>
  <circle cx="690" cy="154" r="82" fill="url(#sun)"/>
  <path d="M0 572 218 302 376 472 522 236 904 604V680H0Z" fill="#203657"/>
  <path d="m218 302 72 78-50-18-46 38Z" fill="#eaf2f8" opacity=".92"/>
  <path d="m522 236 126 120-82-30-69 54Z" fill="#f5f8fb" opacity=".95"/>
  <path d="M0 608c174-76 310-52 452 6 142 58 286 68 452 4v62H0Z" fill="#ff7548" opacity=".86"/>
</svg>`

const fontResource = (subset: 117 | 118 | 119): BrowserResourceDefinition => ({
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
})

export const controlledFixtureResources = [
  fontResource(117),
  fontResource(118),
  fontResource(119),
  {
    id: 'image:fixture-landscape@1',
    kind: 'image',
    mimeType: 'image/svg+xml',
    source: {
      type: 'blob',
      create: () => new Blob([fixtureLandscapeSvg], { type: 'image/svg+xml' }),
    },
  },
] as const satisfies readonly BrowserResourceDefinition[]
