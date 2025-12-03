import type { RawExportArtifact, RawExportFormat, RawExportJob, RawExportOptions } from './types'
import { buildExifPayload, type ExifBuildContext } from './metadata/ExifBuilder'
import { patchPngMetadata } from './metadata/pngMetadata'

const PREVIEW_MAX_EDGE_DEFAULT = 2048
const PREVIEW_QUALITY_DEFAULT = 0.82
const JPEGXL_DISTANCE_DEFAULT = 0.45

type VipsFactoryModule = typeof import('wasm-vips')
type VipsNamespace = Awaited<ReturnType<VipsFactoryModule['default']>>

export class RawExportService {
  private static singleton: RawExportService | null = null
  private vipsPromise: Promise<VipsNamespace> | null = null

  static getInstance(): RawExportService {
    if (!RawExportService.singleton) {
      RawExportService.singleton = new RawExportService()
    }
    return RawExportService.singleton
  }

  async export(
    job: RawExportJob,
    format: RawExportFormat,
    options: RawExportOptions = {},
  ): Promise<RawExportArtifact> {
    const started = now()
    const vips = await this.ensureVips()
    const image = this.createImage(vips, job)
    try {
      const exifPayload = this.buildExifPayload(job)
      const artifact = await this.write(image, format, job, options, exifPayload)
      return { ...artifact, durationMs: now() - started }
    } finally {
      image?.delete?.()
    }
  }

  private async ensureVips(): Promise<VipsNamespace> {
    if (!this.vipsPromise) {
      this.vipsPromise = import('wasm-vips').then((module) =>
        module.default({ locateFile: (path: string) => `/wasm/${path}` }),
      )
    }
    return this.vipsPromise
  }

  private createImage(vips: VipsNamespace, job: RawExportJob): any {
    const { buffer, width, height, channels, bitDepth } = job
    if (bitDepth > 8) {
      const pixels = new Uint16Array(buffer)
      return vips.Image.newFromMemory(pixels, width, height, channels, 'ushort')
    }
    const pixels = new Uint8Array(buffer)
    return vips.Image.newFromMemory(pixels, width, height, channels, 'uchar')
  }

  private async write(
    image: any,
    format: RawExportFormat,
    job: RawExportJob,
    options: RawExportOptions,
    exifPayload?: Uint8Array,
  ): Promise<Omit<RawExportArtifact, 'durationMs'>> {
    switch (format) {
      case 'tiff16': {
        const bitDepth = Math.min(16, job.bitDepth)
        this.attachExif(image, exifPayload)
        const data = image.writeToBuffer('.tif', {
          compression: 'lzw',
          predictor: 'horizontal',
          tile: false,
          bitdepth: bitDepth,
          strip: true,
        })
        return this.buildArtifact('tiff16', data, 'image/tiff', `TIFF ${bitDepth}-bit`)
      }
      case 'png16': {
        const bitDepth = Math.min(16, job.bitDepth)
        this.attachExif(image, exifPayload)
        const data = image.writeToBuffer('.png', {
          bitdepth: bitDepth,
          interlace: false,
          compression: 6,
          strip: true,
        })
        const patched = patchPngMetadata(
          ensureUint8Array(data),
          this.buildExifContext(job),
          exifPayload,
        )
        return this.buildArtifact('png16', patched, 'image/png', `PNG ${bitDepth}-bit`)
      }
      case 'jpegxl': {
        const distance = clampDistance(options.jpegxlDistance ?? JPEGXL_DISTANCE_DEFAULT)
        const data = image.writeToBuffer('.jxl', {
          effort: 7,
          distance,
          lossless: distance === 0,
        })
        const label = distance === 0 ? 'JPEG XL lossless' : `JPEG XL d=${distance.toFixed(2)}`
        return this.buildArtifact('jpegxl', data, 'image/jxl', label)
      }
      case 'jpeg-preview':
      default:
        this.attachExif(image, exifPayload)
        return this.buildPreviewArtifact(image, job, options)
    }
  }

