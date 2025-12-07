import { type ReactNode, useCallback, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Wand2,
  Workflow,
  Zap,
} from 'lucide-react'
import MatrixRain from './MatrixRain'
import VectorCommandCenter from './VectorCommandCenter'
import { getSharedArrayBufferWatchdogReport } from '../raw'

interface ToolBannerMeta {
  id: string
  name: string
  summary: string
  icon: ReactNode
  status: 'open' | 'soon'
  badge: string
  motionClass: string
  openId?: 'raw' | 'downloader' | 'vector'
}

interface RawProcessStep {
  id: string
  title: string
  detail: string
  notes: string[]
}

const rawSteps: RawProcessStep[] = [
  {
    id: 'ingest',
    title: 'Stage 1 · Intake',
    detail: 'RAW file is opened and checked for basics before anything else happens.',
    notes: [
      'Confirms the camera pattern.',
      'Captures quick preview stats.',
    ],
  },
  {
    id: 'demosaic',
    title: 'Stage 2 · Clean Up',
    detail: 'Image is demosaiced and balanced so it looks natural.',
    notes: [
      'Noise reduced, colors lined up.',
      '16-bit quality stays untouched.',
    ],
  },
  {
    id: 'qa',
    title: 'Stage 3 · Ready Check',
    detail: 'Quick QA pass before you export or hand off.',
    notes: [
      'Shows what changed per stage.',
      'Flags anything that needs attention.',
    ],
  },
]



