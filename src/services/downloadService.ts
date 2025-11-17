/**
 * Download Manager
 * PHRASE 12: Filename preservation + metadata + browser download
 * 
 * Features:
 * - Preserve original filename with format suffix
 * - EXIF metadata embedding (where supported)
 * - Proper MIME type handling
 * - Blob URL generation and cleanup
 */

import type { EncodeOptions } from './encoderService'

export interface DownloadOptions {
  originalFilename: string
  format: EncodeOptions['format']
  data: Uint8Array
  metadata?: {
    make?: string
    model?: string
    software?: string
    width?: number
    height?: number
  }
}

/**
 * Generate filename from original + format suffix
 * Examples:
 * - IMG_5034.DNG + png-16 → IMG_5034-raw-16bit.png
 * - photo.CR2 + tiff-16 → photo-raw-16bit.tiff
 * - DSC_1234.NEF + jpeg → DSC_1234-processed.jpg
 */
export function generateFilename(
  originalFilename: string,
  format: EncodeOptions['format']
): string {
  // Extract basename (without extension)
  const lastDot = originalFilename.lastIndexOf('.')
  const basename = lastDot > 0 
    ? originalFilename.substring(0, lastDot) 
    : originalFilename

  // Format-specific suffix and extension
  const formatMap: Record<EncodeOptions['format'], { suffix: string; ext: string }> = {
    'png-16': { suffix: '-raw-16bit', ext: 'png' },
    'tiff-16': { suffix: '-raw-16bit', ext: 'tiff' },
    'png-8': { suffix: '-processed', ext: 'png' },
    'jpeg': { suffix: '-processed', ext: 'jpg' },
    'webp': { suffix: '-processed', ext: 'webp' },
    'avif': { suffix: '-processed', ext: 'avif' }
  }

  const { suffix, ext } = formatMap[format] || { suffix: '-exported', ext: 'png' }

  return `${basename}${suffix}.${ext}`
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: EncodeOptions['format']): string {
  const mimeMap: Record<EncodeOptions['format'], string> = {
    'png-16': 'image/png',
    'tiff-16': 'image/tiff',
    'png-8': 'image/png',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'avif': 'image/avif'
  }
  return mimeMap[format] || 'application/octet-stream'
}

/**
 * Trigger browser download
 * PHRASE 12 Core API
 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { originalFilename, format, data, metadata } = options

  console.log('[Download] Preparing download...')
  console.log(`[Download] Original: ${originalFilename}`)
  console.log(`[Download] Format: ${format}`)
  console.log(`[Download] Size: ${(data.length / 1024 / 1024).toFixed(2)} MB`)

  // Generate final filename
  const filename = generateFilename(originalFilename, format)
  console.log(`[Download] Final name: ${filename}`)

  // Create blob with proper MIME type
  const mimeType = getMimeType(format)
  // Type assertion needed: TS doesn't recognize Uint8Array<ArrayBufferLike> as BlobPart
  // but Blob constructor handles both ArrayBuffer and SharedArrayBuffer at runtime
  const blob = new Blob([data as any], { type: mimeType })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    console.log('[Download] Complete. Blob URL revoked.')
  }, 100)

  // Log metadata (future: embed in EXIF)
  if (metadata) {
    console.log('[Download] Metadata:', metadata)
    console.log('[Download] Note: EXIF embedding requires extended TIFF writer or jsquash/jxl')
  }
}

/**
 * EXIF metadata writer (basic implementation)
 * For full EXIF support, use piexifjs or similar
 */
export function embedExifMetadata(
  imageData: Uint8Array,
  metadata: NonNullable<DownloadOptions['metadata']>,
  format: 'jpeg' | 'tiff'
): Uint8Array {
  // Simplified EXIF embedding
  // Production should use piexifjs or jxl-wasm
  
  console.log('[EXIF] Embedding metadata:', metadata)
  console.log('[EXIF] Format:', format)
  
  // For now, return original data
  // TODO: Implement full EXIF writer
  return imageData
}

/**
 * Validate file size before download
 */
export function validateFileSize(data: Uint8Array, maxSizeMB = 500): boolean {
  const sizeMB = data.length / 1024 / 1024
  
  if (sizeMB > maxSizeMB) {
    console.warn(`[Download] File size ${sizeMB.toFixed(2)} MB exceeds max ${maxSizeMB} MB`)
    return false
  }
  
  return true
}

/**
 * Test download with mock data
 */
export async function testDownload(): Promise<void> {
  // Create test PNG (1x1 pixel, 16-bit)
  const testData = new Uint8Array([
    // PNG signature
    137, 80, 78, 71, 13, 10, 26, 10,
    // IHDR chunk
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1,
    16, 2, 0, 0, 0, 144, 119, 83, 222,
    // IDAT chunk (empty)
    0, 0, 0, 10, 73, 68, 65, 84,
    8, 29, 1, 0, 0, 255, 255, 0, 0, 0, 1,
    // IEND chunk
    0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
  ])

  await downloadFile({
    originalFilename: 'test_image.DNG',
    format: 'png-16',
    data: testData,
    metadata: {
      software: 'Word Hacker 404 RAW Converter',
      width: 1,
      height: 1
    }
  })
}
