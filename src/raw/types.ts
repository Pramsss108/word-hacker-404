export type CFAPattern = 'RGGB' | 'BGGR' | 'GRBG' | 'GBRG' | 'X-Trans' | 'Unknown'

export interface RawProbeResult {
  /** Human-friendly label describing detected format */
  formatLabel: string
  /** MIME type (best-effort) */
  mimeType: string
  /** Extension hint sourced from filename or detector */
  extensionHint: string | null
  /** Whether the container is little endian */
  littleEndian: boolean
  /** Vendor / camera family guess */
  vendorGuess: string | null
  /** Color filter array guess */
  colorFilterArray: CFAPattern
  /** Hex digest of the first bytes for logging + QA */
  headerDigest: string
  /** Offset summary used for audits */
  locator: string
}

export interface RawSessionOptions {
  logicalName?: string
  maxHeaderBytes?: number
}

export interface RawWorkerJob {
  firstRunId: string
  traceToken: string
  logicalName: string
  diagnostics: RawProbeResult
}

export interface RawWorkerJobPayload {
  job: RawWorkerJob
  transferable: ArrayBuffer[]
  buffers: ArrayBufferLike[]
}

export type RawWorkerStatus = 'accepted' | 'completed' | 'failed'

export interface RawWorkerResult {
  status: RawWorkerStatus
  traceToken: string
  firstRunId: string
  logicalName: string
  diagnostics: RawProbeResult
  receivedBytes: number
  elapsedMs: number
  detail?: string
  pipeline?: RawPipelineSummary
  pipelineBuffer?: ArrayBuffer
  notes?: string[]
}

export interface RawPipelineSummary {
  dimensions: RawDimensions
  channels: number
  bitDepth: number
  histogram?: RawHistogram
  metadata?: Record<string, unknown>
  preview?: RawPreviewMeta
  arbitration?: RawArbitrationSummary
  colorScience?: RawColorScienceReport
}

export interface RawDimensions {
  width: number
  height: number
}

export interface RawHistogramChannel {
  label: string
  values: number[]
}

export interface RawHistogram {
  bins: number
  channels: RawHistogramChannel[]
}

export interface RawPreviewMeta {
  format: string
  width: number
  height: number
  bytes: number
}

export type RawArbitrationEngineId = 'libraw' | 'wasm-vips' | 'utif-preview'
export type RawArbitrationEngineStatus = 'ok' | 'degraded' | 'missing' | 'rejected'

export interface RawArbitrationEngineReport {
  id: RawArbitrationEngineId
  status: RawArbitrationEngineStatus
  histogram?: RawHistogram
  detail?: string
}

export interface RawArbitrationSummary {
  winner: RawArbitrationEngineId
  varianceScore?: number
  threshold: number
  engines: RawArbitrationEngineReport[]
}

export interface RawColorScienceReport {
  applied: boolean
  blackLevel?: number[]
  whiteBalance?: number[]
  matrix?: number[][]
  maxSignal?: number
  notes?: string[]
}

export interface RawWorkerApi {
  process(payload: RawWorkerJobPayload): Promise<RawWorkerResult>
}

export interface RawWorkerPoolOptions {
  maxWorkers?: number
}

export interface SharedArrayBufferWatchdogReport {
  available: boolean
  reason?: string
}

export type RawExportFormat = 'tiff16' | 'png16' | 'jpegxl' | 'jpeg-preview'

export interface RawExportMetadata {
  cameraMake?: string
  cameraModel?: string
  lensModel?: string
  orientation?: number
  captureTime?: string
  software?: string
  serialNumber?: string
  imageDescription?: string
  exposureTime?: number
  fNumber?: number
  iso?: number
  focalLength?: number
  focalLength35mm?: number
  colorSpace?: 'sRGB' | 'AdobeRGB' | 'DisplayP3' | 'Unknown'
  uniqueImageId?: string
}

export interface RawExportJob {
  buffer: ArrayBuffer
  width: number
  height: number
  channels: number
  bitDepth: number
  metadata?: RawExportMetadata
}

export interface RawExportOptions {
  previewQuality?: number
  previewMaxEdge?: number
  jpegxlDistance?: number
}

export interface RawExportArtifact {
  format: RawExportFormat
  blob: Blob
  bytes: number
  mimeType: string
  label: string
  durationMs: number
  checksum?: string
}
