import type { RawExportMetadata } from '../types'

const EXIF_HEADER = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]) // "Exif\0\0"

type Rational = { numerator: number; denominator: number }

type EntryValue = {
  tag: number
  type: number
  count: number
  data: Uint8Array
  child?: IfdBuilder
  dataOffset?: number
}

class IfdBuilder {
  private entries: EntryValue[] = []

  addAscii(tag: number, value?: string): void {
    if (!value) return
    const text = `${value}\u0000`
    this.entries.push({ tag, type: 2, count: text.length, data: asciiBytes(text) })
  }

  addShort(tag: number, values: number | number[]): void {
    const list = Array.isArray(values) ? values : [values]
    if (!list.length) return
    const data = new Uint8Array(list.length * 2)
    const view = new DataView(data.buffer)
    list.forEach((value, index) => {
      view.setUint16(index * 2, clampShort(value), true)
    })
    this.entries.push({ tag, type: 3, count: list.length, data })
  }

  addLong(tag: number, values: number | number[]): void {
    const list = Array.isArray(values) ? values : [values]
    if (!list.length) return
    const data = new Uint8Array(list.length * 4)
    const view = new DataView(data.buffer)
    list.forEach((value, index) => {
      view.setUint32(index * 4, Math.max(0, Math.round(value)), true)
    })
    this.entries.push({ tag, type: 4, count: list.length, data })
  }

  addRational(tag: number, values: Rational | Rational[]): void {
    const list = Array.isArray(values) ? values : [values]
    if (!list.length) return
    const data = new Uint8Array(list.length * 8)
    const view = new DataView(data.buffer)
    list.forEach((value, index) => {
      const numerator = Math.max(0, Math.round(value.numerator))
      const denominator = Math.max(1, Math.round(value.denominator))
      view.setUint32(index * 8, numerator, true)
      view.setUint32(index * 8 + 4, denominator, true)
    })
    this.entries.push({ tag, type: 5, count: list.length, data })
  }

  addIfdPointer(tag: number, builder: IfdBuilder): void {
    this.entries.push({ tag, type: 4, count: 1, data: new Uint8Array(4), child: builder })
  }

  serialize(offsetStart: number): { bytes: Uint8Array; length: number } {
    const entries = this.entries
    const baseSize = 2 + entries.length * 12 + 4
    let cursorOffset = offsetStart + baseSize
    const extraWrites: Array<{ offset: number; data: Uint8Array }> = []

    entries.forEach((entry) => {
      if (entry.child) {
        const child = entry.child.serialize(cursorOffset)
        entry.dataOffset = cursorOffset
        extraWrites.push({ offset: cursorOffset, data: child.bytes })
        cursorOffset += child.length
      } else if (entry.data.byteLength > 4) {
        const padded = padEven(entry.data)
        entry.dataOffset = cursorOffset
        extraWrites.push({ offset: cursorOffset, data: padded })
        cursorOffset += padded.byteLength
      }
    })

    const totalLength = cursorOffset - offsetStart
    const buffer = new Uint8Array(totalLength)
    const view = new DataView(buffer.buffer)
    let cursor = 0
    view.setUint16(cursor, entries.length, true)
    cursor += 2

    entries.forEach((entry) => {
      view.setUint16(cursor, entry.tag, true)
      view.setUint16(cursor + 2, entry.type, true)
      view.setUint32(cursor + 4, entry.count, true)
      if (entry.child || entry.data.byteLength > 4) {
        view.setUint32(cursor + 8, entry.dataOffset ?? 0, true)
      } else {
        const inline = new Uint8Array(buffer.buffer, cursor + 8, 4)
        inline.set(padInline(entry.data))
      }
      cursor += 12
    })

    view.setUint32(cursor, 0, true)

    extraWrites.forEach((chunk) => {
      const relative = chunk.offset - offsetStart
      buffer.set(chunk.data, relative)
    })

    return { bytes: buffer, length: totalLength }
  }
}

function padInline(data: Uint8Array): Uint8Array {
  if (data.byteLength === 4) return data
  const padded = new Uint8Array(4)
  padded.set(data)
  return padded
}

function padEven(data: Uint8Array): Uint8Array {
  if (data.byteLength % 2 === 0) return data
  const padded = new Uint8Array(data.byteLength + 1)
  padded.set(data)
  return padded
}

function asciiBytes(text: string): Uint8Array {
  const buffer = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) {
    buffer[i] = text.charCodeAt(i) & 0xff
  }
  return buffer
}

function clampShort(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  if (value >= 0xffff) return 0xffff
  return Math.round(value)
}

export interface ExifBuildContext {
  width: number
  height: number
  bitDepth: number
  channels: number
  metadata?: RawExportMetadata
}

