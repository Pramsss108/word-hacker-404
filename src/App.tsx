import { useEffect, useRef, useState } from 'react'
import { Search, Zap, Brain, Sparkles, ChevronRight, Waves, Wand2, Music4, Lock } from 'lucide-react'
import './App.css'
import MatrixRain from './components/MatrixRain'
import VoiceEncrypter from './components/VoiceEncrypter'
import { VoiceEncrypterV2 } from './components/VoiceEncrypterV2'

type Tone = 'friendly' | 'angry' | 'sexual' | 'comedic' | 'taboo'

const SAMPLE_DECODES: Array<{ id: string; word: string; tone: Tone; teaser: string; emoji: string }>= [
  { id: 'w1', word: 'ভাইরাল', tone: 'comedic', teaser: 'সবাই বলে, কিন্তু ভিতরে চাপা insecurity।', emoji: '🔥' },
  { id: 'w2', word: 'খিস্তি', tone: 'angry', teaser: 'রাগ না, ব্যথা—চোখে পরে না, মুখে বেরোয়।', emoji: '🗡️' },
  { id: 'w3', word: 'সামল', tone: 'friendly', teaser: 'বন্ধুদের ঠাট্টা—ভালোবাসার ছদ্মবেশ।', emoji: '🫶' },
]

const SAMPLE_DICT: Array<{ id: string; word: string; literal: string; street: string; tones: Tone[]; lang: 'bn'|'hi'|'en' }>= [
  { id: 'd1', word: 'লাউডা', literal: 'শব্দ/গালি', street: 'ভাইয়েরা রেগে গেলে—অথবা জোকস।', tones: ['angry','comedic','taboo'], lang: 'bn' },
  { id: 'd2', word: 'BC', literal: 'cuss acronym', street: 'মিমে ছুঁড়ে দেওয়া আগুন।', tones: ['comedic','taboo'], lang: 'hi' },
  { id: 'd3', word: 'simp', literal: 'simpleton', street: 'attention-ভিত্তিক প্রেমের তুলি।', tones: ['friendly','comedic'], lang: 'en' },
]

function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'playing' | 'voice-encrypter' | 'voice-encrypter-v2'>('menu')
  const [score] = useState(0)
  const [query, setQuery] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const heroRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="app">
      {/* Background effect */}
      <MatrixRain opacity={0.08} density={24} speed={2} />

      {gameMode === 'voice-encrypter' ? (
        <VoiceEncrypter onBackToHome={() => setGameMode('menu')} />
      ) : gameMode === 'voice-encrypter-v2' ? (
        <VoiceEncrypterV2 onBackToHome={() => setGameMode('menu')} />
      ) : gameMode === 'menu' ? (
        <>
          {/* System bar (mood setter) */}
          <div className="sysbar">
            <div className="sys-item"><span className="dot" /> ACCESS: OPEN</div>
            <div className="sys-item mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="sys-item mono">BETA · MATRIX-{Math.abs((Date.now()/1000|0)%999)}</div>
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
                <button className="tool glass"><Waves size={18} /> Sound Lab</button>
                <button className="tool glass"><Wand2 size={18} /> Slang Scanner</button>
                <button 
                  className="tool glass"
                  onClick={() => setGameMode('voice-encrypter')}
                >
                  <Music4 size={18} /> Voice Encryptor
                </button>
                <button 
                  className="tool glass nasa-grade"
                  onClick={() => setGameMode('voice-encrypter-v2')}
                >
                  <Sparkles size={18} /> NASA V2.0
                </button>
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
                {['Bengali','Hindi','English','para','meme'].map(t => (
                  <span key={t} className="tag">#{t}</span>
                ))}
              </div>
              <div className="dict-results">
                {SAMPLE_DICT.filter(x => x.word.toLowerCase().includes(query.toLowerCase())).slice(0,6).map(x => (
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

            <section className="stats glass">
              <div className="stat">
                <span className="stat-label">Best Score</span>
                <span className="stat-value">{score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Games Played</span>
                <span className="stat-value">0</span>
              </div>
            </section>
          </main>

          <footer className="footer">
            <p>Built like NASA. React + TypeScript + Vite. Optimized for touch.</p>
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
    </div>
  )
}

export default App