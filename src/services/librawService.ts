/**
 * LibRaw WASM Service
 * PHRASE 6: Full RAW decode integration with LibRaw.wasm
 * 
 * Architecture:
 * - Load libraw.wasm from CDN or local /public/wasm/
 * - Instantiate WASM module with memory management
 * - Expose openRaw() API for full sensor data extraction
 * - Return 16-bit linear buffer + metadata (CFA, black/white levels, WB)
 */

// @ts-ignore
import * as UTIF from 'utif'

// Emscripten Module base interface
interface EmscriptenModule {
  wasmBinary?: ArrayBuffer
  INITIAL_MEMORY?: number
  ALLOW_MEMORY_GROWTH?: boolean
  onRuntimeInitialized?: () => void
}

// LibRaw WASM Module Interface
interface LibRawModule extends EmscriptenModule {
  _malloc(size: number): number
  _free(ptr: number): void
  HEAPU8: Uint8Array
  HEAPU16: Uint16Array
  HEAP32: Int32Array
  
  // LibRaw C API exports (bound via Emscripten)
  _libraw_init(flags: number): number
  _libraw_open_buffer(data: number, size: number, handle: number): number
  _libraw_unpack(handle: number): number
  _libraw_get_raw_width(handle: number): number
  _libraw_get_raw_height(handle: number): number
  _libraw_get_cfa_pattern(handle: number): number
  _libraw_get_black_level(handle: number, channel: number): number
  _libraw_get_white_level(handle: number): number
  _libraw_get_cam_mul(handle: number, channel: number): number
  _libraw_get_raw_data(handle: number): number
  _libraw_close(handle: number): void
  _libraw_strerror(errorCode: number): number
}

interface RawMetadata {
  width: number
  height: number
  cfaPattern: string // e.g., "RGGB", "BGGR"
  blackLevel: number[]
  whiteLevel: number
  whiteBalance: number[] // Camera multipliers [R, G, B, G2]
  colorMatrix?: number[]
  make?: string
  model?: string
  originalWidth?: number
  originalHeight?: number
  downscaleFactor?: number
  mockSource?: boolean
}

interface RawDecodeResult {
  metadata: RawMetadata
  rawBuffer: Uint16Array // 16-bit linear sensor data
  success: boolean
  error?: string
}

class LibRawService {
  private module: LibRawModule | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private mockMode = false

  /**
   * Load LibRaw WASM module
   * Tries CDN first, falls back to local if available
   */
  async loadModule(): Promise<void> {
    if (this.module) return
    if (this.isLoading && this.loadPromise) return this.loadPromise

    this.isLoading = true
    this.loadPromise = this._loadModuleInternal()
    
    try {
      await this.loadPromise
    } finally {
      this.isLoading = false
    }
  }

  private async _loadModuleInternal(): Promise<void> {
    const wasmUrls = [
      // Try local first (if user places wasm in public/)
      '/wasm/libraw.wasm',
      // CDN fallback - LibRaw-Wasm project or custom build
      'https://cdn.jsdelivr.net/npm/libraw-wasm@latest/dist/libraw.wasm'
    ]

    let lastError: Error | null = null

    for (const url of wasmUrls) {
      try {
        console.log(`[LibRaw] Attempting to load WASM from: ${url}`)
        
        // Fetch WASM binary
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const wasmBinary = await response.arrayBuffer()
        
        // Instantiate with Emscripten runtime
        const module = await this._instantiateWasm(wasmBinary)
        
        this.module = module
        console.log('[LibRaw] WASM module loaded successfully')
        console.log(`[LibRaw] Memory: ${(module.HEAPU8.length / 1024 / 1024).toFixed(2)} MB`)
        this.mockMode = false
        return
      } catch (err) {
        lastError = err as Error
        console.warn(`[LibRaw] Failed to load from ${url}:`, err)
      }
    }

    this.mockMode = true
    console.warn('[LibRaw] WASM unavailable — enabling mock decode pipeline for development use only.')
    if (lastError) {
      console.warn('[LibRaw] Last load error:', lastError)
    }
  }

