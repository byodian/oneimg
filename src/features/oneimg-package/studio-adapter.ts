import {
  type OneImgPackageAssetInput,
  type OneImgPackageDocumentInput,
  type OneImgPackageImportedDraft,
  createPackageBlobSource,
} from './index'
import type { AssetPipeline, ReadyAssetRecord } from '@/features/asset-pipeline'
import {
  type DocumentRevision,
  type EditTransaction,
  type JsonValue,
  createImportedDocumentRevision,
  createImportedDocumentTransaction,
  deserializeDocumentRevision,
  serializeDocumentRevision,
} from '@/features/document-core'

export const ONEIMG_PACKAGE_APPLICATION_VERSION = 'studio@0.4.0'

export interface StudioPackageExportInput {
  readonly assets: readonly OneImgPackageAssetInput[]
  readonly document: OneImgPackageDocumentInput
}

const PACKAGE_ID_CHARACTER_PATTERN = /[^A-Za-z0-9_-]/g

function isJsonRecord(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function packagePathId(sourceId: string, fallback: string, usedIds: Set<string>) {
  const normalized = sourceId
    .replace(PACKAGE_ID_CHARACTER_PATTERN, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const base = (normalized || fallback).slice(0, 88)
  let candidate = base
  let suffix = 2
  while (usedIds.has(candidate)) {
    candidate = `${base.slice(0, 87 - String(suffix).length)}-${suffix}`
    suffix += 1
  }
  usedIds.add(candidate)
  return candidate
}

function isAssetReferenceKey(key: string) {
  const normalized = key.toLowerCase().replace(/[-_]/g, '')
  return normalized === 'asset'
    || normalized === 'assets'
    || normalized === 'assetid'
    || normalized === 'assetids'
    || normalized.endsWith('assetid')
    || normalized.endsWith('assetids')
    || normalized.endsWith('assetref')
    || normalized.endsWith('assetrefs')
}

function remapAssetReferences(snapshot: JsonValue, assetIds: ReadonlyMap<string, string>): JsonValue {
  const visit = (value: JsonValue, key?: string, insideAssetContainer = false): JsonValue => {
    const keyIsAssetContainer = key !== undefined && isAssetReferenceKey(key)
    if (
      typeof value === 'string'
      && key !== undefined
      && (keyIsAssetContainer || (insideAssetContainer && key.toLowerCase() === 'id'))
    ) {
      return assetIds.get(value) ?? value
    }
    if (Array.isArray(value)) {
      return value.map(item => visit(item, key, insideAssetContainer || keyIsAssetContainer))
    }
    if (!value || typeof value !== 'object') {
      return value
    }
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        visit(childValue, childKey, insideAssetContainer || keyIsAssetContainer),
      ]),
    ) as JsonValue
  }
  return visit(snapshot)
}

function referencedAssetIds(revision: DocumentRevision) {
  return Array.from(new Set(revision.pages.flatMap(page => page.blocks.flatMap(block => (
    block.kind === 'media-group' ? block.items.map(item => item.assetId) : []
  )))))
}

function unknownBlockCount(revision: DocumentRevision) {
  return revision.pages.reduce(
    (count, page) => count + page.blocks.filter(block => block.kind === 'unknown').length,
    0,
  )
}

function blobWithDeclaredType(blob: Blob, mimeType: string) {
  return blob.type === mimeType ? blob : new Blob([blob], { type: mimeType })
}

function shouldIncludeRenderSource(record: ReadyAssetRecord) {
  const metadata = record.renderSource.metadata
  // PNG is the only currently supported Original format whose color, alpha, and
  // pixel interpretation is already the normalized reader contract. Other
  // formats retain the generated Render Source so import does not depend on a
  // different decoder or conversion implementation.
  return record.original.mimeType !== 'image/png'
    || metadata.exifOrientation !== 1
    || metadata.rawDimensions.width !== metadata.intrinsicDimensions.width
    || metadata.rawDimensions.height !== metadata.intrinsicDimensions.height
}

