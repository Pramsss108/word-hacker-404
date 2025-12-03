import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Loader2, Shield, Upload, AlertOctagon, Download } from 'lucide-react'
import type { RawExportFormat, RawHistogram, RawWorkerResult, RawExportMetadata } from '../raw'
import { ingestRawBlob, RawExportService } from '../raw'
import { deriveExportMetadata } from '../raw/exportMetadata'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[exponent]}`
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0 ms'
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`
  }
  return `${(ms / 1000).toFixed(2)} s`
}

function formatNumberList(values?: number[]): string {
  if (!values || values.length === 0) {
    return '—'
  }
  return values
    .map((value) => {
      const abs = Math.abs(value)
      if (abs >= 100) return value.toFixed(0)
      if (abs >= 10) return value.toFixed(1)
      return value.toFixed(2)
    })
    .join(' / ')
}

const HISTOGRAM_COLORS = [
  { stroke: 'rgba(255,92,141,0.95)', fill: 'rgba(255,92,141,0.25)' },
  { stroke: 'rgba(10,255,106,0.9)', fill: 'rgba(10,255,106,0.18)' },
  { stroke: 'rgba(77,166,255,0.9)', fill: 'rgba(77,166,255,0.2)' },
  { stroke: 'rgba(233,238,246,0.85)', fill: 'rgba(233,238,246,0.12)' },
]

type ExportStatus = 'idle' | 'working' | 'ready' | 'error'

interface ExportEntry {
  status: ExportStatus
  url?: string
  bytes?: number
  label?: string
  error?: string
  checksum?: string
}

interface ExportLogEntry {
  id: string
  format: RawExportFormat
  label: string
  bytes: number
  checksum?: string
  durationMs?: number
  timestamp: string
}

const EXPORT_LOG_STORAGE_KEY = 'rawDock.exportLog.v1'
const EXPORT_LOG_LIMIT = 8

const EXPORT_TARGETS: Array<{ id: RawExportFormat; label: string; detail: string }> = [
  { id: 'tiff16', label: 'TIFF 16-bit', detail: 'LZW compressed archive' },
  { id: 'png16', label: 'PNG 16-bit', detail: 'Lossless glass' },
  { id: 'jpegxl', label: 'JPEG XL', detail: 'Delivery ready' },
  { id: 'jpeg-preview', label: 'JPEG Preview', detail: 'Downscaled diagnostic' },
]

function createInitialExportState(): Record<RawExportFormat, ExportEntry> {
  return {
    'tiff16': { status: 'idle' },
    'png16': { status: 'idle' },
    'jpegxl': { status: 'idle' },
    'jpeg-preview': { status: 'idle' },
  }
}

function buildExportFilename(base: string, format: RawExportFormat): string {
  const safeBase = base || 'raw-export'
  switch (format) {
    case 'png16':
      return `${safeBase}.png`
    case 'jpegxl':
      return `${safeBase}.jxl`
    case 'jpeg-preview':
      return `${safeBase}.jpg`
    case 'tiff16':
    default:
      return `${safeBase}.tiff`
  }
}

function loadStoredExportLog(): ExportLogEntry[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(EXPORT_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.slice(0, EXPORT_LOG_LIMIT)
    }
  } catch (error) {
    console.warn('[RawDiagnosticsPanel] Failed to parse export log', error)
  }
  return []
}

function persistExportLog(entries: ExportLogEntry[]): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(EXPORT_LOG_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.warn('[RawDiagnosticsPanel] Failed to persist export log', error)
  }
}

function formatLogTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function createLogEntry(params: {
  format: RawExportFormat
  label: string
  bytes: number
  checksum?: string
  durationMs?: number
}): ExportLogEntry {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    id,
    timestamp: new Date().toISOString(),
    ...params,
  }
}