  private async buildPreviewArtifact(
    image: any,
    job: RawExportJob,
    options: RawExportOptions,
  ): Promise<Omit<RawExportArtifact, 'durationMs'>> {
    const maxEdge = Math.max(512, options.previewMaxEdge ?? PREVIEW_MAX_EDGE_DEFAULT)
    const targetQuality = clampQuality(options.previewQuality ?? PREVIEW_QUALITY_DEFAULT)
    const qualityPercent = Math.round(targetQuality * 100)
    const disposables = new Set<any>()

    let working = typeof image.copy === 'function' ? image.copy() : image
    if (working !== image) {
      disposables.add(working)
    }

    const adopt = (next: any): void => {
      if (!next) {
        return
      }
      if (next !== working && next !== image) {
        disposables.add(next)
      }
      working = next
    }

    try {
      const longestEdge = Math.max(job.width, job.height)
      if (longestEdge > maxEdge && typeof working.resize === 'function') {
        adopt(working.resize(maxEdge / longestEdge))
      }
      if (typeof working.cast === 'function') {
        adopt(working.cast('uchar'))
      }
      const data = working.writeToBuffer('.jpg', {
        Q: qualityPercent,
        optimiseCoding: true,
        strip: true,
      })
      return this.buildArtifact('jpeg-preview', data, 'image/jpeg', `JPEG preview Q${qualityPercent}`)
    } finally {
      disposables.forEach((img) => img?.delete?.())
    }
  }

  private async buildArtifact(
    format: RawExportFormat,
    data: Uint8Array,
    mimeType: string,
    label: string,
  ): Promise<Omit<RawExportArtifact, 'durationMs'>> {
    const copy = data.slice()
    const checksum = await digestSha256(copy)
    return {
      format,
      mimeType,
      label,
      bytes: copy.byteLength,
      blob: new Blob([copy], { type: mimeType }),
      checksum,
    }
  }

  private buildExifContext(job: RawExportJob): ExifBuildContext {
    return {
      width: job.width,
      height: job.height,
      bitDepth: job.bitDepth,
      channels: job.channels,
      metadata: job.metadata,
    }
  }

  private buildExifPayload(job: RawExportJob): Uint8Array | undefined {
    const context = this.buildExifContext(job)
    try {
      return buildExifPayload(context)
    } catch (error) {
      console.warn('[RawExportService] EXIF build failed', error)
      return undefined
    }
  }

  private attachExif(image: any, payload?: Uint8Array): void {
    if (!payload || !image || typeof image.set !== 'function') {
      return
    }
    try {
      image.set('exif-data', payload)
    } catch (error) {
      console.warn('[RawExportService] Unable to attach EXIF payload', error)
    }
    try {
      image.set('icc-profile-name', 'sRGB IEC61966-2.1')
    } catch {
      // Non-fatal
    }
  }
}

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return PREVIEW_QUALITY_DEFAULT
  }
  return Math.max(0.4, Math.min(1, value))
}

function clampDistance(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(1, value)
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

async function digestSha256(data: Uint8Array): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return undefined
  }
  try {
    const normalized = normalizeArrayBuffer(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', normalized)
    return toHex(hashBuffer)
  } catch (error) {
    console.warn('[RawExportService] SHA-256 digest failed', error)
    return undefined
  }
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let output = ''
  for (let i = 0; i < bytes.length; i += 1) {
    output += bytes[i].toString(16).padStart(2, '0')
  }
  return output
}

function normalizeArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (
    data.byteOffset === 0
    && data.byteLength === data.buffer.byteLength
    && data.buffer instanceof ArrayBuffer
  ) {
    return data.buffer
  }
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  return buffer
}

function ensureUint8Array(data: Uint8Array | ArrayBufferView): Uint8Array {
  if (data instanceof Uint8Array) {
    return data
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}