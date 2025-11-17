/**
 * Image Editor Component
 * PHRASE 13: Visual cropping and rotation interface
 * 
 * Features:
 * - react-image-crop for visual crop selection
 * - Rotate 90° CW/CCW buttons
 * - Reset to original
 * - CSS transform for preview only (export uses buffer math)
 */

import { useState, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { RotateCw, RotateCcw, X, Check, RefreshCw } from 'lucide-react'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface EditorState {
  crop: CropRect | null
  rotation: 0 | 90 | 180 | 270
}

interface ImageEditorProps {
  previewUrl: string
  originalWidth: number
  originalHeight: number
  initialState?: EditorState
  onSave: (state: EditorState) => void
  onCancel: () => void
}

export default function ImageEditor({
  previewUrl,
  originalWidth,
  originalHeight,
  initialState,
  onSave,
  onCancel
}: ImageEditorProps) {
  const [crop, setCrop] = useState<Crop | undefined>(
    initialState?.crop ? pixelCropToPercentCrop(initialState.crop, originalWidth, originalHeight) : undefined
  )
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(
    initialState?.crop ? initialState.crop as PixelCrop : undefined
  )
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialState?.rotation || 0)
  const imgRef = useRef<HTMLImageElement>(null)

  // Convert pixel crop to percentage crop for ReactCrop
  function pixelCropToPercentCrop(pixelCrop: CropRect, imgWidth: number, imgHeight: number): Crop {
    return {
      unit: '%',
      x: (pixelCrop.x / imgWidth) * 100,
      y: (pixelCrop.y / imgHeight) * 100,
      width: (pixelCrop.width / imgWidth) * 100,
      height: (pixelCrop.height / imgHeight) * 100
    }
  }

  const handleRotateCW = () => {
    setRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270)
  }

  const handleRotateCCW = () => {
    setRotation(prev => ((prev - 90 + 360) % 360) as 0 | 90 | 180 | 270)
  }

  const handleReset = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setRotation(0)
  }

  const handleSave = () => {
    const finalCrop: CropRect | null = completedCrop 
      ? {
          x: Math.round(completedCrop.x),
          y: Math.round(completedCrop.y),
          width: Math.round(completedCrop.width),
          height: Math.round(completedCrop.height)
        }
      : null

    onSave({
      crop: finalCrop,
      rotation
    })
  }

  // Get display dimensions considering rotation
  const displayWidth = rotation === 90 || rotation === 270 ? originalHeight : originalWidth
  const displayHeight = rotation === 90 || rotation === 270 ? originalWidth : originalHeight

  return (
    <div className="image-editor-overlay">
      <div className="image-editor-modal">
        <div className="editor-header">
          <h2>Edit Image</h2>
          <button className="btn ghost tiny" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="editor-toolbar">
          <div className="toolbar-group">
            <button className="btn outline tiny" onClick={handleRotateCCW} title="Rotate 90° CCW">
              <RotateCcw size={16} /> Rotate Left
            </button>
            <button className="btn outline tiny" onClick={handleRotateCW} title="Rotate 90° CW">
              <RotateCw size={16} /> Rotate Right
            </button>
          </div>
          <div className="toolbar-group">
            <button className="btn ghost tiny" onClick={handleReset} title="Reset all edits">
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        <div className="editor-canvas-container">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={undefined}
            keepSelection
          >
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Preview"
              style={{
                transform: `rotate(${rotation}deg)`,
                maxWidth: '100%',
                maxHeight: '70vh',
                transition: 'transform 0.3s ease'
              }}
              onLoad={(e) => {
                const img = e.currentTarget
                console.log(`[Editor] Image loaded: ${img.naturalWidth}x${img.naturalHeight}`)
              }}
            />
          </ReactCrop>
        </div>

        <div className="editor-info">
          <div className="info-item">
            <span className="label">Original:</span>
            <span className="value">{originalWidth} × {originalHeight}</span>
          </div>
          {completedCrop && (
            <div className="info-item">
              <span className="label">Crop:</span>
              <span className="value">
                {Math.round(completedCrop.width)} × {Math.round(completedCrop.height)}
              </span>
            </div>
          )}
          {rotation !== 0 && (
            <div className="info-item">
              <span className="label">Rotation:</span>
              <span className="value">{rotation}°</span>
            </div>
          )}
          <div className="info-item">
            <span className="label">Final Size:</span>
            <span className="value">
              {completedCrop 
                ? `${Math.round(rotation === 90 || rotation === 270 ? completedCrop.height : completedCrop.width)} × ${Math.round(rotation === 90 || rotation === 270 ? completedCrop.width : completedCrop.height)}`
                : `${displayWidth} × ${displayHeight}`
              }
            </span>
          </div>
        </div>

        <div className="editor-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            <Check size={16} /> Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
