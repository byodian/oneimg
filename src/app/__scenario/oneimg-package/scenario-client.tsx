'use client'

import { useEffect, useState } from 'react'
import {
  type OneImgPackageDocumentInput,
  type OneImgPackageLimits,
  type PackageProgress,
  createOneImgPackage,
  createPackageBytesSource,
  importOneImgPackage,
  inspectOneImgPackage,
} from '@/features/oneimg-package'

interface PackageScenarioResult {
  readonly archiveBytes: number
  readonly contentLengthMatches: boolean
  readonly error?: string
  readonly manifest: {
    readonly entryPaths: readonly string[]
    readonly formatVersion: number
    readonly packageId: string
  }
  readonly progress: {
    readonly readStages: readonly string[]
    readonly writeStages: readonly string[]
  }
  readonly preview: {
    readonly importedBytesEqual: boolean
    readonly manifestPath: string
    readonly sensitiveOmitted: boolean
  }
  readonly unresolvedAssetIdFresh: boolean
  readonly writerDecodedPixelLimit: string
  readonly roundTrip: {
    readonly assetBytesEqual: boolean
    readonly documentEqual: boolean
    readonly importedDocumentIdDifferent: boolean
    readonly importedDraftIdDifferent: boolean
    readonly packageIdentityEqual: boolean
  }
  readonly status: 'error' | 'ready' | 'running'
}

interface OneImgPackageScenarioHarness {
  inspect: (bytes: readonly number[], limits?: Partial<OneImgPackageLimits>) => Promise<{
    readonly code?: string
    readonly message?: string
    readonly ok: boolean
    readonly recovery?: string
  }>
}

declare global {
  interface Window {
    __oneimgPackageHarness?: OneImgPackageScenarioHarness
  }
}

const FIXTURE_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2,
  0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102,
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
])

const FIXTURE_DOCUMENT: OneImgPackageDocumentInput = {
  blockVersion: 'block-catalog@1',
  id: 'document-fixture-v1',
  modelVersion: 'document@1',
  presentation: {
    density: 'comfortable',
    fontPackId: 'noto-sans-sc@1',
    pageFormat: 'continuous',
    rendererRevision: 'canonical-renderer@1',
    sceneId: 'general-long-image',
    sceneVersion: 'general-long-image@1',
    templateId: 'clear-paper',
    templateVersion: 'clear-paper@1',
    themeId: 'cobalt',
    themeVersion: 'cobalt@1',
  },
  requiredAssetIds: ['asset-fixture-v1'],
  revision: 7,
  snapshot: {
    blockVersion: 'block-catalog@1',
    documentName: 'Package fixture',
    id: 'document-fixture-v1',
    modelVersion: 'document@1',
    pages: [{
      blocks: [{
        arrangement: 'sequence',
        id: 'block-fixture-v1',
        items: [{
          assetId: 'asset-fixture-v1',
          featured: false,
          fit: 'cover',
          focalPoint: { x: 0.5, y: 0.5 },
          id: 'media-item-fixture-v1',
          rotation: 0,
          zoom: 1,
        }],
        kind: 'media-group',
        version: 1,
      }],
      format: { kind: 'continuous', preset: 'long-image', width: 640 },
      id: 'page-fixture-v1',
    }],
    presentation: {
      density: 'comfortable',
      fontPackId: 'noto-sans-sc@1',
      pageFormat: { kind: 'continuous', preset: 'long-image', width: 640 },
      rendererRevision: 'canonical-renderer@1',
      sceneId: 'general-long-image',
      sceneVersion: 'general-long-image@1',
      templateId: 'clear-paper',
      templateVersion: 'clear-paper@1',
      themeId: 'cobalt',
      themeVersion: 'cobalt@1',
    },
    revision: 7,
    schema: 'oneimg-document@1',
  },
  unknownBlockCount: 0,
  unresolvedAssetIds: [],
}

function roleLabel(progress: PackageProgress) {
  return progress.entryRole
}

async function readStream(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).arrayBuffer()
}

async function areBlobBytesEqual(left: Blob, right: Blob) {
  const [leftBytes, rightBytes] = await Promise.all([
    left.arrayBuffer(),
    right.arrayBuffer(),
  ])
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false
  }
  const leftView = new Uint8Array(leftBytes)
  const rightView = new Uint8Array(rightBytes)
  return leftView.every((byte, index) => byte === rightView[index])
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalJson(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
}

