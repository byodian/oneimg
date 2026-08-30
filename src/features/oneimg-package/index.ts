export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export type PackageEntryRole = 'asset-original' | 'asset-render-source' | 'document' | 'manifest'
export type PackageProgressStage = 'reading' | 'writing'

export interface PackagePresentation {
  readonly density: 'comfortable' | 'compact' | 'standard'
  readonly fontPackId: string
  readonly pageFormat: 'bounded' | 'continuous'
  readonly rendererRevision: string
  readonly sensitive?: boolean
  readonly sceneId?: string
  readonly sceneVersion?: string
  readonly templateId: string
  readonly templateVersion: string
  readonly themeId: string
  readonly themeVersion: string
}

export interface OneImgPackageDocumentInput {
  readonly blockVersion: string
  readonly id: string
  readonly modelVersion: string
  readonly presentation: PackagePresentation
  readonly requiredAssetIds: readonly string[]
  readonly revision: number
  readonly snapshot: JsonValue
  readonly unknownBlockCount?: number
  readonly unresolvedAssetIds?: readonly string[]
}

export interface PackageBinarySource {
  readonly extension: string
  readonly mimeType: string
  readonly stream: () => ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>
}

export interface OneImgPackageAssetInput {
  readonly id: string
  readonly original: PackageBinarySource
  readonly renderSource?: PackageBinarySource
  readonly renderSourceRevision?: string
}

export interface PackageEntryManifest {
  readonly byteLength: number
  readonly mediaType: string
  readonly path: string
  readonly role: Exclude<PackageEntryRole, 'manifest'>
  readonly sha256: string
}

export interface PackageDocumentManifest {
  readonly blockVersion: string
  readonly id: string
  readonly modelVersion: string
  readonly path: string
  readonly presentation: PackagePresentation
  readonly requiredAssetIds: readonly string[]
  readonly revision: number
  readonly unknownBlockCount: number
  readonly unresolvedAssetIds: readonly string[]
}

export interface PackageAssetManifest {
  readonly id: string
  readonly originalMimeType: string
  readonly originalPath: string
  readonly renderSourceMimeType?: string
  readonly renderSourcePath?: string
  readonly renderSourceRevision?: string
}

export interface OneImgPackageManifest {
  readonly applicationVersion: string
  readonly assets: readonly PackageAssetManifest[]
  readonly createdAt: string
  readonly documents: readonly PackageDocumentManifest[]
  readonly entries: readonly PackageEntryManifest[]
  readonly formatVersion: 1
  readonly packageId: string
  readonly requiredCapabilities: readonly string[]
  readonly safeRecovery: 'complete' | 'unresolved-assets'
  readonly schema: 'oneimg-package-manifest'
}

export interface PackageProgress {
  readonly byteLength: number
  readonly completedEntries: number
  readonly entryIndex: number
  readonly entryPath: string
  readonly entryRole: PackageEntryRole
  readonly stage: PackageProgressStage
  readonly totalBytes: number
  readonly totalEntries: number
}

export interface OneImgPackageLimits {
  readonly maxDocumentBytes: number
  readonly maxEntryBytes: number
  readonly maxEntries: number
  readonly maxJsonDepth: number
  readonly maxJsonNodes: number
  readonly maxManifestBytes: number
  readonly maxStringBytes: number
  readonly maxTotalBytes: number
}

export const DEFAULT_ONEIMG_PACKAGE_LIMITS: OneImgPackageLimits = {
  maxDocumentBytes: 4 * 1024 * 1024,
  maxEntryBytes: 32 * 1024 * 1024,
  maxEntries: 128,
  maxJsonDepth: 64,
  maxJsonNodes: 100_000,
  maxManifestBytes: 2 * 1024 * 1024,
  maxStringBytes: 8 * 1024 * 1024,
  maxTotalBytes: 128 * 1024 * 1024,
}

export interface CreateOneImgPackageOptions {
  readonly applicationVersion: string
  readonly assets: readonly OneImgPackageAssetInput[]
  readonly createdAt?: string
  readonly documents: readonly OneImgPackageDocumentInput[]
  readonly limits?: Partial<OneImgPackageLimits>
  readonly onProgress?: (progress: PackageProgress) => void
  readonly packageId: string
  readonly signal?: AbortSignal
}

export interface OneImgPackageArtifact {
  readonly contentLength: number
  readonly manifest: OneImgPackageManifest
  readonly stream: ReadableStream<Uint8Array>
}

export type OneImgPackageInput =
  | ArrayBuffer
  | AsyncIterable<Uint8Array>
  | Blob
  | ReadableStream<Uint8Array>
  | Uint8Array

export interface PackageImportedAsset {
  readonly assetId: string
  readonly original: Blob
  readonly renderSource?: Blob
  readonly renderSourceRevision?: string
  readonly sourceAssetId: string
}

export interface PackageImportFinding {
  readonly code: 'newer-format' | 'unknown-blocks' | 'unresolved-assets'
  readonly count: number
  readonly severity: 'warning'
}

export interface PackageImportReport {
  readonly exactAssetCount: number
  readonly exactDocumentCount: number
  readonly findings: readonly PackageImportFinding[]
  readonly unresolvedAssetCount: number
  readonly unknownBlockCount: number
}

export interface OneImgPackageInspection {
  readonly assets: readonly {
    readonly id: string
    readonly mimeType: string
    readonly original: Blob
    readonly renderSource?: Blob
    readonly renderSourceMimeType?: string
    readonly renderSourceRevision?: string
  }[]
  readonly documents: readonly OneImgPackageDocumentInput[]
  readonly manifest: OneImgPackageManifest
  readonly report: PackageImportReport
}

export interface OneImgPackageRecoveryDraft {
  readonly formatVersion: number
  readonly kind: 'recovery-draft'
  readonly message: string
  readonly packageId?: string
  readonly reason: 'newer-component-version' | 'newer-format-version' | 'unsupported-capability'
}

export interface OneImgPackageRecoveryInspection {
  readonly assets: readonly []
  readonly documents: readonly []
  readonly recovery: OneImgPackageRecoveryDraft
  readonly report: PackageImportReport
}

export type OneImgPackageInspectionResult = OneImgPackageInspection | OneImgPackageRecoveryInspection

export interface OneImgPackageImportedDraft {
  readonly assets: readonly PackageImportedAsset[]
  readonly document: OneImgPackageDocumentInput
  readonly documentId: string
  readonly draftId: string
  readonly sourceDocumentId: string
}

export interface OneImgPackageImportResult {
  readonly drafts: readonly OneImgPackageImportedDraft[]
  readonly manifest?: OneImgPackageManifest
  readonly packageId?: string
  readonly report: PackageImportReport
  readonly recovery?: OneImgPackageRecoveryDraft
}

export type PackageIdKind = 'asset' | 'document' | 'draft'

export interface ImportOneImgPackageOptions {
  readonly createId?: (kind: PackageIdKind, sourceId: string) => string
  readonly limits?: Partial<OneImgPackageLimits>
  readonly onProgress?: (progress: PackageProgress) => void
  readonly reservedIds?: readonly string[]
  readonly signal?: AbortSignal
}

export type OneImgPackageErrorCode =
  | 'canceled'
  | 'duplicate-entry'
  | 'executable-content'
  | 'integrity-mismatch'
  | 'invalid-manifest'
  | 'invalid-path'
  | 'invalid-zip'
  | 'length-mismatch'
  | 'media-mismatch'
  | 'missing-entry'
  | 'resource-limit'
  | 'source-changed'
  | 'unsupported-compression'
  | 'unsupported-media'

export class OneImgPackageError extends Error {
  readonly code: OneImgPackageErrorCode
  readonly path?: string

  constructor(code: OneImgPackageErrorCode, message: string, path?: string) {
    super(message)
    this.name = 'OneImgPackageError'
    this.code = code
    this.path = path
  }
}

const ZIP_LOCAL_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_SIGNATURE = 0x02014b50
const ZIP_END_SIGNATURE = 0x06054b50
const ZIP64_END_SIGNATURE = 0x06064b50
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50
const ZIP_MAX_UINT16 = 0xffff
const ZIP_MAX_UINT32 = 0xffffffff
const PACKAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/
const VERSIONED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/
const PATH_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/
const EXTENSION_PATTERN = /^[a-z0-9]{1,8}$/
const HASH_PATTERN = /^[0-9a-f]{64}$/
const EXECUTABLE_DECLARATION_KEYS = new Set([
  '__html',
  '__proto__',
  'constructor',
  'dangerouslysetinnerhtml',
  'eventhandler',
  'innerhtml',
  'javascript',
  'onclick',
  'onerror',
  'onload',
  'outerhtml',
  'prototype',
  'script',
  'scripts',
])
const SUPPORTED_PACKAGE_CAPABILITIES = new Set(['oneimg-package-v1', 'stored-zip-v1'])
const MIME_EXTENSIONS = new Map([
  ['font/woff2', 'woff2'],
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/json', 'json'],
])
const ZIP_SIGNATURE_BYTES = 4
const textEncoder = new TextEncoder()

const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function fail(code: OneImgPackageErrorCode, message: string, path?: string): never {
  throw new OneImgPackageError(code, message, path)
}

function mergeLimits(limits?: Partial<OneImgPackageLimits>): OneImgPackageLimits {
  const merged = { ...DEFAULT_ONEIMG_PACKAGE_LIMITS, ...limits }
  for (const [name, value] of Object.entries(merged)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      fail('resource-limit', `Package limit ${name} must be a positive safe integer`)
    }
  }
  return merged
}

function throwIfPackageAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    fail('canceled', 'OneIMG Package operation was canceled')
  }
}

function assertPackageId(value: string, name: string) {
  if (!PACKAGE_ID_PATTERN.test(value)) {
    fail('invalid-manifest', `${name} must be an opaque ASCII identifier`)
  }
}

function assertVersionedId(value: string, name: string) {
  if (!VERSIONED_ID_PATTERN.test(value)) {
    fail('invalid-manifest', `${name} must be a bounded versioned identifier`)
  }
}

function assertPathId(value: string, name: string) {
  if (!PATH_ID_PATTERN.test(value)) {
    fail('invalid-path', `${name} must be an opaque path identifier`)
  }
}

function assertExtension(value: string, name: string) {
  if (!EXTENSION_PATTERN.test(value)) {
    fail('invalid-path', `${name} must be a lowercase file extension`)
  }
}

