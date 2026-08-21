import { createHash } from 'node:crypto'
import { type Page, expect, test } from '@playwright/test'

interface RawZipEntry {
  readonly data: Buffer
  readonly externalAttributes?: number
  readonly path: string
}

function sha256(data: Buffer) {
  return createHash('sha256').update(data).digest('hex')
}

function crc32(data: Buffer) {
  let value = 0xffffffff
  for (let index = 0; index < data.length; index += 1) {
    const byte = data[index]!
    value ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
    }
  }
  return (value ^ 0xffffffff) >>> 0
}

function buildStoredZip(entries: readonly RawZipEntry[]) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const path = Buffer.from(entry.path, 'utf8')
    const local = Buffer.alloc(30 + path.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(0, 6)
    local.writeUInt32LE(crc32(entry.data), 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(path.length, 26)
    path.copy(local, 30)
    localParts.push(local, entry.data)

    const central = Buffer.alloc(46 + path.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(0, 8)
    central.writeUInt32LE(crc32(entry.data), 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(path.length, 28)
    central.writeUInt32LE(entry.externalAttributes ?? 0, 38)
    central.writeUInt32LE(offset, 42)
    path.copy(central, 46)
    centralParts.push(central)
    offset += local.length + entry.data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

function createRawPackage(
  assetData = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  snapshot: Record<string, unknown> = { blocks: [], pages: [] },
) {
  const documentData = Buffer.from(JSON.stringify({
    blockVersion: 'block-catalog@1',
    documentId: 'raw-document-v1',
    modelVersion: 'document@1',
    presentation: {
      density: 'standard',
      fontPackId: 'noto-sans-sc@1',
      pageFormat: 'continuous',
      rendererRevision: 'canonical-renderer@1',
      templateId: 'clear-paper',
      templateVersion: 'clear-paper@1',
      themeId: 'cobalt',
      themeVersion: 'cobalt@1',
    },
    requiredAssetIds: ['raw-asset-v1'],
    revision: 1,
    schema: 'oneimg-document@1',
    snapshot,
    unknownBlockCount: 0,
    unresolvedAssetIds: [],
  }))
  const payloadEntries = [
    { data: documentData, path: 'documents/raw-document-v1.json' },
    { data: assetData, path: 'assets/raw-asset-v1/original.png' },
  ] as const
  const manifest = {
    applicationVersion: 'studio@0.4.0',
    assets: [{
      id: 'raw-asset-v1',
      originalMimeType: 'image/png',
      originalPath: 'assets/raw-asset-v1/original.png',
    }],
    createdAt: '2026-08-21T00:00:00.000Z',
    documents: [{
      blockVersion: 'block-catalog@1',
      id: 'raw-document-v1',
      modelVersion: 'document@1',
      path: 'documents/raw-document-v1.json',
      presentation: {
        density: 'standard',
        fontPackId: 'noto-sans-sc@1',
        pageFormat: 'continuous',
        rendererRevision: 'canonical-renderer@1',
        templateId: 'clear-paper',
        templateVersion: 'clear-paper@1',
        themeId: 'cobalt',
        themeVersion: 'cobalt@1',
      },
      requiredAssetIds: ['raw-asset-v1'],
      revision: 1,
      unknownBlockCount: 0,
      unresolvedAssetIds: [],
    }],
    entries: payloadEntries.map(entry => ({
      byteLength: entry.data.length,
      mediaType: entry.path.endsWith('.json') ? 'application/json' : 'image/png',
      path: entry.path,
      role: entry.path.endsWith('.json') ? 'document' : 'asset-original',
      sha256: sha256(entry.data),
    })),
    formatVersion: 1,
    packageId: 'raw-package-v1',
    requiredCapabilities: ['oneimg-package-v1', 'stored-zip-v1'],
    safeRecovery: 'complete',
    schema: 'oneimg-package-manifest',
  }
  return [
    { data: Buffer.from(JSON.stringify(manifest)), path: 'manifest.json' },
    ...payloadEntries,
  ]
}

async function inspectBytes(
  page: Page,
  bytes: Buffer,
  limits?: { readonly maxDocumentBytes?: number; readonly maxEntryBytes?: number },
) {
  return page.evaluate(async ({ bytes: input, limits: packageLimits }) => {
    const harness = window.__oneimgPackageHarness
    if (!harness) {
      throw new Error('Package scenario harness is not ready')
    }
    return harness.inspect(input, packageLimits)
  }, { bytes: Array.from(bytes), limits })
}

test.describe('OneIMG Package streaming contract', () => {
  test('writes a streamable package and imports an independent draft', async ({ page }) => {
    await page.goto('/scenario/oneimg-package')

    const result = JSON.parse(await page.getByTestId('package-result').textContent() ?? '{}') as {
      archiveBytes: number
      contentLengthMatches: boolean
      manifest: {
        entryPaths: string[]
        formatVersion: number
        packageId: string
      }
      progress: {
        readStages: string[]
        writeStages: string[]
      }
      roundTrip: {
        documentEqual: boolean
        importedDocumentIdDifferent: boolean
        importedDraftIdDifferent: boolean
        packageIdentityEqual: boolean
        assetBytesEqual: boolean
      }
      status: string
    }
    expect(result.status).toBe('ready')
    expect(result.archiveBytes).toBeGreaterThan(0)
    expect(result.contentLengthMatches).toBe(true)
    expect(result.manifest.formatVersion).toBe(1)
    expect(result.manifest.packageId).toBe('package-stream-fixture-v1')
    expect(result.manifest.entryPaths).toEqual([
      'manifest.json',
      'documents/document-fixture-v1.json',
      'assets/asset-fixture-v1/original.png',
      'assets/asset-fixture-v1/render.png',
    ])
    expect(result.progress.writeStages).toEqual([
      'manifest',
      'document',
      'asset-original',
      'asset-render-source',
    ])
    expect(result.progress.readStages).toEqual(result.progress.writeStages)
    expect(result.roundTrip).toEqual({
      assetBytesEqual: true,
      documentEqual: true,
      importedDocumentIdDifferent: true,
      importedDraftIdDifferent: true,
      packageIdentityEqual: true,
    })
  })

  test('rejects hostile paths, duplicates, digest tampering, media spoofing, and oversized entries', async ({ page }) => {
    await page.goto('/scenario/oneimg-package')
    await expect(page.getByTestId('package-result')).toContainText('"status":"ready"')

    const traversalEntries = createRawPackage()
    traversalEntries[1] = {
      ...traversalEntries[1],
      path: '../documents/raw-document-v1.json',
    }
    const traversal = await inspectBytes(page, buildStoredZip(traversalEntries))
    expect(traversal).toMatchObject({ code: 'invalid-path', ok: false })

    const duplicateEntries = createRawPackage()
    duplicateEntries.push(duplicateEntries[2]!)
    const duplicate = await inspectBytes(page, buildStoredZip(duplicateEntries))
    expect(duplicate).toMatchObject({ code: 'duplicate-entry', ok: false })

    const tamperedEntries = createRawPackage()
    tamperedEntries[2] = {
      ...tamperedEntries[2],
      data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 9]),
    }
    const tampered = await inspectBytes(page, buildStoredZip(tamperedEntries))
    expect(tampered).toMatchObject({ code: 'integrity-mismatch', ok: false })

    const spoofed = await inspectBytes(page, buildStoredZip(createRawPackage(Buffer.from('not a png'))))
    expect(spoofed).toMatchObject({ code: 'media-mismatch', ok: false })

    const oversized = await inspectBytes(page, buildStoredZip(createRawPackage()), { maxEntryBytes: 8 })
    expect(oversized).toMatchObject({ code: 'resource-limit', ok: false })

    const oversizedDocument = await inspectBytes(
      page,
      buildStoredZip(createRawPackage()),
      { maxDocumentBytes: 8 },
    )
    expect(oversizedDocument).toMatchObject({ code: 'resource-limit', ok: false })

    const newerEntries = createRawPackage()
    const newerManifest = JSON.parse(newerEntries[0]!.data.toString()) as Record<string, unknown>
    newerManifest.formatVersion = 2
    newerEntries[0] = { ...newerEntries[0]!, data: Buffer.from(JSON.stringify(newerManifest)) }
    const newer = await inspectBytes(page, buildStoredZip(newerEntries))
    expect(newer).toMatchObject({ ok: true, recovery: 'newer-format-version' })

    const unsupportedCapabilityEntries = createRawPackage()
    const unsupportedCapabilityManifest = JSON.parse(
      unsupportedCapabilityEntries[0]!.data.toString(),
    ) as { requiredCapabilities: string[] }
    unsupportedCapabilityManifest.requiredCapabilities.push('render-source-v2')
    unsupportedCapabilityEntries[0] = {
      ...unsupportedCapabilityEntries[0]!,
      data: Buffer.from(JSON.stringify(unsupportedCapabilityManifest)),
    }
    const unsupportedCapability = await inspectBytes(page, buildStoredZip(unsupportedCapabilityEntries))
    expect(unsupportedCapability).toMatchObject({ ok: true, recovery: 'unsupported-capability' })

    const newerComponentEntries = createRawPackage()
    const newerComponentManifest = JSON.parse(
      newerComponentEntries[0]!.data.toString(),
    ) as { documents: Array<{ modelVersion: string }> }
    newerComponentManifest.documents[0]!.modelVersion = 'document@2'
    newerComponentEntries[0] = {
      ...newerComponentEntries[0]!,
      data: Buffer.from(JSON.stringify(newerComponentManifest)),
    }
    const newerComponent = await inspectBytes(page, buildStoredZip(newerComponentEntries))
    expect(newerComponent).toMatchObject({ ok: true, recovery: 'newer-component-version' })

    const executable = await inspectBytes(
      page,
      buildStoredZip(createRawPackage(undefined, { blocks: [{ onmouseover: 'alert(1)' }] })),
    )
    expect(executable).toMatchObject({ code: 'executable-content', ok: false })
  })
})
