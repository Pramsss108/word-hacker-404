/**
 * Fast Preview Service
 * PHRASE 15: Generate 8-bit preview quickly for UI responsiveness
 * 
 * Strategy:
 * 1. Try UTIF embedded preview first (instant)
 * 2. If no preview, downscale demosaic result (max 1920x1280)
 * 3. Use OffscreenCanvas or buffer downscale
 * 
 * Target: <2s on modern mobile devices
 */

// @ts-ignore
import * as UTIF from 'utif'

export interface PreviewOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-100 for JPEG preview
}

export interface PreviewResult {
  dataUrl: string
  width: number
  height: number
  source: 'utif-embedded' | 'downscaled-demosaic' | 'utif-decode'
  timeMs: number
}

/**
 * Generate fast 8-bit preview from RAW file
 * PHRASE 15 Core API
 */
export async function generateFastPreview(
  fileBuffer: ArrayBuffer,
  options: PreviewOptions = {}
): Promise<PreviewResult> {
  const startTime = performance.now()
  const { maxWidth = 1920, maxHeight = 1280 } = options

  try {
    // Strategy 1: Try UTIF embedded preview (fastest)
    const embeddedResult = await tryUTIFEmbeddedPreview(fileBuffer, maxWidth, maxHeight)
    if (embeddedResult) {
      const timeMs = performance.now() - startTime
      console.log(`[Preview] UTIF embedded: ${embeddedResult.width}x${embeddedResult.height} in ${timeMs.toFixed(0)}ms`)
      return { ...embeddedResult, timeMs }
    }

    // Strategy 2: Decode with UTIF and downscale
    const utifResult = await tryUTIFDecodeAndDownscale(fileBuffer, maxWidth, maxHeight)
    if (utifResult) {
      const timeMs = performance.now() - startTime
      console.log(`[Preview] UTIF decode: ${utifResult.width}x${utifResult.height} in ${timeMs.toFixed(0)}ms`)
      return { ...utifResult, timeMs }
    }

    throw new Error('No preview generation method succeeded')
  } catch (err) {
    console.error('[Preview] Failed to generate preview:', err)
    throw err
  }
}

/**
 * Try to extract embedded JPEG preview from RAW file
 * Fastest method - uses thumbnail/preview IFD
 */
async function tryUTIFEmbeddedPreview(
  fileBuffer: ArrayBuffer,
  maxWidth: number,
  maxHeight: number
): Promise<Omit<PreviewResult, 'timeMs'> | null> {
  try {
    const ifds = UTIF.decode(fileBuffer)
    if (!ifds || ifds.length === 0) return null

    // Look for embedded preview in IFDs
    for (const ifd of ifds) {
      // Check for JPEG thumbnail/preview
      if (ifd.t513 && ifd.t514) { // JPEGInterchangeFormat and JPEGInterchangeFormatLength
        const offset = (Array.isArray(ifd.t513) ? ifd.t513[0] : ifd.t513) as number
        const length = (Array.isArray(ifd.t514) ? ifd.t514[0] : ifd.t514) as number

        if (offset && length) {
          const jpegData = new Uint8Array(fileBuffer, offset, length)
          const blob = new Blob([jpegData], { type: 'image/jpeg' })
          const dataUrl = await blobToDataURL(blob)

          // Get dimensions from IFD
          const width = ifd.width || 1920
          const height = ifd.height || 1280

          return {
            dataUrl,
            width: Math.min(width, maxWidth),
            height: Math.min(height, maxHeight),
            source: 'utif-embedded'
          }
        }
      }
    }

    return null
  } catch (err) {
    console.warn('[Preview] UTIF embedded extraction failed:', err)
    return null
  }
}

/**
 * Decode full RAW with UTIF and downscale
 * Slower but works for all formats
 */
