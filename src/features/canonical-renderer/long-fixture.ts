import type { CanonicalRenderSnapshot } from './model'
import type { BrowserResourceDefinition } from './resource-resolver'
import { controlledFixtureResources } from './controlled-fixture'

const imageDimensions = [
  [96, 144],
  [112, 80],
  [128, 192],
  [144, 96],
  [160, 224],
  [176, 112],
  [192, 256],
  [208, 128],
  [224, 288],
  [240, 144],
  [256, 320],
  [272, 160],
  [288, 352],
  [304, 176],
  [320, 384],
  [336, 192],
  [352, 416],
  [368, 208],
  [384, 448],
  [400, 224],
] as const

function fixtureImageSvg(index: number, width: number, height: number) {
  const hue = (index * 31 + 198) % 360
  return String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 64% 32%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 54) % 360} 78% 66%)"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#gradient)"/>
  <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.28)}" r="${Math.max(8, Math.round(Math.min(width, height) * 0.14))}" fill="#fff" opacity=".72"/>
  <path d="M0 ${Math.round(height * 0.78)} ${Math.round(width * 0.28)} ${Math.round(height * 0.38)} ${Math.round(width * 0.52)} ${Math.round(height * 0.68)} ${Math.round(width * 0.76)} ${Math.round(height * 0.26)} ${width} ${Math.round(height * 0.72)}V${height}H0Z" fill="#10182d" opacity=".82"/>
</svg>`
}

const longImageResources = imageDimensions.map(([width, height], index): BrowserResourceDefinition => ({
  id: `image:long-fixture-${String(index + 1).padStart(2, '0')}@1`,
  kind: 'image',
  mimeType: 'image/svg+xml',
  source: {
    type: 'blob',
    create: () => new Blob([fixtureImageSvg(index, width, height)], { type: 'image/svg+xml' }),
  },
}))

export const longCanonicalSnapshot = {
  schemaVersion: 1,
  snapshotId: 'canonical-long-resource-fixture-v1',
  rendererRevision: 'canonical-renderer@2',
  stylePackId: 'oneimg-foundation@2',
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
  theme: {
    accent: '#ff5c35',
    background: '#f7f8fb',
    foreground: '#182039',
    muted: '#e8ecf5',
    surface: '#ffffff',
  },
  document: {
    id: 'document:canonical-long-resource-fixture',
    sections: imageDimensions.map((_, index) => ({
      id: `section:long-media-${String(index + 1).padStart(2, '0')}`,
      kind: 'media' as const,
      label: `MEDIA ${String(index + 1).padStart(2, '0')} · ASPECT RATIO FIXTURE`,
      title: `第 ${index + 1} 张图片保持同一 Canonical 坐标`,
      body: '分段导出只改变 capture allocation；图片、文字和顺序仍由同一个 Render Root 决定。',
      image: {
        resourceId: `image:long-fixture-${String(index + 1).padStart(2, '0')}@1`,
        alt: `长页测试图片 ${index + 1}`,
      },
    })),
  },
} as const satisfies CanonicalRenderSnapshot

export const longCanonicalFixtureResources = [
  ...controlledFixtureResources.slice(0, 3),
  ...longImageResources,
] as const satisfies readonly BrowserResourceDefinition[]
