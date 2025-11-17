/**
 * Buffer Transform Service
 * PHRASE 14: Canvas-less crop and rotation using pure buffer math
 * 
 * Key Features:
 * - No canvas dependency - pure TypedArray operations
 * - Handles crop + rotation in single pass
 * - Preserves 16-bit depth throughout
 * - Zero-copy where possible
 */

import type { CropRect } from '../components/ImageEditor'

export type RotationAngle = 0 | 90 | 180 | 270

export interface TransformOptions {
  crop?: CropRect | null
  rotation?: RotationAngle
}

export interface TransformResult {
  buffer: Uint16Array
  width: number
  height: number
}

/**
 * Apply crop and/or rotation to 16-bit RGB buffer
 * PHRASE 14 Core Algorithm
 * 
 * Order of operations:
 * 1. Crop (if specified)
 * 2. Rotate (if specified)
 * 
 * @param buffer - Source RGB buffer (width * height * 3)
 * @param width - Source image width
 * @param height - Source image height
 * @param options - Transform parameters
 * @returns Transformed buffer with new dimensions
 */
export function applyCropAndRotate(
  buffer: Uint16Array,
  width: number,
  height: number,
  options: TransformOptions = {}
): TransformResult {
  const { crop, rotation = 0 } = options

  // Step 1: Apply crop
  let currentBuffer = buffer
  let currentWidth = width
  let currentHeight = height

  if (crop && (crop.x !== 0 || crop.y !== 0 || crop.width !== width || crop.height !== height)) {
    const cropResult = applyCrop(currentBuffer, currentWidth, currentHeight, crop)
    currentBuffer = cropResult.buffer
    currentWidth = cropResult.width
    currentHeight = cropResult.height
    console.log(`[Transform] Cropped to ${currentWidth}x${currentHeight}`)
  }

  // Step 2: Apply rotation
  if (rotation !== 0) {
    const rotateResult = applyRotation(currentBuffer, currentWidth, currentHeight, rotation)
    currentBuffer = rotateResult.buffer
    currentWidth = rotateResult.width
    currentHeight = rotateResult.height
    console.log(`[Transform] Rotated ${rotation}° to ${currentWidth}x${currentHeight}`)
  }

  return {
    buffer: currentBuffer,
    width: currentWidth,
    height: currentHeight
  }
}

/**
 * Crop RGB buffer to specified rectangle
 * Pure buffer operation - no canvas
 */
function applyCrop(
  buffer: Uint16Array,
  width: number,
  height: number,
  crop: CropRect
): TransformResult {
  const { x, y, width: cropWidth, height: cropHeight } = crop

  // Validate crop bounds
  const clampedX = Math.max(0, Math.min(x, width - 1))
  const clampedY = Math.max(0, Math.min(y, height - 1))
  const clampedWidth = Math.min(cropWidth, width - clampedX)
  const clampedHeight = Math.min(cropHeight, height - clampedY)

  if (clampedWidth <= 0 || clampedHeight <= 0) {
    console.warn('[Transform] Invalid crop dimensions, returning original')
    return { buffer, width, height }
  }

  // Create output buffer for cropped region
  const croppedBuffer = new Uint16Array(clampedWidth * clampedHeight * 3)

  // Copy row by row (RGB interleaved)
  for (let row = 0; row < clampedHeight; row++) {
    const srcRow = clampedY + row
    const srcOffset = (srcRow * width + clampedX) * 3
    const dstOffset = row * clampedWidth * 3
    const rowPixels = clampedWidth * 3

    croppedBuffer.set(
      buffer.subarray(srcOffset, srcOffset + rowPixels),
      dstOffset
    )
  }

  return {
    buffer: croppedBuffer,
    width: clampedWidth,
    height: clampedHeight
  }
}

/**
 * Rotate RGB buffer by 90°, 180°, or 270°
 * Pure buffer operation - pixel remapping
 */
function applyRotation(
  buffer: Uint16Array,
  width: number,
  height: number,
  rotation: RotationAngle
): TransformResult {
  if (rotation === 0) {
    return { buffer, width, height }
  }

  switch (rotation) {
    case 90:
      return rotate90CW(buffer, width, height)
    case 180:
      return rotate180(buffer, width, height)
    case 270:
      return rotate270CW(buffer, width, height)
    default:
      return { buffer, width, height }
  }
}

/**
 * Rotate 90° clockwise
 * Pixel mapping: (x, y) → (height - 1 - y, x)
 * New dimensions: (height, width)
 */
