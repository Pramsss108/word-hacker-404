import { type ReactNode, lazy, Suspense, useMemo, useState, useEffect } from 'react'
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Cpu,
  Waves,
  Wand2,
  Globe,
  Smartphone,
  Video,
  Zap,
} from 'lucide-react'
import MatrixRain from './MatrixRain'
const BlackOps           = lazy(() => import('./BlackOps'))
const VectorCommandCenter = lazy(() => import('./VectorCommandCenter'))
const CentralBrainChat   = lazy(() => import('./CentralBrainChat'))
const CyberCanvas        = lazy(() => import('./CyberCanvas'))
const VoiceEncrypter     = lazy(() => import('./VoiceEncrypter'))
const RawDiagnosticsPanel = lazy(() => import('./RawDiagnosticsPanel'))
const SarkariCompress    = lazy(() => import('./SarkariCompress'))
const HydraConsole       = lazy(() => import('./HydraConsole'))
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
  imageUrl?: string
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
        id: 'ghost-factory',
        name: 'Global Voice Factory',
        summary: 'Zero-Shot Multi-lingual cloning. F5-TTS Engine.',
        icon: <Globe size={22} aria-hidden />,
        status: 'open',
        badge: 'POLYGLOT',
        motionClass: 'voice-waves',
        openId: 'ghost-factory',
      },
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
        id: 'yt-swarm',
        name: 'YouTube Swarm',
        summary: 'Unlimited 4K/MP3 Downloader. Powered by Decentralized Proxy Swarm.',
        icon: <Video size={22} aria-hidden />,
        status: 'open',
        badge: 'RED TEAM',
        motionClass: 'voice-waves',
        openId: 'yt-swarm',
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
        id: 'project-ghost',
        name: 'Project Ghost VPN',
        summary: 'Zero-Cost, Undetectable Hybrid VPN. Cloudflare + P2P Swarm.',
        icon: <Globe size={22} aria-hidden />,
        status: 'open',
        badge: 'BETA',
        motionClass: 'ai-circuits',
        openId: 'project-ghost',
      },
      {
        id: 'phantom-sim',
        name: 'Phantom SIM Forge',
        summary: 'Generate ephemeral eSIM profiles for SMS bypass. Black Ops Grade.',
        icon: <Smartphone size={22} aria-hidden />,
        status: 'open',
        badge: 'BLACK OPS',
        motionClass: 'sim-glitch',
        openId: 'phantom-sim',
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
      {
        id: 'shadow-fight',
        name: 'Shadow Fight Arena (Dev)',
        summary: 'P2P Fighting Game Prototype with Red Team Tools.',
        icon: <ShieldCheck size={22} aria-hidden />,
        status: 'open',
        badge: 'DEV',
        motionClass: 'vector-grid',
        openId: 'shadow-fight',
      },
      {
        id: 'sarkari-compress',
        name: 'Sarkari Compress',
        summary: 'Ultra-fast, secure file compression and optimization tool.',
        icon: <ShieldCheck size={22} aria-hidden />,
        status: 'open',
        badge: 'NEW',
        motionClass: 'vector-grid',
        openId: 'sarkari-compress',
        imageUrl: './logo.png'
      },
      {
        id: 'hydra-console',
        name: 'HYDRA v5.0 — OTP Recon',
        summary: '90 live Indian platform endpoints. Real-time SSE stream. PHP bridge + Swarm mode.',
        icon: <Zap size={22} aria-hidden />,
        status: 'open',
        badge: 'BLACK OPS',
        motionClass: 'vector-grid',
        openId: 'hydra-console',
      },
    ]
  }, [authStatus])

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [vectorImage, setVectorImage] = useState<string | undefined>(undefined);

  const toolFallback = <div className="lazy-loading"><span className="mono">Loading...</span></div>

  if (activeTool === 'cyber-canvas') {
    return (
      <Suspense fallback={toolFallback}>
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
      </Suspense>
    )
  }

  if (activeTool === 'black-ops') {
    return <Suspense fallback={toolFallback}><BlackOps onBack={() => setActiveTool(null)} addLog={() => { }} /></Suspense>
  }

  if (activeTool === 'vector-sovereign') {
    return <Suspense fallback={toolFallback}><VectorCommandCenter
      onBack={() => {
        setActiveTool(null);
        setVectorImage(undefined);
      }}
      initialImageUrl={vectorImage}
    /></Suspense>
  }

  if (activeTool === 'central-brain') {
    return <Suspense fallback={toolFallback}><CentralBrainChat onClose={() => setActiveTool(null)} /></Suspense>
  }

  if (activeTool === 'voice-encrypter') {
    return <Suspense fallback={toolFallback}><VoiceEncrypter onBackToHome={() => setActiveTool(null)} /></Suspense>
  }

  if (activeTool === 'raw-decoder') {
    return (
      <Suspense fallback={toolFallback}>
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
      </Suspense>
    )
  }

  if (activeTool === 'sarkari-compress') {
    return <Suspense fallback={toolFallback}><SarkariCompress onClose={() => setActiveTool(null)} /></Suspense>
  }

  if (activeTool === 'hydra-console') {
    return <Suspense fallback={toolFallback}><HydraConsole onBack={() => setActiveTool(null)} /></Suspense>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span className="tool-icon-pill">{tool.icon}</span>
                    {tool.imageUrl && (
                      <div style={{
                        width: '45px', height: '45px', borderRadius: '10px',
                        overflow: 'hidden', border: '1px solid rgba(10, 150, 255, 0.2)',
                        background: 'rgba(0,0,0,0.3)', flexShrink: 0
                      }}>
                        <img src={tool.imageUrl} alt={tool.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
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