function assertPlainJson(value: unknown, limits: OneImgPackageLimits, path = '$') : asserts value is JsonValue {
  const state = { nodes: 0, stringBytes: 0 }

  const visit = (current: unknown, currentPath: string, depth: number) => {
    if (depth > limits.maxJsonDepth) {
      fail('resource-limit', `JSON depth exceeds ${limits.maxJsonDepth}`, currentPath)
    }
    state.nodes += 1
    if (state.nodes > limits.maxJsonNodes) {
      fail('resource-limit', `JSON node count exceeds ${limits.maxJsonNodes}`, currentPath)
    }

    if (current === null || typeof current === 'boolean') {
      return
    }
    if (typeof current === 'string') {
      state.stringBytes += current.length * 4
      if (state.stringBytes > limits.maxStringBytes) {
        fail('resource-limit', `JSON string data exceeds ${limits.maxStringBytes} bytes`, currentPath)
      }
      return
    }
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) {
        fail('invalid-manifest', 'JSON numbers must be finite', currentPath)
      }
      return
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`, depth + 1))
      return
    }
    if (typeof current !== 'object') {
      fail('invalid-manifest', 'Package JSON contains a non-serializable value', currentPath)
    }
    const prototype = Object.getPrototypeOf(current)
    if (prototype !== Object.prototype && prototype !== null) {
      fail('invalid-manifest', 'Package JSON contains a non-plain object', currentPath)
    }
    for (const [key, item] of Object.entries(current)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        fail('executable-content', `Package JSON contains forbidden key ${key}`, currentPath)
      }
      if (key.length > 256) {
        fail('resource-limit', 'Package JSON key is too long', currentPath)
      }
      visit(item, `${currentPath}.${key}`, depth + 1)
    }
  }

  visit(value, path, 0)
}

function assertDeclarativeJson(value: JsonValue, path = '$') {
  const visit = (current: JsonValue, currentPath: string) => {
    if (typeof current === 'string') {
      if (
        /^\s*(?:javascript|vbscript|data:text\/html|blob):/i.test(current)
        || /<script\b/i.test(current)
        || /\b(?:https?|wss?|ftp|file):\/\//i.test(current)
        || /(^|[\s"'])\/\//.test(current)
        || /\burl\s*\(/i.test(current)
        || /\b(?:eval|expression)\s*\(/i.test(current)
      ) {
        fail('executable-content', 'Package contains executable declaration text', currentPath)
      }
      return
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`))
      return
    }
    if (!current || typeof current !== 'object') {
      return
    }
    for (const [key, item] of Object.entries(current)) {
      const lowerKey = key.toLowerCase()
      const normalizedKey = lowerKey.replace(/[-_]/g, '')
      if (
        EXECUTABLE_DECLARATION_KEYS.has(lowerKey)
        || EXECUTABLE_DECLARATION_KEYS.has(normalizedKey)
        || /^on[a-z][a-z0-9]*$/.test(normalizedKey)
        || /^(?:css|cssText|style|styleText|stylesheet)$/i.test(key)
      ) {
        fail('executable-content', `Package contains executable declaration key ${key}`, currentPath)
      }
      visit(item, `${currentPath}.${key}`)
    }
  }
  visit(value, path)
}