export default function RawDiagnosticsPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RawWorkerResult | null>(null)
  const [logicalName, setLogicalName] = useState('')
  const exporterRef = useRef<RawExportService | null>(null)
  const exportUrlsRef = useRef<string[]>([])
  const [exportState, setExportState] = useState<Record<RawExportFormat, ExportEntry>>(createInitialExportState)
  const [previewQuality, setPreviewQuality] = useState(85)
  const [exportLog, setExportLog] = useState<ExportLogEntry[]>(loadStoredExportLog)

  const handleChoose = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    const file = files[0]
    setError(null)
    setBusy(true)
    setResult(null)
    setLogicalName(file.name)
    try {
      const next = await ingestRawBlob(file, { logicalName: file.name })
      setResult(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown ingest failure')
    } finally {
      setBusy(false)
    }
  }, [])

  const onDrop = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault()
    handleFiles(event.dataTransfer.files)
  }, [handleFiles])

  const flushExportUrls = useCallback(() => {
    exportUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    exportUrlsRef.current = []
  }, [])

  const appendExportLog = useCallback((entry: ExportLogEntry) => {
    setExportLog((prev) => {
      const next = [entry, ...prev].slice(0, EXPORT_LOG_LIMIT)
      persistExportLog(next)
      return next
    })
  }, [])

  useEffect(() => {
    exporterRef.current = RawExportService.getInstance()
    return () => {
      flushExportUrls()
    }
  }, [flushExportUrls])

  useEffect(() => {
    flushExportUrls()
    setExportState(createInitialExportState())
  }, [flushExportUrls, result?.traceToken])

  useEffect(() => {
    if (!result?.pipelineBuffer) {
      return
    }
    setExportState((prev) => {
      const next = { ...prev }
      const entry = next['jpeg-preview']
      if (entry?.url) {
        URL.revokeObjectURL(entry.url)
        exportUrlsRef.current = exportUrlsRef.current.filter((candidate) => candidate !== entry.url)
      }
      next['jpeg-preview'] = { status: 'idle' }
      return next
    })
  }, [previewQuality, result?.pipelineBuffer])

  const downloadBase = useMemo(() => {
    const source = logicalName || result?.logicalName || 'raw-decode'
    return source.replace(/[^a-z0-9-_]+/gi, '_').replace(/_{2,}/g, '_').toLowerCase()
  }, [logicalName, result?.logicalName])

  const exportMetadata = useMemo<RawExportMetadata | undefined>(() => {
    if (!result?.pipeline) {
      return undefined
    }
    return deriveExportMetadata(result.pipeline, result.logicalName || logicalName)
  }, [logicalName, result?.logicalName, result?.pipeline])

  const handleExport = useCallback(async (target: RawExportFormat) => {
    if (!result?.pipeline || !result.pipelineBuffer) {
      return
    }
    const exporter = exporterRef.current ?? RawExportService.getInstance()
    exporterRef.current = exporter
    setExportState((prev) => ({
      ...prev,
      [target]: { status: 'working' },
    }))
    try {
      const artifact = await exporter.export(
        {
          buffer: result.pipelineBuffer,
          width: result.pipeline.dimensions.width,
          height: result.pipeline.dimensions.height,
          channels: result.pipeline.channels,
          bitDepth: result.pipeline.bitDepth,
          metadata: exportMetadata,
        },
        target,
        target === 'jpeg-preview' ? { previewQuality: previewQuality / 100 } : undefined,
      )
      setExportState((prev) => {
        const next = { ...prev }
        const existing = next[target]
        if (existing?.url) {
          URL.revokeObjectURL(existing.url)
          exportUrlsRef.current = exportUrlsRef.current.filter((candidate) => candidate !== existing.url)
        }
        const url = URL.createObjectURL(artifact.blob)
        exportUrlsRef.current.push(url)
        next[target] = {
          status: 'ready',
          url,
          bytes: artifact.bytes,
          label: artifact.label,
          checksum: artifact.checksum,
        }
        return next
      })
      appendExportLog(createLogEntry({
        format: target,
        label: artifact.label,
        bytes: artifact.bytes,
        checksum: artifact.checksum,
        durationMs: artifact.durationMs,
      }))
    } catch (err) {
      setExportState((prev) => ({
        ...prev,
        [target]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Export failed',
        },
      }))
    }
  }, [appendExportLog, exportMetadata, previewQuality, result])

  return (
    <section className="raw-diagnostics glass" aria-live="polite">
      <header className="raw-diag-head">
        <Shield size={18} aria-hidden />
        <div>
          <p className="mono" style={{ fontSize: '0.65rem', letterSpacing: '0.25em', margin: 0 }}>RAW DOCK</p>
          <h2>Lossless Intake</h2>
        </div>
        <button className="btn ghost small" onClick={handleChoose} disabled={busy}>
          <Upload size={14} /> Select RAW
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".cr2,.cr3,.nef,.arw,.raf,.dng,.orf,.rw2,.3fr,.fff,.raw,.rwl,.pef"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </header>

      <div className={`raw-drop ${busy ? 'raw-drop-busy' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        {busy ? (
          <span><Loader2 className="spin" size={18} aria-hidden /> Probing…</span>
        ) : (
          <span>Drop RAW file here • first-attempt ingest</span>
        )}
      </div>

      {error && (
        <div className="raw-alert" role="alert">
          <AlertTriangle size={14} aria-hidden /> {error}
        </div>
      )}

      {result && (
        <div className="raw-diag-grid">
          <div>
            <p className="label">Logical name</p>
            <p className="value mono">{logicalName || result.logicalName}</p>
          </div>
          <div>
            <p className="label">Format</p>
            <p className="value">{result.diagnostics.formatLabel}</p>
          </div>
          <div>
            <p className="label">Vendor</p>
            <p className="value">{result.diagnostics.vendorGuess ?? 'Unknown'}</p>
          </div>
          <div>
            <p className="label">CFA</p>
            <p className="value mono">{result.diagnostics.colorFilterArray}</p>
          </div>
          <div>
            <p className="label">Endianness</p>
            <p className="value mono">{result.diagnostics.littleEndian ? 'Little' : 'Big'}</p>
          </div>
          <div>
            <p className="label">Header digest</p>
            <p className="value mono">{result.diagnostics.headerDigest}</p>
          </div>
          <div>
            <p className="label">Payload</p>
            <p className="value mono">{formatBytes(result.receivedBytes)}</p>
          </div>
          <div>
            <p className="label">Turnaround</p>
            <p className="value mono">{formatMs(result.elapsedMs)}</p>
          </div>
          <div className="status-pill">
            {result.status === 'completed' ? (
              <><CheckCircle2 size={14} aria-hidden /> Completed</>
            ) : result.status === 'failed' ? (
              <><AlertOctagon size={14} aria-hidden /> Failed</>
            ) : (
              <><Activity size={14} aria-hidden /> {result.status}</>
            )}
          </div>
        </div>
      )}

      {result?.pipeline && (
        <div className="raw-pipeline-card">
          <div className="raw-pipeline-grid">
            <div>
              <p className="label">Resolution</p>
              <p className="value mono">
                {result.pipeline.dimensions.width}×{result.pipeline.dimensions.height}
              </p>
            </div>
            <div>
              <p className="label">Bit depth</p>
              <p className="value mono">{result.pipeline.bitDepth}-bit</p>
            </div>
            <div>
              <p className="label">Channels</p>
              <p className="value mono">{result.pipeline.channels}</p>
            </div>
            {result.pipeline.preview && (
              <div>
                <p className="label">Preview</p>
                <p className="value mono">{result.pipeline.preview.width}×{result.pipeline.preview.height}</p>
                <small className="mono muted">{result.pipeline.preview.format}</small>
              </div>
            )}
          </div>

          {result.pipeline.histogram && (
            <HistogramOverlay histogram={result.pipeline.histogram} />
          )}

          {result.pipeline.colorScience && (
            <div className="raw-color-science">
              <div>
                <p className="label">Black level</p>
                <p className="value mono">{formatNumberList(result.pipeline.colorScience.blackLevel)}</p>
              </div>
              <div>
                <p className="label">WB multipliers</p>
                <p className="value mono">{formatNumberList(result.pipeline.colorScience.whiteBalance)}</p>
              </div>
              {typeof result.pipeline.colorScience.maxSignal === 'number' && (
                <div>
                  <p className="label">Max signal</p>
                  <p className="value mono">{result.pipeline.colorScience.maxSignal}</p>
                </div>
              )}
              <div className="raw-color-chip">
                <span className={`badge ${result.pipeline.colorScience.applied ? 'engine-ok' : 'engine-missing'}`}>
                  {result.pipeline.colorScience.applied ? 'calibrated' : 'metadata only'}
                </span>
              </div>
              {result.pipeline.colorScience.notes && (
                <ul className="raw-color-notes">
                  {result.pipeline.colorScience.notes.map((line, idx) => (
                    <li key={`${line}-${idx}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.pipelineBuffer && (
            <div className="raw-exporter">
              <div className="raw-export-head">
                <div>
                  <p className="label">Exports</p>
                  <p className="value mono">16-bit core sealed</p>
                </div>
                <label className="raw-export-quality">
                  <span>Preview quality</span>
                  <input
                    type="range"
                    min={60}
                    max={95}
                    value={previewQuality}
                    onChange={(event) => setPreviewQuality(Number(event.target.value))}
                  />
                  <span className="mono">{previewQuality}%</span>
                </label>
              </div>
              <div className="raw-export-grid">
                {EXPORT_TARGETS.map((target) => {
                  const entry = exportState[target.id]
                  const working = entry?.status === 'working'
                  const buttonLabel = working ? 'Building…' : entry?.status === 'ready' ? 'Rebuild' : 'Build lossless'
                  return (
                    <div key={target.id} className="raw-export-card">
                      <div>
                        <p className="label">{target.label}</p>
                        <p className="value mono">{target.detail}</p>
                      </div>
                      <button
                        className="btn ghost small"
                        onClick={() => handleExport(target.id)}
                        disabled={working || !result.pipelineBuffer}
                      >
                        {buttonLabel}
                      </button>
                      {entry?.bytes && (
                        <p className="raw-export-meta mono">
                          {formatBytes(entry.bytes)}{entry.checksum ? ` · ${entry.checksum.slice(0, 16)}…` : ''}
                        </p>
                      )}
                      {entry?.status === 'ready' && entry.url && (
                        <a
                          className="raw-export-download"
                          href={entry.url}
                          download={buildExportFilename(downloadBase, target.id)}
                        >
                          <Download size={14} aria-hidden /> Download · {formatBytes(entry.bytes ?? 0)}
                        </a>
                      )}
                      {entry?.status === 'error' && (
                        <p className="raw-export-error">{entry.error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              <small className="mono muted">Slider only touches JPEG preview; TIFF/PNG/JPEG XL stay at full 16-bit.</small>
              {exportLog.length > 0 && (
                <div className="raw-export-log">
                  <header>
                    <span>Diagnostics log</span>
                    <span className="mono">latest {exportLog.length}/{EXPORT_LOG_LIMIT}</span>
                  </header>
                  <ul>
                    {exportLog.map((entry) => (
                      <li key={entry.id}>
                        <span><strong>{entry.format}</strong> · {entry.label}</span>
                        <span>
                          {formatBytes(entry.bytes)}
                          {entry.checksum ? ` · ${entry.checksum.slice(0, 12)}…` : ''}
                        </span>
                        <span>
                          {formatLogTimestamp(entry.timestamp)}
                          {typeof entry.durationMs === 'number' ? ` · ${formatMs(entry.durationMs)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result.pipeline.arbitration && (
            <div className="raw-arbitration">
              <div>
                <p className="label">Engine winner</p>
                <p className="value mono">{result.pipeline.arbitration.winner}</p>
              </div>
              <div className="raw-arb-engines">
                {result.pipeline.arbitration.engines.map((engine) => (
                  <span key={engine.id} className={`badge engine-${engine.status}`}>
                    {engine.id} · {engine.status}
                  </span>
                ))}
              </div>
              {typeof result.pipeline.arbitration.varianceScore === 'number' && (
                <small className="mono muted">
                  variance {Math.round(result.pipeline.arbitration.varianceScore * 100)}% · threshold {Math.round(result.pipeline.arbitration.threshold * 100)}%
                </small>
              )}
            </div>
          )}
        </div>
      )}

      {result?.notes && result.notes.length > 0 && (
        <ul className="raw-notes">
          {result.notes.map((line, idx) => (
            <li key={`${line}-${idx}`}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HistogramOverlay({ histogram }: { histogram: RawHistogram }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(0, 0, width, height)

    const maxValue = histogram.channels.reduce((max, channel) => {
      const channelMax = channel.values.reduce((acc, value) => (value > acc ? value : acc), 0)
      return channelMax > max ? channelMax : max
    }, 0)

    histogram.channels.forEach((channel, index) => {
      const palette = HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]
      ctx.beginPath()
      ctx.moveTo(0, height)
      const bins = channel.values.length
      const denom = Math.max(1, bins - 1)
      for (let bin = 0; bin < bins; bin += 1) {
        const value = channel.values[bin] ?? 0
        const ratio = maxValue > 0 ? value / maxValue : 0
        const x = (bin / denom) * width
        const y = height - ratio * height
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = palette.fill
      ctx.strokeStyle = palette.stroke
      ctx.lineWidth = 1
      ctx.fill()
      ctx.stroke()
    })
  }, [histogram])

  return (
    <div className="raw-histogram-card">
      <div className="raw-hist-head">
        <p className="label">QA Histogram</p>
        <span className="mono muted">{histogram.channels.map((channel) => channel.label).join(' · ')}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="raw-hist-canvas"
        width={320}
        height={110}
        role="img"
        aria-label="Histogram overlay"
      />
      <div className="raw-hist-legend">
        {histogram.channels.map((channel, index) => {
          const palette = HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]
          return (
            <span
              key={`${channel.label}-${index}`}
              className="hist-chip"
              style={{ borderColor: palette.stroke, color: palette.stroke }}
            >
              {channel.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