export function buildExifPayload(context: ExifBuildContext): Uint8Array {
  const root = new IfdBuilder()
  const metadata = context.metadata ?? {}

  root.addLong(0x0100, context.width)
  root.addLong(0x0101, context.height)
  root.addShort(0x0102, Array(context.channels).fill(Math.min(16, context.bitDepth)))
  root.addShort(0x0103, 1)
  root.addShort(0x0106, 2)
  if (metadata.orientation) {
    root.addShort(0x0112, metadata.orientation)
  }
  root.addRational(0x011a, { numerator: 300, denominator: 1 })
  root.addRational(0x011b, { numerator: 300, denominator: 1 })
  root.addShort(0x0128, 2)
  root.addAscii(0x0131, metadata.software)
  root.addAscii(0x0132, formatExifTimestamp(metadata.captureTime))
  root.addAscii(0x010e, metadata.imageDescription)
  root.addAscii(0x010f, metadata.cameraMake)
  root.addAscii(0x0110, metadata.cameraModel)
  root.addShort(0x0115, context.channels)
  root.addShort(0x011c, 1)
  root.addRational(0x013e, SRGB_WHITE_POINT)
  root.addRational(0x013f, SRGB_PRIMARIES)
  root.addRational(0x0214, SRGB_REFERENCE_BLACK_WHITE)

  const exifIfd = new IfdBuilder()
  exifIfd.addShort(0xa001, colorSpaceToShort(metadata.colorSpace))
  exifIfd.addLong(0xa002, context.width)
  exifIfd.addLong(0xa003, context.height)
  if (metadata.exposureTime) {
    exifIfd.addRational(0x829a, toRational(metadata.exposureTime))
  }
  if (metadata.fNumber) {
    exifIfd.addRational(0x829d, toRational(metadata.fNumber))
  }
  if (metadata.iso) {
    exifIfd.addShort(0x8827, metadata.iso)
  }
  if (metadata.focalLength) {
    exifIfd.addRational(0x920a, toRational(metadata.focalLength))
  }
  if (metadata.focalLength35mm) {
    exifIfd.addShort(0xa405, metadata.focalLength35mm)
  }
  exifIfd.addAscii(0x9003, formatExifTimestamp(metadata.captureTime))
  exifIfd.addAscii(0x9004, formatExifTimestamp(metadata.captureTime))
  exifIfd.addShort(0xa217, 2)
  exifIfd.addAscii(0xa434, metadata.lensModel)
  exifIfd.addAscii(0xa431, metadata.serialNumber)
  exifIfd.addAscii(0xa420, metadata.uniqueImageId)

  root.addIfdPointer(0x8769, exifIfd)

  const tiffBytes = serializeTiff(root)
  const payload = new Uint8Array(EXIF_HEADER.byteLength + tiffBytes.byteLength)
  payload.set(EXIF_HEADER, 0)
  payload.set(tiffBytes, EXIF_HEADER.byteLength)
  return payload
}

function serializeTiff(root: IfdBuilder): Uint8Array {
  const header = new Uint8Array(8)
  header[0] = 0x49
  header[1] = 0x49
  header[2] = 0x2a
  header[3] = 0x00
  // IFD starts immediately after header
  const ifd = root.serialize(8)
  const buffer = new Uint8Array(header.byteLength + ifd.length)
  const view = new DataView(buffer.buffer)
  view.setUint32(4, 8, true)
  buffer.set(header, 0)
  buffer.set(ifd.bytes, header.byteLength)
  return buffer
}

const SRGB_WHITE_POINT: Rational[] = [
  { numerator: 3127, denominator: 10000 },
  { numerator: 3290, denominator: 10000 },
]

const SRGB_PRIMARIES: Rational[] = [
  { numerator: 6400, denominator: 10000 },
  { numerator: 3300, denominator: 10000 },
  { numerator: 3000, denominator: 10000 },
  { numerator: 6000, denominator: 10000 },
  { numerator: 1500, denominator: 10000 },
  { numerator: 600, denominator: 10000 },
]

const SRGB_REFERENCE_BLACK_WHITE: Rational[] = [
  { numerator: 0, denominator: 10000 },
  { numerator: 10000, denominator: 10000 },
  { numerator: 0, denominator: 10000 },
  { numerator: 10000, denominator: 10000 },
  { numerator: 0, denominator: 10000 },
  { numerator: 10000, denominator: 10000 },
]

function colorSpaceToShort(space: RawExportMetadata['colorSpace']): number {
  switch (space) {
    case 'AdobeRGB':
      return 0xFFFF // unspecified but flagged differently
    case 'DisplayP3':
      return 0xFFFF
    case 'sRGB':
    default:
      return 1
  }
}

function toRational(value: number): Rational {
  const precision = 10000
  return {
    numerator: Math.round(value * precision),
    denominator: precision,
  }
}

function formatExifTimestamp(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  const yyyy = date.getUTCFullYear().toString().padStart(4, '0')
  const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = date.getUTCDate().toString().padStart(2, '0')
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  return `${yyyy}:${MM}:${dd} ${hh}:${mm}:${ss}`
}
