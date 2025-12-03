import type { ExifBuildContext } from './ExifBuilder'
import { buildExifPayload } from './ExifBuilder'

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

const CRC_TABLE = buildCrcTable()

export function patchPngMetadata(
  source: Uint8Array,
  context?: ExifBuildContext,
  exifPayload?: Uint8Array,
): Uint8Array {
  if (!isPng(source)) {
    return source
  }

  const missingChunks: Uint8Array[] = []
  const existingTypes = collectChunkTypes(source)

  if (!existingTypes.has('gAMA')) {
    const data = new Uint8Array(4)
    const view = new DataView(data.buffer)
    view.setUint32(0, 45455, false) // ~1/2.2 gamma
    missingChunks.push(buildChunk('gAMA', data))
  }

  if (!existingTypes.has('cHRM')) {
    const data = new Uint8Array(32)
    const view = new DataView(data.buffer)
    const values = [
      31270, 32900, // White
      64000, 33000, // Red
      30000, 60000, // Green
      15000, 6000, // Blue
    ]
    values.forEach((value, index) => {
      view.setUint32(index * 4, value, false)
    })
    missingChunks.push(buildChunk('cHRM', data))
  }

  if (!existingTypes.has('sRGB')) {
    missingChunks.push(buildChunk('sRGB', new Uint8Array([0])))
  }

  const exifData = exifPayload ?? (context ? buildExifPayload(context) : undefined)
  if (exifData && !existingTypes.has('eXIf')) {
    missingChunks.push(buildChunk('eXIf', exifData))
  }

  if (!missingChunks.length) {
    return source
  }

  const insertionPoint = findInsertionPoint(source)
  const totalExtra = missingChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(source.length + totalExtra)
  output.set(source.subarray(0, insertionPoint), 0)
  let offset = insertionPoint
  missingChunks.forEach((chunk) => {
    output.set(chunk, offset)
    offset += chunk.length
  })
  output.set(source.subarray(insertionPoint), offset)
  return output
}

function isPng(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_SIGNATURE.byteLength) {
    return false
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      return false
    }
  }
  return true
}

function collectChunkTypes(bytes: Uint8Array): Set<string> {
  const types = new Set<string>()
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset)
    const type = readType(bytes, offset + 4)
    types.add(type)
    offset += 12 + length
  }
  return types
}

function findInsertionPoint(bytes: Uint8Array): number {
  let offset = 8
  if (offset + 12 > bytes.length) {
    return bytes.length
  }
  const length = readUint32(bytes, offset)
  return Math.min(bytes.length, offset + 12 + length)
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length, false)
  const typeBytes = asciiBytes(type)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  const crc = crc32(typeBytes, data)
  view.setUint32(8 + data.length, crc, false)
  return chunk
}

function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i)
  }
  return bytes
}

function crc32(type: Uint8Array, data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < type.length; i += 1) {
    crc = CRC_TABLE[(crc ^ type[i]) & 0xff] ^ (crc >>> 8)
  }
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]
  ) >>> 0
}

function readType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
}
