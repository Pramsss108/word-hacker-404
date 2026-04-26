import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Play, Square, RefreshCw, Zap, FileText, Lock,
  Phone, Shield, Settings, X, HelpCircle,
} from 'lucide-react'
import HelpModal from './HelpModal'
import { proAuth, type UserStatus } from '../services/ProAuth'

const HYDRA_BASE = 'http://localhost:4040'

// ── Backend interfaces (UNCHANGED — preserves API contract) ──
interface LogEntry { t: string; msg: string; lvl: 'info' | 'success' | 'error' | 'warn' | 'sys' | 'ping' }
interface AttackState { running: boolean; phone: string; wave: number; sent: number; blocked: number; ratelimited: number; fake200: number; api_count?: number }
interface Category { name: string; count: number }
interface IntelCat  { category: string; total: number; hits: number }
interface IntelTop  { name: string; total: number; otp_sent: number }
interface IntelData { top_targets: IntelTop[]; by_category: IntelCat[] }
interface SwarmWorker { wave: number; sent: number; blocked: number; targets: number; done: boolean; error: string | null }
interface SwarmStatus  { available: boolean; running: boolean; phone: string; workers: number; wave: number; sent: number; blocked: number; ratelimited: number; fake200: number; targets: number; worker_detail: Record<string, SwarmWorker> }

// ── Premium tone palette ──
const T = {
  bg:        '#080b14',
  surface:   '#0e1424',
  surface2:  '#131b30',
  border:    '#1c2541',
  borderHi:  '#2d3a63',
  brand:     '#0aff6a',
  brandDim:  '#07c06b',
  cyan:      '#00cfff',
  red:       '#ff4d6d',
  yellow:    '#ffd54a',
  purple:    '#c074ff',
  text:      '#e6edf7',
  muted:     '#8390ad',
  dim:       '#454f6e',
  mono:      'JetBrains Mono, Consolas, monospace',
  sans:      'Inter, system-ui, sans-serif',
}

const lvlColor = (l: string) =>
  ({ success: T.brand, error: T.red, warn: T.yellow, sys: T.cyan, info: T.text } as Record<string, string>)[l] || T.muted
