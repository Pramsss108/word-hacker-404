import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from 'react'
import { ArrowLeft, Download, ChevronDown, Check, RotateCw, RotateCcw, RefreshCw, Crop as CropIcon } from 'lucide-react'
// @ts-ignore
import * as UTIF from 'utif'
import FileUploader from './FileUploader'
import { type RawMetadata } from '../services/librawService'
import { getWorkerPool } from '../workers/workerPool'
import { encodeRGBA16, type EncodeOptions } from '../services/encoderService'
import { downloadFile, generateFilename } from '../services/downloadService'
import { applyCropAndRotate, type RotationAngle } from '../services/transformService'
import { rawJpegExtractor } from '../services/rawJpegExtractor'
import {
  detectDeviceCapabilities,
  calculateMemoryPlan,
  type MemoryPlan,
  formatMemory,
  type DeviceCapabilities,
  type CapabilityOverrides
} from '../services/deviceCapabilityService'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type ConversionMode = 'fast-preview' | 'full-raw'
type ExportFormat = 'png-16' | 'tiff-16' | 'webp-lossless' | 'avif' | 'png-8' | 'jpeg'

interface SelectFieldOption<T extends string> {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

interface SelectFieldProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<SelectFieldOption<T>>
}

type OrientationValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const getOrientationValue = (ifd: any): OrientationValue | null => {
  const raw = ifd?.Orientation ?? ifd?.orientation ?? ifd?.t274
  if (Array.isArray(raw)) {
    return getOrientationValue({ Orientation: raw[0] })
  }
  const numeric = Number(raw)
  if (numeric >= 1 && numeric <= 8) return numeric as OrientationValue
  return null
}

const transformOrientation = (rgba: Uint8Array, width: number, height: number, orientation: OrientationValue | null) => {
  if (!orientation || orientation === 1) {
    return { data: rgba, width, height }
  }

  const swap = orientation >= 5 && orientation <= 8
  const targetWidth = swap ? height : width
  const targetHeight = swap ? width : height
  const rotated = new Uint8Array(targetWidth * targetHeight * 4)

  const setPixel = (destX: number, destY: number, srcIndex: number) => {
    const destIndex = (destY * targetWidth + destX) * 4
    rotated[destIndex] = rgba[srcIndex]
    rotated[destIndex + 1] = rgba[srcIndex + 1]
    rotated[destIndex + 2] = rgba[srcIndex + 2]
    rotated[destIndex + 3] = rgba[srcIndex + 3]
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      let destX = x
      let destY = y

      switch (orientation) {
        case 2: // Mirror horizontal
          destX = width - 1 - x
          break
        case 3: // Rotate 180
          destX = width - 1 - x
          destY = height - 1 - y
          break
        case 4: // Mirror vertical
          destY = height - 1 - y
          break
        case 5: // Mirror horizontal + rotate 90 CW (transpose)
          destX = y
          destY = x
          break
        case 6: // Rotate 90 CW
          destX = height - 1 - y
          destY = x
          break
        case 7: // Mirror horizontal + rotate 90 CCW
          destX = height - 1 - y
          destY = width - 1 - x
          break
        case 8: // Rotate 90 CCW
          destX = y
          destY = width - 1 - x
          break
        default:
          break
      }

      setPixel(destX, destY, srcIndex)
    }
  }

  return { data: rotated, width: targetWidth, height: targetHeight }
}