async function runPackageScenario(): Promise<PackageScenarioResult> {
  const writeStages: string[] = []
  const readStages: string[] = []
  const sourceAsset = {
    id: 'asset-fixture-v1',
    original: createPackageBytesSource(FIXTURE_PNG, 'image/png', 'png'),
    renderSource: createPackageBytesSource(FIXTURE_PNG, 'image/png', 'png'),
    renderSourceRevision: 'png-normalization@1',
  }
  const artifact = await createOneImgPackage({
    applicationVersion: 'studio@0.4.0',
    assets: [sourceAsset],
    createdAt: '2026-08-21T00:00:00.000Z',
    documents: [FIXTURE_DOCUMENT],
    onProgress: (progress) => {
      if (!writeStages.includes(roleLabel(progress))) {
        writeStages.push(roleLabel(progress))
      }
    },
    packageId: 'package-stream-fixture-v1',
  })
  const oversizedWriterPng = new Uint8Array(FIXTURE_PNG)
  const oversizedWriterView = new DataView(oversizedWriterPng.buffer)
  oversizedWriterView.setUint32(16, 2)
  oversizedWriterView.setUint32(20, 2)
  let writerDecodedPixelLimit = 'accepted'
  try {
    await createOneImgPackage({
      applicationVersion: 'studio@0.4.0',
      assets: [{
        ...sourceAsset,
        original: createPackageBytesSource(oversizedWriterPng, 'image/png', 'png'),
      }],
      createdAt: '2026-08-21T00:00:00.000Z',
      documents: [FIXTURE_DOCUMENT],
      limits: { maxDecodedPixels: 1 },
      packageId: 'package-writer-pixel-limit-v1',
    })
  } catch (error) {
    writerDecodedPixelLimit = error instanceof Error && 'code' in error
      ? String(error.code)
      : error instanceof Error ? error.message : String(error)
  }
  const archiveBytes = await readStream(artifact.stream)
  const imported = await importOneImgPackage(new Blob([archiveBytes], { type: 'application/zip' }), {
    createId: (kind, sourceId) => `imported-${kind}-${sourceId}`,
    onProgress: (progress) => {
      if (!readStages.includes(roleLabel(progress))) {
        readStages.push(roleLabel(progress))
      }
    },
  })
  const importedDraft = imported.drafts[0]
  const importedAsset = importedDraft?.assets[0]
  const fixtureSnapshot = FIXTURE_DOCUMENT.snapshot as {
    readonly [key: string]: unknown
    readonly pages: readonly [{
      readonly [key: string]: unknown
      readonly blocks: readonly [{
        readonly [key: string]: unknown
        readonly items: readonly [Record<string, unknown>]
      }]
    }]
  }
  const fixturePage = fixtureSnapshot.pages[0]!
  const fixtureBlock = fixturePage.blocks[0]!
  const expectedImportedSnapshot = {
    ...fixtureSnapshot,
    pages: [{
      ...fixturePage,
      blocks: [{
        ...fixtureBlock,
        items: [{ ...fixtureBlock.items[0], assetId: importedAsset?.assetId }],
      }],
    }],
  }
  const previewArtifact = await createOneImgPackage({
    applicationVersion: 'studio@0.4.0',
    assets: [sourceAsset],
    createdAt: '2026-08-21T00:00:00.000Z',
    documents: [FIXTURE_DOCUMENT],
    packageId: 'package-preview-fixture-v1',
    previews: [{
      documentId: FIXTURE_DOCUMENT.id,
      source: createPackageBytesSource(FIXTURE_PNG, 'image/png', 'png'),
    }],
  })
  const previewArchive = await readStream(previewArtifact.stream)
  const previewImported = await importOneImgPackage(new Uint8Array(previewArchive), {
    createId: (kind, sourceId) => `preview-imported-${kind}-${sourceId}`,
  })
  const sensitiveArtifact = await createOneImgPackage({
    applicationVersion: 'studio@0.4.0',
    assets: [sourceAsset],
    createdAt: '2026-08-21T00:00:00.000Z',
    documents: [{
      ...FIXTURE_DOCUMENT,
      presentation: { ...FIXTURE_DOCUMENT.presentation, sensitive: true },
      snapshot: {
        ...FIXTURE_DOCUMENT.snapshot as Record<string, unknown>,
        presentation: {
          ...(FIXTURE_DOCUMENT.snapshot as { readonly presentation: Record<string, unknown> }).presentation,
          sensitive: true,
        },
      },
    }],
    packageId: 'package-sensitive-preview-fixture-v1',
    previews: [{
      documentId: FIXTURE_DOCUMENT.id,
      source: createPackageBytesSource(FIXTURE_PNG, 'image/png', 'png'),
    }],
  })
  const unresolvedAssetId = 'asset-missing-fixture-v1'
  const unresolvedArtifact = await createOneImgPackage({
    applicationVersion: 'studio@0.4.0',
    assets: [],
    createdAt: '2026-08-21T00:00:00.000Z',
    documents: [{
      ...FIXTURE_DOCUMENT,
      id: 'document-unresolved-fixture-v1',
      requiredAssetIds: [unresolvedAssetId],
      snapshot: {
        ...fixtureSnapshot,
        id: 'document-unresolved-fixture-v1',
        pages: [{
          ...fixturePage,
          blocks: [{
            ...fixtureBlock,
            items: [{ ...fixtureBlock.items[0], assetId: unresolvedAssetId }],
          }],
        }],
      },
      unresolvedAssetIds: [unresolvedAssetId],
    }],
    packageId: 'package-unresolved-fixture-v1',
  })
  const unresolvedImported = await importOneImgPackage(
    new Uint8Array(await readStream(unresolvedArtifact.stream)),
    { createId: (kind, sourceId) => `unresolved-imported-${kind}-${sourceId}` },
  )
  const unresolvedDraft = unresolvedImported.drafts[0]
  const importedUnresolvedAssetId = unresolvedDraft?.document.requiredAssetIds[0]

  return {
    archiveBytes: archiveBytes.byteLength,
    contentLengthMatches: artifact.contentLength === archiveBytes.byteLength,
    manifest: {
      entryPaths: ['manifest.json', ...artifact.manifest.entries.map(entry => entry.path)],
      formatVersion: artifact.manifest.formatVersion,
      packageId: artifact.manifest.packageId,
    },
    progress: { readStages, writeStages },
    preview: {
      importedBytesEqual: Boolean(
        previewImported.drafts[0]?.preview
        && await areBlobBytesEqual(previewImported.drafts[0].preview.blob, new Blob([FIXTURE_PNG])),
      ),
      manifestPath: previewArtifact.manifest.previews[0]?.path ?? '',
      sensitiveOmitted: sensitiveArtifact.manifest.previews.length === 0,
    },
    unresolvedAssetIdFresh: Boolean(
      importedUnresolvedAssetId
      && importedUnresolvedAssetId !== unresolvedAssetId
      && importedUnresolvedAssetId === unresolvedDraft?.document.unresolvedAssetIds?.[0],
    ),
    writerDecodedPixelLimit,
    roundTrip: {
      assetBytesEqual: Boolean(importedAsset && await areBlobBytesEqual(new Blob([FIXTURE_PNG]), importedAsset.original)),
      documentEqual: Boolean(
        importedDraft
        && importedDraft.document.id === importedDraft.documentId
        && importedDraft.sourceDocumentId === FIXTURE_DOCUMENT.id
        && importedDraft.document.modelVersion === FIXTURE_DOCUMENT.modelVersion
        && importedDraft.document.blockVersion === FIXTURE_DOCUMENT.blockVersion
        && importedDraft.document.revision === FIXTURE_DOCUMENT.revision
        && canonicalJson(importedDraft.document.snapshot) === canonicalJson(expectedImportedSnapshot)
        && canonicalJson(importedDraft.document.presentation) === canonicalJson(FIXTURE_DOCUMENT.presentation)
        && importedAsset
        && importedDraft.document.requiredAssetIds[0] === importedAsset.assetId,
      ),
      importedDocumentIdDifferent: importedDraft?.document.id !== FIXTURE_DOCUMENT.id,
      importedDraftIdDifferent: importedDraft?.draftId !== FIXTURE_DOCUMENT.id,
      packageIdentityEqual: imported.packageId === artifact.manifest.packageId,
    },
    status: 'ready',
  }
}