const lvlPrefix = (l: string) =>
  ({ success: '[OK]', error: '[ERR]', warn: '[WARN]', sys: '[SYS]', info: '>' } as Record<string, string>)[l] || '>'

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT — single-view 2-column dashboard
// ─────────────────────────────────────────────────────────
function HydraConsole({ onBack }: { onBack: () => void }) {
  const [authStatus, setAuthStatus] = useState<UserStatus>('loading')
  const isPro = authStatus === 'pro' || authStatus === 'god_mode'
  useEffect(() => {
    const unsub = proAuth.subscribe((status) => setAuthStatus(status))
    return () => { unsub() }
  }, [])

  // UI state
  const [showHelp, setShowHelp] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showUpsell, setShowUpsell] = useState<string | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [agreedTos, setAgreedTos] = useState<boolean>(() => {
    try { return localStorage.getItem('hydra_tos_v1') === 'yes' } catch { return false }
  })

  // Form state (preserved)
  const [phone, setPhone]       = useState('')
  const [mode, setMode]         = useState<'single' | 'debug' | 'swarm'>('swarm')
  const [category, setCategory] = useState('all')
  const [stagger, setStagger]   = useState('0.3')
  const [maxWaves, setMaxWaves] = useState('3')
  const [dualVector, setDualVector] = useState(true)
  const [swarmWorkers, setSwarmWorkers] = useState(3)

  // Live state (preserved)
  const [logs, setLogs]               = useState<LogEntry[]>([])
  const [sms, setSms]                 = useState<AttackState>({ running: false, phone: '', wave: 0, sent: 0, blocked: 0, ratelimited: 0, fake200: 0 })
  const [cats, setCats]               = useState<Category[]>([])
  const [up, setUp]                   = useState<boolean | null>(null)
  const [err, setErr]                 = useState<string | null>(null)
  const [, setIntel]                  = useState<IntelData | null>(null)
  const [swarmStatus, setSwarmStatus] = useState<SwarmStatus | null>(null)
  const [reportUrl, setReportUrl]     = useState<string | null>(null)

  const logRef     = useRef<HTMLDivElement>(null)
  const wasRunning = useRef(false)

  // ── API functions (PRESERVED) ──
  const probe = async () => {
    try {
      const j = await fetch(`${HYDRA_BASE}/api/status`, { cache: 'no-store' }).then(r => r.json())
      setSms(j); setUp(true); setErr(null)
      const cs = await fetch(`${HYDRA_BASE}/api/categories`).then(r => r.json())
      setCats(cs)
    } catch { setUp(false) }
  }
  const fetchIntel = async () => { try { const d = await fetch(`${HYDRA_BASE}/api/intel`).then(r => r.json()); setIntel(d) } catch {} }
  const fetchSwarm = async () => { try { const d: SwarmStatus = await fetch(`${HYDRA_BASE}/api/swarm/status`).then(r => r.json()); setSwarmStatus(d) } catch {} }

  useEffect(() => {
    probe()
    const id      = setInterval(() => { fetch(`${HYDRA_BASE}/api/status`).then(r => r.json()).then(setSms).catch(() => {}) }, 2000)
    fetchIntel(); const intelId = setInterval(fetchIntel, 10000)
    fetchSwarm(); const swarmId = setInterval(fetchSwarm, 3000)
    return () => { clearInterval(id); clearInterval(intelId); clearInterval(swarmId) }
  }, [])

  useEffect(() => {
    if (!up) return
    const es = new EventSource(`${HYDRA_BASE}/api/stream`)
    es.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.lvl !== 'ping') setLogs(p => [...p.slice(-799), d]) } catch {} }
    es.onerror = () => setUp(false)
    return () => es.close()
  }, [up])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

  // Auto-fetch latest report when a run completes
  useEffect(() => {
    if (wasRunning.current && !sms.running && sms.wave > 0) {
      fetch(`${HYDRA_BASE}/api/report/list`)
        .then(r => r.json())
        .then((list: { html_file: string }[]) => { if (list.length > 0) setReportUrl(`${HYDRA_BASE}/hydra_reports/${list[0].html_file}`) })
        .catch(() => {})
    }
    wasRunning.current = sms.running
  }, [sms.running])

  // Unified launch
  const launch = async () => {
    setErr(null)
    if (!agreedTos) { setErr('Please agree to the Terms & Disclaimer below before sending.'); return }
    if (!/^\d{10}$/.test(phone.trim())) { setErr('Please enter a valid 10-digit phone number'); return }
    setReportUrl(null)
    if (mode === 'swarm') {
      try {
        await fetch(`${HYDRA_BASE}/api/swarm/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim(), workers: swarmWorkers, stagger: parseFloat(stagger) || 0.3, maxWaves: parseInt(maxWaves) || 0, dualVector }),
        })
        await fetchSwarm()
      } catch { setErr('Cannot reach the server. Make sure HYDRA backend is running.') }
    } else {
      try {
        const j = await fetch(`${HYDRA_BASE}/api/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim(), mode, category, stagger: parseFloat(stagger) || 0.3, maxWaves: parseInt(maxWaves) || 0, dualVector }),
        }).then(r => r.json())
        if (!j.ok) setErr(j.error)
      } catch { setErr('Cannot reach the server. Make sure HYDRA backend is running.') }
    }
  }
  const stopAll = async () => {
    try { await fetch(`${HYDRA_BASE}/api/stop`,        { method: 'POST' }) } catch {}
    try { await fetch(`${HYDRA_BASE}/api/swarm/stop`,  { method: 'POST' }) } catch {}
  }

  // Combined "running" + live stats
  const running = sms.running || swarmStatus?.running || false
  const isSwarm = mode === 'swarm'
  const live = isSwarm ? {
    sent: swarmStatus?.sent ?? 0,
    blocked: swarmStatus?.blocked ?? 0,
    rate: swarmStatus?.ratelimited ?? 0,
    wave: swarmStatus?.wave ?? 0,
  } : { sent: sms.sent, blocked: sms.blocked, rate: sms.ratelimited, wave: sms.wave }
  const sources = sms.api_count || swarmStatus?.targets || 0

  const setRounds = (rounds: number | 'inf') => {
    if (rounds === 'inf' && !isPro) { setShowUpsell('unlimited'); return }
    setMaxWaves(rounds === 'inf' ? '0' : String(rounds))
  }
  const currentRounds: number | 'inf' = maxWaves === '0' ? 'inf' : (parseInt(maxWaves) || 1)
  const switchMode = (m: 'single' | 'swarm' | 'debug') => {
    if (m === 'swarm' && !isPro) { setShowUpsell('turbo'); return }
    setMode(m)
  }
  const toggleSmartRouting = () => {
    if (!isPro) { setShowUpsell('smart'); return }
    setDualVector(v => !v)
  }

  const progressPct = currentRounds === 'inf' ? (running ? 50 : 0) : Math.min(100, (live.wave / currentRounds) * 100)

  // ────────────────────── RENDER ──────────────────────
  return (
    <div className="hydra-root" style={{
      position: 'fixed', inset: 0, background: T.bg, color: T.text, fontFamily: T.sans,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* ═════════ TOP BAR ═════════ */}
      <header style={{
        background: 'rgba(8,11,20,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${T.border}`, padding: '0 18px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: `1px solid ${T.borderHi}`, color: T.text,
          padding: '6px 11px', borderRadius: 8, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Tools
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.brand}, ${T.brandDim})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 14px ${T.brand}55`,
          }}>
            <Zap size={16} color="#000" />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3 }}>SMS Bomber Pro</div>
            <div style={{ fontSize: 9.5, color: T.muted, fontFamily: T.mono, letterSpacing: 0.5 }}>v5.0 · India</div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: T.surface, border: `1px solid ${T.border}`,
            padding: '5px 11px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: up ? T.brand : T.red,
              boxShadow: up ? `0 0 8px ${T.brand}` : `0 0 8px ${T.red}`,
            }} />
            {up === null ? 'Connecting…' : up ? <span><span style={{ color: T.brand }}>{sources}</span> sources live</span> :
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Offline
                <button onClick={probe} style={{ background: 'transparent', border: `1px solid ${T.dim}`, color: T.muted, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}>
                  <RefreshCw size={9} />
                </button>
              </span>}
          </div>

          {!running && reportUrl && (
            <a href={reportUrl} target="_blank" rel="noreferrer" style={{
              padding: '5px 11px', background: 'rgba(192,116,255,0.12)',
              border: `1px solid ${T.purple}`, color: T.purple, borderRadius: 8,
              fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
            }}>
              <FileText size={11} /> Last Report
            </a>
          )}

          <button onClick={() => setShowHelp(true)} title="How to use" aria-label="Help guide" style={{
            background: 'rgba(10,255,106,0.08)', border: `1px solid ${T.brand}55`, color: T.brand,
            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,255,106,0.18)'; e.currentTarget.style.boxShadow = `0 0 12px ${T.brand}55` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,255,106,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* ═════════ 2-COLUMN GRID ═════════ */}
      <main className="hydra-grid" style={{
        flex: 1, display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr',
        gap: 14, padding: 14, overflow: 'hidden', minHeight: 0,
      }}>

        {/* ───── LEFT: CONTROLS ───── */}
        <section className="hydra-controls" style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, minHeight: 0 }}>

            {/* Phone */}
            <label style={labelStyle}>Phone Number</label>
            <div style={{
              display: 'flex', alignItems: 'center', background: T.bg,
              border: `1px solid ${T.borderHi}`, borderRadius: 10, paddingLeft: 12, marginBottom: 16,
            }}>
              <Phone size={15} color={T.muted} />
              <span style={{
                color: T.muted, fontFamily: T.mono, fontSize: 14,
                padding: '0 8px', borderRight: `1px solid ${T.border}`,
              }}>+91</span>
              <input
                value={phone}
                onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.startsWith('91') && v.length === 12) v = v.slice(2); setPhone(v.slice(0, 10)) }}
                placeholder="9876543210"
                maxLength={10}
                disabled={running}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: T.text, fontSize: 15, fontFamily: T.mono, padding: '12px 10px', letterSpacing: 1,
                }}
              />
            </div>

            {/* Rounds */}
            <label style={labelStyle}>How Many Rounds?</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {[1, 3, 5, 10].map(n => (
                <button key={n} onClick={() => setRounds(n)} disabled={running} style={chipStyle(currentRounds === n, running)}>{n}</button>
              ))}
              <button onClick={() => setRounds('inf')} disabled={running} style={{
                ...chipStyle(currentRounds === 'inf', running), flex: '1 1 90px', minWidth: 90,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                ♾ Unlimited {!isPro && <Lock size={10} color={T.yellow} />}
              </button>
            </div>

            {/* Sending Mode */}
            <label style={labelStyle}>Sending Mode</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button onClick={() => switchMode('single')} disabled={running} style={modePillStyle(mode === 'single', T.brand, running)}>
                <Phone size={13} /> Standard
              </button>
              <button onClick={() => switchMode('swarm')} disabled={running} style={modePillStyle(mode === 'swarm', T.cyan, running)}>
                <Zap size={13} /> Turbo {!isPro && <Lock size={10} color={T.yellow} />}
              </button>
            </div>

            {/* Smart Routing */}
            <div onClick={toggleSmartRouting} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '11px 12px', background: T.bg,
              border: `1px solid ${dualVector ? T.brand : T.border}`,
              borderRadius: 10, cursor: 'pointer', marginBottom: 12, transition: 'border 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <Shield size={16} color={dualVector ? T.brand : T.muted} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Smart Routing {!isPro && <Lock size={10} color={T.yellow} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>Auto-fallback when blocked</div>
                </div>
              </div>
              <div style={{
                width: 34, height: 20, borderRadius: 10,
                background: dualVector ? T.brand : T.dim,
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2.5, left: dualVector ? 17 : 2.5,
                  width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                }} />
              </div>
            </div>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced(s => !s)} style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
              border: 'none', color: T.muted, fontSize: 11.5, cursor: 'pointer', padding: '6px 0', fontWeight: 600,
            }}>
              <Settings size={12} /> {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
                {isSwarm && (
                  <div>
                    <label style={advLabel}>Servers</label>
                    <select value={swarmWorkers} onChange={e => setSwarmWorkers(parseInt(e.target.value))} disabled={running} style={selectStyle}>
                      {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={advLabel}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} disabled={running} style={selectStyle}>
                    <option value="all">All ({sms.api_count || 0})</option>
                    {cats.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                  </select>
                </div>
                <div>
                  <label style={advLabel}>Speed</label>
                  <select value={stagger} onChange={e => setStagger(e.target.value)} disabled={running} style={selectStyle}>
                    <option value="0.0">⚡ Instant</option>
                    <option value="0.1">🔥 Fast</option>
                    <option value="0.3">Normal</option>
                    <option value="0.5">Stealth</option>
                    <option value="1.0">Ghost</option>
                  </select>
                </div>
                <div>
                  <label style={advLabel}>Test Mode (debug)</label>
                  <button onClick={() => switchMode('debug')} disabled={running} style={{
                    ...selectStyle, cursor: running ? 'not-allowed' : 'pointer',
                    background: mode === 'debug' ? 'rgba(10,255,106,0.1)' : T.bg,
                    color: mode === 'debug' ? T.brand : T.text, textAlign: 'left',
                  }}>{mode === 'debug' ? '✓ Debug active' : 'Enable debug mode'}</button>
                </div>
              </div>
            )}

            {err && (
              <div style={{
                padding: '9px 12px', background: 'rgba(255,77,109,0.1)',
                border: `1px solid ${T.red}`, borderRadius: 9, color: '#ffa1b3',
                fontSize: 12, marginTop: 12,
              }}>{err}</div>
            )}
          </div>

          {/* CTA pinned to bottom */}
          <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
            {!running && (
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                background: agreedTos ? 'rgba(10,255,106,0.06)' : 'rgba(255,213,74,0.06)',
                border: `1px solid ${agreedTos ? T.brand + '55' : T.yellow + '55'}`,
                borderRadius: 10, padding: '9px 11px', marginBottom: 10,
                cursor: 'pointer', fontSize: 11.5, lineHeight: 1.45, color: T.text,
                transition: 'all 0.2s',
              }}>
                <input
                  type="checkbox"
                  checked={agreedTos}
                  onChange={e => {
                    const v = e.target.checked
                    setAgreedTos(v)
                    try { localStorage.setItem('hydra_tos_v1', v ? 'yes' : 'no') } catch {}
                    if (v) setErr(null)
                  }}
                  style={{ marginTop: 2, accentColor: T.brand, cursor: 'pointer', width: 14, height: 14 }}
                />
                <span>
                  I agree to the{' '}
                  <a href="#" onClick={e => { e.preventDefault(); setShowTerms(true) }}
                     style={{ color: T.cyan, textDecoration: 'underline', fontWeight: 600 }}>Terms</a>
                  {' '}and{' '}
                  <a href="#" onClick={e => { e.preventDefault(); setShowTerms(true) }}
                     style={{ color: T.cyan, textDecoration: 'underline', fontWeight: 600 }}>Disclaimer</a>.
                  <span style={{ display: 'block', color: T.muted, fontSize: 10.5, marginTop: 2 }}>
                    For testing your own number only · Educational use · No spam, no harassment
                  </span>
                </span>
              </label>
            )}
            {!running ? (
              <button onClick={launch} disabled={!up || !agreedTos} style={{
                width: '100%', padding: '14px 18px', borderRadius: 11,
                background: (up && agreedTos) ? `linear-gradient(135deg, ${T.brand}, ${T.brandDim})` : T.dim,
                border: 'none', color: '#000', fontWeight: 900, fontSize: 14.5, letterSpacing: 0.6,
                cursor: (up && agreedTos) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: (up && agreedTos) ? `0 6px 22px rgba(10,255,106,0.35)` : 'none', transition: 'all 0.2s',
                opacity: (up && agreedTos) ? 1 : 0.55,
              }}>
                <Play size={16} fill="#000" /> Start Sending
              </button>
            ) : (
              <button onClick={stopAll} style={{
                width: '100%', padding: '14px 18px', borderRadius: 11,
                background: 'linear-gradient(135deg, #ff4d6d, #d92e2e)',
                border: 'none', color: '#fff', fontWeight: 900, fontSize: 14.5, letterSpacing: 0.6,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: '0 6px 22px rgba(255,77,109,0.45)',
              }}>
                <Square size={16} fill="#fff" /> Stop
              </button>
            )}
          </div>
        </section>

        {/* ───── RIGHT: LIVE RESULTS ───── */}
        <section className="hydra-results" style={{
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden',
        }}>
          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, flexShrink: 0 }}>
            {[
              { label: 'DELIVERED', value: live.sent,    color: T.brand },
              { label: 'BLOCKED',   value: live.blocked, color: T.red },
              { label: 'LIMITED',   value: live.rate,    color: T.yellow },
            ].map(s => (
              <div key={s.label} style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.7, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: T.mono, color: s.color, lineHeight: 1.15, marginTop: 2 }}>
                  {s.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '10px 14px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 600 }}>
                {running ? (
                  <>Round <span style={{ color: T.cyan, fontFamily: T.mono, fontWeight: 800 }}>{live.wave}</span>
                  {currentRounds !== 'inf' && <span> / {currentRounds}</span>} in progress</>
                ) : (live.sent > 0 ? 'Last run completed' : 'Idle')}
              </span>
              <span style={{ fontSize: 11.5, color: T.text, fontFamily: T.mono, fontWeight: 700 }}>
                {currentRounds === 'inf' ? '∞' : `${Math.round(progressPct)}%`}
              </span>
            </div>
            <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${T.brand}, ${T.cyan})`,
                transition: 'width 0.5s', boxShadow: running ? `0 0 8px ${T.brand}` : 'none',
              }} />
            </div>
          </div>

          {/* Worker grid */}
          {isSwarm && swarmStatus?.worker_detail && Object.keys(swarmStatus.worker_detail).length > 0 && (
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: '10px 14px', flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.7, fontWeight: 700, marginBottom: 7 }}>
                ACTIVE SERVERS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
                {Object.entries(swarmStatus.worker_detail).map(([wid, w]) => (
                  <div key={wid} style={{
                    background: T.bg,
                    border: `1px solid ${w.error ? T.red : w.done ? T.dim : T.brand}`,
                    borderRadius: 7, padding: '6px 9px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: w.error ? T.red : w.done ? T.muted : T.brand, letterSpacing: 0.5 }}>
                        S-{wid}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.brand }}>{w.sent}</span>
                    </div>
                    {w.error && <div style={{ fontSize: 9, color: T.red, marginTop: 2 }}>{w.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Activity terminal */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '10px 0 0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0 14px 8px', borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.7, fontWeight: 700 }}>
                LIVE ACTIVITY LOG
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: T.red, opacity: 0.6 }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: T.yellow, opacity: 0.6 }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: T.brand, opacity: 0.6 }} />
              </div>
            </div>
            <div ref={logRef} style={{
              flex: 1, overflowY: 'auto', padding: '8px 14px', fontFamily: T.mono, fontSize: 11, lineHeight: 1.55,
            }}>
              {logs.length === 0 && (
                <div style={{ color: T.dim, textAlign: 'center', padding: '24px 8px', fontSize: 11.5 }}>
                  {up ? '> Awaiting payload dispatch…' : '> Server offline'}
                </div>
              )}
              {logs.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '1px 0' }}>
                  <span style={{ color: T.dim, flexShrink: 0, minWidth: 50 }}>[{l.t}]</span>
                  <span style={{ color: lvlColor(l.lvl), flexShrink: 0, minWidth: 36, fontWeight: 700 }}>{lvlPrefix(l.lvl)}</span>
                  <span style={{ color: lvlColor(l.lvl), wordBreak: 'break-word', flex: 1 }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ───── HELP MODAL (button is in header now to avoid SAB FALLBACK clash) ───── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* ───── TERMS / DISCLAIMER MODAL ───── */}
      {showTerms && (
        <div onClick={() => setShowTerms(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 14,
            maxWidth: 640, width: '100%', maxHeight: '85vh', overflow: 'auto',
            padding: '22px 24px', color: T.text, fontFamily: T.sans,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Shield size={20} color={T.brand} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Terms of Use & Disclaimer</h2>
              <button onClick={() => setShowTerms(false)} style={{
                marginLeft: 'auto', background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer',
              }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: T.text }}>
              <p><strong style={{ color: T.brand }}>1. Educational & Personal-Testing Use Only.</strong> SMS Bomber Pro is provided strictly for users to test the resilience of <em>their own</em> mobile number, learn how OTP/transactional SMS pipelines work, and study anti-spam systems.</p>
              <p><strong style={{ color: T.yellow }}>2. No Targeting Third Parties.</strong> You agree NOT to use this tool against any phone number that is not yours, or for which you do not have explicit written consent from the owner. Doing so may violate local laws including India's IT Act 2000 (§66, §66A jurisprudence), the Indian Telegraph Act, and TRAI UCC regulations.</p>
              <p><strong style={{ color: T.red }}>3. No Harassment.</strong> Pranks, revenge, intimidation, financial fraud, OTP-flood attacks, or any malicious use is strictly forbidden and may constitute criminal harassment, stalking, or cyber-terrorism in your jurisdiction.</p>
              <p><strong>4. No Warranty.</strong> The tool is provided "AS IS" without warranty of any kind. SMS delivery rates depend on third-party gateways which may rate-limit, block, or change behaviour at any time.</p>
              <p><strong>5. Your Responsibility.</strong> You are solely responsible for your use of this tool. The developers, operators, and contributors of Word Hacker 404 disclaim all liability for misuse, damages, or legal consequences arising from your actions.</p>
              <p><strong>6. Privacy.</strong> The phone number you enter is sent only to the SMS gateway sources for the duration of the send and is not stored on our servers. Reports are saved locally on the backend machine you control.</p>
              <p><strong>7. Indemnity.</strong> You agree to indemnify and hold harmless the developers from any claim, damage, or legal action resulting from your misuse of this software.</p>
              <p style={{ marginTop: 18, padding: 12, background: 'rgba(255,77,109,0.08)', border: `1px solid ${T.red}55`, borderRadius: 9, color: '#ffb1c0', fontSize: 12 }}>
                <strong>By checking the agreement box, you confirm that you have read, understood, and accept these terms in full. If you do not agree, do not use this tool.</strong>
              </p>
            </div>
            <button onClick={() => setShowTerms(false)} style={{
              marginTop: 16, width: '100%', padding: '11px 14px', borderRadius: 10,
              background: `linear-gradient(135deg, ${T.brand}, ${T.brandDim})`,
              border: 'none', color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}

      {/* ───── UPSELL MODAL ───── */}
      {showUpsell && (
        <div onClick={() => setShowUpsell(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 16,
            padding: 26, maxWidth: 380, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative',
          }}>
            <button onClick={() => setShowUpsell(null)} style={{
              position: 'absolute', top: 10, right: 10, background: 'transparent',
              border: 'none', color: T.muted, cursor: 'pointer', padding: 6,
            }}><X size={16} /></button>
            <div style={{
              width: 52, height: 52, margin: '0 auto 14px', borderRadius: 13,
              background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={24} color="#000" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
              {showUpsell === 'turbo'    && 'Unlock Turbo Mode'}
              {showUpsell === 'unlimited' && 'Unlock Unlimited Sending'}
              {showUpsell === 'smart'    && 'Unlock Smart Routing'}
            </h3>
            <p style={{ margin: '0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.5 }}>
              {showUpsell === 'turbo'    && 'Turbo Mode uses up to 10 parallel servers for maximum delivery speed. Pro feature.'}
              {showUpsell === 'unlimited' && 'Free tier is limited to 10 rounds. Upgrade to Pro for unlimited rounds.'}
              {showUpsell === 'smart'    && 'Smart Routing auto-falls back to backup sources when blocked. Pro feature.'}
            </p>
            <button onClick={() => setShowUpsell(null)} style={{
              width: '100%', padding: '11px', borderRadius: 9,
              background: `linear-gradient(135deg, ${T.brand}, ${T.brandDim})`,
              border: 'none', color: '#000', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', marginBottom: 6,
            }}>Upgrade to Pro</button>
            <button onClick={() => setShowUpsell(null)} style={{
              width: '100%', padding: '9px', borderRadius: 9, background: 'transparent',
              border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* ───── RESPONSIVE STYLES ───── */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        select option { background: ${T.surface}; }
        .hydra-root ::-webkit-scrollbar { width: 6px; height: 6px; }
        .hydra-root ::-webkit-scrollbar-track { background: transparent; }
        .hydra-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        .hydra-root ::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }

        /* Tablet → stack */
        @media (max-width: 980px) {
          .hydra-grid { grid-template-columns: 1fr !important; grid-template-rows: auto 1fr; overflow-y: auto !important; }
          .hydra-results { min-height: 420px; }
        }
        /* Mobile padding tighten */
        @media (max-width: 600px) {
          .hydra-grid { padding: 10px !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  )
}

// ── Reusable inline style helpers ──
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 700, color: T.muted,
  letterSpacing: 0.7, marginBottom: 6, textTransform: 'uppercase',
}
const advLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: T.muted,
  letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase',
}
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 7, color: T.text,
  fontSize: 12.5, fontFamily: T.sans, outline: 'none', boxSizing: 'border-box',
}
const chipStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
  flex: '1 1 50px', minWidth: 50, padding: '9px 10px', borderRadius: 8,
  fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
  border: active ? `1.5px solid ${T.brand}` : `1px solid ${T.border}`,
  background: active ? 'rgba(10,255,106,0.12)' : T.bg,
  color: active ? T.brand : T.text, transition: 'all 0.15s',
})
const modePillStyle = (active: boolean, color: string, disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '11px 8px', borderRadius: 9,
  fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
  border: active ? `1.5px solid ${color}` : `1px solid ${T.border}`,
  background: active ? `${color}1f` : T.bg,
  color: active ? color : T.text,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
})

export default HydraConsole