async function tryUTIFDecodeAndDownscale(
  fileBuffer: ArrayBuffer,
  maxWidth: number,
  maxHeight: number
): Promise<Omit<PreviewResult, 'timeMs'> | null> {
  try {
    const ifds = UTIF.decode(fileBuffer)
    if (!ifds || ifds.length === 0) return null

    const ifd = ifds[0]
    UTIF.decodeImage(fileBuffer, ifd)

    const rgba = UTIF.toRGBA8(ifd)
    const width = ifd.width
    const height = ifd.height

    if (!rgba || !width || !height) return null

    // Calculate downscale factor
    const scale = Math.min(maxWidth / width, maxHeight / height, 1)
    const targetWidth = Math.floor(width * scale)
    const targetHeight = Math.floor(height * scale)

    // Downscale if needed
    let finalRgba: Uint8Array
    let finalWidth: number
    let finalHeight: number

    if (scale < 1) {
      const downscaled = downscaleRGBA8(rgba, width, height, targetWidth, targetHeight)
      finalRgba = downscaled.rgba
      finalWidth = downscaled.width
      finalHeight = downscaled.height
    } else {
      finalRgba = rgba
      finalWidth = width
      finalHeight = height
    }

    // Convert to data URL
    const dataUrl = await rgbaToDataURL(finalRgba, finalWidth, finalHeight)

    return {
      dataUrl,
      width: finalWidth,
      height: finalHeight,
      source: 'utif-decode'
    }
  } catch (err) {
    console.warn('[Preview] UTIF decode failed:', err)
    return null
  }
}

/**
 * Downscale RGBA8 buffer using bilinear interpolation
 * Pure buffer operation - no canvas
 */
function downscaleRGBA8(
  rgba: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): { rgba: Uint8Array; width: number; height: number } {
  const downscaled = new Uint8Array(dstWidth * dstHeight * 4)
  const xRatio = srcWidth / dstWidth
  const yRatio = srcHeight / dstHeight

  for (let dstY = 0; dstY < dstHeight; dstY++) {
    for (let dstX = 0; dstX < dstWidth; dstX++) {
      // Bilinear sampling
      const srcX = dstX * xRatio
      const srcY = dstY * yRatio

      const x1 = Math.floor(srcX)
      const y1 = Math.floor(srcY)
      const x2 = Math.min(x1 + 1, srcWidth - 1)
      const y2 = Math.min(y1 + 1, srcHeight - 1)

      const fx = srcX - x1
      const fy = srcY - y1

      // Sample 4 neighbors
      const idx11 = (y1 * srcWidth + x1) * 4
      const idx21 = (y1 * srcWidth + x2) * 4
      const idx12 = (y2 * srcWidth + x1) * 4
      const idx22 = (y2 * srcWidth + x2) * 4

      const dstIdx = (dstY * dstWidth + dstX) * 4

      // Interpolate each channel
      for (let c = 0; c < 4; c++) {
        const v11 = rgba[idx11 + c]
        const v21 = rgba[idx21 + c]
        const v12 = rgba[idx12 + c]
        const v22 = rgba[idx22 + c]

        const top = v11 * (1 - fx) + v21 * fx
        const bottom = v12 * (1 - fx) + v22 * fx
        const result = top * (1 - fy) + bottom * fy

        downscaled[dstIdx + c] = Math.round(result)
      }
    }
  }

  return { rgba: downscaled, width: dstWidth, height: dstHeight }
}

/**
 * Convert RGBA8 buffer to data URL using canvas
 * Uses OffscreenCanvas if available, falls back to regular canvas
 */
async function rgbaToDataURL(
  rgba: Uint8Array,
  width: number,
  height: number
): Promise<string> {
  if (typeof OffscreenCanvas !== 'undefined') {
    // Use OffscreenCanvas (faster, non-blocking)
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get OffscreenCanvas context')

    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
    ctx.putImageData(imageData, 0, 0)

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
    return blobToDataURL(blob)
  } else {
    // Fallback to regular canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
    ctx.putImageData(imageData, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.85)
  }
}

