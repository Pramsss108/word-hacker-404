import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload, Download, Save, Trash2, ArrowLeft, Zap } from 'lucide-react'
import MatrixRain from './MatrixRain'
import PerformanceMonitor from './PerformanceMonitor' // M4: Performance monitoring

// Import the audio service functions and new engine core
import { 
  EffectSettings, 
  defaultSettings, 
  fileToAudioBuffer, 
  audioBufferToWavBlob 
} from '../services/audioService'

// Import the new engine core for live preview
import { getEngineCore, PreviewGraph } from '../services/engineCore'

// M7: Import export and preset services
import { 
  exportService, 
  presetService, 
  EXPORT_FORMATS, 
  ExportOptions, 
  AudioPreset, 
  PresetCategory 
} from '../services/exportService'

// M8: Import quality assurance and offline processing
import { qaSystem, QAReport } from '../services/qualityAssurance'
import { offlineProcessor } from '../services/offlineProcessor'

// M3: Import WaveSurfer for waveform visualization
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'

type Profile = {
  name: string
  settings: EffectSettings
}

type VoiceEncrypterProps = {
  onBackToHome: () => void
}

export default function VoiceEncrypter({ onBackToHome }: VoiceEncrypterProps) {
  const [status, setStatus] = useState('Ready. Upload an audio file or record your voice.')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings)
  const [profiles, setProfiles] = useState<Profile[]>([])
  
  // Live preview state
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [previewGraph, setPreviewGraph] = useState<PreviewGraph | null>(null)
  const [isPlaying, setIsPlaying] = useState<'none' | 'original' | 'preview'>('none')
  
  // Audio source tracking for proper cleanup
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // M7: Export and Preset state
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [showPresetPanel, setShowPresetPanel] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'wav',
    quality: 'cd',
    normalize: true,
    fadeIn: 0,
    fadeOut: 0,
    trimSilence: false
  })
  const [availablePresets, setAvailablePresets] = useState<AudioPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [newPresetName, setNewPresetName] = useState('')

  // M8: Quality Assurance state
  const [showQAPanel, setShowQAPanel] = useState(false)
  const [isRunningQA, setIsRunningQA] = useState(false)
  const [qaReport, setQAReport] = useState<QAReport | null>(null)
  const [qaProgress, setQAProgress] = useState(0)
  const [qaCurrentTest, setQACurrentTest] = useState('')

  // DAW Layout state
  const [mode, setMode] = useState<'enhance' | 'denoise' | 'encrypt'>('enhance')
  const [exportSelectionOnly, setExportSelectionOnly] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalAudioRef = useRef<HTMLAudioElement>(null)
  const processedAudioRef = useRef<HTMLAudioElement>(null)
  
  // M3: WaveSurfer refs and state
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<{start: number, end: number} | null>(null)
  const [meterData, setMeterData] = useState({
    peak: 0,
    rms: 0,
    loudness: -60
  })

  // Helper function to count enabled effects
  const getEnabledEffectsCount = (): number => {
    return [
      settings.enablePitchShift,
      settings.enableDistortion,
      settings.enableReverb,
      settings.enableDelay,
      settings.enableLowpass,
      settings.enableHighpass,
      settings.enableAIEnhancement,
      settings.enableNoiseReduction
    ].filter(Boolean).length;
  };

  // Safe number formatter to avoid runtime crashes on undefined/NaN
  const fmt = (n: number | undefined | null, digits = 1) => {
    const num = typeof n === 'number' && Number.isFinite(n) ? n : 0;
    return num.toFixed(digits);
  };

  // Load profiles from localStorage
  useEffect(() => {
    try {
      const savedProfiles = localStorage.getItem('hacker-voice-profiles')
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles))
      }
    } catch (e) {
      console.error('Failed to load profiles:', e)
    }
  }, [])

  // Save profiles to localStorage
  useEffect(() => {
    localStorage.setItem('hacker-voice-profiles', JSON.stringify(profiles))
  }, [profiles])

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [originalUrl, processedUrl])

  // Initialize WaveSurfer when audio is loaded
  useEffect(() => {
    if (originalUrl) {
      initializeWaveSurfer(originalUrl)
    }
  }, [originalUrl])

  // M7: Load presets on component mount
  useEffect(() => {
    setAvailablePresets(presetService.getPresets())
  }, [])

  // M7: Export functionality
  const handleExport = async () => {
    if (!originalBuffer) {
      setError('No audio loaded for export')
      return
    }

    setIsExporting(true)
    setExportProgress(0)
    setError(null)

    try {
      // Get the engine core and render with current settings
      const engine = getEngineCore()
      await engine.ensureAudioContext()
      
      // Render offline with current settings
      const processedBuffer = await engine.renderOffline(
        originalBuffer, 
        settings, 
        (progress) => setExportProgress(progress * 0.8) // Reserve 20% for export encoding
      )

      setExportProgress(0.8)

      // Export with selected format and options
      const blob = await exportService.exportAudio(
        processedBuffer,
        exportOptions,
        (progress) => setExportProgress(0.8 + progress * 0.2)
      )

      // Download the file
      const format = EXPORT_FORMATS.find(f => f.id === exportOptions.format)
      const quality = format?.quality.find(q => q.id === exportOptions.quality)
      const filename = `${originalFile?.name?.split('.')[0] || 'processed'}_${quality?.name || 'export'}.${format?.extension || 'wav'}`
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setStatus(`Successfully exported: ${filename}`)
      setShowExportPanel(false)

    } catch (error) {
      console.error('Export failed:', error)
      setError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // M7: Preset management
  const loadPreset = (presetId: string) => {
    const preset = availablePresets.find(p => p.id === presetId)
    if (preset) {
      setSettings(preset.settings)
      setSelectedPresetId(presetId)
      setStatus(`Loaded preset: ${preset.name}`)
      
      // Update preview if audio is loaded
      if (previewGraph) {
        previewGraph.updateParams(preset.settings)
      }
    }
  }

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) {
      setError('Please enter a preset name')
      return
    }

    try {
      const newPreset = presetService.createPreset(
        newPresetName,
        'Custom preset created by user',
        settings
      )
      setAvailablePresets(presetService.getPresets())
      setNewPresetName('')
      setSelectedPresetId(newPreset.id)
      setStatus(`Saved preset: ${newPreset.name}`)
      setShowPresetPanel(false)
    } catch (error) {
      setError(`Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const deletePreset = (presetId: string) => {
    try {
      presetService.deletePreset(presetId)
      setAvailablePresets(presetService.getPresets())
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null)
      }
      setStatus('Preset deleted')
    } catch (error) {
      setError(`Failed to delete preset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // M8: Quality Assurance functionality
  const runQualityAssurance = async () => {
    if (!originalBuffer) {
      setError('No audio loaded for quality assurance')
      return
    }

    setIsRunningQA(true)
    setQAProgress(0)
    setQACurrentTest('')
    setError(null)
    setShowQAPanel(true)

    try {
      const report = await qaSystem.runMasterQualityInvigilator(
        originalBuffer,
        settings,
        (progress, testName) => {
          setQAProgress(progress)
          setQACurrentTest(testName)
        }
      )

      setQAReport(report)
      
      if (report.nasa_grade_compliance) {
        setStatus('🚀 NASA-grade quality assurance PASSED - Ready for deployment!')
      } else if (report.overallStatus === 'pass') {
        setStatus('✅ Quality assurance passed with recommendations')
      } else if (report.overallStatus === 'warning') {
        setStatus('⚠️ Quality assurance passed with warnings')
      } else {
        setStatus('❌ Quality assurance failed - Review issues before deployment')
      }

    } catch (error) {
      setError(`Quality assurance failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningQA(false)
    }
  }

  const runOfflineProcessing = async () => {
    if (!originalBuffer) {
      setError('No audio loaded for offline processing')
      return
    }

    setStatus('🔄 Queuing offline processing task...')

    const taskId = offlineProcessor.queueRenderTask(
      originalBuffer,
      settings,
      'high',
      (progress, status) => {
        setStatus(`⚡ Offline processing: ${Math.round(progress * 100)}% - ${status}`)
      }
    )

    // Monitor task completion
    const checkTask = setInterval(() => {
      const task = offlineProcessor.getTaskStatus(taskId)
      if (task?.status === 'completed') {
        clearInterval(checkTask)
        setStatus('✅ Offline processing completed successfully!')
        // The result is available in task.result
      } else if (task?.status === 'failed') {
        clearInterval(checkTask)
        setError(`Offline processing failed: ${task.error}`)
      }
    }, 500)
  }

  const handleFileSelect = async (file: File) => {
    if (isProcessing) return

    // CRITICAL: Stop all audio first to prevent mixing
    stopAll()

    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (processedUrl) URL.revokeObjectURL(processedUrl)
    
    // Clean up previous preview graph completely
    if (previewGraph) {
      previewGraph.dispose()
      setPreviewGraph(null)
    }
    
    // Clear previous buffer
    setOriginalBuffer(null)

    setOriginalFile(file)
    setOriginalUrl(URL.createObjectURL(file))
    setProcessedUrl(null)
    setError(null)
    setIsPlaying('none')
    setStatus(`Loading ${file.name} for live preview...`)
    
    try {
      // Load audio buffer for live preview
      const buffer = await fileToAudioBuffer(file)
      setOriginalBuffer(buffer)
      
      // Initialize engine core and build preview graph
      const engine = getEngineCore()
      await engine.ensureAudioContext()
      
      const graph = engine.buildPreviewGraph(buffer, settings)
      setPreviewGraph(graph)
      engine.setPreviewGraph(graph)
      
      // M3: Initialize WaveSurfer waveform visualization
      setTimeout(() => {
        if (originalUrl) {
          initializeWaveSurfer(originalUrl)
        }
      }, 100) // Small delay to ensure DOM is ready
      
      setStatus(`${file.name} ready. Use A/B preview or adjust effects.`)
    } catch (error) {
      console.error('Failed to load audio for preview:', error)
      setError('Failed to load audio file for preview.')
      setStatus('Failed to load audio. Please try another file.')
    }
  }

  // M3: Initialize WaveSurfer with waveform and regions
  const initializeWaveSurfer = (audioUrl: string) => {
    if (!waveformContainerRef.current) return

    // Dispose existing instance
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy()
    }

    // Create new WaveSurfer instance  
    const wavesurfer = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: '#0aff6a',
      progressColor: '#07c06b',
      cursorColor: '#d92e2e',
      barWidth: 2,
      barRadius: 1,
      height: 100,
      normalize: true
    })

    // Register regions plugin
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create())

    wavesurfer.load(audioUrl)

    // Handle region selection for looping
    regions.on('region-created', (region) => {
      if (region && typeof region === 'object' && 'start' in region && 'end' in region) {
        setSelectedRegion({
          start: region.start as number,
          end: region.end as number
        })
      }
    })

    waveSurferRef.current = wavesurfer
  }

  // M3: Start live metering from preview graph
  const startLiveMetering = useCallback(() => {
    if (!previewGraph) return

    const updateMeters = () => {
      try {
        // Get the meter node (last in the chain)
        const meterNode = previewGraph.nodes[previewGraph.nodes.length - 1] as any
        if (meterNode && typeof meterNode.getMeterData === 'function') {
          const data = meterNode.getMeterData()
          setMeterData({
            peak: data.peak,
            rms: data.rms,
            loudness: data.loudness
          })
        }
      } catch (error) {
        console.warn('Meter update failed:', error)
      }
      
      // Continue animation if playing
      if (isPlaying !== 'none') {
        requestAnimationFrame(updateMeters)
      }
    }

    // Start the animation loop
    updateMeters()
  }, [isPlaying, previewGraph])

  // Stop live metering and reset values
  const stopLiveMetering = useCallback(() => {
    setMeterData({
      peak: 0,
      rms: 0,
      loudness: -60
    })
  }, [])

  const handleProcess = async () => {
    if (!originalFile) {
      setError("No file selected.")
      return
    }

    setIsProcessing(true)
    setError(null)
    if (processedUrl) URL.revokeObjectURL(processedUrl)
    setProcessedUrl(null)

    try {
      setStatus('🔍 Analyzing audio structure...')
      const audioBuffer = await fileToAudioBuffer(originalFile)
      
      // Process with engineCore for export parity with preview
      setStatus('🤖 Initializing professional audio engine...')
      const engineCore = getEngineCore()
      
      const processedBuffer = await engineCore.renderOffline(audioBuffer, settings, (progress) => {
        const percentage = Math.round(progress * 100)
        if (progress < 0.3) {
          setStatus(`🎯 Applying effects chain... ${percentage}%`)
        } else if (progress < 0.7) {
          setStatus(`�️ Professional mastering... ${percentage}%`)
        } else {
          setStatus(`🛡️ Finalizing processed audio... ${percentage}%`)
        }
      })
      
      setStatus('📦 Encoding your protected voice...')
      const processedBlob = audioBufferToWavBlob(processedBuffer)
      
      setProcessedUrl(URL.createObjectURL(processedBlob))
      setStatus('🎉 Your voice is now protected and ready for download!')

    } catch (err: any) {
      console.error("AI Processing failed:", err)
      setError(`AI processing encountered an issue: ${err.message || 'Unknown error'}`)
      setStatus('❌ Processing failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }



  const handleSaveProfile = (name: string) => {
    if (!name.trim()) return
    const newProfile: Profile = { name: name.trim(), settings }
    const existingIndex = profiles.findIndex(p => p.name === newProfile.name)
    
    if (existingIndex > -1) {
      const updatedProfiles = [...profiles]
      updatedProfiles[existingIndex] = newProfile
      setProfiles(updatedProfiles)
    } else {
      setProfiles([...profiles, newProfile])
    }
    setStatus(`Profile "${name}" saved.`)
  }

  const handleLoadProfile = (profile: Profile) => {
    setSettings(profile.settings)
    setStatus(`Profile "${profile.name}" loaded.`)
  }

  const handleDeleteProfile = (name: string) => {
    setProfiles(profiles.filter(p => p.name !== name))
    setStatus(`Profile "${name}" deleted.`)
  }

  // Complete audio cleanup - stops all sources and disconnects everything
  const stopAll = () => {
    setIsPlaying('none')
    
    // Stop live metering
    stopLiveMetering()
    
    // Stop active source if exists
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop()
        activeSourceRef.current.disconnect()
      } catch (e) {
        // Source might already be stopped
      }
      activeSourceRef.current = null
    }
    
    // Disconnect preview graph if active
    if (previewGraph && previewGraph.sourceNode) {
      try {
        previewGraph.sourceNode.stop()
        previewGraph.disconnect()
      } catch (e) {
        // Source might already be stopped
      }
    }
  }

  // Live preview controls
  const playOriginal = async () => {
    if (!originalBuffer) return
    
    // CRITICAL: Stop everything first to prevent mixing
    stopAll()
    
    try {
      const engine = getEngineCore()
      await engine.ensureAudioContext()
      
      // Create clean source for original audio (no effects)
      const ctx = (engine as any).ctx // Access private context
      const source = ctx.createBufferSource()
      source.buffer = originalBuffer
      source.connect(ctx.destination)
      
      // Track this source for cleanup
      activeSourceRef.current = source
      setIsPlaying('original')
      
      source.onended = () => {
        setIsPlaying('none')
        activeSourceRef.current = null
      }
      
      source.start(0)
    } catch (error) {
      console.error('Failed to play original:', error)
      setIsPlaying('none')
      activeSourceRef.current = null
    }
  }

  const playPreview = async () => {
    if (!originalBuffer) return
    
    // CRITICAL: Stop everything first to prevent mixing
    stopAll()
    
    try {
      const engine = getEngineCore()
      await engine.ensureAudioContext()
      
      // Rebuild clean preview graph with current settings
      await rebuildPreviewGraph()
      
      // Get the updated graph state
      const currentGraph = engine.getPreviewGraph()
      
      if (currentGraph && currentGraph.sourceNode) {
        // Update and connect the effect chain
        currentGraph.updateParams(settings)
        currentGraph.connect()
        
        setIsPlaying('preview')
        
        // Start live metering for preview
        startLiveMetering()
        
        currentGraph.sourceNode.onended = () => {
          setIsPlaying('none')
          stopLiveMetering()
          currentGraph.disconnect()
        }
        
        currentGraph.sourceNode.start(0)
      }
    } catch (error) {
      console.error('Failed to play preview:', error)
      setIsPlaying('none')
    }
  }

  const rebuildPreviewGraph = async () => {
    if (!originalBuffer) return
    
    try {
      // Clean up old graph completely
      if (previewGraph) {
        previewGraph.dispose()
      }
      
      // Build fresh graph with new source
      const engine = getEngineCore()
      await engine.ensureAudioContext()
      
      const newGraph = engine.buildPreviewGraph(originalBuffer, settings)
      setPreviewGraph(newGraph)
      engine.setPreviewGraph(newGraph)
    } catch (error) {
      console.error('Failed to rebuild preview graph:', error)
    }
  }

  // Update settings and rebuild preview graph
  const updateSettings = (newSettings: Partial<EffectSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    
    // Update live preview if available
    if (previewGraph) {
      previewGraph.updateParams(updated)
    }
  }

  return (
    <div className="app voice-encrypter-page">
      {/* Matrix Rain Background - Consistent UX */}
      <MatrixRain opacity={0.06} density={20} speed={1.5} />
      
      {/* M4: Performance Monitor */}
      <PerformanceMonitor />
      
      <div className="voice-daw">
        {/* Header Toolbar */}
        <header className="daw-header">
          <button onClick={onBackToHome} className="daw-icon-btn" aria-label="Back to home">
            <ArrowLeft size={18} />
          </button>
          <div className="daw-title">
            <strong>Voice Encrypter</strong>
            <span className="daw-subtitle">AI Vocal Shield</span>
          </div>
          <div className="daw-header-actions">
            <span className={`daw-status ${isProcessing ? 'processing' : error ? 'error' : 'ready'}`}>
              {error || status}
            </span>
            <button onClick={onBackToHome} className="daw-icon-btn" aria-label="Close tool">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="daw-main">
          {/* Left Rail: Upload + Modes */}
          <aside className="daw-left">
            <div className="daw-upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="daw-upload-btn"
                disabled={isProcessing}
              >
                <Upload size={20} />
                <div className="upload-content">
                  <div className="upload-title">
                    {originalFile ? originalFile.name : 'Upload Audio'}
                  </div>
                  <div className="upload-subtitle">
                    MP3, WAV, MP4, MOV • Max 100MB
                  </div>
                </div>
              </button>
            </div>

            <div className="daw-modes">
              <div className="mode-tabs" role="tablist">
                <button 
                  className={`mode-tab ${mode === 'enhance' ? 'active' : ''}`} 
                  onClick={() => setMode('enhance')} 
                  role="tab"
                >
                  Enhance
                </button>
                <button 
                  className={`mode-tab ${mode === 'denoise' ? 'active' : ''}`} 
                  onClick={() => setMode('denoise')} 
                  role="tab"
                >
                  Denoise
                </button>
                <button 
                  className={`mode-tab ${mode === 'encrypt' ? 'active' : ''}`} 
                  onClick={() => setMode('encrypt')} 
                  role="tab"
                >
                  Encrypt
                </button>
              </div>
              <div className="mode-hint">Spacebar: Play/Pause</div>
            </div>
          </aside>

          {/* Center: Timeline + Meters */}
          <section className="daw-center">
            {originalUrl && (
              <div className="daw-timeline">
                <div className="timeline-header">
                  <span className="timeline-title">Waveform & Selection</span>
                  {selectedRegion && (
                    <div className="selection-info">
                      <span>{selectedRegion.start.toFixed(2)}s - {selectedRegion.end.toFixed(2)}s</span>
                      <span className="selection-duration">({(selectedRegion.end - selectedRegion.start).toFixed(2)}s)</span>
                    </div>
                  )}
                </div>
                <div className="timeline-content">
                  <div 
                    ref={waveformContainerRef} 
                    className="daw-waveform"
                  />
                </div>
                
                {/* Live Meters */}
                <div className="daw-meters">
                  <div className="meter">
                    <span className="meter-label">Peak</span>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill peak"
                        style={{ width: `${Math.min(100, meterData.peak * 100)}%` }}
                      />
                    </div>
                    <span className="meter-value">{(meterData.peak * 100).toFixed(1)}%</span>
                  </div>
                  <div className="meter">
                    <span className="meter-label">RMS</span>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill rms"
                        style={{ width: `${Math.min(100, meterData.rms * 100)}%` }}
                      />
                    </div>
                    <span className="meter-value">{(meterData.rms * 100).toFixed(1)}%</span>
                  </div>
                  <div className="meter">
                    <span className="meter-label">Loud</span>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill loudness"
                        style={{ width: `${Math.min(100, Math.max(0, (meterData.loudness + 60) / 60 * 100))}%` }}
                      />
                    </div>
                    <span className="meter-value">{meterData.loudness.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {!originalUrl && (
              <div className="daw-placeholder">
                <Upload size={48} />
                <h3>No Audio Loaded</h3>
                <p>Upload an audio file to see the waveform and timeline</p>
              </div>
            )}
          </section>

          {/* Right: Effects Panel */}
          <aside className="daw-right">
            {/* Mastering Section - Separated as requested */}
            <div className="effects-section">
              <h3 className="section-title">Mastering</h3>
              <div className={`effect-module ${settings.enableMastering ? 'active' : 'inactive'}`}>
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableMastering}
                    onChange={(e) => updateSettings({enableMastering: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">Professional Mastering</span>
                </label>
              </div>
            </div>

            {/* Mode-specific Effects */}
            <div className="effects-section">
              <h3 className="section-title">
                {mode === 'enhance' ? 'Enhancement' : mode === 'denoise' ? 'Noise Reduction' : 'Voice Effects'}
              </h3>
              
              {(mode === 'enhance' || mode === 'encrypt') && (
                <div className={`effect-module ${settings.enableAIEnhancement ? 'active' : 'inactive'}`}>
                  <label className="effect-toggle">
                    <input
                      type="checkbox"
                      checked={settings.enableAIEnhancement}
                      onChange={(e) => updateSettings({enableAIEnhancement: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                    <span className="effect-name">AI Enhancement</span>
                  </label>
                  {settings.enableAIEnhancement && (
                    <div className="effect-controls">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={settings.aiEnhancement}
                        onChange={(e) => updateSettings({aiEnhancement: parseFloat(e.target.value)})}
                      />
                      <span className="control-value">{settings.aiEnhancement.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {(mode === 'denoise' || mode === 'encrypt') && (
                <div className={`effect-module ${settings.enableNoiseReduction ? 'active' : 'inactive'}`}>
                  <label className="effect-toggle">
                    <input
                      type="checkbox"
                      checked={settings.enableNoiseReduction}
                      onChange={(e) => updateSettings({enableNoiseReduction: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                    <span className="effect-name">Noise Reduction</span>
                  </label>
                  {settings.enableNoiseReduction && (
                    <div className="effect-controls">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={settings.noiseReduction}
                        onChange={(e) => updateSettings({noiseReduction: parseFloat(e.target.value)})}
                      />
                      <span className="control-value">{settings.noiseReduction.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}

              {mode === 'encrypt' && (
                <>
                  <div className={`effect-module ${settings.enablePitchShift ? 'active' : 'inactive'}`}>
                    <label className="effect-toggle">
                      <input
                        type="checkbox"
                        checked={settings.enablePitchShift}
                        onChange={(e) => updateSettings({enablePitchShift: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                      <span className="effect-name">Pitch Shift</span>
                    </label>
                    {settings.enablePitchShift && (
                      <div className="effect-controls">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={settings.pitchShift}
                          onChange={(e) => updateSettings({pitchShift: parseFloat(e.target.value)})}
                        />
                        <span className="control-value">{settings.pitchShift.toFixed(1)} st</span>
                      </div>
                    )}
                  </div>

                  <div className={`effect-module ${settings.enableReverb ? 'active' : 'inactive'}`}>
                    <label className="effect-toggle">
                      <input
                        type="checkbox"
                        checked={settings.enableReverb}
                        onChange={(e) => updateSettings({enableReverb: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                      <span className="effect-name">Reverb</span>
                    </label>
                    {settings.enableReverb && (
                      <div className="effect-controls">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.reverbMix}
                          onChange={(e) => updateSettings({reverbMix: parseFloat(e.target.value)})}
                        />
                        <span className="control-value">{settings.reverbMix.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

        {/* Bottom Transport Bar */}
        <footer className="daw-transport">
          <div className="transport-left">
            {originalBuffer && (
              <>
                <button
                  onClick={isPlaying === 'original' ? stopAll : playOriginal}
                  className={`transport-btn ${isPlaying === 'original' ? 'playing' : ''}`}
                  disabled={isProcessing}
                  title="Play Original (A key)"
                >
                  <span className="btn-icon">{isPlaying === 'original' ? '⏸' : '▶'}</span>
                  <span className="btn-label">Original</span>
                </button>
                <button
                  onClick={isPlaying === 'preview' ? stopAll : playPreview}
                  className={`transport-btn ${isPlaying === 'preview' ? 'playing' : ''}`}
                  disabled={isProcessing}
                  title="Play Preview (Spacebar)"
                >
                  <span className="btn-icon">{isPlaying === 'preview' ? '⏸' : '▶'}</span>
                  <span className="btn-label">Preview</span>
                </button>
              </>
            )}
          </div>
          
          <div className="transport-center">
            {originalBuffer && (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="process-btn"
              >
                {isProcessing ? (
                  <>
                    <div className="spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Apply Effects
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="transport-right">
            {processedUrl && (
              <>
                <label className="export-checkbox">
                  <input
                    type="checkbox"
                    checked={exportSelectionOnly}
                    onChange={(e) => setExportSelectionOnly(e.target.checked)}
                  />
                  <span>Export selection only</span>
                </label>
                <button
                  onClick={() => setShowExportPanel(true)}
                  className="export-btn"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={runQualityAssurance}
                  className="qa-btn"
                  disabled={isRunningQA}
                >
                  <span className="btn-icon">🔬</span>
                  QA
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

        {/* Export Panel Modal */}
        {showExportPanel && (
          <div className="modal-overlay" onClick={() => setShowExportPanel(false)}>
            <div className="export-panel" onClick={e => e.stopPropagation()}>
              <div className="panel-header">
                <h3>🚀 Professional Export</h3>
                <button onClick={() => setShowExportPanel(false)} className="close-btn">
                  <X size={18} />
                </button>
              </div>
              <div className="export-config">
                <div className="format-section">
                  <label>Output Format</label>
                  <div className="format-grid">
                    {EXPORT_FORMATS.map(format => (
                      <div 
                        key={format.id}
                        className={`format-card ${exportOptions.format === format.id ? 'selected' : ''}`}
                        onClick={() => setExportOptions({...exportOptions, format: format.id, quality: format.quality[0].id})}
                      >
                        <div className="format-name">{format.name}</div>
                        <div className="format-desc">{format.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel-actions">
                  <button 
                    onClick={handleExport}
                    className="export-confirm-btn"
                    disabled={isExporting || !originalBuffer}
                  >
                    {isExporting ? 'Exporting...' : 'Export Audio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QA Panel Modal */}
        {showQAPanel && (
          <div className="modal-overlay" onClick={() => setShowQAPanel(false)}>
            <div className="qa-panel" onClick={e => e.stopPropagation()}>
              <div className="panel-header">
                <h3>🔬 Pro-Grade Quality Assurance</h3>
                <button onClick={() => setShowQAPanel(false)} className="close-btn">
                  <X size={18} />
                </button>
              </div>
              <div className="qa-config">
                {isRunningQA && (
                  <div className="qa-progress-section">
                    <div className="progress-label">Running Quality Check... {Math.round(qaProgress * 100)}%</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: `${qaProgress * 100}%`}} />
                    </div>
                  </div>
                )}
                {qaReport && !isRunningQA && (
                  <div className="qa-results">
                    <div className={`qa-status ${qaReport.overallStatus}`}>
                      Quality Check: {qaReport.overallStatus}
                    </div>
                  </div>
                )}
                {!qaReport && !isRunningQA && (
                  <button 
                    onClick={runQualityAssurance}
                    className="run-qa-btn"
                    disabled={!originalBuffer}
                  >
                    ✅ Run Quality Check
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
        <div className="glass vocal-shield-panel mb-6">