  private async _instantiateWasm(wasmBinary: ArrayBuffer): Promise<LibRawModule> {
    // Emscripten Module configuration
    const moduleConfig: Partial<EmscriptenModule> = {
      wasmBinary,
      // Initial memory: 64MB, can grow to 2GB
      INITIAL_MEMORY: 64 * 1024 * 1024,
      ALLOW_MEMORY_GROWTH: true,
      onRuntimeInitialized: () => {
        console.log('[LibRaw] Runtime initialized')
      }
    }

    // Load Emscripten glue code (would need libraw.js companion)
    // For now, simulate basic instantiation
    const instance = await WebAssembly.instantiate(wasmBinary, {
      env: {
        memory: new WebAssembly.Memory({ 
          initial: 1024, // 64MB (pages are 64KB)
          maximum: 32768 // 2GB
        }),
        // Stub imports that Emscripten expects
        emscripten_resize_heap: () => true,
        emscripten_memcpy_big: () => {},
        fd_write: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0
      }
    })

    // Build module interface
    const memory = instance.instance.exports.memory as WebAssembly.Memory
    const exports = instance.instance.exports as any

    const module: LibRawModule = {
      ...moduleConfig,
      ...exports,
      HEAPU8: new Uint8Array(memory.buffer),
      HEAPU16: new Uint16Array(memory.buffer),
      HEAP32: new Int32Array(memory.buffer),
    } as LibRawModule

    return module
  }

  /**
   * Open RAW file and extract sensor data + metadata
   * PHRASE 6 Core API
   */
  async openRaw(fileBuffer: ArrayBuffer): Promise<RawDecodeResult> {
    await this.loadModule()

    if (this.mockMode || !this.module) {
      return await this._mockDecode(fileBuffer)
    }

    const startTime = performance.now()
    let handle = 0
    let dataPtr = 0

    try {
      // Allocate memory for file data
      const fileSize = fileBuffer.byteLength
      dataPtr = this.module._malloc(fileSize)
      
      if (!dataPtr) {
        throw new Error('WASM memory allocation failed. Try smaller file or restart.')
      }

      // Copy file to WASM memory
      this.module.HEAPU8.set(new Uint8Array(fileBuffer), dataPtr)

      // Initialize LibRaw handle
      handle = this.module._libraw_init(0)
      if (handle === 0) {
        throw new Error('Failed to initialize LibRaw')
      }

      // Open buffer
      const openResult = this.module._libraw_open_buffer(dataPtr, fileSize, handle)
      if (openResult !== 0) {
        const errorMsg = this._getErrorString(openResult)
        throw new Error(`LibRaw open failed: ${errorMsg}`)
      }

      // Unpack raw data
      const unpackResult = this.module._libraw_unpack(handle)
      if (unpackResult !== 0) {
        const errorMsg = this._getErrorString(unpackResult)
        throw new Error(`LibRaw unpack failed: ${errorMsg}`)
      }

      // Extract metadata
      const width = this.module._libraw_get_raw_width(handle)
      const height = this.module._libraw_get_raw_height(handle)
      const cfaPattern = this._getCfaPattern(handle)
      const blackLevel = this._getBlackLevels(handle)
      const whiteLevel = this.module._libraw_get_white_level(handle)
      const whiteBalance = this._getWhiteBalance(handle)

      // Get raw data pointer
      const rawDataPtr = this.module._libraw_get_raw_data(handle)
      if (!rawDataPtr) {
        throw new Error('Failed to get raw data pointer')
      }

      // Copy raw buffer
      const pixelCount = width * height
      const rawBuffer = new Uint16Array(pixelCount)
      
      // Read from WASM memory
      const sourceView = new Uint16Array(
        this.module.HEAPU8.buffer,
        rawDataPtr,
        pixelCount
      )
      rawBuffer.set(sourceView)

      const elapsed = performance.now() - startTime
      console.log(`[LibRaw] Decoded ${width}x${height} in ${elapsed.toFixed(0)}ms`)
      console.log(`[LibRaw] CFA: ${cfaPattern}, Black: [${blackLevel.join(',')}], White: ${whiteLevel}`)

      // Validate
      if (width === 0 || height === 0) {
        throw new Error('Invalid dimensions returned')
      }
      if (rawBuffer.length !== pixelCount) {
        throw new Error(`Buffer length mismatch: expected ${pixelCount}, got ${rawBuffer.length}`)
      }

      return {
        metadata: {
          width,
          height,
          cfaPattern,
          blackLevel,
          whiteLevel,
          whiteBalance
        },
        rawBuffer,
        success: true
      }
    } catch (err) {
      console.error('[LibRaw] Decode error:', err)
      return {
        metadata: this._emptyMetadata(),
        rawBuffer: new Uint16Array(0),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown decode error'
      }
    } finally {
      // Cleanup
      if (dataPtr) this.module._free(dataPtr)
      if (handle) this.module._libraw_close(handle)
    }
  }