export function createStudioPackageExport(
  revision: DocumentRevision,
  assetPipeline: AssetPipeline,
  sourceDocumentId = revision.id,
): StudioPackageExportInput {
  const normalizedRevision = deserializeDocumentRevision(serializeDocumentRevision(revision))
  const documentId = packagePathId('document-1', 'document', new Set<string>())
  const sourceAssetIds = referencedAssetIds(normalizedRevision)
  const assetIds = new Map<string, string>()
  const usedAssetIds = new Set<string>()
  sourceAssetIds.forEach((sourceAssetId, index) => {
    assetIds.set(sourceAssetId, packagePathId(`asset-${index + 1}`, 'asset', usedAssetIds))
  })

  const snapshotValue = JSON.parse(serializeDocumentRevision(normalizedRevision)) as JsonValue
  if (!isJsonRecord(snapshotValue)) {
    throw new Error('Document revision did not serialize to a JSON object')
  }
  const remappedSnapshot = remapAssetReferences(snapshotValue, assetIds)
  if (!isJsonRecord(remappedSnapshot)) {
    throw new Error('Document snapshot did not remain a JSON object')
  }
  const snapshot = { ...remappedSnapshot, id: documentId } as JsonValue
  const packageAssets: OneImgPackageAssetInput[] = []
  const unresolvedAssetIds: string[] = []

  for (const sourceAssetId of sourceAssetIds) {
    const packageAssetId = assetIds.get(sourceAssetId)!
    const record = assetPipeline.get(sourceAssetId)
    if (record?.status === 'unresolved') {
      unresolvedAssetIds.push(packageAssetId)
      continue
    }
    let original: Blob
    try {
      original = assetPipeline.getOriginal(sourceAssetId)
    } catch {
      unresolvedAssetIds.push(packageAssetId)
      continue
    }

    const originalBlob = blobWithDeclaredType(original, record?.original.mimeType ?? original.type)
    const renderSource = record?.status === 'ready' && shouldIncludeRenderSource(record)
      ? assetPipeline.getRenderSource(sourceAssetId)
      : undefined
    packageAssets.push({
      id: packageAssetId,
      original: createPackageBlobSource(originalBlob),
      ...(renderSource === undefined
        ? {}
        : {
            renderSource: createPackageBlobSource(renderSource.blob),
            renderSourceRevision: renderSource.metadata.id,
          }),
    })
  }

  const presentation = normalizedRevision.presentation
  return {
    assets: packageAssets,
    document: {
      blockVersion: normalizedRevision.blockVersion,
      id: documentId,
      modelVersion: normalizedRevision.modelVersion,
      presentation: {
        density: presentation.density,
        fontPackId: presentation.fontPackId,
        pageFormat: presentation.pageFormat.kind,
        rendererRevision: presentation.rendererRevision,
        ...(presentation.sensitive === undefined ? {} : { sensitive: presentation.sensitive }),
        sceneId: presentation.sceneId,
        sceneVersion: presentation.sceneVersion,
        templateId: presentation.templateId,
        templateVersion: presentation.templateVersion,
        themeId: presentation.themeId,
        themeVersion: presentation.themeVersion,
      },
      requiredAssetIds: sourceAssetIds.map(sourceAssetId => assetIds.get(sourceAssetId)!),
      revision: normalizedRevision.revision,
      snapshot,
      sourceDocumentId,
      unknownBlockCount: unknownBlockCount(normalizedRevision),
      unresolvedAssetIds,
    },
  }
}

export function createStudioImportedDocument(
  draft: OneImgPackageImportedDraft,
  importedAssetIds: ReadonlyMap<string, string>,
  documentId: string,
): DocumentRevision {
  const remappedSnapshot = remapAssetReferences(draft.document.snapshot, importedAssetIds)
  if (!isJsonRecord(remappedSnapshot)) {
    throw new Error('Imported Document snapshot must be an object')
  }
  return createImportedDocumentRevision(
    deserializeDocumentRevision(JSON.stringify(remappedSnapshot)),
    documentId,
  )
}

export function createStudioImportTransaction(documentId: string): EditTransaction {
  return createImportedDocumentTransaction(documentId)
}