/**
 * Convert Blob to data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate preview from 16-bit RGB demosaic result
 * Downscale and convert to 8-bit for display
 */
export async function generatePreviewFromRGB16(
  rgb16: Uint16Array,
  width: number,
  height: number,
  options: PreviewOptions = {}
): Promise<PreviewResult> {
  const startTime = performance.now()
  const { maxWidth = 1920, maxHeight = 1280 } = options

  // Calculate downscale
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  const targetWidth = Math.floor(width * scale)
  const targetHeight = Math.floor(height * scale)

  // Convert to RGBA8
  let rgba8: Uint8Array

  if (scale < 1) {
    // Downscale while converting
    rgba8 = downscaleRGB16ToRGBA8(rgb16, width, height, targetWidth, targetHeight)
  } else {
    // Convert without downscaling
    rgba8 = rgb16ToRGBA8(rgb16, width, height)
  }

  const dataUrl = await rgbaToDataURL(rgba8, scale < 1 ? targetWidth : width, scale < 1 ? targetHeight : height)
  const timeMs = performance.now() - startTime

  console.log(`[Preview] RGB16 preview: ${targetWidth}x${targetHeight} in ${timeMs.toFixed(0)}ms`)

  return {
    dataUrl,
    width: scale < 1 ? targetWidth : width,
    height: scale < 1 ? targetHeight : height,
    source: 'downscaled-demosaic',
    timeMs
  }
}

/**
 * Convert RGB16 to RGBA8 (no downscale)
 */
function rgb16ToRGBA8(rgb16: Uint16Array, width: number, height: number): Uint8Array {
  const rgba8 = new Uint8Array(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    rgba8[i * 4] = rgb16[i * 3] >> 8         // R
    rgba8[i * 4 + 1] = rgb16[i * 3 + 1] >> 8 // G
    rgba8[i * 4 + 2] = rgb16[i * 3 + 2] >> 8 // B
    rgba8[i * 4 + 3] = 255                   // A
  }

  return rgba8
}

/**
 * Downscale RGB16 to RGBA8 in one pass
 */
function downscaleRGB16ToRGBA8(
  rgb16: Uint16Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Uint8Array {
  const rgba8 = new Uint8Array(dstWidth * dstHeight * 4)
  const xRatio = srcWidth / dstWidth
  const yRatio = srcHeight / dstHeight

  for (let dstY = 0; dstY < dstHeight; dstY++) {
    for (let dstX = 0; dstX < dstWidth; dstX++) {
      const srcX = dstX * xRatio
      const srcY = dstY * yRatio

      const x1 = Math.floor(srcX)
      const y1 = Math.floor(srcY)
      const x2 = Math.min(x1 + 1, srcWidth - 1)
      const y2 = Math.min(y1 + 1, srcHeight - 1)

      const fx = srcX - x1
      const fy = srcY - y1

      const idx11 = (y1 * srcWidth + x1) * 3
      const idx21 = (y1 * srcWidth + x2) * 3
      const idx12 = (y2 * srcWidth + x1) * 3
      const idx22 = (y2 * srcWidth + x2) * 3

      const dstIdx = (dstY * dstWidth + dstX) * 4

      // Interpolate RGB, convert to 8-bit
      for (let c = 0; c < 3; c++) {
        const v11 = rgb16[idx11 + c]
        const v21 = rgb16[idx21 + c]
        const v12 = rgb16[idx12 + c]
        const v22 = rgb16[idx22 + c]

        const top = v11 * (1 - fx) + v21 * fx
        const bottom = v12 * (1 - fx) + v22 * fx
        const result = top * (1 - fy) + bottom * fy

        rgba8[dstIdx + c] = Math.round(result / 256)
      }

      rgba8[dstIdx + 3] = 255 // Alpha
    }
  }

  return rgba8
}
