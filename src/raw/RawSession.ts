import { guessSignature } from './signatures'
import type { CFAPattern, RawProbeResult, RawSessionOptions, RawWorkerJob, RawWorkerJobPayload } from './types'
import { asciiFrom, createTraceToken, DEFAULT_HEADER_BYTES, digestHeader, sliceToUint8, toDataView } from './utils'

const RAW_FALLBACK_LABEL = 'Unknown RAW container'

const CFA_BY_VENDOR: Record<string, CFAPattern> = {
  Canon: 'RGGB',
  Nikon: 'RGGB',
  Sony: 'RGGB',
  Fujifilm: 'X-Trans',
  Panasonic: 'BGGR',
  Olympus: 'GRBG',
  Adobe: 'RGGB',
}

const CFA_BY_EXTENSION: Record<string, CFAPattern> = {
  raf: 'X-Trans',
  rw2: 'BGGR',
  orf: 'GRBG',
}

export class RawSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RawSessionError'
  }
}

export class RawSession {
  static async create(file: Blob, options?: RawSessionOptions): Promise<RawSession> {
    const session = new RawSession(file, options)
    await session.ensureProbe()
    return session
  }

  readonly firstRunId = createTraceToken()

  private headerBytes?: Uint8Array
  private probe?: RawProbeResult
  private backingBuffer?: ArrayBuffer
  private readonly logicalName: string
  private readonly headerBudget: number
  private extensionHint: string | null = null

  private constructor(private readonly source: Blob, options?: RawSessionOptions) {
    this.logicalName = options?.logicalName ?? RawSession.resolveName(source)
    this.headerBudget = options?.maxHeaderBytes ?? DEFAULT_HEADER_BYTES
  }

  get diagnostics(): RawProbeResult {
    if (!this.probe) {
      throw new RawSessionError('RawSession diagnostics requested before probe completed')
    }
    return this.probe
  }

  get bytes(): number {
    return this.source.size
  }

  get name(): string {
    return this.logicalName
  }

  async toWorkerPayload(): Promise<RawWorkerJobPayload> {
    await this.ensureProbe()
    const buffer = await this.materializeBuffer()
    const job: RawWorkerJob = {
      firstRunId: this.firstRunId,
      traceToken: createTraceToken(),
      logicalName: this.logicalName,
      diagnostics: this.diagnostics,
    }
    return {
      job,
      transferable: [buffer],
      buffers: [buffer],
    }
  }

  private async ensureProbe(): Promise<void> {
    if (this.probe) {
      return
    }
    const header = await this.readHeader()
    const ascii = asciiFrom(header, 256)
    const view = toDataView(header)

    const signature = guessSignature(view, ascii)
    const extension = this.extractExtension()
    const vendor = signature?.vendor ?? deduceVendor(extension)
    const colorFilterArray = signature?.cfa ?? deduceCfa(vendor, extension)
    const littleEndian = signature?.littleEndian ?? ascii.startsWith('II')

    this.probe = {
      formatLabel: signature?.label ?? RawSession.labelFromExtension(extension),
      mimeType: signature?.mimeType ?? 'image/x-raw',
      extensionHint: extension,
      littleEndian,
      vendorGuess: vendor,
      colorFilterArray,
      headerDigest: digestHeader(header),
      locator: signature ? `signature:${signature.label}` : `offset:0,len:${header.length}`,
    }
  }

  private async materializeBuffer(): Promise<ArrayBuffer> {
    if (!this.backingBuffer) {
      this.backingBuffer = await this.source.arrayBuffer()
    }
    return this.backingBuffer
  }

  private async readHeader(): Promise<Uint8Array> {
    if (!this.headerBytes) {
      this.headerBytes = await sliceToUint8(this.source, this.headerBudget)
    }
    return this.headerBytes
  }

  private extractExtension(): string | null {
    if (this.extensionHint) {
      return this.extensionHint
    }
    if (typeof File !== 'undefined' && this.source instanceof File && this.source.name.includes('.')) {
      const ext = this.source.name.split('.').pop()?.toLowerCase() ?? null
      this.extensionHint = ext
      return ext
    }
    return null
  }

  private static resolveName(source: Blob): string {
    if (typeof File !== 'undefined' && source instanceof File && source.name) {
      return source.name
    }
    return 'raw-input'
  }

  private static labelFromExtension(extension: string | null): string {
    if (!extension) {
      return RAW_FALLBACK_LABEL
    }
    return `${extension.toUpperCase()} (unverified)`
  }
}

function deduceVendor(extension: string | null): string | null {
  if (!extension) {
    return null
  }
  switch (extension) {
    case 'cr2':
    case 'cr3':
      return 'Canon'
    case 'nef':
      return 'Nikon'
    case 'arw':
    case 'srf':
    case 'sr2':
      return 'Sony'
    case 'raf':
      return 'Fujifilm'
    case 'rw2':
    case 'rwl':
      return 'Panasonic'
    case 'orf':
      return 'Olympus'
    case 'dng':
      return 'Adobe'
    default:
      return null
  }
}

function deduceCfa(vendor: string | null, extension: string | null): CFAPattern {
  if (vendor && CFA_BY_VENDOR[vendor]) {
    return CFA_BY_VENDOR[vendor]
  }
  if (extension && CFA_BY_EXTENSION[extension]) {
    return CFA_BY_EXTENSION[extension]
  }
  return 'Unknown'
}