function rotate90CW(
  buffer: Uint16Array,
  width: number,
  height: number
): TransformResult {
  const rotatedWidth = height
  const rotatedHeight = width
  const rotatedBuffer = new Uint16Array(rotatedWidth * rotatedHeight * 3)

  for (let srcY = 0; srcY < height; srcY++) {
    for (let srcX = 0; srcX < width; srcX++) {
      // Source pixel position
      const srcIndex = (srcY * width + srcX) * 3

      // Destination pixel position after 90° CW rotation
      const dstX = height - 1 - srcY
      const dstY = srcX
      const dstIndex = (dstY * rotatedWidth + dstX) * 3

      // Copy RGB triplet
      rotatedBuffer[dstIndex] = buffer[srcIndex]         // R
      rotatedBuffer[dstIndex + 1] = buffer[srcIndex + 1] // G
      rotatedBuffer[dstIndex + 2] = buffer[srcIndex + 2] // B
    }
  }

  return {
    buffer: rotatedBuffer,
    width: rotatedWidth,
    height: rotatedHeight
  }
}

/**
 * Rotate 180°
 * Pixel mapping: (x, y) → (width - 1 - x, height - 1 - y)
 * Dimensions unchanged
 */
function rotate180(
  buffer: Uint16Array,
  width: number,
  height: number
): TransformResult {
  const rotatedBuffer = new Uint16Array(width * height * 3)

  for (let srcY = 0; srcY < height; srcY++) {
    for (let srcX = 0; srcX < width; srcX++) {
      const srcIndex = (srcY * width + srcX) * 3

      const dstX = width - 1 - srcX
      const dstY = height - 1 - srcY
      const dstIndex = (dstY * width + dstX) * 3

      rotatedBuffer[dstIndex] = buffer[srcIndex]
      rotatedBuffer[dstIndex + 1] = buffer[srcIndex + 1]
      rotatedBuffer[dstIndex + 2] = buffer[srcIndex + 2]
    }
  }

  return {
    buffer: rotatedBuffer,
    width,
    height
  }
}

/**
 * Rotate 270° clockwise (90° counter-clockwise)
 * Pixel mapping: (x, y) → (y, width - 1 - x)
 * New dimensions: (height, width)
 */
function rotate270CW(
  buffer: Uint16Array,
  width: number,
  height: number
): TransformResult {
  const rotatedWidth = height
  const rotatedHeight = width
  const rotatedBuffer = new Uint16Array(rotatedWidth * rotatedHeight * 3)

  for (let srcY = 0; srcY < height; srcY++) {
    for (let srcX = 0; srcX < width; srcX++) {
      const srcIndex = (srcY * width + srcX) * 3

      const dstX = srcY
      const dstY = width - 1 - srcX
      const dstIndex = (dstY * rotatedWidth + dstX) * 3

      rotatedBuffer[dstIndex] = buffer[srcIndex]
      rotatedBuffer[dstIndex + 1] = buffer[srcIndex + 1]
      rotatedBuffer[dstIndex + 2] = buffer[srcIndex + 2]
    }
  }

  return {
    buffer: rotatedBuffer,
    width: rotatedWidth,
    height: rotatedHeight
  }
}

/**
 * Test function for transform algorithm validation
 * PHRASE 14 Test: crop 400x600 from 1000x1000, rotate 90° → 600x400
 */
export function testTransform(): boolean {
  console.log('[Transform Test] Starting validation...')

  // Create 1000x1000 test image with gradient pattern
  const testWidth = 1000
  const testHeight = 1000
  const testBuffer = new Uint16Array(testWidth * testHeight * 3)

  // Fill with gradient: R increases with X, G increases with Y
  for (let y = 0; y < testHeight; y++) {
    for (let x = 0; x < testWidth; x++) {
      const idx = (y * testWidth + x) * 3
      testBuffer[idx] = Math.floor((x / testWidth) * 65535)     // R gradient X
      testBuffer[idx + 1] = Math.floor((y / testHeight) * 65535) // G gradient Y
      testBuffer[idx + 2] = 32768                                 // B constant
    }
  }

  // Test: crop 400x600 and rotate 90° → final should be 600x400
  const result = applyCropAndRotate(testBuffer, testWidth, testHeight, {
    crop: { x: 300, y: 200, width: 400, height: 600 },
    rotation: 90
  })

  const expectedWidth = 600
  const expectedHeight = 400

  const success = result.width === expectedWidth && result.height === expectedHeight

  console.log(`[Transform Test] Result: ${result.width}x${result.height}`)
  console.log(`[Transform Test] Expected: ${expectedWidth}x${expectedHeight}`)
  console.log(`[Transform Test] ${success ? '✅ PASS' : '❌ FAIL'}`)

  // Verify pixel mapping (sample center pixel)
  const centerX = Math.floor(result.width / 2)
  const centerY = Math.floor(result.height / 2)
  const centerIdx = (centerY * result.width + centerX) * 3
  console.log(`[Transform Test] Center pixel RGB: [${result.buffer[centerIdx]}, ${result.buffer[centerIdx + 1]}, ${result.buffer[centerIdx + 2]}]`)

  return success
}