function SelectField<T extends string>({ value, onChange, options }: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const current = options.find(option => option.value === value)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={`custom-select ${open ? 'open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="select-value">{current?.label ?? 'Select option'}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <ul className="select-menu" role="listbox">
          {options.map(option => (
            <li key={option.value}>
              <button
                type="button"
                className={`select-option ${option.value === value ? 'active' : ''} ${option.disabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (option.disabled) return
                  onChange(option.value)
                  setOpen(false)
                }}
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
              >
                <div className="option-labels">
                  <span>{option.label}</span>
                  {option.description && <small>{option.description}</small>}
                </div>
                {option.value === value && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface RawImageConverterProps {
  onBack: () => void
}

function RawImageConverter({ onBack }: RawImageConverterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ConversionMode>('fast-preview')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png-16')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canRunFullRaw, setCanRunFullRaw] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [fullRawProgress, setFullRawProgress] = useState<string>('')
  const [rawMetadata, setRawMetadata] = useState<RawMetadata | null>(null)
  const [rawRgbBuffer, setRawRgbBuffer] = useState<Uint16Array | null>(null)
  const [canExport, setCanExport] = useState(false)
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [memoryPlan, setMemoryPlan] = useState<MemoryPlan | null>(null)
  const [memoryOverride, setMemoryOverride] = useState<'auto' | '1.5' | '3' | '6'>('auto')
  const [isCapabilityScanning, setIsCapabilityScanning] = useState(true)
  const [isCapabilityModalOpen, setIsCapabilityModalOpen] = useState(true)
  const [hasAcknowledgedCapabilities, setHasAcknowledgedCapabilities] = useState(false)
  const [isMockRawPipeline, setIsMockRawPipeline] = useState(false)
  
  // PHRASE 13: Editor state
  const [crop, setCrop] = useState<Crop | undefined>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>()
  const [rotation, setRotation] = useState<RotationAngle>(0)
  const [showCropTool, setShowCropTool] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined)
  const [hasUnappliedEdits, setHasUnappliedEdits] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const effectiveDeviceMemory = capabilities?.deviceMemory ?? (memoryOverride === 'auto' ? null : Number(memoryOverride))

  const handleCapabilityScan = useCallback(async (overrides?: CapabilityOverrides) => {
    try {
      setIsCapabilityScanning(true)
      const detected = await detectDeviceCapabilities(overrides)
      setCapabilities(detected)
    } catch (scanError) {
      console.error('[Capabilities] Scan failed:', scanError)
    } finally {
      setIsCapabilityScanning(false)
    }
  }, [])

  useEffect(() => {
    const overrides = memoryOverride === 'auto' ? undefined : { deviceMemory: Number(memoryOverride) }
    handleCapabilityScan(overrides)
  }, [memoryOverride, handleCapabilityScan])

  const capabilityRecommendation = useMemo(() => {
    if (isCapabilityScanning) {
      return 'Scanning device capabilities... this takes less than a second.'
    }
    if (!capabilities) {
      return 'Capability scan unavailable — defaulting to safe preview pipeline.'
    }
    if (memoryPlan?.tier === 'preview-only' || capabilities.memoryTier === 'preview-only') {
      return 'Memory guard enabled → stay on Fast Preview / embedded JPEG.'
    }
    if (memoryPlan?.tier === 'reduced-resolution') {
      const pct = memoryPlan.downscaleFactor ? Math.round(memoryPlan.downscaleFactor * 100) : 70
      return `Auto-downscaling to ${pct}% keeps demosaic stable.`
    }
    if (!capabilities.webgl2) {
      return 'WebGL2 missing — previews fall back to CPU, but exports stay 16-bit.'
    }
    if (!capabilities.sharedArrayBuffer) {
      return 'SharedArrayBuffer blocked — worker pool uses copy mode (slower).' 
    }
    return 'All systems nominal — full RAW worker pipeline ready.'
  }, [capabilities, memoryPlan, isCapabilityScanning])

  const capabilityChips = useMemo(() => {
    return [
      { label: 'Memory', value: capabilities ? formatMemory(capabilities.deviceMemory) : 'Detecting...', status: Boolean(capabilities?.deviceMemory) },
      { label: 'SharedArrayBuffer', value: capabilities ? (capabilities.sharedArrayBuffer ? 'enabled' : 'blocked') : 'pending', status: capabilities?.sharedArrayBuffer },
      { label: 'WebGL2', value: capabilities ? (capabilities.webgl2 ? 'ready' : 'fallback') : 'pending', status: capabilities?.webgl2 },
      { label: 'WebGPU', value: capabilities ? (capabilities.webgpu ? 'ready' : 'fallback') : 'pending', status: capabilities?.webgpu },
      { label: 'WebCodecs', value: capabilities ? (capabilities.webCodecs ? 'ready' : 'fallback') : 'pending', status: capabilities?.webCodecs }
    ]
  }, [capabilities])

  const planTier = memoryPlan?.tier ?? capabilities?.memoryTier ?? 'unknown'
  const memoryPlanSummary = memoryPlan?.reason ?? (
    capabilities
      ? capabilities.memoryTier === 'preview-only'
        ? 'Device memory <2GB — stick to Fast Preview.'
        : 'Full decode unlocked once RAW metadata is known.'
      : 'Capability scan pending.'
  )

  const handleCapabilityModalContinue = () => {
    if (!hasAcknowledgedCapabilities) {
      setHasAcknowledgedCapabilities(true)
    }
    setIsCapabilityModalOpen(false)
  }

  const handleMemoryOverrideChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setMemoryOverride(event.target.value as 'auto' | '1.5' | '3' | '6')
  }
  
  const isWorkspaceReady = Boolean(file)
  const stageState = isWorkspaceReady ? 'preview' : hasAcknowledgedCapabilities ? 'upload' : 'intro'

  const fullRawDisabled = capabilities?.memoryTier === 'preview-only' || memoryPlan?.tier === 'preview-only'
  const modeOptions: Array<SelectFieldOption<ConversionMode>> = [
    { value: 'fast-preview', label: 'Fast Preview (Embedded JPEG)' },
    {
      value: 'full-raw',
      label: 'Full RAW Decode (16-bit)',
      description: fullRawDisabled
        ? 'Requires ≥2GB memory'
        : memoryPlan?.tier === 'reduced-resolution'
          ? 'Auto-downscale enabled'
          : undefined,
      disabled: Boolean(fullRawDisabled)
    }
  ]

  useEffect(() => {
    if (fullRawDisabled && mode === 'full-raw') {
      setMode('fast-preview')
    }
  }, [fullRawDisabled, mode])
  const exportOptions: Array<SelectFieldOption<ExportFormat>> = [
    { value: 'png-16', label: '16-bit PNG' },
    { value: 'tiff-16', label: '16-bit TIFF' },
    { value: 'webp-lossless', label: 'Lossless WebP' },
    { value: 'avif', label: 'AVIF' },
    { value: 'png-8', label: '8-bit PNG' },
    { value: 'jpeg', label: 'JPEG' }
  ]

  const renderPreviewFromRGBA = async (rgba: Uint8Array, width: number, height: number): Promise<string> => {
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height)
      const ctx = offscreen.getContext('2d')
      if (!ctx) {
        throw new Error('PREVIEW_CANVAS_CONTEXT')
      }
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(rgba)
      ctx.putImageData(imageData, 0, 0)
      const blob = await offscreen.convertToBlob({ type: 'image/png' })
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      return dataUrl
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('PREVIEW_CANVAS_CONTEXT')
    }
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(rgba)
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  }

  const runFastPreview = async (targetFile: File) => {
    const buffer = await targetFile.arrayBuffer()
    
    // Try improved JPEG extraction first (full-color, high-res)
    try {
      console.log('Attempting improved color extraction...')
      const result = await rawJpegExtractor.extractBestImage(buffer)
      
      console.log(`Extracted ${result.source}: ${result.width}x${result.height}, color: ${result.isColor}`)
      
      // Convert Uint8ClampedArray to Uint8Array for compatibility
      const rgbaData = new Uint8Array(result.imageData)
      
      const oriented = transformOrientation(
        rgbaData, 
        result.width, 
        result.height, 
        null // JPEG previews usually pre-rotated
      )
      
      const preview = await renderPreviewFromRGBA(oriented.data, oriented.width, oriented.height)
      setPreviewUrl(preview)
      setPreviewDimensions({ width: oriented.width, height: oriented.height })
      setError(null)
      setCanRunFullRaw(capabilities?.memoryTier !== 'preview-only')
      
      // Show info if we got color
      if (result.isColor && result.source === 'jpeg-preview') {
        console.log('✓ Full-color JPEG preview extracted successfully!')
      } else if (!result.isColor) {
        console.warn('⚠ Only grayscale data available in this RAW file')
      }
      
      return
    } catch (err) {
      console.warn('Improved extraction failed, falling back to UTIF:', err)
    }

    // Fallback to original UTIF logic
    let ifds
    try {
      ifds = UTIF.decode(buffer)
    } catch (err) {
      throw new Error(`UTIF_DECODE_FAIL: ${(err as Error).message}`)
    }

    if (!ifds || ifds.length === 0) {
      throw new Error('UTIF_PREVIEW_MISSING: no embedded previews found')
    }

    const numericValue = (value: any): number | undefined => {
      if (Array.isArray(value)) {
        return numericValue(value[0])
      }
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
    }

    const deriveDimension = (ifd: any, keys: string[]): number | undefined => {
      for (const key of keys) {
        if (typeof ifd[key] !== 'undefined') {
          const maybe = numericValue(ifd[key])
          if (maybe) return maybe
        }
      }
      return undefined
    }

    const widthKeys = ['width', 'ImageWidth', 'imageWidth', 't256']
    const heightKeys = ['height', 'ImageLength', 'imageLength', 't257']

    type IfdCandidate = { ifd: any; width: number; height: number; decoded: boolean }

    const collectCandidates = (decodeForDims: boolean): IfdCandidate[] => {
      return ifds
        .map((ifd: any) => {
          let width = deriveDimension(ifd, widthKeys)
          let height = deriveDimension(ifd, heightKeys)
          let decoded = false

          if (decodeForDims && (!width || !height)) {
            try {
              UTIF.decodeImage(buffer, ifd)
              decoded = true
              width = deriveDimension(ifd, widthKeys)
              height = deriveDimension(ifd, heightKeys)
            } catch (err) {
              console.warn('UTIF decodeImage failed while deriving dimensions', err)
              return null
            }
          }

          if (width && height) {
            return { ifd, width, height, decoded }
          }
          return null
        })
        .filter(Boolean) as IfdCandidate[]
    }

    let candidates = collectCandidates(false)

    if (!candidates.length) {
      console.warn('UTIF decode returned IFDs without width/height metadata; retrying with decode pass')
      candidates = collectCandidates(true)
    }

    if (!candidates.length) {
      throw new Error('UTIF_PREVIEW_INVALID: missing dimensions')
    }

    const bestCandidate = candidates.reduce((best, current) => {
      const bestArea = best.width * best.height
      const currentArea = current.width * current.height
      return currentArea > bestArea ? current : best
    })

    if (!bestCandidate.decoded) {
      try {
        UTIF.decodeImage(buffer, bestCandidate.ifd)
      } catch (err) {
        throw new Error(`UTIF_DECODE_IMAGE_FAIL: ${(err as Error).message}`)
      }
    }

    let rgba: Uint8Array
    try {
      rgba = UTIF.toRGBA8(bestCandidate.ifd)
    } catch (err) {
      throw new Error(`UTIF_RGBA_FAIL: ${(err as Error).message}`)
    }

    const orientation = getOrientationValue(bestCandidate.ifd)
    const oriented = transformOrientation(rgba, bestCandidate.width, bestCandidate.height, orientation)

    const preview = await renderPreviewFromRGBA(oriented.data, oriented.width, oriented.height)
    setPreviewUrl(preview)
    setPreviewDimensions({ width: oriented.width, height: oriented.height })
    setError(null)
    setCanRunFullRaw(capabilities?.memoryTier !== 'preview-only')
  }

  const handleConvertRequest = async (incomingFile: File) => {
    setFile(incomingFile)
    setPreviewUrl(null)
    setIsProcessing(true)
    setError(null)
    setCanRunFullRaw(false)

    try {
      if (mode === 'fast-preview') {
        await runFastPreview(incomingFile)
      } else {
        setError('Full RAW processing not yet implemented. Use fast-preview or run manual decode.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown preview failure'
      setError(`Fast preview failed: ${message}`)
      setCanRunFullRaw(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const processImage = () => {
    if (!file) return
    if (mode === 'full-raw') {
      void handleRunFullRaw()
      return
    }
    handleConvertRequest(file)
  }

  const handleRunFullRaw = async () => {
    if (!file) return
    
  setCanRunFullRaw(false)
  setCanExport(false)
  setIsMockRawPipeline(false)
    setError(null)
    setIsProcessing(true)
    setFullRawProgress('Initializing worker pool...')

    try {
      // PHRASE 10: Initialize worker pool
      const pool = getWorkerPool()
      
      // PHRASE 6: Decode RAW file via worker
      setFullRawProgress('Decoding RAW sensor data (worker)...')
      const fileBuffer = await file.arrayBuffer()
      
      const decodeResponse = await pool.submitTask({
        id: crypto.randomUUID(),
        type: 'decode',
        payload: { fileBuffer }
      }, 10) // High priority

      if (!decodeResponse.success || !decodeResponse.result) {
        throw new Error(decodeResponse.error || 'Raw decode failed')
      }

      const { metadata, rawBuffer } = decodeResponse.result
      if (!metadata || !rawBuffer) {
        throw new Error('Missing decode result data')
      }
      setPreviewDimensions({ width: metadata.width, height: metadata.height })

      const plan = calculateMemoryPlan({
        deviceMemory: effectiveDeviceMemory,
        width: metadata.width,
        height: metadata.height
      })
      setMemoryPlan(plan)

      if (plan.tier === 'preview-only') {
        setError('Device memory guard prevented full decode. Stay on Fast Preview or simulate a higher tier to test.')
        setFullRawProgress('')
        return
      }

      console.log(`[FullRaw Worker] Decoded ${metadata.width}x${metadata.height}`)
      console.log(`[FullRaw Worker] CFA: ${metadata.cfaPattern}, Black: [${metadata.blackLevel?.join(',') || 'N/A'}]`)

      setFullRawProgress('Linearizing 16-bit sensor data...')
      const linearResponse = await pool.submitTask({
        id: crypto.randomUUID(),
        type: 'linearize',
        payload: {
          rawBuffer,
          metadata,
          options: { normalize: true }
        }
      }, 9)

      if (!linearResponse.success || !linearResponse.result?.linearBuffer) {
        throw new Error(linearResponse.error || 'Linearization failed')
      }

      const linearBuffer = linearResponse.result.linearBuffer

      setFullRawProgress(plan.tier === 'reduced-resolution'
        ? 'Demosaicing with memory-safe downscale...'
        : 'Demosaicing full resolution...')

      const demosaicResponse = await pool.submitTask({
        id: crypto.randomUUID(),
        type: 'demosaic',
        payload: {
          rawBuffer: linearBuffer,
          metadata,
          options: {
            demosaicMethod: 'bilinear',
            downscaleFactor: plan.tier === 'reduced-resolution' ? plan.downscaleFactor : undefined,
            maxMegapixels: plan.maxMegapixels
          }
        }
      }, 8)

      if (!demosaicResponse.success || !demosaicResponse.result?.rgbBuffer) {
        throw new Error(demosaicResponse.error || 'Demosaic failed')
      }

      const rgbBuffer = demosaicResponse.result.rgbBuffer
      const dimensions = demosaicResponse.result.dimensions ?? { width: metadata.width, height: metadata.height }

      const finalMetadata: RawMetadata = {
        ...metadata,
        originalWidth: metadata.originalWidth ?? metadata.width,
        originalHeight: metadata.originalHeight ?? metadata.height,
        width: dimensions.width,
        height: dimensions.height,
        downscaleFactor: demosaicResponse.result.dimensions?.downscaleFactor
      }

      setRawMetadata(finalMetadata)
      setRawRgbBuffer(rgbBuffer)
      setIsMockRawPipeline(Boolean(finalMetadata.mockSource))
      setCanExport(true)

      // Convert 16-bit RGB → 8-bit RGBA for preview
      setFullRawProgress('Rendering preview...')
      const rgba8 = new Uint8Array(dimensions.width * dimensions.height * 4)
      for (let i = 0; i < dimensions.width * dimensions.height; i++) {
        rgba8[i * 4] = rgbBuffer[i * 3] / 256
        rgba8[i * 4 + 1] = rgbBuffer[i * 3 + 1] / 256
        rgba8[i * 4 + 2] = rgbBuffer[i * 3 + 2] / 256
        rgba8[i * 4 + 3] = 255
      }

      const previewDataUrl = await renderPreviewFromRGBA(rgba8, dimensions.width, dimensions.height)
      setPreviewUrl(previewDataUrl)
      setPreviewDimensions({ width: dimensions.width, height: dimensions.height })
      setFullRawProgress('')
      setError(null)

      console.log('[FullRaw Worker] Complete! Full 16-bit pipeline executed via workers.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown full-raw error'
      setError(`Full RAW decode failed: ${message}`)
      setFullRawProgress('')
      setCanExport(false)
      console.error('[FullRaw Worker] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // PHRASE 11+12+13: Export 16-bit image with transforms applied
  const handleExport = async () => {
    if (!rawRgbBuffer || !rawMetadata || !file) {
      setError('No processed RAW data available for export')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      let finalBuffer = rawRgbBuffer
      let finalWidth = rawMetadata.width
      let finalHeight = rawMetadata.height

      // PHRASE 13+14: Apply crop and rotation transforms
      if (completedCrop || rotation !== 0) {
        console.log('[Export] Applying transforms before encode...')
        
        const cropRect = completedCrop ? {
          x: Math.round(completedCrop.x),
          y: Math.round(completedCrop.y),
          width: Math.round(completedCrop.width),
          height: Math.round(completedCrop.height)
        } : null

        const transformResult = applyCropAndRotate(rawRgbBuffer, rawMetadata.width, rawMetadata.height, {
          crop: cropRect,
          rotation
        })

        finalBuffer = transformResult.buffer
        finalWidth = transformResult.width
        finalHeight = transformResult.height

        console.log(`[Export] Transformed: ${rawMetadata.width}x${rawMetadata.height} → ${finalWidth}x${finalHeight}`)
      }

      console.log(`[Export] Encoding ${finalWidth}x${finalHeight} as ${exportFormat}`)

      // Map export format (webp-lossless → webp)
      const encodeFormat = exportFormat === 'webp-lossless' ? 'webp' : exportFormat

      // PHRASE 11: Encode with 16-bit encoder
      const encodeOptions: EncodeOptions = {
        format: encodeFormat,
        quality: exportFormat === 'jpeg' ? 95 : undefined,
        metadata: {
          software: 'Word Hacker 404 RAW Converter',
          make: rawMetadata.make,
          model: rawMetadata.model
        }
      }

      const encodeResult = await encodeRGBA16(
        finalWidth,
        finalHeight,
        finalBuffer,
        encodeOptions
      )

      if (!encodeResult.success || !encodeResult.data) {
        throw new Error(encodeResult.error || 'Encoding failed')
      }

      // PHRASE 12: Download with filename preservation
      const filename = generateFilename(file.name, encodeFormat)
      
      await downloadFile({
        data: encodeResult.data,
        format: encodeFormat,
        originalFilename: file.name,
        metadata: {
          width: finalWidth,
          height: finalHeight
        }
      })

      console.log(`[Export] Downloaded: ${filename}`)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown export error'
      setError(`Export failed: ${message}`)
      console.error('[Export] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetStage = () => {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    setCanRunFullRaw(false)
    setCanExport(false)
    setRawRgbBuffer(null)
    setRawMetadata(null)
    setIsMockRawPipeline(false)
    setPreviewDimensions(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setRotation(0)
    setShowCropTool(false)
    setAspectRatio(undefined)
    setHasUnappliedEdits(false)
    setMemoryPlan(null)
  }

  // PHRASE 13: Editor control functions
  const handleRotateCW = () => {
    setRotation(prev => ((prev + 90) % 360) as RotationAngle)
    setHasUnappliedEdits(true)
  }

  const handleRotateCCW = () => {
    setRotation(prev => ((prev - 90 + 360) % 360) as RotationAngle)
    setHasUnappliedEdits(true)
  }

  const handleResetEdits = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setRotation(0)
    setShowCropTool(false)
    setAspectRatio(undefined)
    setHasUnappliedEdits(false)
    console.log('[Editor] Reset all edits')
  }

  const toggleCropTool = () => {
    setShowCropTool(prev => !prev)
    if (showCropTool) {
      // Turning off crop tool, clear crop
      setCrop(undefined)
      setCompletedCrop(undefined)
      setAspectRatio(undefined)
    }
  }

  const handleAspectRatioChange = (ratio: number | undefined) => {
    setAspectRatio(ratio)
    
    // Create initial centered crop when aspect ratio is selected
    if (ratio && imgRef.current && previewDimensions) {
      // CRITICAL FIX: Use naturalWidth/Height to get actual image dimensions
      // NOT the CSS-scaled display size!
      const imgWidth = imgRef.current.naturalWidth || previewDimensions.width
      const imgHeight = imgRef.current.naturalHeight || previewDimensions.height
      
      // For ReactCrop, we need to specify in terms of the DISPLAYED size
      const displayedWidth = imgRef.current.width
      const displayedHeight = imgRef.current.height
      
      console.log('[Aspect] Image natural size:', imgWidth, 'x', imgHeight)
      console.log('[Aspect] Image displayed size:', displayedWidth, 'x', displayedHeight)
      console.log('[Aspect] Preview dimensions:', previewDimensions)
      
      // Calculate crop size to fit 60% of ACTUAL image while maintaining aspect ratio
      let cropWidth = imgWidth * 0.6
      let cropHeight = cropWidth / ratio
      
      // If height exceeds image, recalculate based on height
      if (cropHeight > imgHeight * 0.6) {
        cropHeight = imgHeight * 0.6
        cropWidth = cropHeight * ratio
      }
      
      // Center the crop (in actual image coordinates)
      const x = (imgWidth - cropWidth) / 2
      const y = (imgHeight - cropHeight) / 2
      
      // Scale to displayed coordinates for ReactCrop
      const scaleX = displayedWidth / imgWidth
      const scaleY = displayedHeight / imgHeight
      
      const displayX = x * scaleX
      const displayY = y * scaleY
      const displayWidth = cropWidth * scaleX
      const displayHeight = cropHeight * scaleY
      
      console.log('[Aspect] Initial crop box (actual):', { x, y, width: cropWidth, height: cropHeight })
      console.log('[Aspect] Initial crop box (display):', { x: displayX, y: displayY, width: displayWidth, height: displayHeight })
      
      const newCrop: Crop = {
        unit: 'px',
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight
      }
      
      setCrop(newCrop)
      setCompletedCrop({
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight,
        unit: 'px'
      } as PixelCrop)
      setHasUnappliedEdits(true)
    } else {
      // Free aspect - clear crop
      setCrop(undefined)
      setCompletedCrop(undefined)
    }
  }

  const handleApplyEdits = async () => {
    if (!previewUrl || !imgRef.current) return

    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    const displayedWidth = rect.width || img.clientWidth || img.offsetWidth || previewDimensions?.width || 1
    const displayedHeight = rect.height || img.clientHeight || img.offsetHeight || previewDimensions?.height || 1

    try {

      // Load the original preview image to get its TRUE dimensions
      const sourceImg = new Image()
      sourceImg.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        sourceImg.onload = resolve
        sourceImg.onerror = reject
        sourceImg.src = previewUrl
      })

      console.log('[Editor] Source image loaded:', sourceImg.width, 'x', sourceImg.height)

      const sourceWidth = sourceImg.width
      const sourceHeight = sourceImg.height

      // STEP 1: Apply crop (based on unrotated image)
      let croppedCanvas: HTMLCanvasElement | null = null
      let croppedWidth = sourceWidth
      let croppedHeight = sourceHeight

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        console.log('[Editor] Crop debug:', {
          completedCrop,
          displayed: { width: displayedWidth, height: displayedHeight },
          source: { width: sourceWidth, height: sourceHeight }
        })

        const scaleX = sourceWidth / displayedWidth
        const scaleY = sourceHeight / displayedHeight

        const cropX = Math.max(0, completedCrop.x * scaleX)
        const cropY = Math.max(0, completedCrop.y * scaleY)
        const cropWidth = Math.min(completedCrop.width * scaleX, sourceWidth - cropX)
        const cropHeight = Math.min(completedCrop.height * scaleY, sourceHeight - cropY)

        console.log('[Editor] Cropping with scaled coords:', { cropX, cropY, cropWidth, cropHeight })

        croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = Math.max(1, Math.round(cropWidth))
        croppedCanvas.height = Math.max(1, Math.round(cropHeight))
        const cropCtx = croppedCanvas.getContext('2d')
        if (!cropCtx) return

        cropCtx.drawImage(
          sourceImg,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          croppedCanvas.width,
          croppedCanvas.height
        )

        croppedWidth = croppedCanvas.width
        croppedHeight = croppedCanvas.height

        console.log('[Editor] Cropped canvas size:', croppedWidth, 'x', croppedHeight)
      }

      const baseCanvas = (croppedCanvas ?? sourceImg) as CanvasImageSource

      // STEP 2: Apply rotation AFTER cropping so it matches user selection
      let finalCanvas: HTMLCanvasElement
      const rotateNeeded = rotation !== 0

      if (rotateNeeded) {
        const rotateSourceWidth = croppedCanvas ? croppedWidth : sourceWidth
        const rotateSourceHeight = croppedCanvas ? croppedHeight : sourceHeight

        finalCanvas = document.createElement('canvas')
        const rotateCtx = finalCanvas.getContext('2d')
        if (!rotateCtx) return

        if (rotation === 90 || rotation === 270) {
          finalCanvas.width = rotateSourceHeight
          finalCanvas.height = rotateSourceWidth
        } else {
          finalCanvas.width = rotateSourceWidth
          finalCanvas.height = rotateSourceHeight
        }

        rotateCtx.save()

        if (rotation === 90) {
          rotateCtx.translate(finalCanvas.width, 0)
          rotateCtx.rotate(Math.PI / 2)
        } else if (rotation === 180) {
          rotateCtx.translate(finalCanvas.width, finalCanvas.height)
          rotateCtx.rotate(Math.PI)
        } else if (rotation === 270) {
          rotateCtx.translate(0, finalCanvas.height)
          rotateCtx.rotate(-Math.PI / 2)
        }

  rotateCtx.drawImage(baseCanvas, 0, 0)
        rotateCtx.restore()
      } else {
        if (croppedCanvas) {
          finalCanvas = croppedCanvas
        } else {
          finalCanvas = document.createElement('canvas')
          finalCanvas.width = sourceWidth
          finalCanvas.height = sourceHeight
          const ctx = finalCanvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(sourceImg, 0, 0)
        }
      }

      console.log('[Editor] Final canvas:', finalCanvas.width, 'x', finalCanvas.height)

      const newPreviewUrl = finalCanvas.toDataURL('image/jpeg', 0.95)
      setPreviewUrl(newPreviewUrl)
      setPreviewDimensions({ width: finalCanvas.width, height: finalCanvas.height })
      setCrop(undefined)
      setCompletedCrop(undefined)
      setRotation(0)
      setAspectRatio(undefined)
      setHasUnappliedEdits(false)
      setShowCropTool(false)

      console.log('[Editor] Applied edits - new dimensions:', finalCanvas.width, 'x', finalCanvas.height)
    } catch (err) {
      console.error('[Editor] Failed to apply edits:', err)
      setError('Failed to apply edits to preview')
    }
  }

  // Aspect ratio presets
  const aspectRatioPresets = [
    { label: 'Free', value: undefined },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4/3 },
    { label: '3:4', value: 3/4 },
    { label: '16:9', value: 16/9 },
    { label: '9:16', value: 9/16 },
    { label: '3:2', value: 3/2 },
    { label: '2:3', value: 2/3 },
    { label: '21:9', value: 21/9 },
  ]


  return (
    <div className="app">
      <div className="sysbar">
        <div className="sys-item"><span className="dot" /> RAW CONVERTER</div>
        <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="sys-item mono">MODE: {mode.toUpperCase()}</div>
      </div>

      <main className="main container">
        <div className="raw-converter">
          <header className="tools-header">
            <button className="back-button" onClick={onBack}>
              <ArrowLeft size={18} /> Back to Tools
            </button>
            <h1 className="page-title">RAW Image Converter</h1>
            <p className="page-subtitle">Convert RAW images to standard formats with full bit-depth preservation</p>
          </header>

          <div className="device-awareness-chip glass">
            <div>
              <p className="mono label">Device Awareness</p>
              <p className="chip-summary">{isCapabilityScanning ? 'Scanning hardware…' : capabilityRecommendation}</p>
            </div>
            <button className="btn ghost tiny" onClick={() => setIsCapabilityModalOpen(true)}>
              View panel
            </button>
          </div>

          <div className={`stage-viewport ${stageState === 'intro' ? 'stage-locked' : ''}`}>
            <div className={`converter-stage stage-${stageState}`}>
              <section className="stage-panel stage-upload" aria-hidden={stageState !== 'upload'}>
                <div className="panel-inner">
                  <FileUploader onConvert={handleConvertRequest} />
                  <p className="mono stage-tip">Drop or browse RAWs to unlock the lab.</p>
                  <small className="stage-safe">Optimized for phones + desktops · Safe-area aware</small>
                </div>
              </section>

              <section className="stage-panel stage-workspace" aria-hidden={!isWorkspaceReady}>
                {isWorkspaceReady ? (
                  <div className="workspace">
                    {isMockRawPipeline && (
                      <section className="mock-warning glass" role="status" aria-live="polite">
                        <div>
                          <p className="mono label">Color fallback active</p>
                          <h4>Install LibRaw WASM to unlock true color.</h4>
                          <p>
                            The current preview is grayscale because the LibRaw decoder module isn't available in <code>/public/wasm</code>.
                            Drop the official <code>libraw.wasm</code> and its Emscripten loader file there, then restart the dev server.
                          </p>
                          <ol>
                            <li>Download or build LibRaw WASM (<code>libraw.wasm</code> + companion <code>libraw.js</code>).</li>
                            <li>Copy both files into <code>public/wasm/</code> inside this project.</li>
                            <li>Reload the app so the worker can load the real decoder.</li>
                          </ol>
                        </div>
                        <button
                          type="button"
                          className="btn ghost tiny"
                          onClick={() => window.open('https://github.com/Pramsss108/word-hacker-404#full-raw-color-setup', '_blank')}
                        >
                          View setup guide
                        </button>
                      </section>
                    )}
                    <div className="preview-section glass compact">
                      <div className="section-heading">
                        <h3>Preview</h3>
                        {file && <span className="mono file-pill">{file.name}</span>}
                      </div>
                      {previewUrl ? (
                        <>
                          <div className={`preview-wrapper ${showCropTool ? 'crop-active' : ''}`}>
                            {showCropTool && previewDimensions ? (
                              <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => {
                                  setCompletedCrop(c)
                                  setHasUnappliedEdits(true)
                                }}
                                aspect={aspectRatio}
                                keepSelection
                              >
                                <img 
                                  ref={imgRef}
                                  src={previewUrl} 
                                  alt="Converted preview" 
                                  className="preview-image preview-compact"
                                  style={{
                                    transform: 'none',
                                    transition: 'transform 0.3s ease'
                                  }}
                                />
                              </ReactCrop>
                            ) : (
                              <img 
                                ref={imgRef}
                                src={previewUrl} 
                                alt="Converted preview" 
                                className="preview-image preview-compact"
                                style={{
                                  transform: `rotate(${rotation}deg)`,
                                  transition: 'transform 0.3s ease'
                                }}
                              />
                            )}
                            <button 
                              className="preview-fullscreen-btn"
                              onClick={() => setIsFullscreenOpen(true)}
                              aria-label="View fullscreen"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                              </svg>
                            </button>
                          </div>

                          {/* PHRASE 13: Editor Tools */}
                          {previewDimensions && (
                            <div className="editor-tools-compact">
                              <div className="tools-row">
                                <button 
                                  className={`btn-tool ${showCropTool ? 'active' : ''}`}
                                  onClick={toggleCropTool}
                                  title="Toggle crop tool"
                                >
                                  <CropIcon size={16} /> Crop
                                </button>
                                <button 
                                  className="btn-tool"
                                  onClick={handleRotateCCW}
                                  title="Rotate 90° left"
                                >
                                  <RotateCcw size={16} />
                                </button>
                                <button 
                                  className="btn-tool"
                                  onClick={handleRotateCW}
                                  title="Rotate 90° right"
                                >
                                  <RotateCw size={16} />
                                </button>
                                <button 
                                  className="btn-tool"
                                  onClick={handleResetEdits}
                                  title="Reset all edits"
                                  disabled={!completedCrop && rotation === 0}
                                >
                                  <RefreshCw size={16} />
                                </button>
                                {hasUnappliedEdits && (
                                  <button 
                                    className="btn-tool btn-done"
                                    onClick={handleApplyEdits}
                                    title="Apply edits"
                                  >
                                    <Check size={16} /> Done
                                  </button>
                                )}
                              </div>

                              {/* Aspect Ratio Presets - Show when crop tool is active */}
                              {showCropTool && (
                                <div className="aspect-ratio-row">
                                  <span className="label-compact">Aspect:</span>
                                  {aspectRatioPresets.map((preset) => (
                                    <button
                                      key={preset.label}
                                      className={`btn-aspect ${aspectRatio === preset.value ? 'active' : ''}`}
                                      onClick={() => handleAspectRatioChange(preset.value)}
                                      title={`Crop to ${preset.label} ratio`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {(completedCrop || rotation !== 0) && (
                                <div className="editor-info-compact">
                                  {rotation !== 0 && (
                                    <span className="info-badge mono">Rotation: {rotation}°</span>
                                  )}
                                  {completedCrop && (
                                    <span className="info-badge mono">
                                      Crop: {Math.round(completedCrop.width)} × {Math.round(completedCrop.height)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : fullRawProgress ? (
                        <div className="progress-indicator">
                          <div className="spinner"></div>
                          <p className="progress-text mono">{fullRawProgress}</p>
                        </div>
                      ) : (
                        <p className="preview-placeholder">Working on the embedded preview...</p>
                      )}
                    </div>

                    <div className="settings-section glass compact">
                      <div className="workspace-header">
                        <h3>Conversion Settings</h3>
                        <div className="workspace-actions">
                          {canExport && (
                            <button className="btn outline tiny" onClick={handleExport} disabled={isProcessing}>
                              <Download size={14} /> Export {exportFormat.toUpperCase()}
                            </button>
                          )}
                          <button className="btn ghost tiny" onClick={resetStage}>Import Another</button>
                        </div>
                      </div>

                      <div className="setting-group">
                        <label>Mode:</label>
                        <SelectField value={mode} onChange={setMode} options={modeOptions} />
                      </div>

                      <div className="setting-group">
                        <label>Export Format:</label>
                        <SelectField value={exportFormat} onChange={setExportFormat} options={exportOptions} />
                      </div>

                      <button 
                        className="btn full" 
                        onClick={processImage} 
                        disabled={!file || isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Convert Image'}
                      </button>
                    </div>

                    {error && (
                      <div className="error-section glass">
                        <p className="error-text">{error}</p>
                        {canRunFullRaw && (
                          <button className="btn ghost" onClick={handleRunFullRaw}>Run Full Raw Decode</button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="workspace-locked glass">
                    <p>Import a RAW to load settings + preview.</p>
                  </div>
                )}
              </section>
            </div>
          </div>

          {isCapabilityModalOpen && (
            <div className="capability-modal-overlay" role="dialog" aria-modal="true" aria-label="Device awareness">
              <div className="capability-modal glass" onClick={(event) => event.stopPropagation()}>
                <div className="capability-modal-header">
                  <div>
                    <p className="mono label">Device Awareness</p>
                    <h3>{isCapabilityScanning ? 'Scanning hardware…' : 'Pipeline Recommendation'}</h3>
                    <p>{capabilityRecommendation}</p>
                  </div>
                  <button className="modal-close" onClick={handleCapabilityModalContinue} aria-label="Close device awareness panel">
                    ×
                  </button>
                </div>
                <div className="capability-modal-body">
                  <div className="capability-grid">
                    {capabilityChips.map(chip => (
                      <div key={chip.label} className={`capability-chip ${chip.status ? 'ok' : 'warn'}`}>
                        <span className="chip-label">{chip.label}</span>
                        <span className="chip-value">{chip.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="memory-plan-callout">
                    <span className={`badge tier-${planTier}`}>{planTier.replace('-', ' ')}</span>
                    <p>{memoryPlanSummary}</p>
                  </div>
                  {capabilities?.notes?.length ? (
                    <ul className="capability-notes">
                      {capabilities.notes.map(note => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="capability-modal-actions">
                  <label className="memory-override">
                    <span>Simulate memory</span>
                    <select value={memoryOverride} onChange={handleMemoryOverrideChange}>
                      <option value="auto">Auto detect</option>
                      <option value="1.5">1.5 GB (low)</option>
                      <option value="3">3 GB (tablet)</option>
                      <option value="6">6 GB (desktop)</option>
                    </select>
                  </label>
                  <div className="modal-action-buttons">
                    <button
                      className="btn ghost tiny"
                      onClick={() => handleCapabilityScan(memoryOverride === 'auto' ? undefined : { deviceMemory: Number(memoryOverride) })}
                      disabled={isCapabilityScanning}
                    >
                      {isCapabilityScanning ? 'Scanning…' : 'Re-run scan'}
                    </button>
                    <button className="btn" onClick={handleCapabilityModalContinue}>
                      {hasAcknowledgedCapabilities ? 'Back to workspace' : 'Proceed to upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFullscreenOpen && previewUrl && (
            <div className="fullscreen-modal" onClick={() => setIsFullscreenOpen(false)}>
              <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="fullscreen-close"
                  onClick={() => setIsFullscreenOpen(false)}
                  aria-label="Close fullscreen"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <img src={previewUrl} alt="Fullscreen preview" className="fullscreen-image" />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Built like a pro. React + TypeScript + Vite. Optimized for touch.</p>
        <small className="mono" aria-label="terminal-log">terminal-log: raw converter active</small>
      </footer>
    </div>
  )
}

export default RawImageConverter