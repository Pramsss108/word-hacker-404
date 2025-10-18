import { useState, useEffect, useRef } from 'react'
import { X, Upload, Download, Save, Trash2, ArrowLeft } from 'lucide-react'
import MatrixRain from './MatrixRain'

// Import the audio service functions
import { 
  EffectSettings, 
  defaultSettings, 
  fileToAudioBuffer, 
  applyEffects, 
  audioBufferToWavBlob 
} from '../services/audioService'

// Import the new engine core for live preview
import { getEngineCore, PreviewGraph } from '../services/engineCore'

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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalAudioRef = useRef<HTMLAudioElement>(null)
  const processedAudioRef = useRef<HTMLAudioElement>(null)

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
      
      setStatus(`${file.name} ready. Use A/B preview or adjust effects.`)
    } catch (error) {
      console.error('Failed to load audio for preview:', error)
      setError('Failed to load audio file for preview.')
      setStatus('Failed to load audio. Please try another file.')
    }
  }

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
      
      // AI Processing with progress updates
      const processedBuffer = await applyEffects(audioBuffer, settings, (stage, progress) => {
        const percentage = Math.round(progress * 100)
        switch (stage) {
          case 'Initializing AI Engine...':
            setStatus('🤖 Initializing AI neural networks...')
            break
          case 'AI Vocal Separation...':
            setStatus(`🎯 AI separating vocals from background... ${percentage}%`)
            break
          case 'Mixing separated tracks...':
            setStatus('🎚️ Intelligently mixing audio layers...')
            break
          case '🤖 AI Voice Enhancement...':
            setStatus('✨ AI enhancing voice clarity and quality...')
            break
          case '🔇 Noise Reduction...':
            setStatus(`🛡️ NASA-Grade spectral noise analysis and filtering... ${percentage}%`)
            break
          case 'Professional Mastering...':
            setStatus('🎵 Applying professional mastering chain...')
            break
          case 'Processing Complete!':
            setStatus('🛡️ Voice successfully encrypted and enhanced!')
            break
          default:
            setStatus(`🔄 ${stage} ${percentage}%`)
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

  const handleDownload = () => {
    if (!processedUrl || !originalFile) return

    const a = document.createElement('a')
    a.href = processedUrl
    a.download = `hacker-voice-${originalFile.name}`
    a.click()
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
        currentGraph.sourceNode.onended = () => {
          setIsPlaying('none')
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
                  <button
                    onClick={handleDownload}
                    className="download-btn"
                  >
                    <Download size={16} />
                    Secure Download
                  </button>
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
            
            {/* AI Enhancement */}
            <div className={`effect-module ${settings.enableAIEnhancement ? 'active' : 'inactive'}`}>
              <div className="effect-header">
                <label className="effect-toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableAIEnhancement}
                    onChange={(e) => updateSettings({enableAIEnhancement: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  <span className="effect-name">🤖 AI Enhancement</span>
                </label>
              </div>
              {settings.enableAIEnhancement && (
                  <div className="effect-controls">
                    <label>Strength: {fmt(settings.aiEnhancement, 1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.aiEnhancement}
                    onChange={(e) => updateSettings({aiEnhancement: parseFloat(e.target.value)})}
                  />
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
      </div>
    </div>
  )
}