function ToolsPage({ onBackToHome }: { onBackToHome: () => void }) {
  const sabReport = useMemo(() => getSharedArrayBufferWatchdogReport(), [])
  const toolList = useMemo<ToolBannerMeta[]>(() => ([
    {
      id: 'vector-command',
      name: 'Vector Command Center',
      summary: 'Prompt Architect & Image-to-SVG Vectorizer.',
      icon: <Cpu size={22} aria-hidden />,
      status: 'open',
      badge: 'NEW',
      motionClass: 'vector-grid',
      openId: 'vector',
    },
    {
      id: 'raw-decoder',
      name: 'RAW Decoder Lab',
      summary: 'Lossless demosaic + LibRaw arbitration. Active build.',
      icon: <ShieldCheck size={22} aria-hidden />,
      status: 'open',
      badge: 'ACTIVE',
      motionClass: 'raw-grid',
      openId: 'raw',
    },
    {
      id: 'internet-downloader',
      name: '404 Social Media Downloader',
      summary: 'Client-side helper for the yt-dlp PowerShell runner.',
      icon: <Download size={22} aria-hidden />,
      status: 'open',
      badge: 'NEW',
      motionClass: 'downloader-stream',
      openId: 'downloader',
    },
    {
      id: 'voice-encrypter',
      name: 'Voice Encryptor FX',
      summary: 'FX toggles + mastering queue for drops.',
      icon: <Wand2 size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'cipher-glyphs',
    },
    {
      id: 'prompt-forge',
      name: 'Prompt Forge',
      summary: 'Micro prompt polisher + tone guardrails.',
      icon: <Sparkles size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'prompt-plasma',
    },
    {
      id: 'ops-pipeline',
      name: 'Ops Pipeline',
      summary: 'Multi-step task runner for drops and proofing.',
      icon: <Workflow size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'ops-orbit',
    },
    {
      id: 'anagram-lab',
      name: 'Anagram Lab',
      summary: 'Scramble tools for undercover scripts.',
      icon: <Shuffle size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'anagram-matrix',
    },
    {
      id: 'ai-companion',
      name: 'AI Companion',
      summary: 'Supervise agents, pin diagnostics, run macros.',
      icon: <Cpu size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'ai-circuits',
    },
  ]), [])

  const [activeTool, setActiveTool] = useState<'raw' | 'downloader' | 'vector' | null>(null)
  const [rawStepIndex, setRawStepIndex] = useState(0)



  const openDesktopAppDocs = useCallback(() => {
    window.open('https://github.com/Pramsss108/word-hacker-404/releases/latest/download/WH404%20Downloader.exe', '_blank')
  }, [])

  const cycleRawStep = useCallback((direction: 'prev' | 'next') => {
    setRawStepIndex((prev) => {
      if (direction === 'next') {
        return prev + 1 >= rawSteps.length ? 0 : prev + 1
      }
      return prev - 1 < 0 ? rawSteps.length - 1 : prev - 1
    })
  }, [])

  return (
    <div className="app tools-screen">
      <MatrixRain opacity={0.08} density={24} speed={2} />

      <div className="sysbar">
        <div className="sys-item"><span className="dot" /> ACCESS: OPEN</div>
        <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="sys-item mono">TOOLS · MATRIX-{Math.abs(((Date.now() / 1000) | 0) % 999)}</div>
        <div className={`sys-item mono sab-pill ${sabReport.available ? 'ok' : 'warn'}`}>
          {sabReport.available ? 'SAB LOCK' : 'SAB FALLBACK'}
        </div>
      </div>

      <main className="tools-viewport container">
        <section className="tools-panel">
          <header className="tools-hero">
            <div className="tools-label">01 · Tools</div>
            <h1>Tools Library</h1>
            <p>Floating client-side utilities. Tap a tool banner to open its deck.</p>
            <div className="tools-hero-actions">
              <button className="back-button" onClick={onBackToHome}>
                <ArrowLeft size={18} aria-hidden /> Back to Home
              </button>
              <a 
                href="/downloads/WordHacker404-Setup.exe" 
                download
                className="back-button"
                style={{ marginLeft: '12px', color: '#0aff6a', borderColor: 'rgba(10, 255, 106, 0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={18} aria-hidden /> Get Desktop App
              </a>
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
        <p>Built like a pro. React + TypeScript + Vite. Optimized for touch.</p>
        <small className="mono" aria-label="terminal-log">terminal-log: tools deck primed</small>
      </footer>

      {activeTool === 'vector' && (
        <div className="tools-overlay" role="dialog" aria-modal="true">
          <div className="raw-holo" style={{ width: '95vw', maxWidth: 'none', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="raw-anim-grid vector-grid" aria-hidden />
            <header className="raw-holo-head">
              <div>
                <h3 className="raw-head-title">Vector Command Center</h3>
                <p className="raw-head-note">Prompt Architect & Image-to-SVG Vectorizer.</p>
              </div>
              <button className="btn ghost" onClick={() => setActiveTool(null)}>
                Close <span className="close-cross" aria-hidden>✕</span>
              </button>
            </header>

            <div style={{ flex: 1, overflow: 'hidden', padding: '0' }}>
              <VectorCommandCenter />
            </div>
          </div>
        </div>
      )}

      {activeTool === 'raw' && (
        <div className="tools-overlay" role="dialog" aria-modal="true">
          <div className="raw-holo">
            <div className="raw-anim-grid" aria-hidden />
            <header className="raw-holo-head">
              <div>
                <h3 className="raw-head-title">RAW Decoder Lab</h3>
                <p className="raw-head-note">RAW image converter · from any RAW to any format.</p>
              </div>
              <button className="btn ghost" onClick={() => setActiveTool(null)}>
                Close <span className="close-cross" aria-hidden>✕</span>
              </button>
            </header>

            <section className="raw-deck">
              <div className="raw-deck-head">
                <p className="raw-deck-label">Stage preview</p>
                <div className="raw-deck-badge">Live</div>
              </div>

              <div className="tools-slider" aria-roledescription="carousel">
                <button className="slider-btn" aria-label="Previous stage" onClick={() => cycleRawStep('prev')}>
                  <ChevronLeft size={20} aria-hidden />
                </button>

                <div className="tool-stage">
                  <div className="tool-track" style={{ transform: `translateX(-${rawStepIndex * 100}%)` }}>
                    {rawSteps.map((step) => (
                      <article key={step.id} className="tool-slide">
                        <div className="tool-floating glass">
                          <header className="tool-slide-head">
                            <span className="tool-icon-pill"><ShieldCheck size={20} aria-hidden /></span>
                            <div>
                              <p className="tool-tag">Stage</p>
                              <h2>{step.title}</h2>
                            </div>
                            <span className="status-chip live">ACTIVE</span>
                          </header>
                          <p className="tool-summary">{step.detail}</p>
                          <ul className="tool-highlights">
                            {step.notes.map((note) => (
                              <li key={note}>{note}</li>
                            ))}
                          </ul>
                          <div className="tool-actions compact">
                            <button className="btn ghost" onClick={() => cycleRawStep('next')}>
                              Next Stage <ChevronRight size={16} aria-hidden />
                            </button>
                            <span className="stage-hint">Currently running…</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <button className="slider-btn" aria-label="Next stage" onClick={() => cycleRawStep('next')}>
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTool === 'downloader' && (
        <div className="tools-overlay" role="dialog" aria-modal="true">
          <div className="raw-holo" style={{ maxWidth: '500px' }}>
            <div className="raw-anim-grid downloader-grid" aria-hidden />
            <header className="raw-holo-head">
              <div>
                <h3 className="raw-head-title">404 Social Media Downloader</h3>
                <p className="raw-head-note">Desktop App Required</p>
              </div>
              <button className="btn ghost" onClick={() => setActiveTool(null)}>
                Close <span className="close-cross" aria-hidden>✕</span>
              </button>
            </header>

            <section className="downloader-box" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
              <p className="downloader-hint intense">
                For the best experience, use our dedicated desktop application.
                <br />
                Secure, fast, and ad-free.
              </p>

              <div className="trust-badge" style={{ fontSize: '0.8rem', color: '#9aa3b2', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                ⚠️ <strong>Windows Warning?</strong> Click "More Info" → "Run Anyway".
                <br/>
                (Normal for new open-source tools!)
              </div>
              
              <div className="cta-stack" style={{ width: '100%', maxWidth: '400px' }}>
                <button className="btn full" type="button" onClick={openDesktopAppDocs}>
                  <Zap size={20} /> Download for Windows (PC)
                </button>
                
                <button 
                  className="btn ghost full" 
                  type="button" 
                  onClick={() => window.open('https://github.com/Pramsss108/word-hacker-404/releases', '_blank')}
                >
                  <Sparkles size={20} /> Download for Mac
                </button>
              </div>

              <p className="downloader-hint">
                Mac version coming soon. Check releases for updates.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolsPage
