export type MemoryTier = 'full-resolution' | 'reduced-resolution' | 'preview-only'

export interface DeviceCapabilities {
  deviceMemory: number | null
  hardwareConcurrency: number | null
  webgl2: boolean
  webgpu: boolean
  wasmSimd: boolean | null
  webCodecs: boolean
  sharedArrayBuffer: boolean
  crossOriginIsolated: boolean
  memoryTier: MemoryTier
  notes: string[]
}

export interface MemoryPlan {
  tier: MemoryTier
  reason: string
  downscaleFactor?: number
  maxMegapixels?: number
  estimatedWorkingSetMB?: number
}

export interface CapabilityOverrides {
  deviceMemory?: number | null
  wasmSimd?: boolean | null
}

const wasmSimdSnippet = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 123, 123, 1, 123, 3, 2, 1, 0,
  7, 7, 1, 3, 97, 100, 100, 0, 0, 10, 11, 1, 9, 0, 65, 0, 253, 15, 65, 0,
  253, 15, 253, 108, 11
])

function getForcedDeviceMemory(): number | null {
  if (typeof window === 'undefined') return null
  const forced = (window as any).__WH404_FORCE_DEVICE_MEMORY
  if (typeof forced === 'number' && forced > 0) {
    return forced
  }
  return null
}

async function detectWasmSimd(force?: boolean | null): Promise<boolean | null> {
  if (typeof force === 'boolean') return force
  if (typeof WebAssembly === 'undefined' || typeof WebAssembly.compile === 'undefined') {
    return null
  }
  try {
    const module = await WebAssembly.compile(wasmSimdSnippet)
    return module instanceof WebAssembly.Module
  } catch {
    return false
  }
}

function detectWebgl2(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  return Boolean(gl)
}

function detectWebgpu(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as any).gpu)
}

function detectWebCodecs(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as any).VideoEncoder === 'function' || typeof (window as any).VideoDecoder === 'function'
}

function detectSharedArrayBuffer(): { sab: boolean; isolated: boolean } {
  const sab = typeof SharedArrayBuffer !== 'undefined'
  const isolated = typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false
  return { sab: sab && isolated, isolated }
}

function resolveDeviceMemory(options?: CapabilityOverrides): number | null {
  if (typeof navigator === 'undefined') return null
  if (typeof options?.deviceMemory === 'number') return options.deviceMemory
  const forced = getForcedDeviceMemory()
  if (forced) return forced
  const navMemory = (navigator as any).deviceMemory
  return typeof navMemory === 'number' ? navMemory : null
}

function resolveHardwareConcurrency(): number | null {
  if (typeof navigator === 'undefined') return null
  return typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null
}

export async function detectDeviceCapabilities(overrides?: CapabilityOverrides): Promise<DeviceCapabilities> {
  const deviceMemory = resolveDeviceMemory(overrides)
  const hardwareConcurrency = resolveHardwareConcurrency()
  const webgl2 = detectWebgl2()
  const webgpu = detectWebgpu()
  const wasmSimd = await detectWasmSimd(overrides?.wasmSimd)
  const webCodecs = detectWebCodecs()
  const { sab, isolated } = detectSharedArrayBuffer()
  const memoryPlan = calculateMemoryPlan({
    deviceMemory,
    width: 4000,
    height: 3000
  })

  const notes: string[] = []
  if (!webgl2) notes.push('WebGL2 unavailable — GPU previews limited')
  if (!webgpu) notes.push('WebGPU disabled — CPU-only pipeline')
  if (wasmSimd === false) notes.push('WASM SIMD not supported — slower demosaic')
  if (!sab) notes.push('SharedArrayBuffer disabled — no worker shared memory')
  if (!webCodecs) notes.push('WebCodecs missing — using canvas encoder')

  return {
    deviceMemory,
    hardwareConcurrency,
    webgl2,
    webgpu,
    wasmSimd,
    webCodecs,
    sharedArrayBuffer: sab,
    crossOriginIsolated: isolated,
    memoryTier: memoryPlan.tier,
    notes
  }
}

interface MemoryPlanInput {
  deviceMemory: number | null
  width: number
  height: number
  bufferMultiplier?: number
}

export function calculateMemoryPlan(input: MemoryPlanInput): MemoryPlan {
  const { deviceMemory, width, height, bufferMultiplier = 2.2 } = input
  const pixels = width * height
  const bytesPerPixel = 6 // RGB16 = 3 channels * 2 bytes
  const rgbFootprintMB = (pixels * bytesPerPixel) / (1024 * 1024)
  const estimatedWorkingSetMB = rgbFootprintMB * bufferMultiplier
  const safeBudgetMB = deviceMemory ? deviceMemory * 1024 * 0.6 : Infinity

  if (deviceMemory !== null && deviceMemory < 2) {
    return {
      tier: 'preview-only',
      reason: 'Device reports <2GB — embedded preview only',
      estimatedWorkingSetMB
    }
  }

  if (estimatedWorkingSetMB <= safeBudgetMB || !Number.isFinite(safeBudgetMB)) {
    return {
      tier: 'full-resolution',
      reason: 'Within safe memory budget',
      estimatedWorkingSetMB
    }
  }

  const downscaleFactor = Math.max(0.4, Math.min(0.85, Math.sqrt(safeBudgetMB / estimatedWorkingSetMB) * 0.95))
  const maxPixels = pixels * downscaleFactor * downscaleFactor
  const maxMegapixels = maxPixels / 1_000_000

  if (downscaleFactor <= 0.45 && deviceMemory && deviceMemory < 3) {
    return {
      tier: 'preview-only',
      reason: 'Available memory too small even after downscale',
      estimatedWorkingSetMB
    }
  }

  return {
    tier: 'reduced-resolution',
    reason: `Downscaling to ${(downscaleFactor * 100).toFixed(0)}% to fit memory budget`,
    downscaleFactor,
    maxMegapixels,
    estimatedWorkingSetMB
  }
}

export function formatMemory(deviceMemory: number | null): string {
  if (!deviceMemory) return 'unknown'
  return `${deviceMemory.toFixed(1)} GB`
}

export function estimateRawFootprintMB(width: number, height: number): number {
  const pixels = width * height
  const bytesPerPixel = 6
  return (pixels * bytesPerPixel) / (1024 * 1024)
}
