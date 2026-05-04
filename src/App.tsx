import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Zap, Brain, ChevronRight, Wand2, Music4, Lock, Sparkles, Shield } from 'lucide-react'
import './App.css'
// MatrixRain is purely decorative — lazy-load so it doesn't block first paint.
const MatrixRain = lazy(() => import('./components/MatrixRain'))
// import RawWatchdogIndicator from './components/RawWatchdogIndicator'  // removed: clashes with floating chat
// Direct deep import (NOT the barrel) so we don't drag RawExportService /
// wasm-vips into the main chunk just to read a watchdog flag.
import { getSharedArrayBufferWatchdogReport } from './raw/RawWorkerPool'

// Local type — avoids pulling Firebase into initial bundle
type UserStatus = 'loading' | 'anonymous' | 'pro' | 'god_mode'

// Lazy-load heavy route-level components — drastically cuts initial JS parse time
const VoiceEncrypter  = lazy(() => import('./components/VoiceEncrypter'))
const BlackOps        = lazy(() => import('./components/BlackOps'))
const ToolsPage       = lazy(() => import('./components/ToolsPage'))
const NeuralEditor    = lazy(() => import('./components/NeuralEditor/NeuralEditor').then(m => ({ default: m.NeuralEditor })))
const SarkariCompress = lazy(() => import('./components/SarkariCompress'))
// LoginDashboard pulls Firebase — keep it lazy so first paint is instant
const LoginDashboard  = lazy(() => import('./components/LoginDashboard'))
// Diagnostics panel is heavy and below-the-fold — lazy load
const RawDiagnosticsPanel = lazy(() => import('./components/RawDiagnosticsPanel'))

type Tone = 'friendly' | 'angry' | 'sexual' | 'comedic' | 'taboo'

const SAMPLE_DECODES: Array<{ id: string; word: string; tone: Tone; teaser: string; emoji: string }> = [
  { id: 'w1', word: 'ভাইরাল', tone: 'comedic', teaser: 'সবাই বলে, কিন্তু ভিতরে চাপা insecurity।', emoji: '🔥' },
  { id: 'w2', word: 'খিস্তি', tone: 'angry', teaser: 'রাগ না, ব্যথা—চোখে পরে না, মুখে বেরোয়।', emoji: '🗡️' },
  { id: 'w3', word: 'সামল', tone: 'friendly', teaser: 'বন্ধুদের ঠাট্টা—ভালোবাসার ছদ্মবেশ।', emoji: '🫶' },
]

const SAMPLE_DICT: Array<{ id: string; word: string; literal: string; street: string; tones: Tone[]; lang: 'bn' | 'hi' | 'en' }> = [
  { id: 'd1', word: 'লাউডা', literal: 'শব্দ/গালি', street: 'ভাইয়েরা রেগে গেলে—অথবা জোকস।', tones: ['angry', 'comedic', 'taboo'], lang: 'bn' },
  { id: 'd2', word: 'BC', literal: 'cuss acronym', street: 'মিমে ছুঁড়ে দেওয়া আগুন।', tones: ['comedic', 'taboo'], lang: 'hi' },
  { id: 'd3', word: 'simp', literal: 'simpleton', street: 'attention-ভিত্তিক প্রেমের তুলি।', tones: ['friendly', 'comedic'], lang: 'en' },
]

