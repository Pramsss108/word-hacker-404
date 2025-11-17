/**
 * RAW Processing Web Worker
 * PHRASE 10: Offload LibRaw decode/linearize/demosaic to worker thread
 * 
 * Supports transferable ArrayBuffers for zero-copy performance
 */

import { librawService, type RawMetadata, type RawDecodeResult } from '../services/librawService'

export interface WorkerTask {
  id: string
  type: 'decode' | 'linearize' | 'demosaic' | 'full-pipeline'
  payload: {
    fileBuffer?: ArrayBuffer
    rawBuffer?: Uint16Array
    metadata?: RawMetadata
    options?: {
      normalize?: boolean
      demosaicMethod?: 'bilinear' | 'ahd'
      downscaleFactor?: number
      maxMegapixels?: number
    }
  }
}

export interface WorkerResponse {
  id: string
  success: boolean
  result?: {
    metadata?: RawMetadata
    rawBuffer?: Uint16Array
    linearBuffer?: Uint16Array
    rgbBuffer?: Uint16Array
    dimensions?: {
      width: number
      height: number
      downscaleFactor?: number
    }
    preview?: string
  }
  error?: string
  progress?: string
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const task = event.data
  
  try {
    switch (task.type) {
      case 'decode':
        await handleDecode(task)
        break
      case 'linearize':
        await handleLinearize(task)
        break
      case 'demosaic':
        await handleDemosaic(task)
        break
      case 'full-pipeline':
        await handleFullPipeline(task)
        break
      default:
        throw new Error(`Unknown task type: ${(task as any).type}`)
    }
  } catch (err) {
    const response: WorkerResponse = {
      id: task.id,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown worker error'
    }
    self.postMessage(response)
  }
}

async function handleDecode(task: WorkerTask): Promise<void> {
  const { fileBuffer } = task.payload
  if (!fileBuffer) throw new Error('No file buffer provided')

  postProgress(task.id, 'Loading LibRaw WASM...')
  await librawService.loadModule()

  postProgress(task.id, 'Decoding RAW sensor data...')
  const result: RawDecodeResult = await librawService.openRaw(fileBuffer)

  if (!result.success) {
    throw new Error(result.error || 'Decode failed')
  }

  const response: WorkerResponse = {
    id: task.id,
    success: true,
    result: {
      metadata: result.metadata,
      rawBuffer: result.rawBuffer
    }
  }

  // Transfer buffer ownership back to main thread
  self.postMessage(response, { transfer: [result.rawBuffer.buffer] } as any)
}

async function handleLinearize(task: WorkerTask): Promise<void> {
  const { rawBuffer, metadata, options } = task.payload
  if (!rawBuffer || !metadata) {
    throw new Error('Missing rawBuffer or metadata')
  }

  postProgress(task.id, 'Applying linearization...')
  const linearBuffer = await librawService.applyLinearization(
    rawBuffer,
    metadata,
    options
  )

  const response: WorkerResponse = {
    id: task.id,
    success: true,
    result: { linearBuffer }
  }

  self.postMessage(response, { transfer: [linearBuffer.buffer] } as any)
}

async function handleDemosaic(task: WorkerTask): Promise<void> {
  const { rawBuffer, metadata, options } = task.payload
  if (!rawBuffer || !metadata) {
    throw new Error('Missing rawBuffer or metadata')
  }

  postProgress(task.id, 'Demosaicing Bayer pattern...')
  const method = options?.demosaicMethod || 'bilinear'
  const rgbBuffer = await librawService.demosaic(rawBuffer, metadata, method)
  const processed = applyDownscaleIfNeeded(
    rgbBuffer,
    metadata.width,
    metadata.height,
    options
  )

  const response: WorkerResponse = {
    id: task.id,
    success: true,
    result: {
      rgbBuffer: processed.buffer,
      dimensions: {
        width: processed.width,
        height: processed.height,
        downscaleFactor: processed.downscaleFactor
      }
    }
  }

  self.postMessage(response, { transfer: [processed.buffer.buffer] } as any)
}

