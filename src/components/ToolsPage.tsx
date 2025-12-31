import { type ReactNode, useMemo, useState, useEffect, lazy, Suspense } from 'react'
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Cpu,
  Waves,
  Wand2,
} from 'lucide-react'
import MatrixRain from './MatrixRain'
import BlackOps from './BlackOps'
import VectorCommandCenter from './VectorCommandCenter'
import CentralBrainChat from './CentralBrainChat'
import CyberCanvas from './CyberCanvas'
import VoiceEncrypter from './VoiceEncrypter'
import RawDiagnosticsPanel from './RawDiagnosticsPanel'
import { proAuth, type UserStatus } from '../services/ProAuth'

interface ToolBannerMeta {
  id: string
  name: string
  summary: string
  icon: ReactNode
  status: 'open' | 'soon'
  badge: string
  motionClass: string
  openId?: string
}

function ToolsPage({ onBackToHome }: { onBackToHome: () => void }) {
  // Auth Integration
  const [authStatus, setAuthStatus] = useState<UserStatus>('loading');
  useEffect(() => {
    return proAuth.subscribe((status) => {
      setAuthStatus(status);
    });
  }, []);

  const toolList = useMemo<ToolBannerMeta[]>(() => {
    return [
      {
        id: 'central-brain',
        name: 'Central AI Brain',
        summary: 'Powered by Llama 3.3 70B (Uncensored Cloud Core). The Master Intelligence.',
        icon: <Cpu size={22} aria-hidden />,
        status: 'open',
        badge: 'GOD MODE',
        motionClass: 'ai-circuits',
        openId: 'central-brain',
      },
      {
        id: 'raw-decoder',
        name: 'RAW Decoder Lab',
        summary: 'Lossless demosaic + LibRaw arbitration. Active build.',
        icon: <ShieldCheck size={22} aria-hidden />,
        status: 'open',
        badge: 'ACTIVE',
        motionClass: 'raw-grid',
        openId: 'raw-decoder',
      },
      {
        id: 'voice-encrypter',
        name: 'Voice Encryptor FX',
        summary: 'FX toggles + mastering queue for drops.',
        icon: <Waves size={22} aria-hidden />,
        status: 'open',
        badge: 'ACTIVE',
        motionClass: 'voice-waves',
        openId: 'voice-encrypter',
      },
      {
        id: 'cipher-strip',
        name: 'Cipher Strip',
        summary: 'Encode/Decode utilities with audit logs.',
        icon: <Wand2 size={22} aria-hidden />,
        status: 'soon',
        badge: 'COMING SOON',
        motionClass: 'cipher-grid',
      },
      {
        id: 'black-ops',
        name: 'Cyber Sentinel (Black Ops)',
        summary: 'Advanced Network Diagnostics & Penetration Testing Suite.',
        icon: <ShieldCheck size={22} aria-hidden />,
        status: 'open',
        badge: 'CLASSIFIED',
        motionClass: 'vector-grid',
        openId: 'black-ops',
      },
      {
        id: 'vector-sovereign',
        name: 'Vector Sovereign',
        summary: 'Trace Pixels To Vectors in Full Color. Client-Side Privacy.',
        icon: <Sparkles size={22} aria-hidden />,
        status: 'open',
        badge: 'NEW',
        motionClass: 'ai-circuits',
        openId: 'vector-sovereign',
      },
      {
        id: 'cyber-canvas',
        name: 'Cyber Canvas',
        summary: 'AI Image Generator. Text to Image. 4 Variations.',
        icon: <Sparkles size={22} aria-hidden />,
        status: 'open',
        badge: 'NEW',
        motionClass: 'ai-circuits',
        openId: 'cyber-canvas',
      },
    ]
  }, [authStatus])

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [vectorImage, setVectorImage] = useState<string | undefined>(undefined);

  if (activeTool === 'cyber-canvas') {
    // Render only the image generator (CyberCanvas). Vectorization remains a separate tool.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b0b0d' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTool(null)}
            style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} /> Back to Tools
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CyberCanvas onBack={() => setActiveTool(null)} onVectorize={(url?: string) => { setVectorImage(url); setActiveTool('vector-sovereign'); }} />
        </div>
      </div>
    )
  }

  if (activeTool === 'black-ops') {
    return <BlackOps onBack={() => setActiveTool(null)} addLog={() => {}} />
  }

  if (activeTool === 'vector-sovereign') {
    return <VectorCommandCenter 
      onBack={() => {
        setActiveTool(null);
        setVectorImage(undefined);
      }} 
      initialImageUrl={vectorImage}
    />
  }

  if (activeTool === 'central-brain') {
    return <CentralBrainChat onClose={() => setActiveTool(null)} />
  }

  if (activeTool === 'voice-encrypter') {
    return <VoiceEncrypter onBackToHome={() => setActiveTool(null)} />
  }

  if (activeTool === 'raw-decoder') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b0b0d' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setActiveTool(null)}
            style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} /> Back to Tools
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <RawDiagnosticsPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="app tools-screen">
      <MatrixRain opacity={0.08} density={24} speed={2} />

      <div className="sysbar">
        <div className="sys-item"><span className="dot" /> ACCESS: OPEN</div>
        <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="sys-item mono">TOOLS  MATRIX-{Math.abs(((Date.now() / 1000) | 0) % 999)}</div>
      </div>

      <main className="tools-viewport container">
        <section className="tools-panel">
          <header className="tools-hero">
            <div className="tools-label">01  Tools</div>
            <h1>Tools Library</h1>
            <p>Authorized Educational Security Tools. Local Execution Only.</p>
            <div className="tools-hero-actions">
              <button className="back-button" onClick={onBackToHome}>
                <ArrowLeft size={18} aria-hidden /> Back to Home
              </button>
            </div>
          </header>

          <div className="tool-banner-list">
            {toolList.map((tool) => (
              <article key={tool.id} className={`tool-banner ${tool.status}`}>
                <div className={`tool-motion ${tool.motionClass}`} aria-hidden />
                <div className="tool-banner-meta">
                  <span className="tool-icon-pill">{tool.icon}</span>
                  <div>
                    <p className="tool-tag">#{tool.badge}</p>
                    <h2>{tool.name}</h2>
                    <p className="tool-summary">{tool.summary}</p>
                  </div>
                </div>
                <button
                  className={`btn ${tool.status === 'open' ? 'cta-open' : ''}`}
                  disabled={tool.status !== 'open'}
                  onClick={() => {
                    if (tool.status !== 'open') return
                    if (tool.openId) {
                      setActiveTool(tool.openId)
                    }
                  }}
                >
                  {tool.status === 'open' ? 'Open Tool' : 'Coming Soon'}
                </button>
              </article>
            ))}
          </div>

        </section>
      </main>

      <footer className="footer">
        <p>Educational Use Only. Do not use on unauthorized networks.</p>
        <small className="mono" aria-label="terminal-log">terminal-log: tools deck primed</small>
      </footer>
    </div>
  )
}

export default ToolsPage
