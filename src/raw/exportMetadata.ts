import type { RawExportMetadata, RawPipelineSummary } from './types'

const SOFTWARE_LABEL = 'Word Hacker 404 · RAW Dock'

export function deriveExportMetadata(
  summary: RawPipelineSummary,
  logicalName?: string,
): RawExportMetadata {
  const libraw = summary.metadata?.libraw as Record<string, any> | undefined
  const coreMeta = pickObject(libraw, 'metadata', 'maker', 'camera')
  const exif = pickObject(libraw, 'exif', 'metadata', 'Exif')
  const lens = pickObject(libraw, 'lens')

  const captureTimestamp = coerceTimestamp(
    firstAvailable<number>([
      coreMeta?.timestamp,
      coreMeta?.Timestamp,
      exif?.DateTimeOriginal,
      exif?.SubSecTimeOriginal,
    ]),
  )

  const metadata: RawExportMetadata = {
    cameraMake: sanitizeText(
      firstAvailable<string>([
        coreMeta?.make,
        coreMeta?.Make,
        coreMeta?.camera_make,
        exif?.Make,
      ]),
    ),
    cameraModel: sanitizeText(
      firstAvailable<string>([
        coreMeta?.model,
        coreMeta?.Model,
        coreMeta?.camera_model,
        exif?.Model,
      ]),
    ),
    lensModel: sanitizeText(
      firstAvailable<string>([
        lens?.lens,
        lens?.Lens,
        lens?.model,
        exif?.LensModel,
      ]),
    ),
    orientation: coerceNumber(
      firstAvailable<number>([
        exif?.Orientation,
        coreMeta?.orientation,
        coreMeta?.Orientation,
      ]),
      1,
    ),
    captureTime: captureTimestamp,
    software: SOFTWARE_LABEL,
    serialNumber: sanitizeText(
      firstAvailable<string>([
        coreMeta?.serial,
        coreMeta?.SerialNumber,
        exif?.BodySerialNumber,
      ]),
    ),
    imageDescription: logicalName ? `RAW export of ${logicalName}` : undefined,
    exposureTime: normalizeExposure(firstAvailable([exif?.ExposureTime, coreMeta?.shutter])),
    fNumber: coerceNumber(firstAvailable<number>([exif?.FNumber, coreMeta?.aperture]), undefined),
    iso: coerceNumber(firstAvailable<number>([exif?.ISOSpeedRatings, coreMeta?.iso_speed, coreMeta?.iso])),
    focalLength: coerceNumber(firstAvailable<number>([exif?.FocalLength, lens?.focal, lens?.FocalLength])),
    focalLength35mm: coerceNumber(firstAvailable<number>([
      exif?.FocalLengthIn35mmFilm,
      lens?.focal35,
      lens?.FocalLengthIn35mm,
    ])),
    colorSpace: deriveColorSpace(summary),
    uniqueImageId: sanitizeText(
      firstAvailable<string>([
        exif?.ImageUniqueID,
        libraw?.unique_image_id,
        cryptoRandomId(),
      ]),
    ),
  }

  if (!metadata.cameraMake) {
    metadata.cameraMake = 'Unknown Camera'
  }
  if (!metadata.cameraModel) {
    metadata.cameraModel = 'RAW Source'
  }
  if (!metadata.software) {
    metadata.software = SOFTWARE_LABEL
  }

  return metadata
}

function pickObject(source: Record<string, any> | undefined, ...keys: string[]): Record<string, any> | undefined {
  if (!source) return undefined
  for (const key of keys) {
    const candidate = source[key]
    if (candidate && typeof candidate === 'object') {
      return candidate as Record<string, any>
    }
  }
  return undefined
}

function firstAvailable<T>(candidates: Array<T | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate
    }
  }
  return undefined
}

function coerceNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function sanitizeText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  return undefined
}

function coerceTimestamp(value: number | string | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }
  return undefined
}

function normalizeExposure(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const fractionMatch = value.match(/^(\d+)\/(\d+)$/)
    if (fractionMatch) {
      const numerator = Number(fractionMatch[1])
      const denominator = Number(fractionMatch[2])
      if (denominator !== 0) {
        return numerator / denominator
      }
    }
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  if (typeof value === 'object' && value) {
    const numerator = coerceNumber((value as any).numerator ?? (value as any).num)
    const denominator = coerceNumber((value as any).denominator ?? (value as any).den)
    if (numerator !== undefined && denominator && denominator !== 0) {
      return numerator / denominator
    }
  }
  return undefined
}

function deriveColorSpace(summary: RawPipelineSummary): RawExportMetadata['colorSpace'] {
  const hint = (summary.metadata?.libraw as any)?.color?.space
  if (typeof hint === 'string') {
    const normalized = hint.toLowerCase()
    if (normalized.includes('srgb')) return 'sRGB'
    if (normalized.includes('adobe')) return 'AdobeRGB'
    if (normalized.includes('p3')) return 'DisplayP3'
  }
  return 'sRGB'
}

function cryptoRandomId(): string | undefined {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID()
    } catch (error) {
      console.warn('[deriveExportMetadata] randomUUID failed', error)
    }
  }
  return undefined
}