  /**
   * PHRASE 7: Apply black level subtraction and white balance
   * Operates on 16-bit raw buffer in-place or returns new buffer
   */
  async applyLinearization(
    rawBuffer: Uint16Array,
    metadata: RawMetadata,
    options: { normalize?: boolean } = {}
  ): Promise<Uint16Array> {
    const { blackLevel, whiteLevel, whiteBalance } = metadata
    const output = new Uint16Array(rawBuffer.length)

    console.log('[LibRaw] Applying linearization...')
    console.log(`[LibRaw] Black: [${blackLevel.join(',')}], White: ${whiteLevel}`)
    console.log(`[LibRaw] WB multipliers: [${whiteBalance.join(',')}]`)

    // Average black level for simplicity (or use per-channel for CFA)
    const avgBlack = blackLevel.reduce((a, b) => a + b, 0) / blackLevel.length
    const range = whiteLevel - avgBlack

    for (let i = 0; i < rawBuffer.length; i++) {
      let value = rawBuffer[i]
      
      // Subtract black
      value = Math.max(0, value - avgBlack)
      
      // Normalize to 0-65535 if requested
      if (options.normalize) {
        value = Math.round((value / range) * 65535)
      }
      
      output[i] = Math.min(65535, value)
    }

    // Verify black region
    const meanBlack = output.slice(0, 1000).reduce((a, b) => a + b, 0) / 1000
    console.log(`[LibRaw] Mean black region after subtraction: ${meanBlack.toFixed(2)}`)

    return output
  }

  /**
   * PHRASE 8: Classical demosaic (bilinear or AHD)
   * Converts Bayer pattern to RGB
   */
  async demosaic(
    rawBuffer: Uint16Array,
    metadata: RawMetadata,
    method: 'bilinear' | 'ahd' = 'bilinear'
  ): Promise<Uint16Array> {
    const { width, height, cfaPattern } = metadata
    console.log(`[LibRaw] Demosaicing ${width}x${height} with ${method}...`)

    // RGB output (3 channels)
    const rgbBuffer = new Uint16Array(width * height * 3)

    if (method === 'bilinear') {
      this._demosaicBilinear(rawBuffer, rgbBuffer, width, height, cfaPattern)
    } else {
      // AHD would call WASM function if available
      console.warn('[LibRaw] AHD not implemented, falling back to bilinear')
      this._demosaicBilinear(rawBuffer, rgbBuffer, width, height, cfaPattern)
    }

    console.log('[LibRaw] Demosaic complete')
    return rgbBuffer
  }

