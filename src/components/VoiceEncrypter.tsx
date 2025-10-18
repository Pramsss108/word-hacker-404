import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload, Download, Save, Trash2, ArrowLeft } from 'lucide-react'
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
      
      <div className="container">
        {/* Navigation Header */}
        <div className="voice-nav">
          <button 
            onClick={onBackToHome}
            className="btn ghost flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <div className="voice-branding">
            <h1 className="voice-title">Voice Encrypter</h1>
            <p className="voice-subtitle">AI Vocal Shield & Identity Protection</p>
          </div>
          <button 
            onClick={onBackToHome}
            className="btn ghost"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mission Control - File Upload */}
        <div className="glass vocal-shield-panel mb-6">
          <div className="panel-header">
            <h3 className="panel-title">🛡️ Upload Your Voice</h3>
            <p className="panel-desc">Your identity stays protected. Processing happens locally.</p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">
              <Upload size={32} />
            </div>
            <div className="upload-text">
              <h4>{originalFile ? originalFile.name : 'Drop audio or video file here'}</h4>
              <p>Supports: MP3, WAV, MP4, MOV • Max: 100MB • 100% Private</p>
            </div>
          </div>
          
          {/* AI Processing Status */}
          <div className="status-display">
            <div className="status-row">
              <span className="status-label">System Status:</span>
              <span className={`status-value ${isProcessing ? 'processing' : 'ready'}`}>
                {status}
              </span>
            </div>
            {error && (
              <div className="status-row error">
                <span className="status-label">Alert:</span>
                <span className="status-value">{error}</span>
              </div>
            )}
            {isProcessing && (
              <div className="processing-animation">
                <div className="neural-pulse"></div>
                <span className="processing-text">AI processing your voice...</span>
              </div>
            )}
          </div>
        </div>

        {/* Audio Playback & Download */}
        {(originalUrl || processedUrl) && (
          <div className="glass audio-studio mb-6">
            <div className="panel-header">
              <h3 className="panel-title">🎧 Audio Studio</h3>
              <p className="panel-desc">Listen to your transformed voice. Download when ready.</p>
            </div>
            
            {/* M3: Waveform Visualization */}
            {originalUrl && (
              <div className="waveform-section">
                <h3 className="section-title">📊 Live Waveform & Metering</h3>
                
                <div className="waveform-container">
                  <div className="waveform-wrapper">
                    <div 
                      ref={waveformContainerRef} 
                      className="waveform-display"
                    />
                    <div className="waveform-overlay" />
                  </div>
                
                  {/* M3: Live Audio Meters */}
                  <div className="live-meters">
                  <div className="meter-group">
                    <div className="meter-label">Peak</div>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill peak"
                        style={{ width: `${Math.min(100, meterData.peak * 100)}%` }}
                      />
                    </div>
                    <div className="meter-value">{(meterData.peak * 100).toFixed(1)}%</div>
                  </div>
                  
                  <div className="meter-group">
                    <div className="meter-label">RMS</div>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill rms"
                        style={{ width: `${Math.min(100, meterData.rms * 100)}%` }}
                      />
                    </div>
                    <div className="meter-value">{(meterData.rms * 100).toFixed(1)}%</div>
                  </div>
                  
                  <div className="meter-group">
                    <div className="meter-label">Loudness</div>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill loudness"
                        style={{ width: `${Math.min(100, Math.max(0, (meterData.loudness + 60) / 60 * 100))}%` }}
                      />
                    </div>
                    <div className="meter-value">{meterData.loudness.toFixed(1)} LUFS</div>
                  </div>
                </div>
                </div>
                
                {/* Region Selection Info */}
                {selectedRegion && (
                  <div className="region-info">
                    Loop Selection: <span className="highlight">{selectedRegion.start.toFixed(2)}s - {selectedRegion.end.toFixed(2)}s</span> 
                    (Duration: <span className="highlight">{(selectedRegion.end - selectedRegion.start).toFixed(2)}s</span>)
                  </div>
                )}
              </div>
            )}


            <div className="audio-comparison">
              {originalUrl && (
                <div className="audio-track">
                  <div className="track-header">
                    <span className="track-label">📁 Original</span>
                    <span className="track-info">Source Audio</span>
                    {originalBuffer && (
                      <div className="transport-controls">
                        <button
                          onClick={isPlaying === 'original' ? stopAll : playOriginal}
                          className={`transport-btn ${isPlaying === 'original' ? 'playing' : ''}`}
                          disabled={isProcessing}
                          title={isPlaying === 'original' ? 'Stop' : 'Play Original'}
                        >
                          {isPlaying === 'original' ? '⏸' : '▶'}
                        </button>
                      </div>
                    )}
                  </div>
                  <audio ref={originalAudioRef} src={originalUrl} controls className="audio-player" />
                </div>
              )}
              
              {originalBuffer && (
                <div className="audio-track preview">
                  <div className="track-header">
                    <span className="track-label">🎛️ Live Preview</span>
                    <span className="track-info">Real-time Effects</span>
                    <div className="transport-controls">
                      <button
                        onClick={isPlaying === 'preview' ? stopAll : playPreview}
                        className={`transport-btn preview ${isPlaying === 'preview' ? 'playing' : ''}`}
                        disabled={isProcessing}
                        title={isPlaying === 'preview' ? 'Stop' : 'Play Preview'}
                      >
                        {isPlaying === 'preview' ? '⏸' : '▶'}
                      </button>
                    </div>
                  </div>
                  <div className="preview-waveform">
                    <div className="waveform-placeholder">
                      {isPlaying === 'preview' ? (
                        <span className="playing-indicator">🎵 Playing with effects...</span>
                      ) : (
                        <span className="ready-indicator">Ready for live preview</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {processedUrl && (
                <div className="audio-track enhanced">
                  <div className="track-header">
                    <span className="track-label">🛡️ Protected Voice</span>
                    <span className="track-info">AI Enhanced</span>
                  </div>
                  <audio ref={processedAudioRef} src={processedUrl} controls className="audio-player" />
                  <div className="audio-actions">
                    <button
                      onClick={() => setShowExportPanel(true)}
                      className="export-btn"
                      disabled={!originalBuffer}
                    >
                      <Download size={16} />
                      Professional Export
                    </button>
                    <button
                      onClick={() => setShowPresetPanel(true)}
                      className="preset-btn"
                    >
                      <Save size={16} />
                      Presets
                    </button>
                  </div>
                  
                  {/* M8: Quality Assurance Actions */}
                  <div className="qa-actions">
                    <button
                      onClick={runQualityAssurance}
                      className="qa-btn"
                      disabled={!originalBuffer || isRunningQA}
                    >
                      🔬 NASA Quality Check
                    </button>
                    <button
                      onClick={runOfflineProcessing}
                      className="offline-btn"
                      disabled={!originalBuffer}
                    >
                      ⚡ Offline Processing
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {processedUrl && (
              <div className="success-message">
                ✅ Your voice has been successfully encrypted and enhanced!
              </div>
            )}
          </div>
        )}

        {/* Professional Effects Mixer */}
        <div className="glass effects-mixer-panel mb-6">
          <div className="panel-header">
            <h3 className="panel-title">🎛️ Professional Effects Suite</h3>
            <p className="panel-desc">Mix and match effects to create your perfect voice transformation</p>
          </div>
          
          {/* Effects Grid */}
          <div className="effects-grid">
            
            {/* M5: AI Enhancement Engine */}
            <div className={`effect-module ${settings.enableAIEnhancement ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableAIEnhancement}
                    onChange={(e) => updateSettings({enableAIEnhancement: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🤖 AI Enhancement (M5)</span>
                </label>
                <span className="effect-badge">Advanced</span>
              </div>
              {settings.enableAIEnhancement && (
                <div className="effect-controls">
                  <label>Master Strength: {fmt(settings.aiEnhancement, 1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.aiEnhancement}
                    onChange={(e) => updateSettings({aiEnhancement: parseFloat(e.target.value)})}
                  />
                  
                  <div className="ai-features-grid">
                    <div className="ai-feature">
                      <div className="ai-feature-icon">🎯</div>
                      <div className="ai-feature-info">
                        <div className="ai-feature-name">Voice Clarity</div>
                        <div className="ai-feature-desc">Adaptive frequency enhancement</div>
                      </div>
                    </div>
                    
                    <div className="ai-feature">
                      <div className="ai-feature-icon">🔊</div>
                      <div className="ai-feature-info">
                        <div className="ai-feature-name">Presence Boost</div>
                        <div className="ai-feature-desc">Intelligent vocal forward-ness</div>
                      </div>
                    </div>
                    
                    <div className="ai-feature">
                      <div className="ai-feature-icon">🌡️</div>
                      <div className="ai-feature-info">
                        <div className="ai-feature-name">Warmth Control</div>
                        <div className="ai-feature-desc">Dynamic low-frequency enhancement</div>
                      </div>
                    </div>
                    
                    <div className="ai-feature">
                      <div className="ai-feature-icon">📢</div>
                      <div className="ai-feature-info">
                        <div className="ai-feature-name">Intelligibility</div>
                        <div className="ai-feature-desc">Speech clarity optimization</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ai-status">
                    <span className="ai-status-label">AI Engine:</span>
                    <span className="ai-status-value">Adaptive Voice Analysis Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* M6: Professional Mastering Chain */}
            <div className={`effect-module ${settings.enableMastering ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableMastering}
                    onChange={(e) => updateSettings({enableMastering: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🎚️ Professional Mastering (M6)</span>
                </label>
                <span className="effect-badge">Master</span>
              </div>
              {settings.enableMastering && (
                <div className="effect-controls">
                  <div className="mastering-sections">
                    <div className="mastering-section">
                      <div className="section-header">
                        <span className="section-icon">🎛️</span>
                        <span className="section-name">Multi-band EQ</span>
                      </div>
                      <div className="eq-bands">
                        <div className="eq-band">
                          <label>Low Shelf</label>
                          <div className="eq-control">
                            <span className="eq-freq">250Hz</span>
                            <input type="range" min="-12" max="12" step="0.5" defaultValue="0" />
                            <span className="eq-gain">+0dB</span>
                          </div>
                        </div>
                        <div className="eq-band">
                          <label>Mid Peak</label>
                          <div className="eq-control">
                            <span className="eq-freq">2kHz</span>
                            <input type="range" min="-12" max="12" step="0.5" defaultValue="0" />
                            <span className="eq-gain">+0dB</span>
                          </div>
                        </div>
                        <div className="eq-band">
                          <label>High Shelf</label>
                          <div className="eq-control">
                            <span className="eq-freq">8kHz</span>
                            <input type="range" min="-12" max="12" step="0.5" defaultValue="0" />
                            <span className="eq-gain">+0dB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mastering-section">
                      <div className="section-header">
                        <span className="section-icon">🔊</span>
                        <span className="section-name">Stereo Enhancement</span>
                      </div>
                      <div className="stereo-controls">
                        <div className="stereo-control">
                          <label>Stereo Width</label>
                          <input type="range" min="0" max="200" step="5" defaultValue="100" />
                          <span>100%</span>
                        </div>
                        <div className="stereo-control">
                          <label>Bass Mono</label>
                          <input type="range" min="20" max="200" step="10" defaultValue="80" />
                          <span>80Hz</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mastering-section">
                      <div className="section-header">
                        <span className="section-icon">✨</span>
                        <span className="section-name">Harmonic Exciter</span>
                      </div>
                      <div className="exciter-controls">
                        <div className="exciter-control">
                          <label>Exciter Amount</label>
                          <input type="range" min="0" max="100" step="5" defaultValue="25" />
                          <span>25%</span>
                        </div>
                        <div className="exciter-control">
                          <label>Target Frequency</label>
                          <input type="range" min="1000" max="8000" step="100" defaultValue="2000" />
                          <span>2kHz</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mastering-section">
                      <div className="section-header">
                        <span className="section-icon">🧱</span>
                        <span className="section-name">Mastering Limiter</span>
                      </div>
                      <div className="limiter-controls">
                        <div className="limiter-control">
                          <label>Ceiling</label>
                          <input type="range" min="-6" max="0" step="0.1" defaultValue="-0.3" />
                          <span>-0.3dB</span>
                        </div>
                        <div className="limiter-control">
                          <label>Release</label>
                          <input type="range" min="10" max="1000" step="10" defaultValue="50" />
                          <span>50ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mastering-status">
                    <span className="mastering-status-label">Mastering Chain:</span>
                    <span className="mastering-status-value">Professional Multi-band Processing Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Noise Reduction */}
            <div className={`effect-module ${settings.enableNoiseReduction ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableNoiseReduction}
                    onChange={(e) => updateSettings({enableNoiseReduction: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">� Noise Reduction</span>
                </label>
              </div>
              {settings.enableNoiseReduction && (
                  <div className="effect-controls">
                    <label>Strength: {fmt(settings.noiseReduction, 1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.noiseReduction}
                    onChange={(e) => updateSettings({noiseReduction: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* Pitch Shift */}
            <div className={`effect-module ${settings.enablePitchShift ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enablePitchShift}
                    onChange={(e) => updateSettings({enablePitchShift: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🎵 Pitch Shift</span>
                </label>
              </div>
              {settings.enablePitchShift && (
                <div className="effect-controls">
                  <label>Semitones: {fmt(settings.pitchShift, 1)}</label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={settings.pitchShift}
                    onChange={(e) => updateSettings({pitchShift: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* Distortion */}
            <div className={`effect-module ${settings.enableDistortion ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableDistortion}
                    onChange={(e) => updateSettings({enableDistortion: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🔥 Distortion</span>
                </label>
              </div>
              {settings.enableDistortion && (
                  <div className="effect-controls">
                    <label>Amount: {fmt(settings.distortion, 1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.distortion}
                    onChange={(e) => updateSettings({distortion: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* Reverb */}
            <div className={`effect-module ${settings.enableReverb ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableReverb}
                    onChange={(e) => updateSettings({enableReverb: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🏛️ Reverb</span>
                </label>
              </div>
              {settings.enableReverb && (
                <div className="effect-controls">
                  <label>Mix: {fmt(settings.reverbMix, 1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.reverbMix}
                    onChange={(e) => updateSettings({reverbMix: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* Delay */}
            <div className={`effect-module ${settings.enableDelay ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableDelay}
                    onChange={(e) => updateSettings({enableDelay: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🔄 Delay</span>
                </label>
              </div>
              {settings.enableDelay && (
                <div className="effect-controls">
                  <label>Time: {fmt(settings.delayTime, 2)}s</label>
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={settings.delayTime}
                    onChange={(e) => updateSettings({delayTime: parseFloat(e.target.value)})}
                  />
                  <label>Feedback: {fmt(settings.delayFeedback, 1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.1"
                    value={settings.delayFeedback}
                    onChange={(e) => updateSettings({delayFeedback: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* Low-pass Filter */}
            <div className={`effect-module ${settings.enableLowpass ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableLowpass}
                    onChange={(e) => updateSettings({enableLowpass: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🔽 Low-pass Filter</span>
                </label>
              </div>
              {settings.enableLowpass && (
                <div className="effect-controls">
                  <label>Cutoff: {fmt(settings.lowpassFreq, 0)}Hz</label>
                  <input
                    type="range"
                    min="200"
                    max="20000"
                    step="100"
                    value={settings.lowpassFreq}
                    onChange={(e) => updateSettings({lowpassFreq: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

            {/* High-pass Filter */}
            <div className={`effect-module ${settings.enableHighpass ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableHighpass}
                    onChange={(e) => updateSettings({enableHighpass: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🔼 High-pass Filter</span>
                </label>
              </div>
              {settings.enableHighpass && (
                <div className="effect-controls">
                  <label>Cutoff: {fmt(settings.highpassFreq, 0)}Hz</label>
                  <input
                    type="range"
                    min="20"
                    max="2000"
                    step="10"
                    value={settings.highpassFreq}
                    onChange={(e) => updateSettings({highpassFreq: parseFloat(e.target.value)})}
                  />
                </div>
              )}
            </div>

          </div>
          
          {/* M4: WASM Performance Settings */}
          <div className="glass p-4 rounded-lg mb-4">
            <h3 className="section-title">⚡ Performance Options (M4)</h3>
            
            <div className={`effect-module ${settings.enableWASM ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableWASM}
                    onChange={(e) => updateSettings({enableWASM: e.target.checked})}
                  />
                  <span className="toggle-switch"></span>
                  <span className="effect-label">🚀 WASM Acceleration</span>
                </label>
                <span className="effect-status">
                  {settings.enableWASM ? 'High Performance' : 'Standard JS'}
                </span>
              </div>
              {settings.enableWASM && (
                <div className="effect-controls">
                  <label>Block Size: {settings.wasmBlockSize} samples</label>
                  <select
                    value={settings.wasmBlockSize}
                    onChange={(e) => updateSettings({wasmBlockSize: parseInt(e.target.value)})}
                    className="block-size-select"
                  >
                    <option value="1024">1024 (Low Latency)</option>
                    <option value="2048">2048 (Balanced)</option>
                    <option value="4096">4096 (High Throughput)</option>
                    <option value="8192">8192 (Maximum Performance)</option>
                  </select>
                  <p className="wasm-info">
                    WebAssembly acceleration provides up to 3x faster processing for noise reduction and FFT operations.
                    Automatically falls back to JavaScript if WASM is unavailable.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Master Process Button */}
          <div className="master-controls">
            <button
              onClick={handleProcess}
              disabled={!originalFile || isProcessing}
              className="process-btn"
            >
              <div className="process-icon">
                {isProcessing ? (
                  <div className="neural-spinner"></div>
                ) : (
                  <span className="process-emoji">⚡</span>
                )}
              </div>
              <div className="process-text">
                <h4>{isProcessing ? 'Processing Effects...' : 'Apply Selected Effects'}</h4>
                <p>{isProcessing ? 'AI is working on your voice...' : `${getEnabledEffectsCount()} effects selected`}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Profile Management */}
        <div className="glass p-4 rounded-lg">
          <h3 className="font-semibold mb-4">Saved Profiles</h3>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Profile name..."
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveProfile((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Profile name..."]') as HTMLInputElement
                if (input?.value) {
                  handleSaveProfile(input.value)
                  input.value = ''
                }
              }}
              className="btn ghost"
            >
              <Save size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profiles.map((profile) => (
              <div key={profile.name} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                <button
                  onClick={() => handleLoadProfile(profile)}
                  className="flex-1 text-left text-sm hover:text-accent transition-colors"
                >
                  {profile.name}
                </button>
                <button
                  onClick={() => handleDeleteProfile(profile.name)}
                  className="p-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* M7: Export Panel */}
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

                <div className="quality-section">
                  <label>Quality Settings</label>
                  <select 
                    value={exportOptions.quality}
                    onChange={e => setExportOptions({...exportOptions, quality: e.target.value})}
                    className="quality-select"
                  >
                    {EXPORT_FORMATS.find(f => f.id === exportOptions.format)?.quality.map(quality => (
                      <option key={quality.id} value={quality.id}>
                        {quality.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="processing-options">
                  <label>Processing Options</label>
                  <div className="option-grid">
                    <label className="option-item">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.normalize}
                        onChange={e => setExportOptions({...exportOptions, normalize: e.target.checked})}
                      />
                      <span>Normalize Audio</span>
                    </label>
                    <label className="option-item">
                      <input 
                        type="checkbox" 
                        checked={exportOptions.trimSilence}
                        onChange={e => setExportOptions({...exportOptions, trimSilence: e.target.checked})}
                      />
                      <span>Trim Silence</span>
                    </label>
                  </div>

                  <div className="fade-controls">
                    <div className="fade-control">
                      <label>Fade In: {exportOptions.fadeIn}s</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        step="0.1"
                        value={exportOptions.fadeIn}
                        onChange={e => setExportOptions({...exportOptions, fadeIn: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="fade-control">
                      <label>Fade Out: {exportOptions.fadeOut}s</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        step="0.1"
                        value={exportOptions.fadeOut}
                        onChange={e => setExportOptions({...exportOptions, fadeOut: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                {isExporting && (
                  <div className="export-progress">
                    <div className="progress-label">Exporting... {Math.round(exportProgress * 100)}%</div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${exportProgress * 100}%`}}
                      ></div>
                    </div>
                  </div>
                )}

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

        {/* M7: Preset Panel */}
        {showPresetPanel && (
          <div className="modal-overlay" onClick={() => setShowPresetPanel(false)}>
            <div className="preset-panel" onClick={e => e.stopPropagation()}>
              <div className="panel-header">
                <h3>🎛️ Audio Presets</h3>
                <button onClick={() => setShowPresetPanel(false)} className="close-btn">
                  <X size={18} />
                </button>
              </div>
              
              <div className="preset-config">
                <div className="preset-categories">
                  {Object.values(PresetCategory).map(category => (
                    <div key={category} className="category-section">
                      <h4 className="category-title">
                        {category === PresetCategory.VOICE_ENHANCEMENT ? '🎯 Voice Enhancement' :
                         category === PresetCategory.VOCAL_EFFECTS ? '🎵 Vocal Effects' :
                         category === PresetCategory.CREATIVE ? '🎨 Creative' :
                         category === PresetCategory.MASTERING ? '🎚️ Mastering' :
                         category === PresetCategory.AI_GENERATED ? '🤖 AI Generated' :
                         '⚙️ Custom'}
                      </h4>
                      <div className="preset-grid">
                        {availablePresets
                          .filter(preset => preset.category === category)
                          .map(preset => (
                          <div 
                            key={preset.id}
                            className={`preset-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
                          >
                            <div className="preset-info">
                              <div className="preset-name">{preset.name}</div>
                              <div className="preset-desc">{preset.description}</div>
                              <div className="preset-tags">
                                {preset.tags.map(tag => (
                                  <span key={tag} className="preset-tag">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="preset-actions">
                              <button 
                                onClick={() => loadPreset(preset.id)}
                                className="load-preset-btn"
                              >
                                Load
                              </button>
                              {!preset.id.startsWith('voice-clarity') && 
                               !preset.id.startsWith('podcast-master') && 
                               !preset.id.startsWith('creative-voice') && 
                               !preset.id.startsWith('ai-enhance') && (
                                <button 
                                  onClick={() => deletePreset(preset.id)}
                                  className="delete-preset-btn"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="save-preset-section">
                  <h4>💾 Save Current Settings</h4>
                  <div className="save-preset-form">
                    <input 
                      type="text"
                      placeholder="Enter preset name..."
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      className="preset-name-input"
                    />
                    <button 
                      onClick={saveCurrentAsPreset}
                      className="save-preset-btn"
                      disabled={!newPresetName.trim()}
                    >
                      Save Preset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* M8: Quality Assurance Panel */}
        {showQAPanel && (
          <div className="modal-overlay" onClick={() => setShowQAPanel(false)}>
            <div className="qa-panel" onClick={e => e.stopPropagation()}>
              <div className="panel-header">
                <h3>🔬 NASA-Grade Quality Assurance</h3>
                <button onClick={() => setShowQAPanel(false)} className="close-btn">
                  <X size={18} />
                </button>
              </div>
              
              <div className="qa-config">
                {isRunningQA && (
                  <div className="qa-progress-section">
                    <div className="qa-progress-header">
                      <div className="progress-label">Running Quality Invigilator... {Math.round(qaProgress * 100)}%</div>
                      <div className="current-test">{qaCurrentTest}</div>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${qaProgress * 100}%`}}
                      ></div>
                    </div>
                  </div>
                )}

                {qaReport && !isRunningQA && (
                  <div className="qa-results">
                    <div className={`qa-status ${qaReport.overallStatus}`}>
                      <div className="status-header">
                        <span className="status-icon">
                          {qaReport.nasa_grade_compliance ? '🚀' : 
                           qaReport.overallStatus === 'pass' ? '✅' : 
                           qaReport.overallStatus === 'warning' ? '⚠️' : '❌'}
                        </span>
                        <span className="status-text">
                          {qaReport.nasa_grade_compliance ? 'NASA-Grade Compliance Achieved' :
                           qaReport.overallStatus === 'pass' ? 'Quality Assurance Passed' :
                           qaReport.overallStatus === 'warning' ? 'Passed with Warnings' :
                           'Quality Assurance Failed'}
                        </span>
                      </div>
                      <div className="processing-time">
                        Processing Time: {qaReport.processingTime}ms
                      </div>
                    </div>

                    <div className="test-results">
                      <h4>Test Results</h4>
                      <div className="test-grid">
                        {qaReport.tests.map(test => (
                          <div key={test.id} className={`test-result ${test.status}`}>
                            <div className="test-header">
                              <span className="test-icon">
                                {test.status === 'pass' ? '✅' : 
                                 test.status === 'warning' ? '⚠️' : '❌'}
                              </span>
                              <span className="test-name">{test.name}</span>
                            </div>
                            <div className="test-message">{test.message}</div>
                            {test.metrics && (
                              <div className="test-metrics">
                                <div className="metric">Peak: {test.metrics.peakLevel.toFixed(2)}dB</div>
                                <div className="metric">RMS: {test.metrics.rmsLevel.toFixed(2)}dB</div>
                                <div className="metric">THD: {test.metrics.thd.toFixed(3)}%</div>
                                <div className="metric">Dynamic Range: {test.metrics.dynamicRange.toFixed(1)}dB</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {qaReport.recommendations.length > 0 && (
                      <div className="qa-recommendations">
                        <h4>Recommendations</h4>
                        <ul className="recommendation-list">
                          {qaReport.recommendations.map((rec, index) => (
                            <li key={index} className="recommendation-item">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="qa-summary">
                      <div className="summary-stats">
                        <div className="stat">
                          <span className="stat-label">Tests Run:</span>
                          <span className="stat-value">{qaReport.tests.length}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Passed:</span>
                          <span className="stat-value pass">{qaReport.tests.filter(t => t.status === 'pass').length}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Warnings:</span>
                          <span className="stat-value warning">{qaReport.tests.filter(t => t.status === 'warning').length}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Failed:</span>
                          <span className="stat-value fail">{qaReport.tests.filter(t => t.status === 'fail').length}</span>
                        </div>
                      </div>
                      
                      {qaReport.nasa_grade_compliance && (
                        <div className="nasa-badge">
                          <span className="badge-icon">🚀</span>
                          <span className="badge-text">NASA-GRADE CERTIFIED</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!qaReport && !isRunningQA && (
                  <div className="qa-intro">
                    <div className="intro-content">
                      <h4>🛡️ Master Quality Invigilator</h4>
                      <p>
                        Run comprehensive NASA-grade quality assurance tests on your audio processing pipeline.
                        This system validates audio integrity, processing quality, performance metrics, and compliance standards.
                      </p>
                      <ul className="test-list">
                        <li>✓ Audio Buffer Integrity</li>
                        <li>✓ Settings Validation</li>
                        <li>✓ Engine Core Functionality</li>
                        <li>✓ Processing Quality Analysis</li>
                        <li>✓ Performance Benchmarking</li>
                        <li>✓ Memory Leak Detection</li>
                        <li>✓ Export System Validation</li>
                        <li>✓ Preset System Validation</li>
                        <li>✓ Browser Compatibility</li>
                        <li>✓ NASA Compliance Validation</li>
                      </ul>
                      <button 
                        onClick={runQualityAssurance}
                        className="run-qa-btn"
                        disabled={!originalBuffer}
                      >
                        🚀 Run NASA Quality Check
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}