function stableJsonStringify(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableJsonStringify(item)).join(',')}]`
  }
  const record = value as { readonly [key: string]: JsonValue }
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJsonStringify(record[key]!)}`).join(',')}}`
}

function requireRecord(value: JsonValue, path: string): { readonly [key: string]: JsonValue } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('invalid-manifest', `${path} must be an object`, path)
  }
  return value as { readonly [key: string]: JsonValue }
}

function requireString(record: { readonly [key: string]: JsonValue }, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'string') {
    fail('invalid-manifest', `${path}.${key} must be a string`, path)
  }
  return value
}

function requireBoolean(record: { readonly [key: string]: JsonValue }, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'boolean') {
    fail('invalid-manifest', `${path}.${key} must be a boolean`, path)
  }
  return value
}

function isNewerComponentVersion(value: string) {
  const match = /@(\d+)$/.exec(value)
  return match !== null && Number(match[1]) > 1
}

function recoveryDraftFromManifest(
  record: { readonly [key: string]: JsonValue },
  formatVersion: number,
  reason: OneImgPackageRecoveryDraft['reason'],
  message: string,
): OneImgPackageRecoveryDraft {
  const packageIdValue = record.packageId
  if (packageIdValue !== undefined && typeof packageIdValue !== 'string') {
    fail('invalid-manifest', 'Recovery Manifest packageId must be a string', 'manifest.json')
  }
  if (typeof packageIdValue === 'string') {
    assertPackageId(packageIdValue, 'manifest.packageId')
  }
  return {
    formatVersion,
    kind: 'recovery-draft',
    message,
    ...(typeof packageIdValue === 'string' ? { packageId: packageIdValue } : {}),
    reason,
  }
}

function requireNumber(record: { readonly [key: string]: JsonValue }, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    fail('invalid-manifest', `${path}.${key} must be a safe integer`, path)
  }
  return value
}

function requireArray(record: { readonly [key: string]: JsonValue }, key: string, path: string) {
  const value = record[key]
  if (!Array.isArray(value)) {
    fail('invalid-manifest', `${path}.${key} must be an array`, path)
  }
  return value
}

function normalizePresentation(presentation: PackagePresentation): PackagePresentation {
  const normalized: PackagePresentation = {
    density: presentation.density,
    fontPackId: presentation.fontPackId,
    pageFormat: presentation.pageFormat,
    rendererRevision: presentation.rendererRevision,
    templateId: presentation.templateId,
    templateVersion: presentation.templateVersion,
    themeId: presentation.themeId,
    themeVersion: presentation.themeVersion,
    ...(presentation.sensitive === undefined ? {} : { sensitive: presentation.sensitive }),
    ...(presentation.sceneId === undefined ? {} : { sceneId: presentation.sceneId }),
    ...(presentation.sceneVersion === undefined ? {} : { sceneVersion: presentation.sceneVersion }),
  }
  if (!['comfortable', 'compact', 'standard'].includes(normalized.density)) {
    fail('invalid-manifest', 'Presentation density is not supported')
  }
  if (!['bounded', 'continuous'].includes(normalized.pageFormat)) {
    fail('invalid-manifest', 'Presentation page format is not supported')
  }
  for (const [name, value] of Object.entries(normalized)) {
    if (name === 'sensitive') {
      if (typeof value !== 'boolean') {
        fail('invalid-manifest', `Presentation ${name} must be a boolean`)
      }
      continue
    }
    if (typeof value !== 'string' || value.length === 0) {
      fail('invalid-manifest', `Presentation ${name} must be a non-empty string`)
    }
    assertVersionedId(value, `presentation.${name}`)
  }
  return normalized
}

function documentPayload(document: OneImgPackageDocumentInput, limits: OneImgPackageLimits): JsonValue {
  assertPlainJson(document.snapshot, limits, `document.${document.id}.snapshot`)
  assertDeclarativeJson(document.snapshot, `document.${document.id}.snapshot`)
  return {
    blockVersion: document.blockVersion,
    documentId: document.id,
    modelVersion: document.modelVersion,
    presentation: normalizePresentation(document.presentation) as unknown as JsonValue,
    requiredAssetIds: [...document.requiredAssetIds],
    revision: document.revision,
    schema: 'oneimg-document@1',
    snapshot: document.snapshot,
    unknownBlockCount: document.unknownBlockCount ?? 0,
    unresolvedAssetIds: [...(document.unresolvedAssetIds ?? [])],
  }
}

function encodeJson(value: JsonValue, limit: number, path: string) {
  const encoded = textEncoder.encode(stableJsonStringify(value))
  if (encoded.byteLength > limit) {
    fail('resource-limit', `${path} exceeds ${limit} bytes`, path)
  }
  return encoded
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function rotateRight(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount))
}

class Sha256Hasher {
  private readonly buffer = new Uint8Array(64)
  private bufferLength = 0
  private bytesHashed = 0
  private finished = false
  private readonly state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])

  update(bytes: Uint8Array) {
    if (this.finished) {
      throw new Error('SHA-256 digest has already been finalized')
    }
    this.bytesHashed += bytes.byteLength
    let offset = 0

    if (this.bufferLength > 0) {
      const needed = 64 - this.bufferLength
      const copied = Math.min(needed, bytes.byteLength)
      this.buffer.set(bytes.subarray(0, copied), this.bufferLength)
      this.bufferLength += copied
      offset += copied
      if (this.bufferLength === 64) {
        this.processBlock(this.buffer)
        this.bufferLength = 0
      }
    }

    while (offset + 64 <= bytes.byteLength) {
      this.processBlock(bytes.subarray(offset, offset + 64))
      offset += 64
    }

    if (offset < bytes.byteLength) {
      this.buffer.set(bytes.subarray(offset), 0)
      this.bufferLength = bytes.byteLength - offset
    }
  }

  digest() {
    if (!this.finished) {
      const totalBits = this.bytesHashed * 8
      this.buffer[this.bufferLength] = 0x80
      this.bufferLength += 1
      if (this.bufferLength > 56) {
        this.buffer.fill(0, this.bufferLength)
        this.processBlock(this.buffer)
        this.bufferLength = 0
      }
      this.buffer.fill(0, this.bufferLength, 56)
      const view = new DataView(this.buffer.buffer)
      view.setUint32(56, Math.floor(totalBits / 0x1_0000_0000) >>> 0)
      view.setUint32(60, totalBits >>> 0)
      this.processBlock(this.buffer)
      this.finished = true
    }

    const result = new Uint8Array(32)
    const view = new DataView(result.buffer)
    this.state.forEach((value, index) => view.setUint32(index * 4, value))
    return result
  }

  private processBlock(block: Uint8Array) {
    const words = new Uint32Array(64)
    const view = new DataView(block.buffer, block.byteOffset, 64)
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(index * 4)
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15]!, 7)
        ^ rotateRight(words[index - 15]!, 18)
        ^ (words[index - 15]! >>> 3)
      const s1 = rotateRight(words[index - 2]!, 17)
        ^ rotateRight(words[index - 2]!, 19)
        ^ (words[index - 2]! >>> 10)
      words[index] = (words[index - 16]! + s0 + words[index - 7]! + s1) >>> 0
    }

    let a = this.state[0]!
    let b = this.state[1]!
    let c = this.state[2]!
    let d = this.state[3]!
    let e = this.state[4]!
    let f = this.state[5]!
    let g = this.state[6]!
    let h = this.state[7]!
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temp1 = (h + sum1 + choice + SHA256_CONSTANTS[index]! + words[index]!) >>> 0
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sum0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    this.state[0] = (this.state[0]! + a) >>> 0
    this.state[1] = (this.state[1]! + b) >>> 0
    this.state[2] = (this.state[2]! + c) >>> 0
    this.state[3] = (this.state[3]! + d) >>> 0
    this.state[4] = (this.state[4]! + e) >>> 0
    this.state[5] = (this.state[5]! + f) >>> 0
    this.state[6] = (this.state[6]! + g) >>> 0
    this.state[7] = (this.state[7]! + h) >>> 0
  }
}

const CRC32_TABLE = new Uint32Array(256)
for (let index = 0; index < 256; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }
  CRC32_TABLE[index] = value >>> 0
}

class Crc32 {
  private value = 0xffffffff

  update(bytes: Uint8Array) {
    for (let index = 0; index < bytes.byteLength; index += 1) {
      const byte = bytes[index]!
      this.value = (CRC32_TABLE[(this.value ^ byte) & 0xff]! ^ (this.value >>> 8)) >>> 0
    }
  }

  digest() {
    return (this.value ^ 0xffffffff) >>> 0
  }
}

interface SourceSummary {
  readonly byteLength: number
  readonly crc32: number
  readonly sample: Uint8Array
  readonly sha256: string
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ReadableStream<Uint8Array>).getReader === 'function'
}

function toReadableStream(value: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>) {
  if (isReadableStream(value)) {
    return value
  }

  const iterator = value[Symbol.asyncIterator]()
  return new ReadableStream<Uint8Array>({
    async cancel(reason) {
      await iterator.return?.(reason)
    },
    async pull(controller) {
      try {
        const next = await iterator.next()
        if (next.done) {
          controller.close()
          return
        }
        if (!(next.value instanceof Uint8Array)) {
          controller.error(new TypeError('Package byte sources must yield Uint8Array chunks'))
          return
        }
        controller.enqueue(next.value)
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

function sourceStream(source: PackageBinarySource) {
  return toReadableStream(source.stream())
}

async function summarizeSource(
  source: PackageBinarySource,
  limits: OneImgPackageLimits,
  signal: AbortSignal | undefined,
  maxBytes: number,
): Promise<SourceSummary> {
  const hasher = new Sha256Hasher()
  const crc = new Crc32()
  const sample = new Uint8Array(32)
  let sampleLength = 0
  let byteLength = 0
  const stream = sourceStream(source)
  const reader = stream.getReader()

  try {
    while (true) {
      throwIfPackageAborted(signal)
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!(value instanceof Uint8Array)) {
        fail('invalid-zip', 'Package byte sources must yield Uint8Array chunks')
      }
      byteLength += value.byteLength
      if (byteLength > maxBytes || byteLength > limits.maxEntryBytes) {
        fail('resource-limit', `Package entry exceeds ${Math.min(maxBytes, limits.maxEntryBytes)} bytes`)
      }
      hasher.update(value)
      crc.update(value)
      if (sampleLength < sample.byteLength) {
        const copied = Math.min(sample.byteLength - sampleLength, value.byteLength)
        sample.set(value.subarray(0, copied), sampleLength)
        sampleLength += copied
      }
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }

  return {
    byteLength,
    crc32: crc.digest(),
    sample: sample.subarray(0, sampleLength),
    sha256: bytesToHex(hasher.digest()),
  }
}

function summarizeBytes(bytes: Uint8Array): SourceSummary {
  const hasher = new Sha256Hasher()
  const crc = new Crc32()
  hasher.update(bytes)
  crc.update(bytes)
  return {
    byteLength: bytes.byteLength,
    crc32: crc.digest(),
    sample: bytes.subarray(0, 32),
    sha256: bytesToHex(hasher.digest()),
  }
}

function concatBytes(parts: readonly Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

function zipHeaderBytes(path: string) {
  return textEncoder.encode(path)
}

interface PackageEntry {
  readonly byteLength: number
  readonly crc32: number
  readonly mediaType: string
  readonly path: string
  readonly role: PackageEntryRole
  readonly sha256: string
  readonly source: PackageBinarySource
}

interface CentralRecord {
  readonly entry: PackageEntry
  readonly localHeaderOffset: number
}

function setZipUint16(view: DataView, offset: number, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > ZIP_MAX_UINT16) {
    fail('resource-limit', 'ZIP 16-bit field exceeds its bounded range')
  }
  view.setUint16(offset, value, true)
}

function setZipUint32(view: DataView, offset: number, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > ZIP_MAX_UINT32) {
    fail('resource-limit', 'ZIP 32-bit field exceeds its bounded range')
  }
  view.setUint32(offset, value, true)
}

function buildLocalHeader(entry: PackageEntry) {
  const pathBytes = zipHeaderBytes(entry.path)
  const header = new Uint8Array(30 + pathBytes.byteLength)
  const view = new DataView(header.buffer)
  setZipUint32(view, 0, ZIP_LOCAL_SIGNATURE)
  setZipUint16(view, 4, 20)
  setZipUint16(view, 6, 0)
  setZipUint16(view, 8, 0)
  setZipUint16(view, 10, 0)
  setZipUint16(view, 12, 0)
  setZipUint32(view, 14, entry.crc32)
  setZipUint32(view, 18, entry.byteLength)
  setZipUint32(view, 22, entry.byteLength)
  setZipUint16(view, 26, pathBytes.byteLength)
  setZipUint16(view, 28, 0)
  header.set(pathBytes, 30)
  return header
}

function buildCentralDirectory(records: readonly CentralRecord[]) {
  const parts = records.map(({ entry, localHeaderOffset }) => {
    const pathBytes = zipHeaderBytes(entry.path)
    const record = new Uint8Array(46 + pathBytes.byteLength)
    const view = new DataView(record.buffer)
    setZipUint32(view, 0, ZIP_CENTRAL_SIGNATURE)
    setZipUint16(view, 4, 20)
    setZipUint16(view, 6, 20)
    setZipUint16(view, 8, 0)
    setZipUint16(view, 10, 0)
    setZipUint16(view, 12, 0)
    setZipUint16(view, 14, 0)
    setZipUint32(view, 16, entry.crc32)
    setZipUint32(view, 20, entry.byteLength)
    setZipUint32(view, 24, entry.byteLength)
    setZipUint16(view, 28, pathBytes.byteLength)
    setZipUint16(view, 30, 0)
    setZipUint16(view, 32, 0)
    setZipUint16(view, 34, 0)
    setZipUint16(view, 36, 0)
    setZipUint32(view, 38, 0)
    setZipUint32(view, 42, localHeaderOffset)
    record.set(pathBytes, 46)
    return record
  })
  return concatBytes(parts)
}

function buildEndOfCentralDirectory(entryCount: number, centralDirectory: Uint8Array, centralOffset: number) {
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  setZipUint32(view, 0, ZIP_END_SIGNATURE)
  setZipUint16(view, 4, 0)
  setZipUint16(view, 6, 0)
  setZipUint16(view, 8, entryCount)
  setZipUint16(view, 10, entryCount)
  setZipUint32(view, 12, centralDirectory.byteLength)
  setZipUint32(view, 16, centralOffset)
  setZipUint16(view, 20, 0)
  return end
}

function assertSupportedMedia(mimeType: string, extension: string, sample: Uint8Array, path: string) {
  const expectedExtension = MIME_EXTENSIONS.get(mimeType)
  if (!expectedExtension || expectedExtension !== extension) {
    fail('unsupported-media', `Media type ${mimeType} is not supported for ${extension}`, path)
  }
  if (mimeType === 'application/json') {
    return
  }

  const matches = (bytes: readonly number[]) => bytes.every((byte, index) => sample[index] === byte)
  const valid = mimeType === 'image/png'
    ? matches([137, 80, 78, 71, 13, 10, 26, 10])
    : mimeType === 'image/jpeg'
      ? matches([0xff, 0xd8, 0xff])
      : mimeType === 'image/gif'
        ? matches([71, 73, 70, 56])
        : mimeType === 'image/webp'
          ? matches([82, 73, 70, 70])
            && sample[8] === 87
            && sample[9] === 69
            && sample[10] === 66
            && sample[11] === 80
          : mimeType === 'font/woff2'
            ? matches([119, 79, 70, 50])
            : false
  if (!valid) {
    fail('media-mismatch', `Media signature does not match ${mimeType}`, path)
  }
}

function assertPackagePath(path: string) {
  if (
    path.length === 0
    || path.length > 512
    || path.startsWith('/')
    || path.includes('\\')
    || path.includes('%')
    || path.split('/').some(part => part.length === 0 || part === '.' || part === '..')
    || /[^A-Za-z0-9._/-]/.test(path)
  ) {
    fail('invalid-path', `Package path is not normalized: ${path}`, path)
  }
}

function packageBlobSource(blob: Blob, mimeType: string, extension: string): PackageBinarySource {
  return {
    extension,
    mimeType,
    stream: () => blob.stream() as ReadableStream<Uint8Array>,
  }
}

export function createPackageBlobSource(blob: Blob, extension = MIME_EXTENSIONS.get(blob.type) ?? 'bin'): PackageBinarySource {
  return packageBlobSource(blob, blob.type, extension)
}

export function createPackageBytesSource(bytes: Uint8Array, mimeType: string, extension: string): PackageBinarySource {
  const ownedBytes = bytes.slice()
  return {
    extension,
    mimeType,
    stream: () => new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(ownedBytes.slice())
        controller.close()
      },
    }),
  }
}

function validateDocumentForWrite(
  document: OneImgPackageDocumentInput,
  assets: ReadonlyMap<string, OneImgPackageAssetInput>,
  limits: OneImgPackageLimits,
) {
  assertPathId(document.id, 'document.id')
  assertVersionedId(document.modelVersion, 'document.modelVersion')
  assertVersionedId(document.blockVersion, 'document.blockVersion')
  if (!Number.isSafeInteger(document.revision) || document.revision < 1) {
    fail('invalid-manifest', `Document ${document.id} revision must be positive`)
  }
  const requiredAssetIds = [...document.requiredAssetIds]
  if (new Set(requiredAssetIds).size !== requiredAssetIds.length) {
    fail('invalid-manifest', `Document ${document.id} repeats an Asset reference`)
  }
  const unresolvedAssetIds = [...(document.unresolvedAssetIds ?? [])]
  if (new Set(unresolvedAssetIds).size !== unresolvedAssetIds.length) {
    fail('invalid-manifest', `Document ${document.id} repeats an Unresolved Asset reference`)
  }
  for (const assetId of requiredAssetIds) {
    assertPathId(assetId, 'document.requiredAssetId')
    if (!assets.has(assetId) && !unresolvedAssetIds.includes(assetId)) {
      fail('missing-entry', `Document ${document.id} references missing Asset ${assetId}`)
    }
  }
  for (const assetId of unresolvedAssetIds) {
    if (!requiredAssetIds.includes(assetId)) {
      fail('invalid-manifest', `Document ${document.id} marks an unreferenced Asset unresolved`)
    }
  }
  const unknownBlockCount = document.unknownBlockCount ?? 0
  if (!Number.isSafeInteger(unknownBlockCount) || unknownBlockCount < 0) {
    fail('invalid-manifest', `Document ${document.id} has an invalid Unknown Block count`)
  }
  normalizePresentation(document.presentation)
  assertPlainJson(document.snapshot, limits, `document.${document.id}.snapshot`)
  assertDeclarativeJson(document.snapshot, `document.${document.id}.snapshot`)
}

function makeReport(
  documents: readonly OneImgPackageDocumentInput[],
  assetCount: number,
): PackageImportReport {
  const unknownBlockCount = documents.reduce((sum, document) => sum + (document.unknownBlockCount ?? 0), 0)
  const unresolvedAssetCount = documents.reduce(
    (sum, document) => sum + (document.unresolvedAssetIds?.length ?? 0),
    0,
  )
  const findings: PackageImportFinding[] = []
  if (unknownBlockCount > 0) {
    findings.push({ code: 'unknown-blocks', count: unknownBlockCount, severity: 'warning' })
  }
  if (unresolvedAssetCount > 0) {
    findings.push({ code: 'unresolved-assets', count: unresolvedAssetCount, severity: 'warning' })
  }
  return {
    exactAssetCount: assetCount,
    exactDocumentCount: documents.length,
    findings,
    unknownBlockCount,
    unresolvedAssetCount,
  }
}

function makeRecoveryReport(): PackageImportReport {
  return {
    exactAssetCount: 0,
    exactDocumentCount: 0,
    findings: [{ code: 'newer-format', count: 1, severity: 'warning' }],
    unknownBlockCount: 0,
    unresolvedAssetCount: 0,
  }
}

async function preflightEntry(
  entry: PackageEntry,
  limits: OneImgPackageLimits,
  signal: AbortSignal | undefined,
): Promise<PackageEntry> {
  const summary = await summarizeSource(
    entry.source,
    limits,
    signal,
    entry.role === 'document' ? limits.maxDocumentBytes : limits.maxEntryBytes,
  )
  if (entry.role !== 'manifest') {
    const extension = entry.path.split('.').pop() ?? ''
    assertSupportedMedia(entry.mediaType, extension, summary.sample, entry.path)
  }
  return { ...entry, ...summary }
}

function packageEntryFromBytes(
  path: string,
  role: PackageEntryRole,
  mediaType: string,
  bytes: Uint8Array,
): PackageEntry {
  const summary = summarizeBytes(bytes)
  return {
    byteLength: summary.byteLength,
    crc32: summary.crc32,
    mediaType,
    path,
    role,
    sha256: summary.sha256,
    source: createPackageBytesSource(bytes, mediaType, path.split('.').pop() ?? 'bin'),
  }
}

function createWriterStream(
  entries: readonly PackageEntry[],
  onProgress: ((progress: PackageProgress) => void) | undefined,
  signal: AbortSignal | undefined,
): ReadableStream<Uint8Array> {
  const MAX_STREAM_CHUNK_BYTES = 64 * 1024
  let canceled = false
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let cancelReason: unknown
  let resumeProducer: (() => void) | undefined

  const waitForDemand = async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (canceled) {
      fail('canceled', String(cancelReason ?? 'OneIMG Package stream was canceled'))
    }
    const desiredSize = controller.desiredSize
    if (desiredSize === null || desiredSize > 0) {
      return
    }
    await new Promise<void>((resolve) => {
      resumeProducer = resolve
    })
    if (canceled) {
      fail('canceled', String(cancelReason ?? 'OneIMG Package stream was canceled'))
    }
  }

  const enqueueBytes = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
    bytes: Uint8Array,
  ) => {
    for (let offset = 0; offset < bytes.byteLength; offset += MAX_STREAM_CHUNK_BYTES) {
      controller.enqueue(bytes.subarray(offset, offset + MAX_STREAM_CHUNK_BYTES))
      await waitForDemand(controller)
    }
  }

  const produce = async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    try {
      const totalBytes = entries.reduce((sum, entry) => sum + entry.byteLength, 0)
      let completedEntries = 0
      let archiveOffset = 0
      const centralRecords: CentralRecord[] = []

      for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        const entry = entries[entryIndex]!
        if (canceled) {
          fail('canceled', String(cancelReason ?? 'OneIMG Package stream was canceled'))
        }
        throwIfPackageAborted(signal)
        const localHeader = buildLocalHeader(entry)
        const localHeaderOffset = archiveOffset
        await enqueueBytes(controller, localHeader)
        archiveOffset += localHeader.byteLength

        const hasher = new Sha256Hasher()
        const crc = new Crc32()
        let byteLength = 0
        const reader = sourceStream(entry.source).getReader()
        activeReader = reader
        try {
          while (true) {
            if (canceled) {
              fail('canceled', String(cancelReason ?? 'OneIMG Package stream was canceled'))
            }
            throwIfPackageAborted(signal)
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            if (!(value instanceof Uint8Array)) {
              fail('source-changed', `Package entry ${entry.path} yielded invalid bytes`, entry.path)
            }
            byteLength += value.byteLength
            if (byteLength > entry.byteLength) {
              fail('source-changed', `Package entry ${entry.path} changed after preflight`, entry.path)
            }
            hasher.update(value)
            crc.update(value)
            await enqueueBytes(controller, value)
            archiveOffset += value.byteLength
          }
        } finally {
          activeReader = undefined
          reader.releaseLock()
        }

        if (
          byteLength !== entry.byteLength
          || crc.digest() !== entry.crc32
          || bytesToHex(hasher.digest()) !== entry.sha256
        ) {
          fail('source-changed', `Package entry ${entry.path} changed after preflight`, entry.path)
        }
        centralRecords.push({ entry, localHeaderOffset })
        completedEntries += 1
        onProgress?.({
          byteLength: entry.byteLength,
          completedEntries,
          entryIndex,
          entryPath: entry.path,
          entryRole: entry.role,
          stage: 'writing',
          totalBytes,
          totalEntries: entries.length,
        })
      }

      const centralDirectory = buildCentralDirectory(centralRecords)
      const endOfCentralDirectory = buildEndOfCentralDirectory(
        entries.length,
        centralDirectory,
        archiveOffset,
      )
      await enqueueBytes(controller, centralDirectory)
      await enqueueBytes(controller, endOfCentralDirectory)
      controller.close()
    } catch (error) {
      if (!canceled) {
        controller.error(error)
      }
    }
  }

  return new ReadableStream<Uint8Array>({
    cancel(reason) {
      canceled = true
      cancelReason = reason
      resumeProducer?.()
      resumeProducer = undefined
      return activeReader?.cancel(reason).catch(() => undefined)
    },
    start(controller) {
      produce(controller).catch(() => undefined)
    },
    pull() {
      resumeProducer?.()
      resumeProducer = undefined
    },
  })
}

function expectedPackageEntries(
  documents: readonly OneImgPackageDocumentInput[],
  assets: readonly OneImgPackageAssetInput[],
  limits: OneImgPackageLimits,
) {
  const assetMap = new Map(assets.map(asset => [asset.id, asset]))
  const documentIds = new Set<string>()
  for (const document of documents) {
    if (documentIds.has(document.id)) {
      fail('duplicate-entry', `Document ${document.id} is repeated`)
    }
    documentIds.add(document.id)
    validateDocumentForWrite(document, assetMap, limits)
  }
  const assetIds = new Set<string>()
  for (const asset of assets) {
    if (assetIds.has(asset.id)) {
      fail('duplicate-entry', `Asset ${asset.id} is repeated`)
    }
    assertPathId(asset.id, 'asset.id')
    if (assetMap.get(asset.id) !== asset) {
      fail('duplicate-entry', `Asset ${asset.id} is repeated`)
    }
    assetIds.add(asset.id)
    if (!documents.some(document => document.requiredAssetIds.includes(asset.id))) {
      fail('invalid-manifest', `Asset ${asset.id} is not referenced by a Document`)
    }
    assertExtension(asset.original.extension, `asset.${asset.id}.original.extension`)
    assertSupportedMediaTypeDeclaration(
      asset.original.mimeType,
      asset.original.extension,
      `asset.${asset.id}.original.mimeType`,
    )
    if (asset.renderSource) {
      assertExtension(asset.renderSource.extension, `asset.${asset.id}.renderSource.extension`)
      assertSupportedMediaTypeDeclaration(
        asset.renderSource.mimeType,
        asset.renderSource.extension,
        `asset.${asset.id}.renderSource.mimeType`,
      )
      if (!asset.renderSourceRevision) {
        fail('invalid-manifest', `Asset ${asset.id} Render Source must declare a conversion revision`)
      }
      assertVersionedId(asset.renderSourceRevision, `asset.${asset.id}.renderSourceRevision`)
    } else if (asset.renderSourceRevision !== undefined) {
      fail('invalid-manifest', `Asset ${asset.id} declares a Render Source revision without a Render Source`)
    }
  }

  const entries: PackageEntry[] = []
  for (const document of [...documents].sort((left, right) => left.id.localeCompare(right.id))) {
    const bytes = encodeJson(documentPayload(document, limits), limits.maxDocumentBytes, `documents/${document.id}.json`)
    entries.push({
      byteLength: 0,
      crc32: 0,
      mediaType: 'application/json',
      path: `documents/${document.id}.json`,
      role: 'document',
      sha256: '',
      source: createPackageBytesSource(bytes, 'application/json', 'json'),
    })
  }
  for (const asset of [...assets].sort((left, right) => left.id.localeCompare(right.id))) {
    entries.push({
      byteLength: 0,
      crc32: 0,
      mediaType: asset.original.mimeType,
      path: `assets/${asset.id}/original.${asset.original.extension}`,
      role: 'asset-original',
      sha256: '',
      source: asset.original,
    })
    if (asset.renderSource) {
      entries.push({
        byteLength: 0,
        crc32: 0,
        mediaType: asset.renderSource.mimeType,
        path: `assets/${asset.id}/render.${asset.renderSource.extension}`,
        role: 'asset-render-source',
        sha256: '',
        source: asset.renderSource,
      })
    }
  }
  return entries
}

function assertEntryCountAndBytes(entries: readonly PackageEntry[], limits: OneImgPackageLimits) {
  if (entries.length > limits.maxEntries) {
    fail('resource-limit', `Package contains more than ${limits.maxEntries} entries`)
  }
  const totalBytes = entries.reduce((sum, entry) => sum + entry.byteLength, 0)
  if (totalBytes > limits.maxTotalBytes) {
    fail('resource-limit', `Package expands beyond ${limits.maxTotalBytes} bytes`)
  }
}

export async function createOneImgPackage(options: CreateOneImgPackageOptions): Promise<OneImgPackageArtifact> {
  const limits = mergeLimits(options.limits)
  assertPackageId(options.packageId, 'packageId')
  assertVersionedId(options.applicationVersion, 'applicationVersion')
  const createdAt = options.createdAt ?? new Date().toISOString()
  if (Number.isNaN(Date.parse(createdAt))) {
    fail('invalid-manifest', 'createdAt must be a valid timestamp')
  }
  if (options.documents.length === 0) {
    fail('invalid-manifest', 'A OneIMG Package must contain at least one Document')
  }
  if (options.documents.length > limits.maxEntries) {
    fail('resource-limit', 'Document count exceeds the package entry limit')
  }

  const payloadEntries = expectedPackageEntries(options.documents, options.assets, limits)
  const preparedPayloadEntries: PackageEntry[] = []
  for (const entry of payloadEntries) {
    throwIfPackageAborted(options.signal)
    preparedPayloadEntries.push(await preflightEntry(entry, limits, options.signal))
  }

  const documentManifests = [...options.documents]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((document): PackageDocumentManifest => ({
      blockVersion: document.blockVersion,
      id: document.id,
      modelVersion: document.modelVersion,
      path: `documents/${document.id}.json`,
      presentation: normalizePresentation(document.presentation),
      requiredAssetIds: [...document.requiredAssetIds],
      revision: document.revision,
      unknownBlockCount: document.unknownBlockCount ?? 0,
      unresolvedAssetIds: [...(document.unresolvedAssetIds ?? [])],
    }))
  const assetManifests = [...options.assets]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((asset): PackageAssetManifest => ({
      id: asset.id,
      originalMimeType: asset.original.mimeType,
      originalPath: `assets/${asset.id}/original.${asset.original.extension}`,
      ...(asset.renderSource
        ? {
            renderSourceMimeType: asset.renderSource.mimeType,
            renderSourcePath: `assets/${asset.id}/render.${asset.renderSource.extension}`,
            renderSourceRevision: asset.renderSourceRevision!,
          }
        : {}),
    }))
  const manifest: OneImgPackageManifest = {
    applicationVersion: options.applicationVersion,
    assets: assetManifests,
    createdAt,
    documents: documentManifests,
    entries: preparedPayloadEntries.map(({ byteLength, mediaType, path, role, sha256 }) => ({
      byteLength,
      mediaType,
      path,
      role: role as Exclude<PackageEntryRole, 'manifest'>,
      sha256,
    })),
    formatVersion: 1,
    packageId: options.packageId,
    requiredCapabilities: ['oneimg-package-v1', 'stored-zip-v1'],
    safeRecovery: options.documents.some(document => (document.unresolvedAssetIds?.length ?? 0) > 0)
      ? 'unresolved-assets'
      : 'complete',
    schema: 'oneimg-package-manifest',
  }
  const manifestBytes = encodeJson(manifest as unknown as JsonValue, limits.maxManifestBytes, 'manifest.json')
  const manifestEntry = await preflightEntry(
    packageEntryFromBytes('manifest.json', 'manifest', 'application/json', manifestBytes),
    limits,
    options.signal,
  )
  const entries = [manifestEntry, ...preparedPayloadEntries]
  assertEntryCountAndBytes(entries, limits)
  const centralRecords: CentralRecord[] = []
  let archiveOffset = 0
  for (const entry of entries) {
    const localHeaderLength = buildLocalHeader(entry).byteLength
    centralRecords.push({ entry, localHeaderOffset: archiveOffset })
    archiveOffset += localHeaderLength + entry.byteLength
  }
  const centralDirectory = buildCentralDirectory(centralRecords)
  const endOfCentralDirectory = buildEndOfCentralDirectory(entries.length, centralDirectory, archiveOffset)
  const contentLength = archiveOffset + centralDirectory.byteLength + endOfCentralDirectory.byteLength

  return {
    contentLength,
    manifest,
    stream: createWriterStream(entries, options.onProgress, options.signal),
  }
}

function decodeUtf8(bytes: Uint8Array, path: string) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    fail('invalid-manifest', `Entry ${path} is not valid UTF-8`, path)
  }
}

function parseJson(bytes: Uint8Array, path: string, limits: OneImgPackageLimits): JsonValue {
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeUtf8(bytes, path))
  } catch (error) {
    if (error instanceof OneImgPackageError) {
      throw error
    }
    fail('invalid-manifest', `Entry ${path} is not valid JSON`, path)
  }
  assertPlainJson(parsed, limits, path)
  return parsed
}

function parsePresentation(value: JsonValue, path: string): PackagePresentation {
  const record = requireRecord(value, path)
  const density = requireString(record, 'density', path) as PackagePresentation['density']
  const fontPackId = requireString(record, 'fontPackId', path)
  const pageFormat = requireString(record, 'pageFormat', path) as PackagePresentation['pageFormat']
  const rendererRevision = requireString(record, 'rendererRevision', path)
  const templateId = requireString(record, 'templateId', path)
  const templateVersion = requireString(record, 'templateVersion', path)
  const themeId = requireString(record, 'themeId', path)
  const themeVersion = requireString(record, 'themeVersion', path)
  const sensitive = record.sensitive === undefined ? undefined : requireBoolean(record, 'sensitive', path)
  const sceneId = record.sceneId === undefined ? undefined : requireString(record, 'sceneId', path)
  const sceneVersion = record.sceneVersion === undefined ? undefined : requireString(record, 'sceneVersion', path)
  return normalizePresentation({
    density,
    fontPackId,
    pageFormat,
    rendererRevision,
    templateId,
    templateVersion,
    themeId,
    themeVersion,
    ...(sensitive === undefined ? {} : { sensitive }),
    ...(sceneId === undefined ? {} : { sceneId }),
    ...(sceneVersion === undefined ? {} : { sceneVersion }),
  })
}

function parseManifest(
  bytes: Uint8Array,
  limits: OneImgPackageLimits,
): OneImgPackageManifest | OneImgPackageRecoveryDraft {
  try {
    const parsed = parseJson(bytes, 'manifest.json', limits)
    assertDeclarativeJson(parsed, 'manifest.json')
    const record = requireRecord(parsed, 'manifest')
    const formatVersion = record.formatVersion
    if (
      record.schema === 'oneimg-package-manifest'
      && typeof formatVersion === 'number'
      && Number.isSafeInteger(formatVersion)
      && formatVersion > 1
    ) {
      return recoveryDraftFromManifest(
        record,
        formatVersion,
        'newer-format-version',
        `OneIMG Package format v${formatVersion} is newer than this reader; no content was imported`,
      )
    }
    if (record.schema !== 'oneimg-package-manifest' || record.formatVersion !== 1) {
      fail('invalid-manifest', 'Manifest schema or format version is unsupported', 'manifest.json')
    }
    const packageId = requireString(record, 'packageId', 'manifest')
    const applicationVersion = requireString(record, 'applicationVersion', 'manifest')
    const createdAt = requireString(record, 'createdAt', 'manifest')
    assertPackageId(packageId, 'manifest.packageId')
    assertVersionedId(applicationVersion, 'manifest.applicationVersion')
    if (Number.isNaN(Date.parse(createdAt))) {
      fail('invalid-manifest', 'Manifest createdAt is invalid', 'manifest.json')
    }
    const requiredCapabilities = requireArray(record, 'requiredCapabilities', 'manifest').map((item, index) => {
      if (typeof item !== 'string') {
        fail('invalid-manifest', `manifest.requiredCapabilities[${index}] must be a string`)
      }
      return item
    })
    if (!requiredCapabilities.includes('oneimg-package-v1') || !requiredCapabilities.includes('stored-zip-v1')) {
      fail('invalid-manifest', 'Manifest requires an unsupported Package capability', 'manifest.json')
    }
    const unsupportedCapability = requiredCapabilities.find(
      capability => !SUPPORTED_PACKAGE_CAPABILITIES.has(capability),
    )
    if (unsupportedCapability) {
      return recoveryDraftFromManifest(
        record,
        1,
        'unsupported-capability',
        `OneIMG Package requires unsupported capability ${unsupportedCapability}; no content was imported`,
      )
    }
    const safeRecovery = requireString(record, 'safeRecovery', 'manifest') as OneImgPackageManifest['safeRecovery']
    if (safeRecovery !== 'complete' && safeRecovery !== 'unresolved-assets') {
      fail('invalid-manifest', 'Manifest recovery status is invalid', 'manifest.json')
    }
    const documentValues = requireArray(record, 'documents', 'manifest')
    const documents: PackageDocumentManifest[] = []
    const documentIds = new Set<string>()
    for (let index = 0; index < documentValues.length; index += 1) {
      const value = documentValues[index]!
      const path = `manifest.documents[${index}]`
      const item = requireRecord(value, path)
      const id = requireString(item, 'id', path)
      assertPathId(id, `${path}.id`)
      if (documentIds.has(id)) {
        fail('duplicate-entry', `Manifest repeats Document ${id}`, 'manifest.json')
      }
      documentIds.add(id)
      const requiredAssetIds = requireArray(item, 'requiredAssetIds', path).map((assetId, assetIndex) => {
        if (typeof assetId !== 'string') {
          fail('invalid-manifest', `${path}.requiredAssetIds[${assetIndex}] must be a string`)
        }
        assertPathId(assetId, `${path}.requiredAssetIds[${assetIndex}]`)
        return assetId
      })
      const unresolvedAssetIds = requireArray(item, 'unresolvedAssetIds', path).map((assetId, assetIndex) => {
        if (typeof assetId !== 'string') {
          fail('invalid-manifest', `${path}.unresolvedAssetIds[${assetIndex}] must be a string`)
        }
        assertPathId(assetId, `${path}.unresolvedAssetIds[${assetIndex}]`)
        return assetId
      })
      if (new Set(requiredAssetIds).size !== requiredAssetIds.length || new Set(unresolvedAssetIds).size !== unresolvedAssetIds.length) {
        fail('invalid-manifest', `${path} repeats an Asset reference`, 'manifest.json')
      }
      const blockVersion = requireString(item, 'blockVersion', path)
      const modelVersion = requireString(item, 'modelVersion', path)
      assertVersionedId(blockVersion, `${path}.blockVersion`)
      assertVersionedId(modelVersion, `${path}.modelVersion`)
      const presentation = parsePresentation(item.presentation!, `${path}.presentation`)
      const newerComponent = [
        blockVersion,
        modelVersion,
        presentation.fontPackId,
        presentation.rendererRevision,
        presentation.sceneVersion,
        presentation.templateVersion,
        presentation.themeVersion,
      ].find(version => version !== undefined && isNewerComponentVersion(version))
      if (newerComponent) {
        return recoveryDraftFromManifest(
          record,
          1,
          'newer-component-version',
          `OneIMG Package requires newer component version ${newerComponent}; no content was imported`,
        )
      }
      const revision = requireNumber(item, 'revision', path)
      if (revision < 1) {
        fail('invalid-manifest', `${path}.revision must be positive`, 'manifest.json')
      }
      const unknownBlockCount = requireNumber(item, 'unknownBlockCount', path)
      if (unknownBlockCount < 0) {
        fail('invalid-manifest', `${path}.unknownBlockCount cannot be negative`, 'manifest.json')
      }
      const entryPath = requireString(item, 'path', path)
      assertPackagePath(entryPath)
      if (entryPath !== `documents/${id}.json`) {
        fail('invalid-path', `${path}.path does not match its Document id`, entryPath)
      }
      documents.push({
        blockVersion,
        id,
        modelVersion,
        path: entryPath,
        presentation,
        requiredAssetIds,
        revision,
        unknownBlockCount,
        unresolvedAssetIds,
      })
    }
    if (documents.length === 0) {
      fail('invalid-manifest', 'Manifest must contain a Document', 'manifest.json')
    }

    const assetValues = requireArray(record, 'assets', 'manifest')
    const assets: PackageAssetManifest[] = []
    const assetIds = new Set<string>()
    for (let index = 0; index < assetValues.length; index += 1) {
      const value = assetValues[index]!
      const path = `manifest.assets[${index}]`
      const item = requireRecord(value, path)
      const id = requireString(item, 'id', path)
      assertPathId(id, `${path}.id`)
      if (assetIds.has(id)) {
        fail('duplicate-entry', `Manifest repeats Asset ${id}`, 'manifest.json')
      }
      assetIds.add(id)
      const originalPath = requireString(item, 'originalPath', path)
      const originalMimeType = requireString(item, 'originalMimeType', path)
      assertPackagePath(originalPath)
      if (originalPath !== `assets/${id}/original.${originalPath.split('.').pop()}`) {
        fail('invalid-path', `${path}.originalPath does not match its Asset id`, originalPath)
      }
      const originalExtension = originalPath.split('.').pop() ?? ''
      assertSupportedMediaTypeDeclaration(originalMimeType, originalExtension, `${path}.originalMimeType`)
      const renderSourcePath = item.renderSourcePath === undefined ? undefined : requireString(item, 'renderSourcePath', path)
      const renderSourceMimeType = item.renderSourceMimeType === undefined
        ? undefined
        : requireString(item, 'renderSourceMimeType', path)
      const renderSourceRevision = item.renderSourceRevision === undefined
        ? undefined
        : requireString(item, 'renderSourceRevision', path)
      if (
        (renderSourcePath === undefined)
        !== (renderSourceMimeType === undefined)
        || (renderSourcePath === undefined) !== (renderSourceRevision === undefined)
      ) {
        fail('invalid-manifest', `${path} must declare Render Source path, media type, and conversion revision together`, 'manifest.json')
      }
      if (renderSourcePath) {
        assertPackagePath(renderSourcePath)
        const extension = renderSourcePath.split('.').pop() ?? ''
        if (renderSourcePath !== `assets/${id}/render.${extension}`) {
          fail('invalid-path', `${path}.renderSourcePath does not match its Asset id`, renderSourcePath)
        }
        assertSupportedMediaTypeDeclaration(renderSourceMimeType!, extension, `${path}.renderSourceMimeType`)
        assertVersionedId(renderSourceRevision!, `${path}.renderSourceRevision`)
      }
      assets.push({
        id,
        originalMimeType,
        originalPath,
        ...(renderSourceMimeType === undefined || renderSourcePath === undefined
          ? {}
          : { renderSourceMimeType, renderSourcePath, renderSourceRevision }),
      })
    }

    const entryValues = requireArray(record, 'entries', 'manifest')
    if (entryValues.length > limits.maxEntries) {
      fail('resource-limit', `Manifest contains more than ${limits.maxEntries} entries`, 'manifest.json')
    }
    const entries: PackageEntryManifest[] = []
    const paths = new Set<string>()
    for (let index = 0; index < entryValues.length; index += 1) {
      const value = entryValues[index]!
      const path = `manifest.entries[${index}]`
      const item = requireRecord(value, path)
      const entryPath = requireString(item, 'path', path)
      assertPackagePath(entryPath)
      if (entryPath === 'manifest.json') {
        fail('invalid-manifest', 'Manifest cannot declare itself as a payload entry', 'manifest.json')
      }
      if (paths.has(entryPath)) {
        fail('duplicate-entry', `Manifest repeats entry ${entryPath}`, 'manifest.json')
      }
      paths.add(entryPath)
      const mediaType = requireString(item, 'mediaType', path)
      const extension = entryPath.split('.').pop() ?? ''
      assertSupportedMediaTypeDeclaration(mediaType, extension, `${path}.mediaType`)
      const byteLength = requireNumber(item, 'byteLength', path)
      if (byteLength < 0 || byteLength > limits.maxEntryBytes) {
        fail('resource-limit', `Manifest entry ${entryPath} exceeds the entry limit`, entryPath)
      }
      const sha256 = requireString(item, 'sha256', path)
      if (!HASH_PATTERN.test(sha256)) {
        fail('invalid-manifest', `Manifest entry ${entryPath} has an invalid SHA-256`, entryPath)
      }
      const role = requireString(item, 'role', path) as Exclude<PackageEntryRole, 'manifest'>
      if (!['asset-original', 'asset-render-source', 'document'].includes(role)) {
        fail('invalid-manifest', `Manifest entry ${entryPath} has an unsupported role`, entryPath)
      }
      entries.push({ byteLength, mediaType, path: entryPath, role, sha256 })
    }

    const referencedAssetIds = new Set(documents.flatMap(document => document.requiredAssetIds))
    for (const asset of assets) {
      if (!referencedAssetIds.has(asset.id)) {
        fail('invalid-manifest', `Asset ${asset.id} is not reachable from a Document`, 'manifest.json')
      }
    }
    for (const document of documents) {
      for (const assetId of document.requiredAssetIds) {
        if (!assetIds.has(assetId) && !document.unresolvedAssetIds.includes(assetId)) {
          fail('missing-entry', `Document ${document.id} references missing Asset ${assetId}`, 'manifest.json')
        }
      }
      for (const unresolvedAssetId of document.unresolvedAssetIds) {
        if (!document.requiredAssetIds.includes(unresolvedAssetId)) {
          fail('invalid-manifest', `Document ${document.id} has an unreferenced Unresolved Asset`, 'manifest.json')
        }
      }
    }
    const expectedEntryPaths = new Set([
      ...documents.map(document => document.path),
      ...assets.flatMap(asset => [asset.originalPath, ...(asset.renderSourcePath ? [asset.renderSourcePath] : [])]),
    ])
    if (expectedEntryPaths.size !== entries.length || entries.some(entry => !expectedEntryPaths.has(entry.path))) {
      fail('invalid-manifest', 'Manifest entries do not match its Documents and Assets', 'manifest.json')
    }
    for (const document of documents) {
      const entry = entries.find(candidate => candidate.path === document.path)
      if (!entry || entry.role !== 'document' || entry.mediaType !== 'application/json') {
        fail('invalid-manifest', `Document ${document.id} has an invalid Manifest entry`, document.path)
      }
    }
    for (const asset of assets) {
      const originalEntry = entries.find(candidate => candidate.path === asset.originalPath)
      if (!originalEntry || originalEntry.role !== 'asset-original' || originalEntry.mediaType !== asset.originalMimeType) {
        fail('invalid-manifest', `Asset ${asset.id} has an invalid Original entry`, asset.originalPath)
      }
      if (asset.renderSourcePath) {
        const renderEntry = entries.find(candidate => candidate.path === asset.renderSourcePath)
        if (!renderEntry || renderEntry.role !== 'asset-render-source' || renderEntry.mediaType !== asset.renderSourceMimeType) {
          fail('invalid-manifest', `Asset ${asset.id} has an invalid Render Source entry`, asset.renderSourcePath)
        }
      }
    }
    const safeRecoveryExpected = documents.some(document => document.unresolvedAssetIds.length > 0)
      ? 'unresolved-assets'
      : 'complete'
    if (safeRecovery !== safeRecoveryExpected) {
      fail('invalid-manifest', 'Manifest recovery status does not match its graph', 'manifest.json')
    }
    return {
      applicationVersion,
      assets,
      createdAt,
      documents,
      entries,
      formatVersion: 1,
      packageId,
      requiredCapabilities,
      safeRecovery,
      schema: 'oneimg-package-manifest',
    }
  } catch (error) {
    if (error instanceof OneImgPackageError) {
      throw error
    }
    fail('invalid-manifest', 'Manifest could not be validated', 'manifest.json')
  }
}

function assertSupportedMediaTypeDeclaration(mediaType: string, extension: string, path: string) {
  const expectedExtension = MIME_EXTENSIONS.get(mediaType)
  if (!expectedExtension || expectedExtension !== extension) {
    fail('unsupported-media', `Media type ${mediaType} is not allowed`, path)
  }
}

function parseDocumentPayload(
  bytes: Uint8Array,
  manifestDocument: PackageDocumentManifest,
  limits: OneImgPackageLimits,
): OneImgPackageDocumentInput {
  const parsed = parseJson(bytes, manifestDocument.path, limits)
  assertDeclarativeJson(parsed, manifestDocument.path)
  const record = requireRecord(parsed, manifestDocument.path)
  if (record.schema !== 'oneimg-document@1') {
    fail('invalid-manifest', `Document ${manifestDocument.id} has an unsupported schema`, manifestDocument.path)
  }
  const id = requireString(record, 'documentId', manifestDocument.path)
  const modelVersion = requireString(record, 'modelVersion', manifestDocument.path)
  const blockVersion = requireString(record, 'blockVersion', manifestDocument.path)
  const revision = requireNumber(record, 'revision', manifestDocument.path)
  const requiredAssetIds = requireArray(record, 'requiredAssetIds', manifestDocument.path).map((value, index) => {
    if (typeof value !== 'string') {
      fail('invalid-manifest', `Document Asset reference ${index} is not a string`, manifestDocument.path)
    }
    return value
  })
  const unresolvedAssetIds = requireArray(record, 'unresolvedAssetIds', manifestDocument.path).map((value, index) => {
    if (typeof value !== 'string') {
      fail('invalid-manifest', `Document Unresolved Asset reference ${index} is not a string`, manifestDocument.path)
    }
    return value
  })
  const unknownBlockCount = requireNumber(record, 'unknownBlockCount', manifestDocument.path)
  const document: OneImgPackageDocumentInput = {
    blockVersion,
    id,
    modelVersion,
    presentation: parsePresentation(record.presentation!, `${manifestDocument.path}.presentation`),
    requiredAssetIds,
    revision,
    snapshot: record.snapshot!,
    unknownBlockCount,
    unresolvedAssetIds,
  }
  if (
    document.id !== manifestDocument.id
    || document.modelVersion !== manifestDocument.modelVersion
    || document.blockVersion !== manifestDocument.blockVersion
    || document.revision !== manifestDocument.revision
    || stableJsonStringify(document.presentation as unknown as JsonValue) !== stableJsonStringify(manifestDocument.presentation as unknown as JsonValue)
    || stableJsonStringify(document.requiredAssetIds as unknown as JsonValue) !== stableJsonStringify(manifestDocument.requiredAssetIds as unknown as JsonValue)
    || stableJsonStringify(document.unresolvedAssetIds as unknown as JsonValue) !== stableJsonStringify(manifestDocument.unresolvedAssetIds as unknown as JsonValue)
    || document.unknownBlockCount !== manifestDocument.unknownBlockCount
  ) {
    fail('integrity-mismatch', `Document ${manifestDocument.id} disagrees with the Manifest`, manifestDocument.path)
  }
  assertPlainJson(document.snapshot, limits, `${manifestDocument.path}.snapshot`)
  return document
}

interface ParsedLocalEntry {
  readonly byteLength: number
  readonly crc32: number
  readonly flags: number
  readonly localHeaderOffset: number
  readonly method: number
  readonly path: string
  readonly sha256: string
  readonly value?: Blob | Uint8Array
}

interface ParsedCentralEntry {
  readonly byteLength: number
  readonly compressedByteLength: number
  readonly crc32: number
  readonly flags: number
  readonly localHeaderOffset: number
  readonly method: number
  readonly path: string
}

class ZipStreamCursor {
  private buffer = new Uint8Array()
  private bufferOffset = 0
  private ended = false
  private released = false
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private consumedBytes = 0

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader()
  }

  get bytesRead() {
    return this.consumedBytes
  }

  async cancel(reason?: unknown) {
    if (this.released) {
      return
    }
    await this.reader.cancel(reason).catch(() => undefined)
  }

  release() {
    if (this.released) {
      return
    }
    this.reader.releaseLock()
    this.released = true
  }

  async assertEof() {
    const trailing = await this.readUpTo(1)
    if (trailing !== null) {
      fail('invalid-zip', 'ZIP contains trailing bytes after the end record')
    }
  }

  async readExactly(length: number) {
    const output = new Uint8Array(length)
    let offset = 0
    while (offset < length) {
      const chunk = await this.readUpTo(length - offset)
      if (chunk === null) {
        fail('invalid-zip', 'ZIP ended before a declared field was complete')
      }
      output.set(chunk, offset)
      offset += chunk.byteLength
    }
    return output
  }

  async readMaybe(length: number) {
    const first = await this.readUpTo(length)
    if (first === null) {
      return null
    }
    if (first.byteLength === length) {
      return first
    }
    const rest = await this.readExactly(length - first.byteLength)
    return concatBytes([first, rest])
  }

  async readUpTo(maximum: number): Promise<Uint8Array | null> {
    if (maximum < 1) {
      return new Uint8Array()
    }
    while (this.bufferOffset >= this.buffer.byteLength) {
      if (this.ended) {
        return null
      }
      const result = await this.reader.read()
      if (result.done) {
        this.ended = true
        this.buffer = new Uint8Array()
        this.bufferOffset = 0
        return null
      }
      if (!(result.value instanceof Uint8Array)) {
        fail('invalid-zip', 'ZIP stream yielded an invalid chunk')
      }
      if (result.value.byteLength === 0) {
        continue
      }
      const ownedChunk = new Uint8Array(new ArrayBuffer(result.value.byteLength))
      ownedChunk.set(result.value)
      this.buffer = ownedChunk
      this.bufferOffset = 0
    }
    const length = Math.min(maximum, this.buffer.byteLength - this.bufferOffset)
    const chunk = this.buffer.subarray(this.bufferOffset, this.bufferOffset + length)
    this.bufferOffset += length
    this.consumedBytes += length
    return chunk
  }
}

function readUint16(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
}

function decodePackagePath(bytes: Uint8Array) {
  const path = decodeUtf8(bytes, 'ZIP path')
  assertPackagePath(path)
  if (textEncoder.encode(path).byteLength !== bytes.byteLength) {
    fail('invalid-path', 'ZIP paths must use normalized ASCII bytes', path)
  }
  return path
}

function blobFromBytes(bytes: Uint8Array, type?: string) {
  const ownedBytes = new Uint8Array(new ArrayBuffer(bytes.byteLength))
  ownedBytes.set(bytes)
  return new Blob([ownedBytes.buffer], type ? { type } : undefined)
}

function assertZipFlags(flags: number, path?: string) {
  if (flags !== 0 && flags !== 0x800) {
    fail('invalid-zip', 'ZIP encryption, data descriptors, and unsupported flags are rejected', path)
  }
}

function assertZipNameLength(value: number, path = 'ZIP') {
  if (value < 1 || value > 512) {
    fail('resource-limit', `${path} name exceeds the bounded path length`)
  }
}

async function consumeZipEntry(
  cursor: ZipStreamCursor,
  byteLength: number,
  limits: OneImgPackageLimits,
  shouldCapture: boolean,
  maxByteLength = limits.maxEntryBytes,
  signal?: AbortSignal,
) {
  if (byteLength > maxByteLength || byteLength > limits.maxTotalBytes) {
    fail('resource-limit', `ZIP entry exceeds the bounded byte limit of ${maxByteLength} bytes`)
  }
  const chunks: Uint8Array[] = []
  const hasher = new Sha256Hasher()
  const crc = new Crc32()
  let remaining = byteLength
  let consumed = 0
  while (remaining > 0) {
    throwIfPackageAborted(signal)
    const chunk = await cursor.readUpTo(Math.min(64 * 1024, remaining))
    if (chunk === null) {
      fail('invalid-zip', 'ZIP ended inside an entry')
    }
    hasher.update(chunk)
    crc.update(chunk)
    if (shouldCapture) {
      chunks.push(chunk.slice())
    }
    consumed += chunk.byteLength
    remaining -= chunk.byteLength
  }
  return {
    bytes: shouldCapture ? concatBytes(chunks) : undefined,
    byteLength: consumed,
    crc32: crc.digest(),
    sha256: bytesToHex(hasher.digest()),
  }
}

function validateEntryAgainstManifest(
  entry: ParsedLocalEntry,
  manifestEntry: PackageEntryManifest | undefined,
  path: string,
) {
  if (!manifestEntry) {
    fail('missing-entry', `ZIP entry ${path} is not declared by the Manifest`, path)
  }
  if (entry.byteLength !== manifestEntry.byteLength) {
    fail('length-mismatch', `ZIP entry ${path} length does not match the Manifest`, path)
  }
  if (entry.sha256 !== manifestEntry.sha256) {
    fail('integrity-mismatch', `ZIP entry ${path} SHA-256 does not match the Manifest`, path)
  }
}

function readManifestEntry(manifest: OneImgPackageManifest, path: string) {
  return manifest.entries.find(entry => entry.path === path)
}

function centralRecordFromBytes(bytes: Uint8Array, path: string): ParsedCentralEntry {
  const versionNeeded = readUint16(bytes, 2)
  const flags = readUint16(bytes, 4)
  const method = readUint16(bytes, 6)
  const crc32 = readUint32(bytes, 12)
  const compressedByteLength = readUint32(bytes, 16)
  const byteLength = readUint32(bytes, 20)
  const diskNumber = readUint16(bytes, 30)
  const externalAttributes = readUint32(bytes, 34)
  const localHeaderOffset = readUint32(bytes, 38)
  if (versionNeeded > 20 || diskNumber !== 0) {
    fail('unsupported-compression', 'ZIP requires an unsupported version or disk', path)
  }
  assertZipFlags(flags, path)
  if (method !== 0) {
    fail('unsupported-compression', 'Only stored ZIP entries are accepted by this Package reader', path)
  }
  if (compressedByteLength !== byteLength) {
    fail('unsupported-compression', 'Compressed ZIP entries are not accepted by this bounded reader', path)
  }
  if ((externalAttributes >>> 16 & 0xf000) === 0xa000) {
    fail('executable-content', 'ZIP symlink entries are rejected', path)
  }
  return { byteLength, compressedByteLength, crc32, flags, localHeaderOffset, method, path }
}

export async function inspectOneImgPackage(
  input: OneImgPackageInput,
  options: Omit<ImportOneImgPackageOptions, 'createId'> = {},
): Promise<OneImgPackageInspectionResult> {
  const limits = mergeLimits(options.limits)
  const inputStream = input instanceof Blob
    ? input.stream() as ReadableStream<Uint8Array>
    : input instanceof ArrayBuffer
      ? new Blob([input]).stream() as ReadableStream<Uint8Array>
      : input instanceof Uint8Array
        ? blobFromBytes(input).stream() as ReadableStream<Uint8Array>
        : toReadableStream(input)
  const cursor = new ZipStreamCursor(inputStream)
  const localEntries: ParsedLocalEntry[] = []
  const localPaths = new Set<string>()
  const centralEntries: ParsedCentralEntry[] = []
  let manifest: OneImgPackageManifest | undefined
  let manifestByteLength = 0
  let centralOffset = -1
  let centralDirectoryStart = -1
  let expandedBytes = 0

  try {
    while (true) {
      throwIfPackageAborted(options.signal)
      const signatureBytes = await cursor.readMaybe(ZIP_SIGNATURE_BYTES)
      if (signatureBytes === null) {
        fail('invalid-zip', 'ZIP did not contain an end-of-central-directory record')
      }
      const signature = readUint32(signatureBytes, 0)
      if (signature === ZIP_LOCAL_SIGNATURE) {
        const localHeaderOffset = cursor.bytesRead - ZIP_SIGNATURE_BYTES
        if (localEntries.length >= limits.maxEntries) {
          fail('resource-limit', `ZIP contains more than ${limits.maxEntries} entries`)
        }
        const header = await cursor.readExactly(26)
        const versionNeeded = readUint16(header, 0)
        const flags = readUint16(header, 2)
        const method = readUint16(header, 4)
        const crc32 = readUint32(header, 10)
        const compressedByteLength = readUint32(header, 14)
        const byteLength = readUint32(header, 18)
        const nameLength = readUint16(header, 22)
        const extraLength = readUint16(header, 24)
        if (versionNeeded > 20) {
          fail('unsupported-compression', 'ZIP entry requires an unsupported version')
        }
        assertZipFlags(flags)
        if (method !== 0) {
          fail('unsupported-compression', 'Only stored ZIP entries are accepted by this Package reader')
        }
        if (compressedByteLength !== byteLength) {
          fail('unsupported-compression', 'Compressed ZIP entries are not accepted by this bounded reader')
        }
        assertZipNameLength(nameLength)
        if (extraLength > 64 * 1024) {
          fail('resource-limit', 'ZIP extra fields exceed the bounded limit')
        }
        const path = decodePackagePath(await cursor.readExactly(nameLength))
        if (localPaths.has(path)) {
          fail('duplicate-entry', `ZIP entry ${path} is repeated`, path)
        }
        localPaths.add(path)
        await cursor.readExactly(extraLength)
        if (path === 'manifest.json' && localEntries.length !== 0) {
          fail('invalid-manifest', 'manifest.json must be the first ZIP entry', path)
        }
        if (path !== 'manifest.json' && !manifest) {
          fail('invalid-manifest', 'manifest.json must be read before payload entries', path)
        }
        const isManifest = path === 'manifest.json'
        const manifestEntry = isManifest ? undefined : readManifestEntry(manifest!, path)
        if (!isManifest && !manifestEntry) {
          fail('missing-entry', `ZIP entry ${path} is not declared by the Manifest`, path)
        }
        const capture = true
        const maxByteLength = isManifest
          ? limits.maxManifestBytes
          : manifestEntry!.role === 'document'
            ? limits.maxDocumentBytes
            : limits.maxEntryBytes
        const consumed = await consumeZipEntry(cursor, byteLength, limits, capture, maxByteLength, options.signal)
        expandedBytes += consumed.byteLength
        if (expandedBytes > limits.maxTotalBytes) {
          fail('resource-limit', `ZIP expands beyond ${limits.maxTotalBytes} bytes`)
        }
        if (consumed.byteLength !== byteLength || consumed.crc32 !== crc32) {
          fail('integrity-mismatch', `ZIP entry ${path} CRC or length is invalid`, path)
        }
        const parsed: ParsedLocalEntry = {
          byteLength,
          crc32,
          flags,
          localHeaderOffset,
          method,
          path,
          sha256: consumed.sha256,
          ...(consumed.bytes === undefined ? {} : { value: consumed.bytes }),
        }
        if (isManifest) {
          if (byteLength > limits.maxManifestBytes) {
            fail('resource-limit', 'Manifest exceeds the bounded size', path)
          }
          const parsedManifest = parseManifest(consumed.bytes!, limits)
          if ('kind' in parsedManifest) {
            await cursor.cancel(parsedManifest.message)
            cursor.release()
            return {
              assets: [],
              documents: [],
              recovery: parsedManifest,
              report: makeRecoveryReport(),
            }
          }
          manifest = parsedManifest
          manifestByteLength = byteLength
        } else {
          validateEntryAgainstManifest(parsed, manifestEntry, path)
          const extension = path.split('.').pop() ?? ''
          assertSupportedMedia(
            manifestEntry!.mediaType,
            extension,
            consumed.bytes!.subarray(0, 32),
            path,
          )
        }
        localEntries.push(parsed)
        options.onProgress?.({
          byteLength,
          completedEntries: localEntries.length,
          entryIndex: localEntries.length - 1,
          entryPath: path,
          entryRole: isManifest ? 'manifest' : manifestEntry!.role,
          stage: 'reading',
          totalBytes: manifest
            ? manifest.entries.reduce((sum, entry) => sum + entry.byteLength, manifestByteLength)
            : byteLength,
          totalEntries: manifest ? manifest.entries.length + 1 : 1,
        })
        if (manifest && localEntries.length - 1 > manifest.entries.length) {
          fail('invalid-manifest', 'ZIP contains more payload entries than its Manifest', path)
        }
        continue
      }
      if (signature === ZIP_CENTRAL_SIGNATURE) {
        centralDirectoryStart = cursor.bytesRead - ZIP_SIGNATURE_BYTES
        let recordSignature: Uint8Array | null = signatureBytes
        while (true) {
          if (recordSignature === null) {
            fail('invalid-zip', 'ZIP central directory ended without an end record')
          }
          const record = readUint32(recordSignature, 0)
          if (record === ZIP_CENTRAL_SIGNATURE) {
            const header = await cursor.readExactly(42)
            const nameLength = readUint16(header, 24)
            const extraLength = readUint16(header, 26)
            const commentLength = readUint16(header, 28)
            assertZipNameLength(nameLength, 'ZIP central directory')
            if (extraLength > 64 * 1024 || commentLength > 0) {
              fail('resource-limit', 'ZIP central directory metadata exceeds the bounded limit')
            }
            const path = decodePackagePath(await cursor.readExactly(nameLength))
            await cursor.readExactly(extraLength)
            await cursor.readExactly(commentLength)
            if (centralEntries.some(entry => entry.path === path)) {
              fail('duplicate-entry', `ZIP central directory repeats ${path}`, path)
            }
            centralEntries.push(centralRecordFromBytes(header, path))
            if (centralEntries.length > limits.maxEntries) {
              fail('resource-limit', `ZIP contains more than ${limits.maxEntries} central records`)
            }
            recordSignature = await cursor.readMaybe(ZIP_SIGNATURE_BYTES)
            continue
          }
          if (record === ZIP_END_SIGNATURE) {
            const end = await cursor.readExactly(18)
            const diskNumber = readUint16(end, 0)
            const centralDisk = readUint16(end, 2)
            const diskEntries = readUint16(end, 4)
            const totalEntries = readUint16(end, 6)
            const centralSize = readUint32(end, 8)
            const declaredCentralOffset = readUint32(end, 12)
            const commentLength = readUint16(end, 16)
            if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || commentLength !== 0) {
              fail('invalid-zip', 'Multi-disk ZIPs and ZIP comments are rejected')
            }
            centralOffset = declaredCentralOffset
            if (
              totalEntries !== centralEntries.length
              || totalEntries !== localEntries.length
              || centralSize !== cursor.bytesRead - centralDirectoryStart - 22
              || centralOffset !== centralDirectoryStart
            ) {
              fail('invalid-zip', 'ZIP central directory bounds do not match its records')
            }
            break
          }
          if (record === ZIP64_END_SIGNATURE || record === ZIP64_LOCATOR_SIGNATURE) {
            fail('unsupported-compression', 'ZIP64 packages are outside the bounded v1 contract')
          }
          fail('invalid-zip', 'ZIP central directory contains an unknown record')
        }
        break
      }
      if (signature === ZIP_END_SIGNATURE || signature === ZIP64_END_SIGNATURE || signature === ZIP64_LOCATOR_SIGNATURE) {
        fail('invalid-zip', 'ZIP ended before its central directory')
      }
      fail('invalid-zip', 'ZIP contains an unknown record')
    }

    if (!manifest) {
      fail('invalid-manifest', 'Package did not contain a valid Manifest')
    }
    await cursor.assertEof()
    cursor.release()

    const localByPath = new Map(localEntries.map(entry => [entry.path, entry]))
    if (localEntries.length !== manifest.entries.length + 1 || localByPath.size !== localEntries.length) {
      fail('invalid-manifest', 'ZIP entries do not match the Manifest')
    }
    const centralByPath = new Map(centralEntries.map(entry => [entry.path, entry]))
    for (const local of localEntries) {
      const central = centralByPath.get(local.path)
      if (!central) {
        fail('invalid-zip', `ZIP central directory is missing ${local.path}`, local.path)
      }
      if (
        central.localHeaderOffset !== local.localHeaderOffset
        || central.byteLength !== local.byteLength
        || central.compressedByteLength !== local.byteLength
        || central.crc32 !== local.crc32
        || central.flags !== local.flags
        || central.method !== local.method
      ) {
        fail('integrity-mismatch', `ZIP central directory disagrees with ${local.path}`, local.path)
      }
    }
    for (const entry of manifest.entries) {
      if (!localByPath.has(entry.path)) {
        fail('missing-entry', `Manifest entry ${entry.path} is missing from the ZIP`, entry.path)
      }
    }

    const parsedDocuments = manifest.documents.map((manifestDocument) => {
      const entry = localByPath.get(manifestDocument.path)
      if (!entry || !(entry.value instanceof Uint8Array)) {
        fail('missing-entry', `Document ${manifestDocument.id} is missing`, manifestDocument.path)
      }
      return parseDocumentPayload(entry.value, manifestDocument, limits)
    })
    const parsedAssets = manifest.assets.map((manifestAsset) => {
      const originalEntry = localByPath.get(manifestAsset.originalPath)
      if (!originalEntry || !(originalEntry.value instanceof Uint8Array)) {
        fail('missing-entry', `Asset ${manifestAsset.id} Original is missing`, manifestAsset.originalPath)
      }
      const originalMimeType = manifestAsset.originalMimeType
      const original = blobFromBytes(originalEntry.value, originalMimeType)
      const renderEntry = manifestAsset.renderSourcePath === undefined
        ? undefined
        : localByPath.get(manifestAsset.renderSourcePath)
      if (manifestAsset.renderSourcePath && (!renderEntry || !(renderEntry.value instanceof Uint8Array))) {
        fail('missing-entry', `Asset ${manifestAsset.id} Render Source is missing`, manifestAsset.renderSourcePath)
      }
      const renderSource = renderEntry?.value instanceof Uint8Array
        ? blobFromBytes(renderEntry.value, manifestAsset.renderSourceMimeType)
        : undefined
      return {
        id: manifestAsset.id,
        mimeType: originalMimeType,
        original,
        ...(renderSource === undefined
          ? {}
          : {
              renderSource,
              renderSourceMimeType: manifestAsset.renderSourceMimeType,
              renderSourceRevision: manifestAsset.renderSourceRevision,
            }),
      }
    })
    return {
      assets: parsedAssets,
      documents: parsedDocuments,
      manifest,
      report: makeReport(parsedDocuments, parsedAssets.length),
    }
  } catch (error) {
    await cursor.cancel(error)
    cursor.release()
    throw error
  }
}

function defaultPackageId(kind: PackageIdKind, sourceId: string) {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `imported-${kind}-${sourceId}-${random}`
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

function remapSnapshotAssetReferences(
  snapshot: JsonValue,
  assetIds: ReadonlyMap<string, string>,
): JsonValue {
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

export async function importOneImgPackage(
  input: OneImgPackageInput,
  options: ImportOneImgPackageOptions = {},
): Promise<OneImgPackageImportResult> {
  const inspection = await inspectOneImgPackage(input, options)
  if ('recovery' in inspection) {
    return {
      drafts: [],
      packageId: inspection.recovery.packageId,
      recovery: inspection.recovery,
      report: inspection.report,
    }
  }
  const createId = options.createId ?? defaultPackageId
  const issuedIds = new Set<string>()
  const reservedIds = new Set(options.reservedIds ?? [])
  for (const document of inspection.documents) {
    reservedIds.add(document.id)
  }
  for (const asset of inspection.assets) {
    reservedIds.add(asset.id)
  }
  const issueId = (kind: PackageIdKind, sourceId: string) => {
    const id = createId(kind, sourceId)
    if (typeof id !== 'string' || id.length === 0 || issuedIds.has(id) || reservedIds.has(id)) {
      fail('invalid-manifest', `Imported ${kind} identity is missing or repeated`)
    }
    issuedIds.add(id)
    return id
  }
  const assetIds = new Map<string, string>()
  for (const asset of inspection.assets) {
    assetIds.set(asset.id, issueId('asset', asset.id))
  }
  const drafts = inspection.documents.map((document) => {
    const draftId = issueId('draft', document.id)
    const documentId = issueId('document', document.id)
    const importedAssets: PackageImportedAsset[] = []
    for (const sourceAssetId of document.requiredAssetIds) {
      const asset = inspection.assets.find(candidate => candidate.id === sourceAssetId)
      if (!asset) {
        continue
      }
      importedAssets.push({
        assetId: assetIds.get(sourceAssetId)!,
        original: asset.original,
        ...(asset.renderSource === undefined
          ? {}
          : { renderSource: asset.renderSource, renderSourceRevision: asset.renderSourceRevision }),
        sourceAssetId,
      })
    }
    const importedDocument: OneImgPackageDocumentInput = {
      ...document,
      id: documentId,
      requiredAssetIds: document.requiredAssetIds.map(sourceAssetId => assetIds.get(sourceAssetId) ?? sourceAssetId),
      unresolvedAssetIds: document.unresolvedAssetIds?.map(sourceAssetId => assetIds.get(sourceAssetId) ?? sourceAssetId),
      snapshot: remapSnapshotAssetReferences(document.snapshot, assetIds),
    }
    return {
      assets: importedAssets,
      document: importedDocument,
      documentId,
      draftId,
      sourceDocumentId: document.id,
    }
  })
  return {
    drafts,
    manifest: inspection.manifest,
    packageId: inspection.manifest.packageId,
    report: inspection.report,
  }
}
