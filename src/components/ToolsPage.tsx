import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Waves,
  Wand2,
  Workflow,
} from 'lucide-react'
import MatrixRain from './MatrixRain'
import { getSharedArrayBufferWatchdogReport } from '../raw'

interface ToolBannerMeta {
  id: string
  name: string
  summary: string
  icon: ReactNode
  status: 'open' | 'soon'
  badge: string
  motionClass: string
  openId?: 'raw' | 'downloader'
}

interface RawProcessStep {
  id: string
  title: string
  detail: string
  notes: string[]
}

type DownloaderFormat = 'mp4-1080' | 'mp4-720' | 'mp3'

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

const formatOptions: Array<{ id: DownloaderFormat; label: string; detail: string }> = [
  { id: 'mp4-1080', label: '1080p MP4', detail: 'Full HD video + audio.' },
  { id: 'mp4-720', label: '720p MP4', detail: 'Smaller drop, still HD.' },
  { id: 'mp3', label: 'MP3 Audio', detail: '192 kbps audio-only.' },
]

function parseUrlInput(rawValue: string): string[] {
  return rawValue
    .split(/[\s,\n]+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item))
}

function ToolsPage({ onBackToHome }: { onBackToHome: () => void }) {
  const sabReport = useMemo(() => getSharedArrayBufferWatchdogReport(), [])
  const toolList = useMemo<ToolBannerMeta[]>(() => ([
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
      name: 'Internet Downloader',
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
      icon: <Waves size={22} aria-hidden />,
      status: 'soon',
      badge: 'COMING SOON',
      motionClass: 'voice-waves',
    },
    {
      id: 'cipher-strip',
      name: 'Cipher Strip',
      summary: 'Encode/Decode utilities with audit logs.',
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

  const [activeTool, setActiveTool] = useState<'raw' | 'downloader' | null>(null)
  const [rawStepIndex, setRawStepIndex] = useState(0)

  const [downloaderUrls, setDownloaderUrls] = useState('')
  const [downloaderFormat, setDownloaderFormat] = useState<DownloaderFormat>('mp4-1080')
  const [downloaderSlide, setDownloaderSlide] = useState(0)
  const [autoAdvancePending, setAutoAdvancePending] = useState(false)
  const [autoAdvanceDone, setAutoAdvanceDone] = useState(false)
  const [clipboardPrimed, setClipboardPrimed] = useState(false)
  const [isDesktopDevice, setIsDesktopDevice] = useState(true)

  const parsedUrls = useMemo(() => parseUrlInput(downloaderUrls), [downloaderUrls])
  const deckStatus = parsedUrls.length === 0
    ? { label: 'Paste link', tone: 'idle' as const }
    : { label: `Ready · ${parsedUrls.length} job${parsedUrls.length === 1 ? '' : 's'}`, tone: 'ready' as const }
  const downloaderSlideLabels = ['Paste queue', 'Select format', 'Run helper']
  const totalDownloaderSlides = downloaderSlideLabels.length

  const handleUrlChange = useCallback((value: string) => {
    setDownloaderUrls(value)
    if (!value.trim()) {
      setDownloaderSlide(0)
      setAutoAdvancePending(false)
      setAutoAdvanceDone(false)
    } else {
      setAutoAdvanceDone(false)
    }
  }, [])

  useEffect(() => {
    if (activeTool !== 'downloader' || clipboardPrimed) {
      return
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    navigator.clipboard.readText().then((text) => {
      if (text && parseUrlInput(text).length > 0) {
        handleUrlChange(text.trim())
      }
      setClipboardPrimed(true)
    }).catch(() => {
      setClipboardPrimed(true)
    })
  }, [activeTool, clipboardPrimed, handleUrlChange])

  const handlePaste = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      handleUrlChange(text.trim())
      setClipboardPrimed(true)
    } catch (error) {
      console.warn('Clipboard read failed', error)
    }
  }, [handleUrlChange])

  const handleClear = useCallback(() => {
    handleUrlChange('')
    setClipboardPrimed(false)
  }, [handleUrlChange])

  const cycleDownloaderSlide = useCallback((direction: 'prev' | 'next') => {
    setDownloaderSlide((prev) => {
      if (direction === 'next') {
        return Math.min(totalDownloaderSlides - 1, prev + 1)
      }
      return Math.max(0, prev - 1)
    })
    if (direction === 'prev') {
      setAutoAdvancePending(false)
    }
  }, [totalDownloaderSlides])

  useEffect(() => {
    if (!downloaderUrls.trim()) {
      setAutoAdvancePending(false)
      setAutoAdvanceDone(false)
      return
    }
    if (autoAdvanceDone) {
      return
    }
    if (downloaderSlide === 0 && !autoAdvancePending) {
      setDownloaderSlide(1)
      setAutoAdvancePending(true)
    }
  }, [downloaderUrls, downloaderSlide, autoAdvancePending, autoAdvanceDone])

  useEffect(() => {
    if (!autoAdvancePending || downloaderSlide !== 1 || typeof window === 'undefined') {
      return
    }
    const timer = window.setTimeout(() => {
      setDownloaderSlide(2)
      setAutoAdvancePending(false)
      setAutoAdvanceDone(true)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [autoAdvancePending, downloaderSlide])

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return
    }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')
    setIsDesktopDevice(!isMobile)
  }, [])

  const openDesktopAppDocs = useCallback(() => {
    window.open('https://github.com/Pramsss108/word-hacker-404/releases/download/desktop-v1.0.1/Word%20Hacker%20Downloader%200.1.0.exe', '_blank')
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
          <div className="raw-holo">
            <div className="raw-anim-grid downloader-grid" aria-hidden />
            <header className="raw-holo-head">
              <div>
                <h3 className="raw-head-title">Internet Downloader</h3>
                <p className="raw-head-note">Paste, pick format, fire the helper. One slide. Fast.</p>
              </div>
              <button className="btn ghost" onClick={() => setActiveTool(null)}>
                Close <span className="close-cross" aria-hidden>✕</span>
              </button>
            </header>

            <section className="downloader-box">
              <div className="downloader-box-head">
                <div>
                  <p className="downloader-title">Deck 02 · Internet Downloader</p>
                  <span className="downloader-sub">{clipboardPrimed ? 'Clipboard linked' : 'Autopaste armed once'} · {parsedUrls.length || 'No'} job{parsedUrls.length === 1 ? '' : 's'}</span>
                </div>
                <div className="downloader-head-actions">
                  <span className={`engine-chip ${deckStatus.tone}`}>{deckStatus.label}</span>
                  <button className="btn ghost tiny" type="button" onClick={handlePaste}>
                    Paste link
                  </button>
                </div>
              </div>

              <div className="downloader-slider" aria-roledescription="carousel">
                <button
                  className="slider-btn"
                  type="button"
                  aria-label="Previous step"
                  onClick={() => cycleDownloaderSlide('prev')}
                  disabled={downloaderSlide === 0}
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>

                <div className="downloader-stage">
                  <div className="downloader-track" style={{ transform: `translateX(-${downloaderSlide * 100}%)` }}>
                    <article className="downloader-slide">
                      <div className="downloader-panel">
                        <div className="panel-head">
                          <span className="step-label">Step 01</span>
                          <h4>Paste queue</h4>
                        </div>
                        {isDesktopDevice && (
                          <div className="desktop-callout">
                            <p>Desktop detected. Install the Word Hacker Downloader app for one-click pulls.</p>
                            <button className="btn ghost tiny" type="button" onClick={openDesktopAppDocs}>Download desktop app</button>
                          </div>
                        )}
                        <textarea
                          id="downloader-input"
                          className="downloader-textarea compact"
                          value={downloaderUrls}
                          onChange={(event) => handleUrlChange(event.target.value)}
                          placeholder="Drop YouTube links here."
                        />
                        <div className="downloader-row tight">
                          <button className="btn" type="button" onClick={handlePaste}>
                            Paste
                          </button>
                          <button className="btn ghost" type="button" onClick={handleClear} disabled={!downloaderUrls.trim()}>
                            Clear
                          </button>
                          <span className="downloader-hint">Spaces, commas, or new lines all work.</span>
                        </div>
                      </div>
                    </article>

                    <article className="downloader-slide">
                      <div className="downloader-panel">
                        <div className="panel-head">
                          <span className="step-label">Step 02</span>
                          <h4>Select format</h4>
                        </div>
                        <p className="downloader-hint">Pick the drop style.</p>
                        <div className="format-grid">
                          {formatOptions.map((option) => (
                            <button
                              key={option.id}
                              className={`format-card ${downloaderFormat === option.id ? 'active' : ''}`}
                              type="button"
                              onClick={() => setDownloaderFormat(option.id)}
                            >
                              <strong>{option.label}</strong>
                              <small>{option.detail}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>

                    <article className="downloader-slide">
                      <div className="downloader-panel">
                        <div className="panel-head">
                          <span className="step-label">Step 03</span>
                          <h4>{isDesktopDevice ? 'Install helper app' : 'Telegram bot'}</h4>
                        </div>
                        {isDesktopDevice ? (
                          <>
                            <p className="downloader-hint intense">Windows installer ready! Download the .exe, install like any software, then paste YouTube URLs to download.</p>
                            <div className="cta-stack">
                              <button className="btn" type="button" onClick={openDesktopAppDocs}>
                                Download Windows Installer (103 MB)
                              </button>
                              <button
                                className="btn ghost"
                                type="button"
                                onClick={() => window.open('https://github.com/Pramsss108/word-hacker-404/releases/tag/desktop-v1.0.0', '_blank')}
                              >
                                View all platforms (Windows/Mac/Linux)
                              </button>
                            </div>
                            <div className="helper-status-grid">
                              <div>
                                <p className="helper-label">Installer Status</p>
                                <p className="helper-value">✅ Ready (v1.0.0)</p>
                              </div>
                              <div>
                                <p className="helper-label">What to expect</p>
                                <p className="helper-value">Double-click installer → Install → Launch → Paste links → Download</p>
                              </div>
                              <div>
                                <p className="helper-label">Output path</p>
                                <p className="helper-value">Downloads/WordHackerDownloads</p>
                              </div>
                            </div>
                            <ul className="helper-checklist">
                              <li><strong>Installer will include:</strong> Signed .exe (Windows), .dmg (Mac), .AppImage (Linux)</li>
                              <li><strong>One-click install:</strong> No Node.js, no terminal—just install and run</li>
                              <li><strong>Auto-updates:</strong> New versions install automatically</li>
                            </ul>
                            <p className="downloader-hint">Meanwhile, use the PowerShell helper or wait for Telegram bot (mobile-friendly).</p>
                          </>
                        ) : (
                          <>
                            <p className="downloader-hint intense">You’re on mobile. The Telegram bot handles downloads with zero setup.</p>
                            <div className="cta-stack">
                              <button className="btn" type="button" onClick={() => window.open('https://t.me/wordhacker_downloader_bot', '_blank')} disabled>
                                Telegram bot (coming soon)
                              </button>
                            </div>
                            <p className="downloader-hint">Bot notifications + auto-uploads are shipping soon. We’ll drop the invite link here.</p>
                          </>
                        )}
                      </div>
                    </article>
                  </div>
                </div>

                <button
                  className="slider-btn"
                  type="button"
                  aria-label="Next step"
                  onClick={() => cycleDownloaderSlide('next')}
                  disabled={downloaderSlide >= totalDownloaderSlides - 1}
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>

              <div className="downloader-pips">
                {downloaderSlideLabels.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={downloaderSlide === index ? 'active' : ''}
                    onClick={() => setDownloaderSlide(index)}
                    aria-label={label}
                  >
                    0{index + 1}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolsPage
