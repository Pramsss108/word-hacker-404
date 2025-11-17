/**
 * Simple Bayer Demosaicing
 * Converts single-channel RAW sensor data to RGB using bilinear interpolation
 * This is a basic implementation - not as good as LibRaw but gives usable color
 */

type BayerPattern = 'RGGB' | 'BGGR' | 'GRBG' | 'GBRG'

/**
 * Simple bilinear demosaic
 * Takes grayscale RAW data and converts to RGB based on Bayer pattern
 */
export function demosaicBayer(
  rawData: Uint8Array | Uint16Array,
  width: number,
  height: number,
  pattern: BayerPattern = 'RGGB'
): Uint8ClampedArray {
  const is16bit = rawData instanceof Uint16Array
  const scale = is16bit ? 255 / 65535 : 1
  
  const rgb = new Uint8ClampedArray(width * height * 4)
  
  // Pattern offsets: [row % 2][col % 2] = channel (0=R, 1=G, 2=B)
  const patterns: Record<BayerPattern, number[][]> = {
    'RGGB': [[0, 1], [1, 2]], // R G / G B
    'BGGR': [[2, 1], [1, 0]], // B G / G R
    'GRBG': [[1, 0], [2, 1]], // G R / B G
    'GBRG': [[1, 2], [0, 1]]  // G B / R G
  }
  
  const pat = patterns[pattern]
  
  console.log(`Demosaicing ${width}x${height} Bayer (${pattern}) image...`)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const outIdx = idx * 4
      
      // Determine which channel this pixel represents
      const channel = pat[y % 2][x % 2]
      const value = Math.round(rawData[idx] * scale)
      
      // For edge pixels, use simple replication
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        rgb[outIdx + 0] = value // R
        rgb[outIdx + 1] = value // G
        rgb[outIdx + 2] = value // B
        rgb[outIdx + 3] = 255   // A
        continue
      }
      
      // Bilinear interpolation for missing channels
      let r = 0, g = 0, b = 0
      
      if (channel === 0) { // Red pixel
        r = value
        g = Math.round((
          rawData[(y - 1) * width + x] +
          rawData[(y + 1) * width + x] +
          rawData[y * width + (x - 1)] +
          rawData[y * width + (x + 1)]
        ) / 4 * scale)
        b = Math.round((
          rawData[(y - 1) * width + (x - 1)] +
          rawData[(y - 1) * width + (x + 1)] +
          rawData[(y + 1) * width + (x - 1)] +
          rawData[(y + 1) * width + (x + 1)]
        ) / 4 * scale)
      } else if (channel === 1) { // Green pixel
        g = value
        r = Math.round((
          rawData[y * width + (x - 1)] +
          rawData[y * width + (x + 1)]
        ) / 2 * scale)
        b = Math.round((
          rawData[(y - 1) * width + x] +
          rawData[(y + 1) * width + x]
        ) / 2 * scale)
      } else { // Blue pixel
        b = value
        g = Math.round((
          rawData[(y - 1) * width + x] +
          rawData[(y + 1) * width + x] +
          rawData[y * width + (x - 1)] +
          rawData[y * width + (x + 1)]
        ) / 4 * scale)
        r = Math.round((
          rawData[(y - 1) * width + (x - 1)] +
          rawData[(y - 1) * width + (x + 1)] +
          rawData[(y + 1) * width + (x - 1)] +
          rawData[(y + 1) * width + (x + 1)]
        ) / 4 * scale)
      }
      
      rgb[outIdx + 0] = Math.min(255, Math.max(0, r))
      rgb[outIdx + 1] = Math.min(255, Math.max(0, g))
      rgb[outIdx + 2] = Math.min(255, Math.max(0, b))
      rgb[outIdx + 3] = 255
    }
  }
  
  console.log('✓ Demosaicing complete!')
  return rgb
}

/**
 * Try to demosaic grayscale data if it looks like Bayer pattern
 */
export function attemptBayerDemosaic(
  grayData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray | null {
  // Check if the data looks like it might be Bayer
  // Bayer data has a characteristic checkerboard pattern
  
  // Sample a few pixels to see if there's variation suggesting Bayer
  let hasVariation = false
  for (let y = 0; y < Math.min(100, height - 1); y += 2) {
    for (let x = 0; x < Math.min(100, width - 1); x += 2) {
      const idx1 = (y * width + x) * 4
      const idx2 = (y * width + (x + 1)) * 4
      const idx3 = ((y + 1) * width + x) * 4
      
      const diff1 = Math.abs(grayData[idx1] - grayData[idx2])
      const diff2 = Math.abs(grayData[idx1] - grayData[idx3])
      
      if (diff1 > 5 || diff2 > 5) {
        hasVariation = true
        break
      }
    }
    if (hasVariation) break
  }
  
  if (!hasVariation) {
    console.log('Data does not appear to be Bayer pattern (no variation detected)')
    return null
  }
  
  console.log('Data may be Bayer pattern - attempting demosaic...')
  
  // Extract single channel from RGBA
  const raw = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    raw[i] = grayData[i * 4] // Use R channel
  }
  
  // Try demosaicing with RGGB (most common)
  return demosaicBayer(raw, width, height, 'RGGB')
}
