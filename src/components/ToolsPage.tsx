import { useState } from 'react'
import { ArrowLeft, Hash, Shuffle, RotateCcw, Type, CheckCircle, Lock, Wand2, Brain, Sparkles } from 'lucide-react'
import MatrixRain from './MatrixRain'
import RawImageConverter from './RawImageConverter'

interface ToolProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function ToolCard({ title, icon, children }: ToolProps) {
  return (
    <article className="tool-card glass">
      <header className="tool-head">
        {icon}
        <h3 className="tool-title">{title}</h3>
      </header>
      <div className="tool-content">
        {children}
      </div>
    </article>
  )
}

function ToolsPage({ onBackToHome }: { onBackToHome: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  const tools = [
    { id: 'raw-converter', name: 'RAW Image Converter', icon: <Shuffle size={20} />, description: 'Convert RAW images to standard formats' },
    { id: 'word-counter', name: 'Word Counter', icon: <Hash size={20} />, description: 'Count words and characters in text' },
    { id: 'text-reverser', name: 'Text Reverser', icon: <RotateCcw size={20} />, description: 'Reverse text strings' },
    { id: 'case-converter', name: 'Case Converter', icon: <Type size={20} />, description: 'Change text case (upper/lower/title)' },
    { id: 'palindrome-checker', name: 'Palindrome Checker', icon: <CheckCircle size={20} />, description: 'Check if text is a palindrome' },
    { id: 'anagram-generator', name: 'Anagram Generator', icon: <Shuffle size={20} />, description: 'Generate anagrams from words' },
    { id: 'base64-encoder', name: 'Base64 Encoder/Decoder', icon: <Lock size={20} />, description: 'Encode and decode Base64 strings' },
    { id: 'url-encoder', name: 'URL Encoder/Decoder', icon: <Wand2 size={20} />, description: 'Encode and decode URLs' },
    { id: 'json-formatter', name: 'JSON Formatter', icon: <Brain size={20} />, description: 'Format and validate JSON' },
    { id: 'color-picker', name: 'Color Picker', icon: <Sparkles size={20} />, description: 'Pick and convert colors' },
  ]

  if (selectedTool === 'raw-converter') {
    return <RawImageConverter onBack={() => setSelectedTool(null)} />
  }

  return (
    <div className="app">
      <MatrixRain opacity={0.08} density={24} speed={2} />

      <div className="sysbar">
        <div className="sys-item"><span className="dot" /> ACCESS: OPEN</div>
        <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="sys-item mono">TOOLS · MATRIX-{Math.abs((Date.now()/1000|0)%999)}</div>
      </div>

      <main className="main container">
        <div className="tools-page">
          <header className="tools-header">
            <button className="back-button" onClick={onBackToHome}>
              <ArrowLeft size={18} /> Back to Home
            </button>
            <h1 className="page-title">Tools Library</h1>
            <p className="page-subtitle">Collection of client-side utilities and converters</p>
          </header>

          <div className="tools-grid">
            {tools.map((tool) => (
              <ToolCard key={tool.id} title={tool.name} icon={tool.icon}>
                <p className="tool-description">{tool.description}</p>
                <div className="tool-placeholder">
                  <p>Coming soon...</p>
                  <button 
                    className="btn small" 
                    onClick={() => setSelectedTool(tool.id)}
                    disabled={tool.id !== 'raw-converter'}
                  >
                    Open Tool
                  </button>
                </div>
              </ToolCard>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Built like a pro. React + TypeScript + Vite. Optimized for touch.</p>
        <small className="mono" aria-label="terminal-log">terminal-log: tools library ready</small>
      </footer>
    </div>
  )
}

export default ToolsPage