async function handleFullPipeline(task: WorkerTask): Promise<void> {
  const { fileBuffer, options } = task.payload
  if (!fileBuffer) throw new Error('No file buffer provided')

  // Step 1: Decode
  postProgress(task.id, 'Loading LibRaw WASM...')
  await librawService.loadModule()

  postProgress(task.id, 'Decoding RAW (1/3)...')
  const decodeResult = await librawService.openRaw(fileBuffer)
  if (!decodeResult.success) {
    throw new Error(decodeResult.error || 'Decode failed')
  }

  const { metadata, rawBuffer } = decodeResult

  // Step 2: Linearize
  postProgress(task.id, 'Linearizing (2/3)...')
  const linearBuffer = await librawService.applyLinearization(
    rawBuffer,
    metadata,
    { normalize: options?.normalize ?? true }
  )

  // Step 3: Demosaic
  postProgress(task.id, 'Demosaicing (3/3)...')
  const method = options?.demosaicMethod || 'bilinear'
  const rgbBuffer = await librawService.demosaic(linearBuffer, metadata, method)
  const processed = applyDownscaleIfNeeded(
    rgbBuffer,
    metadata.width,
    metadata.height,
    options
  )

  const memUsage = librawService.getMemoryUsage()
  console.log('[Worker] Pipeline complete. Memory:', memUsage)

  const response: WorkerResponse = {
    id: task.id,
    success: true,
    result: {
      metadata,
      rawBuffer,
      linearBuffer,
      rgbBuffer: processed.buffer,
      dimensions: {
        width: processed.width,
        height: processed.height,
        downscaleFactor: processed.downscaleFactor
      }
    }
  }

  // Transfer all buffers
  self.postMessage(response, {
    transfer: [
      rawBuffer.buffer,
      linearBuffer.buffer,
      processed.buffer.buffer
    ]
  } as any)
}

function applyDownscaleIfNeeded(
  buffer: Uint16Array,
  width: number,
  height: number,
  options?: { downscaleFactor?: number; maxMegapixels?: number }
): { buffer: Uint16Array; width: number; height: number; downscaleFactor?: number } {
  const targetFactor = options?.downscaleFactor ?? 1
  const pixels = width * height
  const maxPixels = options?.maxMegapixels ? options.maxMegapixels * 1_000_000 : Infinity

  let effectiveFactor = targetFactor
  if (Number.isFinite(maxPixels) && maxPixels > 0 && pixels > maxPixels) {
    effectiveFactor = Math.min(effectiveFactor, Math.sqrt(maxPixels / pixels))
  }

  if (!effectiveFactor || effectiveFactor >= 0.98) {
    return { buffer, width, height }
  }

  const scaledWidth = Math.max(1, Math.floor(width * effectiveFactor))
  const scaledHeight = Math.max(1, Math.floor(height * effectiveFactor))
  const downscaled = new Uint16Array(scaledWidth * scaledHeight * 3)
  const xRatio = width / scaledWidth
  const yRatio = height / scaledHeight

  for (let y = 0; y < scaledHeight; y++) {
    const srcY = Math.min(height - 1, Math.floor(y * yRatio))
    for (let x = 0; x < scaledWidth; x++) {
      const srcX = Math.min(width - 1, Math.floor(x * xRatio))
      const srcIndex = (srcY * width + srcX) * 3
      const destIndex = (y * scaledWidth + x) * 3
      downscaled[destIndex] = buffer[srcIndex]
      downscaled[destIndex + 1] = buffer[srcIndex + 1]
      downscaled[destIndex + 2] = buffer[srcIndex + 2]
    }
  }

  return {
    buffer: downscaled,
    width: scaledWidth,
    height: scaledHeight,
    downscaleFactor: effectiveFactor
  }
}

function postProgress(id: string, message: string): void {
  const response: WorkerResponse = {
    id,
    success: true,
    progress: message
  }
  self.postMessage(response)
}

// Keep worker alive
console.log('[Worker] RAW processing worker initialized')