function App() {
  const isStandaloneSarkari = window.location.pathname === '/freesarkarifilecompress';
  const [gameMode, setGameMode] = useState<'menu' | 'playing' | 'voice-encrypter' | 'tools' | 'neural-editor' | 'black-ops' | 'sarkari-compress'>(isStandaloneSarkari ? 'sarkari-compress' : 'menu')
  const [score] = useState(0)
  const [query, setQuery] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [authStatus, setAuthStatus] = useState<UserStatus>('loading')
  const [currentUser, setCurrentUser] = useState<any>(null)
  // Defer mounting MatrixRain until after first paint to keep TTI low.
  const [showMatrix, setShowMatrix] = useState(false)
  useEffect(() => {
    const kick = () => setShowMatrix(true)
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(kick, { timeout: 1200 })
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const t = setTimeout(kick, 350)
    return () => clearTimeout(t)
  }, [])

  // Subscribe to auth changes — Firebase loaded LAZILY so it doesn't block first paint
  useEffect(() => {
    let unsub: (() => void) | null = null
    let cancelled = false
    // Defer Firebase import until after first paint (idle)
    const kick = () => {
      import('./services/ProAuth').then(({ proAuth }) => {
        if (cancelled) return
        unsub = proAuth.subscribe((status, user) => {
          setAuthStatus(status)
          setCurrentUser(user)
        })
      }).catch(err => console.warn('ProAuth lazy load failed:', err))
    }
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(kick, { timeout: 1500 })
    } else {
      setTimeout(kick, 200)
    }
    return () => {
      cancelled = true
      if (unsub) unsub()
    }
  }, [])

  const heroRef = useRef<HTMLDivElement | null>(null)
  const sabReport = useMemo(() => getSharedArrayBufferWatchdogReport(), [])

  // ENABLE F12 DEVTOOLS (DEBUGGING)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        try {
          // Dynamic import to avoid breaking web build
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await (getCurrentWindow() as any).openDevTools();
        } catch (err) {
          console.warn("DevTools not available (Web Mode?)", err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Start AI loading in background immediately when app opens
    // initWorker();

    const t = setTimeout(() => setShowIntro(false), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="app">
      {/* Background effect — mounted after first paint */}
      {showMatrix && (
        <Suspense fallback={null}>
          <MatrixRain opacity={0.08} density={24} speed={2} />
        </Suspense>
      )}
      {/* SAB watchdog disabled — clashed with floating chat. Status still visible in sysbar. */}
      {/* <RawWatchdogIndicator /> */}

      <Suspense fallback={<div className="lazy-loading"><span className="mono">Loading...</span></div>}>
      {gameMode === 'sarkari-compress' ? (
        <SarkariCompress onClose={() => {
          if (isStandaloneSarkari) {
            window.location.href = 'https://google.com'; // Anonymous exit
          } else {
            setGameMode('menu');
          }
        }} />
      ) : gameMode === 'voice-encrypter' ? (
        <VoiceEncrypter onBackToHome={() => setGameMode('menu')} />
      ) : gameMode === 'tools' ? (
        <ToolsPage
          onBackToHome={() => setGameMode('menu')}
        />
      ) : gameMode === 'neural-editor' ? (
        <NeuralEditor onExit={() => setGameMode('menu')} />
      ) : gameMode === 'black-ops' ? (
        <BlackOps onBack={() => setGameMode('menu')} addLog={() => { }} />
      ) : gameMode === 'menu' ? (
        <>
          {/* System bar (mood setter) */}
          <div className="sysbar">
            <div className="sys-item clickable" onClick={() => setShowLogin(true)} style={{ cursor: 'pointer' }}>
              <span className={`dot ${currentUser ? 'active' : ''}`} style={{ background: currentUser ? '#0aff6a' : (authStatus === 'loading' ? '#f59e0b' : '#d92e2e') }} />
              {authStatus === 'loading' ? 'ACCESS: VERIFYING...' : (currentUser ? `ID: ${currentUser.displayName?.split(' ')[0].toUpperCase()}` : 'ACCESS: GUEST')}
            </div>
            <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="sys-item mono">BETA · MATRIX-{Math.abs((Date.now() / 1000 | 0) % 999)}</div>
            <div className={`sys-item mono sab-pill ${sabReport.available ? 'ok' : 'warn'}`}>
              {sabReport.available ? 'SAB LOCK' : 'SAB FALLBACK'}
            </div>
          </div>

          <header className="header hero" ref={heroRef}>
            <div className="container">
              <div className="brand-row">
                <div className="logo-pill glass">
                  <Zap className="logo-icon" aria-hidden />
                  <span className="logo-text">Word Hacker 404</span>
                </div>
                <span className="beta-tag">CYBER EDITION</span>
              </div>

              <h1 className="hero-title">
                {showIntro ? (
                  <span className="type-line">Word Hacker 404 — <span className="mono">decode forbidden words</span><span className="cursor" /></span>
                ) : (
                  <>Word Hacker 404 — <span className="mono">decode forbidden words</span></>
                )}
              </h1>
              <p className="hero-sub">
                আমরা শব্দ খুঁজি, অনুভূতি দেখাই। ৪৫–৬০ সেকেন্ডের ডিকোড রিলস।
              </p>

              <div className="cta-row">
                <button className="btn full" onClick={() => {
                  heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setTimeout(() => {
                    const el = document.getElementById('featured')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }, 260)
                }}>
                  <Sparkles size={18} /> Decode Now <ChevronRight size={18} />
                </button>
                <button className="btn ghost full" onClick={() => document.getElementById('dictionary')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Search size={18} /> Open Dictionary
                </button>
              </div>
            </div>
          </header>

          <main className="main container">
            {/* Tools strip */}
            <section className="tools-strip" aria-label="Tools">
              <div className="tools-row">
                <button
                  className="tool glass"
                  onClick={() => setGameMode('neural-editor')}
                >
                  <Brain size={18} /> Neural Writer
                </button>
                <button
                  className="tool glass"
                  onClick={() => setGameMode('tools')}
                >
                  <Wand2 size={18} /> Useful Tools
                </button>
                <button
                  className="tool glass"
                  onClick={() => setGameMode('voice-encrypter')}
                >
                  <Music4 size={18} /> Voice Encryptor
                </button>
                <button
                  className="tool glass danger-glow"
                  onClick={() => setGameMode('black-ops')}
                  style={{ borderColor: 'rgba(220, 38, 38, 0.3)', color: '#ef4444' }}
                >
                  <Shield size={18} /> Black Ops
                </button>
                {/* Consolidated to a single enhanced Voice Encrypter as requested */}
                <button className="tool glass"><Lock size={18} /> Private Drops</button>
              </div>
            </section>

            {/* Featured decode carousel */}
            <section id="featured" className="featured">
              <h2 className="section-title">Featured Decodes</h2>
              <div className="carousel">
                {SAMPLE_DECODES.map(d => (
                  <article key={d.id} className={`decode-card glass ${d.tone === 'taboo' ? 'danger' : ''}`}>
                    <header className="decode-head">
                      <span className="emoji" aria-hidden>{d.emoji}</span>
                      <h3 className="decode-word">{d.word}</h3>
                      <span className={`badge tone-${d.tone}`}>{d.tone}</span>
                    </header>
                    <p className="decode-tease">{d.teaser}</p>
                    <button className="btn full small">Watch Reel</button>
                  </article>
                ))}
              </div>
            </section>

            {/* Dictionary quick search */}
            <section id="dictionary" className="dictionary glass">
              <h2 className="section-title">Slang Dictionary</h2>
              <div className="dict-search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a word… বাংলা, हिन्दी, English"
                  aria-label="Search dictionary"
                />
              </div>
              <div className="dict-tags">
                {['Bengali', 'Hindi', 'English', 'para', 'meme'].map(t => (
                  <span key={t} className="tag">#{t}</span>
                ))}
              </div>
              <div className="dict-results">
                {SAMPLE_DICT.filter(x => x.word.toLowerCase().includes(query.toLowerCase())).slice(0, 6).map(x => (
                  <article key={x.id} className="dict-card glass">
                    <header className="dict-head">
                      <h3 className="dict-word">{x.word}</h3>
                      <div className="tones">
                        {x.tones.map(t => <span key={t} className={`badge tone-${t}`}>{t}</span>)}
                      </div>
                    </header>
                    <p className="dict-mean"><b>lit:</b> {x.literal}</p>
                    <p className="dict-mean"><b>street:</b> {x.street}</p>
                    <div className="dict-actions">
                      <button className="btn ghost">Listen</button>
                      <button className="btn">Report</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="raw-lab" className="raw-lab-section" aria-label="RAW Diagnostics">
              <RawDiagnosticsPanel />
            </section>

            {/* How it works + callout */}
            <section className="how glass">
              <h2 className="section-title">How it works</h2>
              <ol className="steps">
                <li><span className="dot" /> Access</li>
                <li><span className="dot" /> Decode</li>
                <li><span className="dot" /> Reflect</li>
                <li><span className="dot" /> Submit your word</li>
              </ol>
              <div className="callout">
                <p>Secret drops via Telegram. Subscribe for private decodes.</p>
                <a className="btn" href="#" aria-disabled>Join Soon</a>
              </div>
            </section>
          </main>

          <footer className="footer">
            <p>Built like a pro. React + TypeScript + Vite. Optimized for touch.</p>
            <small className="mono" aria-label="terminal-log">terminal-log: ready</small>
          </footer>
        </>
      ) : (
        <main className="main container">
          <div className="game">
            <div className="game-header glass">
              <button
                className="back-button"
                onClick={() => setGameMode('menu')}
              >
                ← Back
              </button>
              <div className="score">Score: {score}</div>
            </div>

            <div className="game-content">
              <div className="game-placeholder">
                <Brain className="placeholder-icon" />
                <h3>Game Loading...</h3>
                <p>AI is preparing your word challenge!</p>
              </div>
            </div>
          </div>
        </main>
      )}

      </Suspense>

      {showLogin && (
        <Suspense fallback={null}>
          <LoginDashboard onClose={() => setShowLogin(false)} />
        </Suspense>
      )}
    </div>
  )
}

export default App