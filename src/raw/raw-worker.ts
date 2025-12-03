import * as Comlink from 'comlink'
import * as UTIF from 'utif'
import type {
  RawArbitrationEngineReport,
  RawColorScienceReport,
  RawDimensions,
  RawHistogram,
  RawHistogramChannel,
  RawPreviewMeta,
  RawPipelineSummary,
  RawWorkerApi,
  RawWorkerJobPayload,
  RawWorkerResult,
} from './types'

type LibRawCtor = typeof import('libraw-wasm').default
type VipsFactoryModule = typeof import('wasm-vips')
type VipsNamespace = Awaited<ReturnType<VipsFactoryModule['default']>>

const HISTOGRAM_BINS = 256
const CHANNEL_LABELS = ['R', 'G', 'B', 'K', 'L']
const LIBRAW_OPTIONS = {
  outputBps: 16,
  outputColor: 1,
  useCameraWb: true,
  noAutoBright: true,
  halfSize: false,
}

const workerApi: RawWorkerApi = {
  async process(payload: RawWorkerJobPayload): Promise<RawWorkerResult> {
    const started = now()
    const sourceBuffer = payload.transferable[0] ?? payload.buffers[0]
    if (!sourceBuffer) {
      throw new Error('RawWorker received job without transferable buffer')
    }

    const sourceBytes = sourceBuffer instanceof Uint8Array ? sourceBuffer : new Uint8Array(sourceBuffer)
    const receivedBytes = sourceBytes.byteLength
    const notes: string[] = []

    try {
      const { summary, buffer } = await runLosslessPipeline(sourceBytes, notes)
      return Comlink.transfer({
        status: 'completed',
        traceToken: payload.job.traceToken,
        firstRunId: payload.job.firstRunId,
        logicalName: payload.job.logicalName,
        diagnostics: payload.job.diagnostics,
        receivedBytes,
        elapsedMs: now() - started,
        detail: 'LibRaw wasm decode + histogram ready',
        pipeline: summary,
        pipelineBuffer: buffer,
        notes: notes.length ? notes : undefined,
      }, [buffer])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notes.push(message)
      return {
        status: 'failed',
        traceToken: payload.job.traceToken,
        firstRunId: payload.job.firstRunId,
        logicalName: payload.job.logicalName,
        diagnostics: payload.job.diagnostics,
        receivedBytes,
        elapsedMs: now() - started,
        detail: message,
        notes,
      }
    }
  },
}

Comlink.expose(workerApi)

interface LosslessPipelineResult {
  summary: RawPipelineSummary
  buffer: ArrayBuffer
}

async function runLosslessPipeline(rawBytes: Uint8Array, notes: string[]): Promise<LosslessPipelineResult> {
  const libRawCtor = await loadLibRawCtor()
  const libRaw = new libRawCtor()
  try {
    await libRaw.open(rawBytes, LIBRAW_OPTIONS)
    const metadata = await libRaw.metadata(true)
    const imagePayload = await libRaw.imageData()
    const { pixels, widthHint, heightHint, channelHint } = unwrapLibRawImage(imagePayload)
    const { buffer16, bitDepth } = coerceToUint16(pixels)
    let calibratedBuffer = buffer16

    const dimensions = resolveDimensions(metadata, widthHint, heightHint)
    if (!dimensions) {
      throw new Error('Unable to resolve image dimensions from LibRaw metadata')
    }

    const channels = resolveChannelCount(metadata, channelHint, buffer16.length, dimensions, notes)
    const colorScienceProfile = resolveColorScienceProfile(metadata, channels)
    const colorScienceResult = applyColorScience(calibratedBuffer, channels, colorScienceProfile)
    calibratedBuffer = colorScienceResult.buffer
    const exportBuffer = calibratedBuffer.slice()

    const histogram = computeHistogram(exportBuffer, channels)

    const vipsMetadata = await withVips((vips) => {
      try {
        const format = bitDepth <= 8 ? 'uchar' : 'ushort'
        const image = vips.Image.newFromMemory(exportBuffer, dimensions.width, dimensions.height, channels, format)
        const summary = {
          format,
          bands: image?.bands ?? channels,
          interpretation: (image as any)?.interpretation ?? 'unknown',
        }
        image?.delete?.()
        return summary
      } catch (vipsError) {
        notes.push(`wasm-vips init failed: ${vipsError instanceof Error ? vipsError.message : String(vipsError)}`)
        return undefined
      }
    })

    const previewResult = decodeUtifPreview(rawBytes, notes)
    const arbitration = buildArbitrationSummary(
      histogram,
      previewResult?.histogram,
      vipsMetadata ? 'ok' : 'missing',
      notes,
    )

    return {
      buffer: exportBuffer.buffer,
      summary: {
      dimensions,
      channels,
      bitDepth,
      histogram,
      metadata: {
        libraw: metadata,
        vips: vipsMetadata,
      },
      preview: previewResult?.preview,
      arbitration,
      colorScience: colorScienceResult.report,
      },
    }
  } finally {
    terminateLibRaw(libRaw)
  }
}

async function loadLibRawCtor(): Promise<LibRawCtor> {
  if (!libRawCtorPromise) {
    libRawCtorPromise = import('libraw-wasm').then((module) => module.default)
  }
  return libRawCtorPromise
}

async function withVips<T>(fn: (vips: VipsNamespace) => T | Promise<T>): Promise<T | undefined> {
  try {
    const vips = await loadVips()
    return await fn(vips)
  } catch (error) {
    console.warn('[raw-worker] wasm-vips unavailable:', error)
    return undefined
  }
}

async function loadVips(): Promise<VipsNamespace> {
  if (!vipsInstancePromise) {
    vipsInstancePromise = import('wasm-vips').then((module) =>
      module.default({ locateFile: (path: string) => `/wasm/${path}` }),
    )
  }
  return vipsInstancePromise
}

function unwrapLibRawImage(payload: unknown): {
  pixels: ArrayBufferView
  widthHint?: number
  heightHint?: number
  channelHint?: number
} {
  if (isArrayBufferView(payload)) {
    return { pixels: payload }
  }

  if (payload && typeof payload === 'object') {
    const candidate = (payload as Record<string, unknown>).data
      ?? (payload as Record<string, unknown>).image
      ?? (payload as Record<string, unknown>).pixels
    if (isArrayBufferView(candidate)) {
      return {
        pixels: candidate,
        widthHint: toNumber((payload as Record<string, unknown>).width),
        heightHint: toNumber((payload as Record<string, unknown>).height),
        channelHint: toNumber((payload as Record<string, unknown>).channels),
      }
    }
  }

  throw new Error('Unsupported LibRaw imageData payload')
}

function coerceToUint16(view: ArrayBufferView): { buffer16: Uint16Array; bitDepth: number } {
  if (view instanceof Uint16Array) {
    return { buffer16: view, bitDepth: 16 }
  }
  if (view instanceof Uint8Array || view instanceof Uint8ClampedArray) {
    const converted = new Uint16Array(view.length)
    for (let i = 0; i < view.length; i += 1) {
      converted[i] = view[i] << 8
    }
    return { buffer16: converted, bitDepth: 8 }
  }
  if (view instanceof DataView) {
    return coerceToUint16(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  }

  throw new Error(`Unsupported pixel buffer type: ${Object.prototype.toString.call(view)}`)
}

function resolveDimensions(metadata: unknown, widthHint?: number, heightHint?: number): RawDimensions | null {
  const candidates = [
    { width: widthHint, height: heightHint },
    pickDimensions(metadata),
    pickDimensions((metadata as any)?.sizes),
    pickDimensions((metadata as any)?.raw),
  ]

  for (const candidate of candidates) {
    if (candidate?.width && candidate?.height) {
      return candidate as RawDimensions
    }
  }
  return null
}

function pickDimensions(source: unknown): RawDimensions | null {
  if (!source || typeof source !== 'object') {
    return null
  }
  const width = toNumber((source as Record<string, unknown>).width ?? (source as Record<string, unknown>).raw_width)
  const height = toNumber((source as Record<string, unknown>).height ?? (source as Record<string, unknown>).raw_height)
  if (width && height) {
    return { width, height }
  }
  return null
}

function resolveChannelCount(
  metadata: unknown,
  channelHint: number | undefined,
  totalSamples: number,
  dimensions: RawDimensions,
  notes: string[],
): number {
  if (channelHint && channelHint > 0) {
    return channelHint
  }

  const metadataChannels = toNumber((metadata as any)?.colors ?? (metadata as any)?.sizes?.colors)
  if (metadataChannels && metadataChannels > 0) {
    return metadataChannels
  }

  const derived = totalSamples / (dimensions.width * dimensions.height)
  if (Number.isFinite(derived) && derived >= 1 && derived <= 4) {
    const rounded = Math.max(1, Math.min(4, Math.round(derived)))
    if (derived !== rounded) {
      notes.push(`Channel count derived as ${derived.toFixed(2)}; rounded to ${rounded}`)
    }
    return rounded
  }

  notes.push('Channel count unavailable; defaulting to RGB')
  return 3
}

interface ColorScienceProfile {
  blackLevel?: number[]
  whiteBalance?: number[]
  matrix?: number[][]
  maxSignal: number
  report: RawColorScienceReport
}

function resolveColorScienceProfile(metadata: unknown, channels: number): ColorScienceProfile | undefined {
  if (!metadata || channels < 1) {
    return undefined
  }
  const colorMeta = (metadata as Record<string, unknown>)?.color ?? (metadata as Record<string, unknown>)
  if (!colorMeta || typeof colorMeta !== 'object') {
    return undefined
  }

  const blackLevel = replicateToChannels(
    firstNumberArray([
      (colorMeta as any).black,
      (colorMeta as any).black_level,
      (colorMeta as any).cblack,
      (metadata as any)?.raw?.black,
      (metadata as any)?.raw?.black_level,
    ]),
    channels,
    0,
  )

  const whiteBalance = normalizeGains(
    replicateToChannels(
      firstNumberArray([
        (colorMeta as any).cam_mul,
        (colorMeta as any).pre_mul,
        (metadata as any)?.cam_mul,
      ]),
      channels,
      1,
    ),
  )

  const matrixValues = firstNumberArray([ (colorMeta as any).rgb_cam, (metadata as any)?.rgb_cam ])
  const matrix = buildColorMatrix(matrixValues, channels)

  const maxSignal = clampMaxSignal(
    toNumber((colorMeta as any).maximum)
      ?? toNumber((metadata as any)?.color?.maximum)
      ?? toNumber((metadata as any)?.raw?.maximum)
      ?? toNumber((metadata as any)?.sizes?.maximum)
      ?? 65535,
  )

  if (!blackLevel && !whiteBalance && !matrix) {
    return undefined
  }

  const report: RawColorScienceReport = {
    applied: false,
    blackLevel: blackLevel?.slice(),
    whiteBalance: whiteBalance?.slice(),
    matrix,
    maxSignal,
  }

  return {
    blackLevel: blackLevel ?? undefined,
    whiteBalance: whiteBalance ?? undefined,
    matrix,
    maxSignal,
    report,
  }
}

function applyColorScience(
  buffer: Uint16Array,
  channels: number,
  profile?: ColorScienceProfile,
): { buffer: Uint16Array; report?: RawColorScienceReport } {
  if (!profile) {
    return { buffer }
  }
  let working = buffer
  const report: RawColorScienceReport = { ...profile.report }
  const reportNotes: string[] = []
  let applied = false

  if (profile.blackLevel && profile.blackLevel.length) {
    working = applyBlackLevelInPlace(working, channels, profile.blackLevel)
    applied = true
    reportNotes.push(`black level offsets ${formatArray(profile.blackLevel)}`)
  }

  if (profile.whiteBalance && profile.whiteBalance.length) {
    working = applyWhiteBalanceInPlace(working, channels, profile.whiteBalance, profile.maxSignal)
    applied = true
    reportNotes.push(`white balance multipliers ${formatArray(profile.whiteBalance)}`)
  }

  if (profile.matrix && profile.matrix.length && channels >= 3) {
    working = applyColorMatrix(working, channels, profile.matrix, profile.maxSignal)
    applied = true
    reportNotes.push('rgb_cam matrix applied')
  }

  report.applied = applied
  if (reportNotes.length) {
    report.notes = reportNotes
  }

  return { buffer: working, report }
}

function applyBlackLevelInPlace(buffer: Uint16Array, channels: number, blackLevel: number[]): Uint16Array {
  const total = buffer.length
  for (let index = 0; index < total; index += 1) {
    const channel = index % channels
    const offset = blackLevel[channel] ?? blackLevel[blackLevel.length - 1] ?? 0
    const value = buffer[index]
    buffer[index] = value > offset ? value - offset : 0
  }
  return buffer
}

function applyWhiteBalanceInPlace(
  buffer: Uint16Array,
  channels: number,
  multipliers: number[],
  maxSignal: number,
): Uint16Array {
  const total = buffer.length
  for (let index = 0; index < total; index += 1) {
    const channel = index % channels
    const gain = multipliers[channel] ?? 1
    const scaled = buffer[index] * gain
    buffer[index] = clampToUint16(scaled, maxSignal)
  }
  return buffer
}

function applyColorMatrix(
  buffer: Uint16Array,
  channels: number,
  matrix: number[][],
  maxSignal: number,
): Uint16Array {
  const rows = Math.min(matrix.length, channels)
  if (!rows) {
    return buffer
  }
  const stride = channels
  const result = new Uint16Array(buffer.length)
  const maxColumns = Math.max(...matrix.map((row) => row.length))
  for (let base = 0; base < buffer.length; base += stride) {
    const pixel: number[] = []
    for (let c = 0; c < channels; c += 1) {
      pixel[c] = buffer[base + c] ?? 0
    }
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = matrix[rowIndex]
      let sum = 0
      const limit = Math.min(row.length, maxColumns, channels)
      for (let column = 0; column < limit; column += 1) {
        sum += row[column] * (pixel[column] ?? 0)
      }
      result[base + rowIndex] = clampToUint16(sum, maxSignal)
    }
    for (let channel = rows; channel < channels; channel += 1) {
      result[base + channel] = pixel[channel]
    }
  }
  return result
}

function firstNumberArray(candidates: unknown[]): number[] | undefined {
  for (const candidate of candidates) {
    const arr = toNumberArray(candidate)
    if (arr && arr.length) {
      return arr
    }
  }
  return undefined
}

function buildColorMatrix(values: number[] | undefined, channels: number): number[][] | undefined {
  if (!values || values.length === 0) {
    return undefined
  }
  const rows = 3
  const columns = Math.floor(values.length / rows)
  if (!columns) {
    return undefined
  }
  const matrix: number[][] = []
  for (let row = 0; row < rows; row += 1) {
    const offset = row * columns
    const slice = values.slice(offset, offset + columns)
    matrix.push(slice.slice(0, Math.max(channels, 1)))
  }
  return normalizeMatrixRows(matrix)
}

function normalizeMatrixRows(matrix: number[][]): number[][] {
  return matrix.map((row) => {
    const magnitude = row.reduce((acc, value) => acc + Math.abs(value), 0)
    const scale = magnitude > 0 ? 1 / magnitude : 1
    return row.map((value) => value * scale)
  })
}

function replicateToChannels(values: number[] | undefined, channels: number, fallback: number): number[] | undefined {
  if (!values || channels <= 0) {
    return undefined
  }
  const result: number[] = []
  for (let i = 0; i < channels; i += 1) {
    const value = values[i] ?? values[values.length - 1] ?? fallback
    result.push(Number.isFinite(value) ? value : fallback)
  }
  return result
}

function normalizeGains(values: number[] | undefined): number[] | undefined {
  if (!values || values.length === 0) {
    return undefined
  }
  const positives = values.filter((value) => value > 0)
  const reference = positives.length
    ? positives.reduce((acc, value) => acc + value, 0) / positives.length
    : 1
  const safeReference = reference > 0 ? reference : 1
  return values.map((value) => (value > 0 ? value / safeReference : 1))
}

function clampMaxSignal(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 65535
  }
  return Math.max(256, Math.min(65535, Math.round(value)))
}

function clampToUint16(value: number, maxSignal: number): number {
  const max = clampMaxSignal(maxSignal)
  const clamped = Math.max(0, Math.min(max, value))
  return Math.round(clamped)
}

function formatArray(values: number[]): string {
  return values.map((value) => (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2))).join(', ')
}

function computeHistogram(data: Uint16Array, channels: number): RawHistogram {
  const channelBuckets: RawHistogramChannel[] = Array.from({ length: channels }, (_, index) => ({
    label: CHANNEL_LABELS[index] ?? `C${index + 1}`,
    values: Array(HISTOGRAM_BINS).fill(0),
  }))

  const pixels = Math.floor(data.length / channels)
  for (let i = 0; i < pixels; i += 1) {
    const base = i * channels
    for (let c = 0; c < channels; c += 1) {
      const value = data[base + c] >>> 8
      channelBuckets[c].values[value] += 1
    }
  }

  return {
    bins: HISTOGRAM_BINS,
    channels: channelBuckets,
  }
}

