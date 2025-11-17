/**
 * RAW JPEG Extractor
 * Extracts embedded high-resolution JPEG previews from RAW files
 * This gives full-color images without needing LibRaw WASM compilation
 */

// @ts-ignore
import * as UTIF from 'utif'
import { attemptBayerDemosaic } from './simpleDemosaic'

interface JpegExtractionResult {
  imageData: Uint8ClampedArray
  width: number
  height: number
  isColor: boolean
  source: 'jpeg-preview' | 'tiff-rgb' | 'tiff-grayscale'
}

export class RawJpegExtractor {
  /**
   * Extract the best quality image from a RAW file
   * Priority: 1) Large JPEG preview, 2) RGB TIFF, 3) Grayscale fallback
   */
  async extractBestImage(buffer: ArrayBuffer): Promise<JpegExtractionResult> {
    // Try to find embedded JPEG first
    const jpegResult = await this.extractEmbeddedJpeg(buffer)
    if (jpegResult) {
      return jpegResult
    }

    // Fall back to TIFF/IFD extraction
    return this.extractFromTiff(buffer)
  }

  /**
   * Search for embedded JPEG preview in RAW file
   * Many cameras store full-res JPEGs at specific offsets
   */
  private extractEmbeddedJpeg(buffer: ArrayBuffer): Promise<JpegExtractionResult | null> {
    const view = new Uint8Array(buffer)
    
    // JPEG markers
    const JPEG_START = [0xFF, 0xD8, 0xFF]
    const JPEG_END = [0xFF, 0xD9]
    
    // Search for JPEG start marker
    let jpegStart = -1
    for (let i = 0; i < view.length - 3; i++) {
      if (view[i] === JPEG_START[0] && 
          view[i + 1] === JPEG_START[1] && 
          view[i + 2] === JPEG_START[2]) {
        jpegStart = i
        break
      }
    }
    
    if (jpegStart === -1) return Promise.resolve(null)
    
    // Search for JPEG end marker
    let jpegEnd = -1
    for (let i = jpegStart + 3; i < view.length - 1; i++) {
      if (view[i] === JPEG_END[0] && view[i + 1] === JPEG_END[1]) {
        jpegEnd = i + 2
        break
      }
    }
    
    if (jpegEnd === -1 || jpegEnd <= jpegStart) return Promise.resolve(null)
    
    // Extract JPEG data
    const jpegData = view.slice(jpegStart, jpegEnd)
    
    // Only use if it's reasonably large (> 100KB = likely full preview)
    if (jpegData.length < 100 * 1024) return Promise.resolve(null)
    
    console.log(`Found embedded JPEG: ${(jpegData.length / 1024 / 1024).toFixed(2)}MB`)
    
    // Decode JPEG to ImageData
    return this.decodeJpegToImageData(jpegData)
  }

  /**
   * Decode JPEG bytes to ImageData using browser's native decoder
   */
  private decodeJpegToImageData(jpegData: Uint8Array): Promise<JpegExtractionResult | null> {
    return new Promise((resolve) => {
      try {
        // Create blob and object URL - copy to new array to avoid SharedArrayBuffer issues
        const buffer = new Uint8Array(jpegData)
        const blob = new Blob([buffer], { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)
        
        // Load image
        const img = new Image()
        img.onload = () => {
          try {
            // Draw to canvas to extract pixel data
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // Cleanup
            URL.revokeObjectURL(url)
            
            resolve({
              imageData: imageData.data,
              width: canvas.width,
              height: canvas.height,
              isColor: true,
              source: 'jpeg-preview'
            })
          } catch (err) {
            console.warn('Canvas decode failed:', err)
            URL.revokeObjectURL(url)
            resolve(null)
          }
        }
        img.onerror = () => {
          console.warn('Image load failed')
          URL.revokeObjectURL(url)
          resolve(null)
        }
        img.src = url
      } catch (err) {
        console.warn('JPEG decode setup failed:', err)
        resolve(null)
      }
    })
  }

  /**
   * Extract from TIFF/IFD structure (fallback)
   */
  private extractFromTiff(buffer: ArrayBuffer): JpegExtractionResult {
    const ifds = UTIF.decode(buffer)
    
    if (!ifds || ifds.length === 0) {
      throw new Error('No valid TIFF/IFD data found')
    }

    console.log(`Found ${ifds.length} IFDs in RAW file`)

    // Find the largest IFD with the most samples per pixel (color)
    let bestIfd = ifds[0]
    let maxScore = 0

    for (let i = 0; i < ifds.length; i++) {
      const ifd = ifds[i]
      const width = ifd.width || 0
      const height = ifd.height || 0
      const spp = ifd.t258 ? (Array.isArray(ifd.t258) ? ifd.t258.length : 1) : 1 // samples per pixel
      const bps = ifd.t258 ? (Array.isArray(ifd.t258) ? ifd.t258[0] : ifd.t258) : 8 // bits per sample
      const pixels = width * height
      const score = pixels * spp // Prefer larger + more channels
      
      console.log(`IFD ${i}: ${width}x${height}, ${spp} channels, ${bps} bits, score: ${score}`)
      
      if (score > maxScore && width > 0 && height > 0) {
        maxScore = score
        bestIfd = ifd
      }
    }

    const bestWidth = bestIfd.width || 0
    const bestHeight = bestIfd.height || 0
    const bestSpp = bestIfd.t258 ? (Array.isArray(bestIfd.t258) ? bestIfd.t258.length : 1) : 1
    
    console.log(`Using best IFD: ${bestWidth}x${bestHeight}, ${bestSpp} channels`)

    // Decode the best IFD
    UTIF.decodeImage(buffer, bestIfd)
    const rgba = UTIF.toRGBA8(bestIfd)

    const isColor = bestSpp >= 3

    if (!isColor) {
      console.warn('⚠ Grayscale data detected - attempting Bayer demosaic to recover color...')
      
      // Try to demosaic if this looks like Bayer pattern data
      const demosaiced = attemptBayerDemosaic(
        new Uint8ClampedArray(rgba),
        bestIfd.width,
        bestIfd.height
      )
      
      if (demosaiced) {
        console.log('✓ Successfully recovered color from Bayer pattern!')
        return {
          imageData: demosaiced,
          width: bestIfd.width,
          height: bestIfd.height,
          isColor: true,
          source: 'tiff-rgb'
        }
      } else {
        console.warn('⚠ Could not recover color - displaying as grayscale')
      }
    }

    return {
      imageData: new Uint8ClampedArray(rgba),
      width: bestIfd.width,
      height: bestIfd.height,
      isColor,
      source: isColor ? 'tiff-rgb' : 'tiff-grayscale'
    }
  }
}

export const rawJpegExtractor = new RawJpegExtractor()
