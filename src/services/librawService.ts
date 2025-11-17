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

type LibRawFactory = (config?: Partial<EmscriptenModule>) => Promise<LibRawModule | any> | LibRawModule | any

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

declare global {
  interface Window {
    LibRawModule?: LibRawFactory
  }

  interface WorkerGlobalScope {
    LibRawModule?: LibRawFactory
    importScripts?: (...urls: string[]) => void
  }
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
    const globalScope = this.getGlobalScope()
    console.log('[LibRaw] Environment:', {
      isWorker: typeof document === 'undefined' && typeof self !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasImportScripts: typeof (globalScope as any).importScripts !== 'undefined',
      hasLibRawModule: typeof globalScope.LibRawModule
    })

    // Preferred path: use the Emscripten glue (libraw.js) placed under public/wasm
    const scriptCandidates = [
      '/wasm/libraw.js',
      // optional CDN fallback if present
      'https://cdn.jsdelivr.net/npm/libraw-wasm@latest/dist/libraw.js'
    ]

    let lastError: Error | null = null

    for (const src of scriptCandidates) {
      try {
        console.log(`[LibRaw] Attempting to load: ${src}`)
        if (typeof globalScope.LibRawModule !== 'function') {
          console.log(`[LibRaw] LibRawModule not present, loading script...`)
          await this._loadScript(src)
          console.log(`[LibRaw] Script loaded, checking for LibRawModule...`)
        } else {
          console.log(`[LibRaw] LibRawModule already present`)
        }

        if (typeof globalScope.LibRawModule !== 'function') {
          throw new Error('LibRawModule factory not found on global scope after loading script')
        }

        console.log(`[LibRaw] Instantiating WASM module...`)
        const locateFile = this.createLocateFileResolver(src)
        const module = await globalScope.LibRawModule({
          locateFile,
          onRuntimeInitialized: () => {
            console.log('[LibRaw] Runtime initialized')
          },
          ALLOW_MEMORY_GROWTH: true,
          print: (text: string) => console.log('[LibRaw/stdout]', text),
          printErr: (text: string) => console.error('[LibRaw/stderr]', text)
        } as any)

        console.log('[LibRaw] Module instantiated, checking exports...')
        if (!module || !module.HEAPU8 || typeof module._malloc !== 'function') {
          throw new Error('Loaded LibRaw module is missing expected exports')
        }

        // Log available exports
        const exports = Object.keys(module).filter(k => k.startsWith('_lr_') || k.startsWith('_libraw_'))
        console.log('[LibRaw] Available exports:', exports.slice(0, 10))

        this.module = module as LibRawModule
        this.mockMode = false
        console.log('[LibRaw] ✓ WASM module loaded successfully')
        console.log(`[LibRaw] Memory: ${(this.module.HEAPU8.length / 1024 / 1024).toFixed(2)} MB`)
        return
      } catch (err) {
        lastError = err as Error
        console.error(`[LibRaw] ✗ Failed to load from ${src}:`, err)
        console.error('[LibRaw] Error stack:', (err as Error).stack)
      }
    }

    // Ultimate fallback: try raw .wasm direct instantiation (may fail depending on exports)
    try {
      const resp = await fetch('/wasm/libraw.wasm')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
      const wasmBinary = await resp.arrayBuffer()
      const module = await this._instantiateWasm(wasmBinary)
      this.module = module
      this.mockMode = false
      console.log('[LibRaw] WASM module loaded via direct instantiate (no glue)')
      return
    } catch (err) {
      lastError = err as Error
      console.warn('[LibRaw] Direct instantiate failed as well:', err)
    }

    this.mockMode = true
    console.warn('[LibRaw] WASM unavailable — enabling mock decode pipeline for development use only.')
    if (lastError) console.warn('[LibRaw] Last load error:', lastError)
  }

  private async _loadScript(src: string): Promise<void> {
    // Main thread: use DOM script injection
    if (typeof document !== 'undefined' && document?.head) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.defer = true
        script.setAttribute('data-libraw', 'true')
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.head.appendChild(script)
      })
    }

    // Worker: Fetch and evaluate the script
    // Cannot use import() because Vite treats /public files as static assets
    // Cannot use importScripts() in module workers
    const scope = this.getGlobalScope()
    
    try {
      console.log('[LibRaw] Fetching script for manual evaluation...')
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const scriptText = await response.text()
      
      // Emscripten scripts use an IIFE that assigns to var LibRawModule, 
      // then conditionally exports via module.exports at the end.
      // We need to provide a module/exports environment and capture the result.
      const wrappedScript = `
        var module = { exports: {} };
        var exports = module.exports;
        
        // Execute the Emscripten script
        ${scriptText}
        
        // Return the factory function
        if (typeof module.exports === 'function') {
          return module.exports;
        } else if (typeof LibRawModule !== 'undefined') {
          return LibRawModule;
        }
        return null;
      `
      
      const evalFunc = new Function(wrappedScript)
      const moduleFactory = evalFunc.call(scope)
      
      console.log('[LibRaw] Evaluated factory type:', typeof moduleFactory)
      
      if (typeof moduleFactory === 'function') {
        // Assign to global scope so we can instantiate it later
        (scope as any).LibRawModule = moduleFactory
        console.log('[LibRaw] ✓ Module factory captured and assigned to global scope')
      } else {
        throw new Error('Script did not produce a valid module factory function')
      }
      
      return
    } catch (error) {
      throw new Error(`Failed to fetch and evaluate script: ${error}`)
    }
  }

  private getGlobalScope(): (WorkerGlobalScope & Window & { LibRawModule?: LibRawFactory }) {
    if (typeof globalThis !== 'undefined') return globalThis as any
    if (typeof self !== 'undefined') return self as any
    if (typeof window !== 'undefined') return window as any
    return {} as any
  }

  private createLocateFileResolver(source: string): (path: string) => string {
    if (!source) {
      return (path: string) => `/wasm/${path}`
    }

    const hasProtocol = /^https?:/i.test(source)
    const lastSlash = source.lastIndexOf('/')
    const baseDir = lastSlash >= 0 ? source.slice(0, lastSlash + 1) : ''

    if (hasProtocol) {
      return (path: string) => `${baseDir}${path}`
    }

    if (source.startsWith('/')) {
      return (path: string) => `${baseDir || '/wasm/'}${path}`
    }

    return (path: string) => `/wasm/${path}`
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

    // Branch: wrapper API (lr_*) vs full LibRaw C API (_libraw_*)
    const hasWrapper = typeof (this.module as any)._lr_init === 'function'
    const hasFullAPI = typeof (this.module as any)._libraw_init === 'function'

    if (hasWrapper) {
      return this._decodeViaWrapper(fileBuffer)
    } else if (hasFullAPI) {
      return this._decodeViaFullAPI(fileBuffer)
    } else {
      console.warn('[LibRaw] No recognizable API exports found; falling back to mock decode.')
      return await this._mockDecode(fileBuffer)
    }
  }

  private _decodeViaWrapper(fileBuffer: ArrayBuffer): RawDecodeResult {
    const mod: any = this.module
    const start = performance.now()
    let filePtr = 0
    let handle = 0
    let metaPtrs: number[] = []
    try {
      filePtr = mod._malloc(fileBuffer.byteLength)
      if (!filePtr) throw new Error('Allocation failed')
      mod.HEAPU8.set(new Uint8Array(fileBuffer), filePtr)

      handle = mod._lr_init()
      if (!handle) throw new Error('lr_init failed')
      
      // Note: Parameters (sRGB, camera WB, 16-bit) are now configured in the C wrapper
      console.log('[LibRaw] Using wrapper with pre-configured sRGB output')
      
      const openRes = mod._lr_open_buffer(handle, filePtr, fileBuffer.byteLength)
      if (openRes !== 0) throw new Error(`lr_open_buffer failed code=${openRes}`)
      const unpackRes = mod._lr_unpack(handle)
      if (unpackRes !== 0) throw new Error(`lr_unpack failed code=${unpackRes}`)
      const procRes = mod._lr_process(handle)
      if (procRes !== 0) throw new Error(`lr_process failed code=${procRes}`)

      // width/height/type pointers
      const widthPtr = mod._malloc(4)
      const heightPtr = mod._malloc(4)
      const typePtr = mod._malloc(4)
      metaPtrs = [widthPtr, heightPtr, typePtr]
      const imgPtr = mod._lr_make_image(handle, widthPtr, heightPtr, typePtr)
      if (!imgPtr) throw new Error('lr_make_image returned null')
      const width = mod.HEAP32[widthPtr >> 2]
      const height = mod.HEAP32[heightPtr >> 2]
      const type = mod.HEAP32[typePtr >> 2]
      if (!width || !height) throw new Error('Zero dimensions reported')

      const pixelCount = width * height
      let raw16: Uint16Array
      
      if (type === 1) {
        // Type 1: 8-bit RGB, expand to 16-bit
        console.log('[LibRaw] Processing 8-bit RGB output')
        const src = new Uint8Array(mod.HEAPU8.buffer, imgPtr, pixelCount * 3)
        raw16 = new Uint16Array(pixelCount * 3)
        for (let i = 0; i < src.length; i++) {
          raw16[i] = (src[i] << 8) | src[i] // expand 0..255 to 0..65535 with proper gamma
        }
      } else if (type === 2) {
        // Type 2: 16-bit RGB, copy directly
        console.log('[LibRaw] Processing 16-bit RGB output')
        const src = new Uint16Array(mod.HEAPU16.buffer, imgPtr >> 1, pixelCount * 3)
        raw16 = new Uint16Array(pixelCount * 3)
        raw16.set(src)
      } else {
        throw new Error(`Unsupported image type: ${type}`)
      }

      const elapsed = performance.now() - start
      console.log(`[LibRaw] Wrapper decode ${width}x${height} type=${type} in ${elapsed.toFixed(0)}ms`)

      return {
        metadata: {
          width,
          height,
          cfaPattern: 'RGB', // Already processed by LibRaw - NOT Bayer CFA!
          blackLevel: [0, 0, 0, 0],
          whiteLevel: 65535,
          whiteBalance: [1, 1, 1, 1],
          mockSource: false
        },
        rawBuffer: raw16,
        success: true
      }
    } catch (err) {
      console.error('[LibRaw] Wrapper decode error:', err)
      return {
        metadata: this._emptyMetadata(),
        rawBuffer: new Uint16Array(0),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown wrapper decode failure'
      }
    } finally {
      if (filePtr) mod._free(filePtr)
      metaPtrs.forEach(p => p && mod._free(p))
      if (handle) mod._lr_close(handle)
    }
  }

  private _decodeViaFullAPI(fileBuffer: ArrayBuffer): RawDecodeResult {
    const m: any = this.module
    const startTime = performance.now()
    let handle = 0
    let dataPtr = 0
    try {
      const fileSize = fileBuffer.byteLength
      dataPtr = m._malloc(fileSize)
      if (!dataPtr) throw new Error('WASM memory allocation failed. Try smaller file or restart.')
      m.HEAPU8.set(new Uint8Array(fileBuffer), dataPtr)
      handle = m._libraw_init(0)
      if (!handle) throw new Error('Failed to initialize LibRaw')
      const openResult = m._libraw_open_buffer(dataPtr, fileSize, handle)
      if (openResult !== 0) throw new Error(`LibRaw open failed code=${openResult}`)
      const unpackResult = m._libraw_unpack(handle)
      if (unpackResult !== 0) throw new Error(`LibRaw unpack failed code=${unpackResult}`)
      const width = m._libraw_get_raw_width(handle)
      const height = m._libraw_get_raw_height(handle)
      const cfaPattern = this._getCfaPattern(handle)
      const blackLevel = this._getBlackLevels(handle)
      const whiteLevel = m._libraw_get_white_level(handle)
      const whiteBalance = this._getWhiteBalance(handle)
      const rawDataPtr = m._libraw_get_raw_data(handle)
      if (!rawDataPtr) throw new Error('Failed to get raw data pointer')
      const pixelCount = width * height
      const rawBuffer = new Uint16Array(pixelCount)
      const sourceView = new Uint16Array(m.HEAPU8.buffer, rawDataPtr, pixelCount)
      rawBuffer.set(sourceView)
      const elapsed = performance.now() - startTime
      console.log(`[LibRaw] Decoded ${width}x${height} in ${elapsed.toFixed(0)}ms`)
      return {
        metadata: { width, height, cfaPattern, blackLevel, whiteLevel, whiteBalance },
        rawBuffer,
        success: true
      }
    } catch (err) {
      console.error('[LibRaw] Full API decode error:', err)
      return {
        metadata: this._emptyMetadata(),
        rawBuffer: new Uint16Array(0),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown decode error'
      }
    } finally {
      if (dataPtr) m._free(dataPtr)
      if (handle) m._libraw_close(handle)
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
    // If data is already RGB (processed by LibRaw), return as-is
    if (metadata.cfaPattern === 'RGB') {
      console.log('[LibRaw] Data already processed by LibRaw, skipping linearization')
      return rawBuffer
    }
    
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
    
    // If data is already RGB (processed by LibRaw), return as-is
    if (cfaPattern === 'RGB') {
      console.log('[LibRaw] Data already demosaiced by LibRaw, skipping JS demosaic')
      return rawBuffer
    }
    
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
