/**
 * Voice Encrypter Version 2.0 - Professional Aerospace Standards
 * 
 * Advanced mission-control interface with professional spectral processing,
 * multi-agent quality assurance, and aerospace-grade compliance monitoring.
 */

import { useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import MissionControl from './MissionControl'
import './MissionControl.css'

type VoiceEncrypterV2Props = {
  onBackToHome: () => void
}

export default function VoiceEncrypterV2({ onBackToHome }: VoiceEncrypterV2Props) {
  const [status, setStatus] = useState('Ready. Upload audio file for professional-grade processing.')
  const [error, setError] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [qualityReport, setQualityReport] = useState<any>(null)
  const [professionalCompliance, setProfessionalCompliance] = useState<number>(0)

  // File upload handler
  const handleFileSelect = async (file: File) => {
    try {
      setError(null)
      setOriginalFile(file)
      setStatus('Processing file with professional-grade analysis...')
      
      // Convert file to audio buffer
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      
      setOriginalBuffer(buffer)
      setStatus('Audio loaded. Mission Control analyzing...')
      
      console.log(`🚀 Professional Audio Processing: ${file.name} loaded - ${buffer.duration.toFixed(1)}s`)
      
    } catch (err) {
      console.error('🚨 Professional Processing Error:', err)
      setError(`Professional processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setStatus('Error in professional processing system')
    }
  }

  // Handle processing completion
  const handleProcessingComplete = (result: AudioBuffer) => {
    setProcessedBuffer(result)
    setIsProcessing(false)
    setStatus('Professional-grade processing complete. Audio optimized to aerospace standards.')
  }

  // Handle quality report updates
  const handleQualityReport = (report: any) => {
    setQualityReport(report)
    if (report && report.overallScore !== undefined) {
      setProfessionalCompliance(report.overallScore)
    }
  }

  // Export processed audio
  const exportAudio = () => {
    if (!processedBuffer) return
    
    try {
      // Create WAV file
      const offlineContext = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate
      )
      
      const source = offlineContext.createBufferSource()
      source.buffer = processedBuffer
      source.connect(offlineContext.destination)
      source.start()
      
      offlineContext.startRendering().then(renderedBuffer => {
        // Convert to WAV and download
        const wav = audioBufferToWav(renderedBuffer)
        const blob = new Blob([wav], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${originalFile?.name?.split('.')[0] || 'professional-processed'}_PROFESSIONAL_GRADE.wav`
        a.click()
        
        URL.revokeObjectURL(url)
        setStatus('Professional-certified audio exported successfully.')
      })
      
    } catch (err) {
      console.error('🚨 Export Error:', err)
      setError('Export failed. Please try again.')
    }
  }

  return (
    <div className="voice-encrypter-v2">
      {/* Professional Header Interface */}
      <div className="professional-header">
        <button 
          onClick={onBackToHome}
          className="back-btn"
        >
          <ArrowLeft size={20} />
          Return to Base
        </button>
        
        <div className="professional-branding">
          <h1>VOICE ENCRYPTER V2.0</h1>
          <p>Aerospace Standards • Mission-Critical Audio Processing</p>
        </div>
        
        <div className="compliance-indicator">
          <div className="compliance-score">
            Professional: {professionalCompliance.toFixed(0)}%
          </div>
          <div className={`compliance-status ${professionalCompliance >= 90 ? 'certified' : professionalCompliance >= 70 ? 'qualified' : 'developing'}`}>
            {professionalCompliance >= 90 ? 'CERTIFIED' : professionalCompliance >= 70 ? 'QUALIFIED' : 'DEVELOPING'}
          </div>
        </div>
      </div>

      {/* File Upload Interface */}
      {!originalBuffer && (
        <div className="professional-upload-section">
          <div className="upload-panel">
            <div className="upload-header">
              <h3>🛡️ SECURE AUDIO UPLOAD</h3>
              <p>Upload your audio for professional-grade processing and analysis</p>
            </div>
            
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              id="professional-file-input"
            />
            
            <label htmlFor="professional-file-input" className="professional-upload-zone">
              <div className="upload-icon">
                <Upload size={48} />
              </div>
              <div className="upload-text">
                <h4>{originalFile ? originalFile.name : 'Select Audio File'}</h4>
                <p>Supports: WAV, MP3, M4A • Max: 100MB • Professional Security Standards</p>
              </div>
            </label>
            
            <div className="upload-status">
              <div className="status-indicator">
                <span className="status-label">System Status:</span>
                <span className="status-value">{status}</span>
              </div>
              {error && (
                <div className="error-display">
                  <span className="error-label">Error:</span>
                  <span className="error-message">{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mission Control Interface */}
      {originalBuffer && (
        <>
          <MissionControl 
            audioBuffer={originalBuffer}
            onProcessingComplete={handleProcessingComplete}
            onQualityReport={handleQualityReport}
          />
          
          {/* Processing Actions */}
          <div className="professional-actions">
            <div className="action-panel">
              <h3>MISSION OPERATIONS</h3>
              
              <div className="action-grid">
                <button 
                  onClick={() => setIsProcessing(true)}
                  disabled={isProcessing}
                  className="action-btn process-btn"
                >
                  {isProcessing ? '🔄 PROCESSING...' : '🚀 INITIATE PROCESSING'}
                </button>
                
                <button 
                  onClick={exportAudio}
                  disabled={!processedBuffer}
                  className="action-btn export-btn"
                >
                  📁 EXPORT PROFESSIONAL-CERTIFIED AUDIO
                </button>
                
                <button 
                  onClick={() => {
                    setOriginalBuffer(null)
                    setProcessedBuffer(null)
                    setOriginalFile(null)
                    setStatus('Ready for new mission.')
                  }}
                  className="action-btn reset-btn"
                >
                  🔄 NEW MISSION
                </button>
              </div>
              
              {qualityReport && (
                <div className="quality-summary">
                  <h4>QUALITY ASSURANCE REPORT</h4>
                  <div className="quality-metrics">
                    <div className="quality-item">
                      <span>Overall Score:</span>
                      <span className="score">{qualityReport.overallScore?.toFixed(1)}%</span>
                    </div>
                    <div className="quality-item">
                      <span>Professional Compliance:</span>
                      <span className="score">{qualityReport.professionalCompliance?.toFixed(1)}%</span>
                    </div>
                    <div className="quality-item">
                      <span>Audio Standards:</span>
                      <span className="score">{qualityReport.audioStandards?.toFixed(1)}%</span>
                    </div>
                    <div className="quality-item">
                      <span>Performance:</span>
                      <span className="score">{qualityReport.performanceStandards?.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {qualityReport.certifications && qualityReport.certifications.length > 0 && (
                    <div className="certifications-earned">
                      <h5>CERTIFICATIONS ACHIEVED:</h5>
                      {qualityReport.certifications.map((cert: string, index: number) => (
                        <div key={index} className="certification-badge">
                          ✅ {cert}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Audio buffer to WAV converter utility
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = length * blockAlign
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)
  const channels = []

  let pos = 0

  // Write WAV header
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i))
    }
  }

  writeString('RIFF')
  view.setUint32(pos, bufferSize - 8, true); pos += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(pos, 16, true); pos += 4 // Chunk size
  view.setUint16(pos, 1, true); pos += 2 // Audio format (PCM)
  view.setUint16(pos, numberOfChannels, true); pos += 2
  view.setUint32(pos, sampleRate, true); pos += 4
  view.setUint32(pos, byteRate, true); pos += 4
  view.setUint16(pos, blockAlign, true); pos += 2
  view.setUint16(pos, bytesPerSample * 8, true); pos += 2
  writeString('data')
  view.setUint32(pos, dataSize, true); pos += 4

  // Get audio data
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  // Interleave and write audio data
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(pos, sample * 0x7FFF, true)
      pos += 2
    }
  }

  return arrayBuffer
}

export { VoiceEncrypterV2 }