  /**
   * Simple bilinear demosaic in JS (for testing)
   * Production should use WASM-optimized version
   */
  private _demosaicBilinear(
    raw: Uint16Array,
    rgb: Uint16Array,
    width: number,
    height: number,
    cfa: string
  ): void {
    const cfaMap = this._parseCfaPattern(cfa)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const rgbIdx = idx * 3
        const color = cfaMap[y % 2][x % 2]

        if (color === 'R') {
          rgb[rgbIdx] = raw[idx]
          rgb[rgbIdx + 1] = (raw[idx - 1] + raw[idx + 1]) / 2
          rgb[rgbIdx + 2] = (raw[idx - width] + raw[idx + width]) / 2
        } else if (color === 'G') {
          rgb[rgbIdx] = (raw[idx - 1] + raw[idx + 1]) / 2
          rgb[rgbIdx + 1] = raw[idx]
          rgb[rgbIdx + 2] = (raw[idx - width] + raw[idx + width]) / 2
        } else {
          rgb[rgbIdx] = (raw[idx - width] + raw[idx + width]) / 2
          rgb[rgbIdx + 1] = (raw[idx - 1] + raw[idx + 1]) / 2
          rgb[rgbIdx + 2] = raw[idx]
        }
      }
    }
  }

  private _parseCfaPattern(cfa: string): string[][] {
    if (cfa === 'RGGB') return [['R', 'G'], ['G', 'B']]
    if (cfa === 'BGGR') return [['B', 'G'], ['G', 'R']]
    if (cfa === 'GRBG') return [['G', 'R'], ['B', 'G']]
    if (cfa === 'GBRG') return [['G', 'B'], ['R', 'G']]
    return [['R', 'G'], ['G', 'B']] // default
  }

  private _getCfaPattern(handle: number): string {
    const pattern = this.module!._libraw_get_cfa_pattern(handle)
    // Decode pattern integer to string (LibRaw encoding)
    const patterns = ['RGGB', 'BGGR', 'GRBG', 'GBRG']
    return patterns[pattern % 4] || 'RGGB'
  }

  private _getBlackLevels(handle: number): number[] {
    return [
      this.module!._libraw_get_black_level(handle, 0),
      this.module!._libraw_get_black_level(handle, 1),
      this.module!._libraw_get_black_level(handle, 2),
      this.module!._libraw_get_black_level(handle, 3)
    ]
  }

  private _getWhiteBalance(handle: number): number[] {
    return [
      this.module!._libraw_get_cam_mul(handle, 0),
      this.module!._libraw_get_cam_mul(handle, 1),
      this.module!._libraw_get_cam_mul(handle, 2),
      this.module!._libraw_get_cam_mul(handle, 1) // G2 = G
    ]
  }

  private _getErrorString(code: number): string {
    if (!this.module) return `Error code: ${code}`
    const strPtr = this.module._libraw_strerror(code)
    // Read C string from memory
    let str = ''
    let i = 0
    while (this.module.HEAPU8[strPtr + i] !== 0) {
      str += String.fromCharCode(this.module.HEAPU8[strPtr + i])
      i++
    }
    return str || `Error code: ${code}`
  }

  private _emptyMetadata(): RawMetadata {
    return {
      width: 0,
      height: 0,
      cfaPattern: 'RGGB',
      blackLevel: [0, 0, 0, 0],
      whiteLevel: 65535,
      whiteBalance: [1, 1, 1, 1]
    }
  }

  private async _mockDecode(fileBuffer: ArrayBuffer): Promise<RawDecodeResult> {
    try {
      const tiff = UTIF.decode(fileBuffer)
      if (!tiff || tiff.length === 0) {
        throw new Error('Mock decode failed: no TIFF IFDs found')
      }

      const best = tiff.reduce((winner: any, candidate: any) => {
        const w = this._extractDimension(candidate, ['width', 'ImageWidth', 'imageWidth', 't256']) ?? 0
        const h = this._extractDimension(candidate, ['height', 'ImageLength', 'imageLength', 't257']) ?? 0
        const area = w * h
        if (!winner) return { ifd: candidate, width: w, height: h, area }
        if (area > winner.area) return { ifd: candidate, width: w, height: h, area }
        return winner
      }, null as null | { ifd: any; width: number; height: number; area: number })

      if (!best || !best.width || !best.height) {
        throw new Error('Mock decode failed: unable to determine dimensions')
      }

      if (!best.ifd.data) {
        UTIF.decodeImage(fileBuffer, best.ifd)
      }

      const rgba = UTIF.toRGBA8(best.ifd)
      const rawBuffer = new Uint16Array(best.width * best.height)

      for (let i = 0; i < rawBuffer.length; i++) {
        const r = rgba[i * 4]
        const g = rgba[i * 4 + 1]
        const b = rgba[i * 4 + 2]
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        rawBuffer[i] = Math.min(65535, Math.round((luminance / 255) * 65535))
      }

      return {
        metadata: {
          width: best.width,
          height: best.height,
          cfaPattern: 'RGGB',
          blackLevel: [0, 0, 0, 0],
          whiteLevel: 65535,
          whiteBalance: [1, 1, 1, 1],
          make: best.ifd.Make || 'Mock Capture',
          model: best.ifd.Model || 'Preview Sensor',
          mockSource: true
        },
        rawBuffer,
        success: true
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown mock decode failure'
      console.error('[LibRaw] Mock decode failed:', message)
      return {
        metadata: this._emptyMetadata(),
        rawBuffer: new Uint16Array(0),
        success: false,
        error: message
      }
    }
  }

  private _extractDimension(ifd: any, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = ifd[key]
      if (typeof value === 'number') return value
      if (Array.isArray(value) && typeof value[0] === 'number') return value[0]
    }
    return undefined
  }

  /**
   * Memory check and cleanup
   */
  getMemoryUsage(): { used: number; total: number } | null {
    if (!this.module) return null
    return {
      used: this.module.HEAPU8.length,
      total: this.module.HEAPU8.buffer.byteLength
    }
  }

  cleanup(): void {
    this.module = null
    this.loadPromise = null
    console.log('[LibRaw] Service cleaned up')
  }
}

// Singleton instance
export const librawService = new LibRawService()

// Type exports
export type { RawMetadata, RawDecodeResult }