function decodeUtifPreview(source: Uint8Array, notes: string[]): { preview: RawPreviewMeta; histogram: RawHistogram } | undefined {
  try {
    const ifds = UTIF.decode(source)
    if (!ifds || ifds.length === 0) {
      return undefined
    }
    const primary = ifds[0]
    UTIF.decodeImage(source, primary)
    const rgba = UTIF.toRGBA8(primary)
    const { buffer16 } = coerceToUint16(rgba)
    const histogram = computeHistogram(buffer16, 4)
    const preview: RawPreviewMeta = {
      format: 'UTIF/JPEG Preview',
      width: Number((primary as any).width) || 0,
      height: Number((primary as any).height) || 0,
      bytes: rgba.byteLength,
    }
    return { preview, histogram }
  } catch (error) {
    notes.push(`UTIF preview decode failed: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

function buildArbitrationSummary(
  libRawHistogram: RawHistogram,
  utifHistogram: RawHistogram | undefined,
  vipsStatus: RawArbitrationEngineReport['status'],
  notes: string[],
): RawPipelineSummary['arbitration'] {
  const engines: RawArbitrationEngineReport[] = []
  engines.push({ id: 'libraw', status: 'ok', histogram: libRawHistogram })
  engines.push({ id: 'wasm-vips', status: vipsStatus, detail: vipsStatus === 'ok' ? undefined : 'wasm-vips unavailable' })

  const threshold = 0.3
  let varianceScore: number | undefined
  let winner: 'libraw' | 'wasm-vips' | 'utif-preview' = 'libraw'

  if (utifHistogram) {
    varianceScore = computeHistogramVariance(libRawHistogram, utifHistogram)
    const status = varianceScore < threshold ? 'rejected' : 'ok'
    engines.push({
      id: 'utif-preview',
      status,
      histogram: utifHistogram,
      detail: `variance=${varianceScore.toFixed(3)}`,
    })
    if (status === 'rejected') {
      winner = 'utif-preview'
      notes.push(`Arbitration: UTIF preview selected (variance ${varianceScore.toFixed(3)} below ${threshold.toFixed(2)})`)
    }
  } else {
    engines.push({ id: 'utif-preview', status: 'missing', detail: 'no embeddable preview located' })
  }

  return {
    winner,
    varianceScore,
    threshold,
    engines,
  }
}

function computeHistogramVariance(reference: RawHistogram, candidate: RawHistogram): number {
  const channels = Math.min(reference.channels.length, candidate.channels.length)
  if (channels === 0) {
    return 1
  }
  let diff = 0
  let total = 0
  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const refValues = reference.channels[channelIndex].values
    const candValues = candidate.channels[channelIndex].values
    const bins = Math.min(refValues.length, candValues.length)
    for (let i = 0; i < bins; i += 1) {
      const ref = refValues[i]
      const cand = candValues[i]
      diff += Math.abs(ref - cand)
      total += ref + cand
    }
  }
  if (total === 0) {
    return 1
  }
  const similarity = 1 - diff / total
  return Math.max(0, Math.min(1, similarity))
}

function terminateLibRaw(instance: { worker?: Worker } | null): void {
  try {
    instance?.worker?.terminate()
  } catch (error) {
    console.warn('[raw-worker] Failed to terminate LibRaw worker', error)
  }
}

function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return value instanceof Int8Array
    || value instanceof Uint8Array
    || value instanceof Uint8ClampedArray
    || value instanceof Int16Array
    || value instanceof Uint16Array
    || value instanceof Int32Array
    || value instanceof Uint32Array
    || value instanceof Float32Array
    || value instanceof Float64Array
    || value instanceof DataView
}

type NumericArrayBufferView =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array

function isNumericArrayBufferView(value: unknown): value is NumericArrayBufferView {
  return value instanceof Int8Array
    || value instanceof Uint8Array
    || value instanceof Uint8ClampedArray
    || value instanceof Int16Array
    || value instanceof Uint16Array
    || value instanceof Int32Array
    || value instanceof Uint32Array
    || value instanceof Float32Array
    || value instanceof Float64Array
}

function toNumberArray(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    const mapped = value
      .map((entry) => toNumber(entry))
      .filter((entry): entry is number => typeof entry === 'number')
    return mapped.length ? mapped : undefined
  }
  if (isNumericArrayBufferView(value)) {
    return Array.from(value as Iterable<number>)
  }
  if (typeof value === 'string') {
    const parts = value.split(/[ ,]+/)
    const mapped = parts
      .map((entry) => toNumber(entry))
      .filter((entry): entry is number => typeof entry === 'number')
    return mapped.length ? mapped : undefined
  }
  return undefined
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

let libRawCtorPromise: Promise<LibRawCtor> | null = null
let vipsInstancePromise: Promise<VipsNamespace> | null = null