export function OneImgPackageScenario() {
  const [result, setResult] = useState<PackageScenarioResult>({
    archiveBytes: 0,
    contentLengthMatches: false,
    manifest: { entryPaths: [], formatVersion: 0, packageId: '' },
    progress: { readStages: [], writeStages: [] },
    preview: { importedBytesEqual: false, manifestPath: '', sensitiveOmitted: false },
    unresolvedAssetIdFresh: false,
    writerDecodedPixelLimit: '',
    roundTrip: {
      assetBytesEqual: false,
      documentEqual: false,
      importedDocumentIdDifferent: false,
      importedDraftIdDifferent: false,
      packageIdentityEqual: false,
    },
    status: 'running',
  })

  useEffect(() => {
    window.__oneimgPackageHarness = {
      inspect: async (bytes, limits) => {
        try {
          const inspection = await inspectOneImgPackage(new Uint8Array(bytes), {
            limits,
          })
          return {
            ok: true,
            ...('recovery' in inspection ? { recovery: inspection.recovery.reason } : {}),
          }
        } catch (error) {
          return {
            code: typeof error === 'object' && error !== null && 'code' in error
              ? String(error.code)
              : undefined,
            message: error instanceof Error ? error.message : String(error),
            ok: false,
          }
        }
      },
    }
    return () => {
      delete window.__oneimgPackageHarness
    }
  }, [])

  useEffect(() => {
    let active = true
    runPackageScenario()
      .then((nextResult) => {
        if (active) {
          setResult(nextResult)
        }
      })
      .catch((error) => {
        if (active) {
          setResult(current => ({
            ...current,
            error: error instanceof Error ? error.message : String(error),
            status: 'error',
          }))
          console.error(error)
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main>
      <pre data-testid="package-result">{JSON.stringify(result)}</pre>
    </main>
  )
}
