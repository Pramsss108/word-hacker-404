import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Play, Square, RefreshCw, Zap, FileText, Lock,
  Activity, BarChart3, Sliders, ChevronDown, ChevronRight, Phone, Shield,
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
  surface2:  '#13192c',
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

const lvlColor = (l: string) => ({ success: T.brand, error: T.red, warn: T.yellow, sys: T.cyan, info: T.muted } as Record<string, string>)[l] || T.muted

// ── Reusable card style ──
const cardStyle: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
}

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────
function HydraConsole({ onBack }: { onBack: () => void }) {
  // Auth
  const [authStatus, setAuthStatus] = useState<UserStatus>('loading')
  const isPro = authStatus === 'pro' || authStatus === 'god_mode'

  useEffect(() => {
    const unsub = proAuth.subscribe((status) => setAuthStatus(status))
    return () => { unsub() }
  }, [])

  // UI state
  const [showHelp, setShowHelp] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showUpsell, setShowUpsell] = useState<string | null>(null)

  // Form state (all preserved from original)
  const [phone, setPhone]       = useState('')
  const [mode, setMode]         = useState<'single' | 'debug' | 'swarm'>('swarm')
  const [category, setCategory] = useState('all')
  const [stagger, setStagger]   = useState('0.3')
  const [maxWaves, setMaxWaves] = useState('3')
  const [dualVector, setDualVector] = useState(true)
  const [swarmWorkers, setSwarmWorkers] = useState(3)

  // Live state (preserved)
  const [logs, setLogs]           = useState<LogEntry[]>([])
  const [sms, setSms]             = useState<AttackState>({ running: false, phone: '', wave: 0, sent: 0, blocked: 0, ratelimited: 0, fake200: 0 })
  const [cats, setCats]           = useState<Category[]>([])
  const [up, setUp]               = useState<boolean | null>(null)
  const [err, setErr]             = useState<string | null>(null)
  const [intel, setIntel]         = useState<IntelData | null>(null)
  const [swarmStatus, setSwarmStatus]   = useState<SwarmStatus | null>(null)
  const [reportUrl, setReportUrl]       = useState<string | null>(null)

  const logRef       = useRef<HTMLDivElement>(null)
  const barCanvasRef = useRef<HTMLCanvasElement>(null)
  const wasRunning   = useRef(false)

  // ── API functions (PRESERVED VERBATIM from original) ──
  const probe = async () => {
    try {
      const j = await fetch(`${HYDRA_BASE}/api/status`, { cache: 'no-store' }).then(r => r.json())
      setSms(j); setUp(true); setErr(null)
      const cs = await fetch(`${HYDRA_BASE}/api/categories`).then(r => r.json())
      setCats(cs)
    } catch { setUp(false) }
  }

  const fetchIntel = async () => {
    try {
      const d = await fetch(`${HYDRA_BASE}/api/intel`).then(r => r.json())
      setIntel(d)
    } catch {}
  }

  const fetchSwarm = async () => {
    try {
      const d: SwarmStatus = await fetch(`${HYDRA_BASE}/api/swarm/status`).then(r => r.json())
      setSwarmStatus(d)
    } catch {}
  }

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

  // Auto-fetch latest report when run completes
  useEffect(() => {
    if (wasRunning.current && !sms.running && sms.wave > 0) {
      fetch(`${HYDRA_BASE}/api/report/list`)
        .then(r => r.json())
        .then((list: { html_file: string }[]) => { if (list.length > 0) setReportUrl(`${HYDRA_BASE}/hydra_reports/${list[0].html_file}`) })
        .catch(() => {})
    }
    wasRunning.current = sms.running
  }, [sms.running])

  // Insights canvas chart
  useEffect(() => {
    if (!barCanvasRef.current || !intel?.by_category?.length || !showInsights) return
    const canvas = barCanvasRef.current
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const list = intel.by_category.slice(0, 8)
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const barH = Math.floor((H - 10) / list.length) - 5
    list.forEach((c, i) => {
      const pct = c.total > 0 ? c.hits / c.total : 0
      const y = 5 + i * (barH + 5)
      ctx.fillStyle = '#13192c'
      ctx.fillRect(0, y, W - 90, barH)
      const fillW = Math.round((W - 90) * pct)
      const grad = ctx.createLinearGradient(0, 0, fillW, 0)
      grad.addColorStop(0, T.brand); grad.addColorStop(1, T.cyan)
      ctx.fillStyle = grad
      ctx.fillRect(0, y, fillW, barH)
      ctx.fillStyle = T.muted; ctx.font = '11px Inter, sans-serif'
      ctx.fillText(c.category.slice(0, 14), W - 86, y + barH - 4)
      ctx.fillStyle = T.text; ctx.font = 'bold 11px JetBrains Mono, monospace'
      ctx.fillText(`${(pct * 100).toFixed(0)}%`, fillW > 36 ? fillW - 32 : fillW + 4, y + barH - 4)
    })
  }, [intel, showInsights])

  // Unified launch
  const launch = async () => {
    setErr(null)
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

  // Combined "running" + live stats (whichever engine is active)
  const running = sms.running || swarmStatus?.running || false
  const isSwarm = mode === 'swarm'
  const live = isSwarm ? {
    sent: swarmStatus?.sent ?? 0,
    blocked: swarmStatus?.blocked ?? 0,
    rate: swarmStatus?.ratelimited ?? 0,
    fake: swarmStatus?.fake200 ?? 0,
    wave: swarmStatus?.wave ?? 0,
  } : {
    sent: sms.sent,
    blocked: sms.blocked,
    rate: sms.ratelimited,
    fake: sms.fake200,
    wave: sms.wave,
  }
  const sources = sms.api_count || swarmStatus?.targets || 0

  // Round chip handler with premium gating
  const setRounds = (rounds: number | 'inf') => {
    if (rounds === 'inf' && !isPro) { setShowUpsell('unlimited'); return }
    setMaxWaves(rounds === 'inf' ? '0' : String(rounds))
  }
  const currentRounds: number | 'inf' = maxWaves === '0' ? 'inf' : (parseInt(maxWaves) || 1)

  // Mode switch with premium gating for Turbo
  const switchMode = (m: 'single' | 'swarm' | 'debug') => {
    if (m === 'swarm' && !isPro) { setShowUpsell('turbo'); return }
    setMode(m)
  }

  const toggleSmartRouting = () => {
    if (!isPro) { setShowUpsell('smart'); return }
    setDualVector(v => !v)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: T.sans }}>

      {/* ───── TOP BAR ───── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(8,11,20,0.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${T.border}`, padding: '0 18px', height: 60, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${T.borderHi}`, color: T.text, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={14} /> Tools
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${T.brand}55` }}>
            <Zap size={17} color="#000" />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.3 }}>SMS Bomber Pro</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, letterSpacing: 0.5 }}>v5.0 · India</div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: T.surface, border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: up ? T.brand : T.red, boxShadow: up ? `0 0 8px ${T.brand}` : `0 0 8px ${T.red}` }} />
            {up === null ? 'Connecting…' : up ? <span><span style={{ color: T.brand }}>{sources}</span> sources live</span> : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Offline
                <button onClick={probe} style={{ background: 'transparent', border: `1px solid ${T.dim}`, color: T.muted, padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}><RefreshCw size={10} /></button>
              </span>
            )}
          </div>

          {!running && reportUrl && (
            <a href={reportUrl} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', background: 'rgba(192,116,255,0.12)', border: `1px solid ${T.purple}`, color: T.purple, borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <FileText size={12} /> Last Report
            </a>
          )}

          {running && (
            <button onClick={stopAll} style={{ padding: '7px 14px', background: 'linear-gradient(135deg, #ff4d6d, #d92e2e)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 14px rgba(255,77,109,0.4)' }}>
              <Square size={12} /> Stop
            </button>
          )}
        </div>
      </header>

      {/* ───── MAIN SCROLL CONTENT ───── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 80px' }}>
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ===== HERO: SEND SMS ===== */}
          <section style={cardStyle}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Send SMS</h1>
            <p style={{ color: T.muted, fontSize: 14, margin: '6px 0 22px', lineHeight: 1.5 }}>
              Free SMS testing tool. Hits {sources || '90+'} verified Indian app sources to deliver one-time-passwords to your number.
            </p>

            {/* Phone */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' }}>Phone Number</label>
              <div style={{ display: 'flex', alignItems: 'center', background: T.bg, border: `1px solid ${T.borderHi}`, borderRadius: 10, paddingLeft: 12, transition: 'border 0.2s' }}>
                <Phone size={16} color={T.muted} />
                <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 15, padding: '0 8px 0 8px', borderRight: `1px solid ${T.border}` }}>+91</span>
                <input
                  value={phone}
                  onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.startsWith('91') && v.length === 12) v = v.slice(2); setPhone(v.slice(0, 10)) }}
                  placeholder="9876543210"
                  maxLength={10}
                  disabled={running}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 17, fontFamily: T.mono, padding: '14px 12px', letterSpacing: 1 }}
                />
              </div>
            </div>

            {/* Round chips */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' }}>How Many Rounds?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 3, 5, 10].map(n => {
                  const active = currentRounds === n
                  return (
                    <button key={n} onClick={() => setRounds(n)} disabled={running} style={{
                      flex: '1 1 80px', minWidth: 80, padding: '11px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                      border: active ? `1.5px solid ${T.brand}` : `1px solid ${T.border}`,
                      background: active ? 'rgba(10,255,106,0.12)' : T.bg,
                      color: active ? T.brand : T.text,
                      transition: 'all 0.15s',
                    }}>{n} round{n > 1 ? 's' : ''}</button>
                  )
                })}
                {(() => {
                  const active = currentRounds === 'inf'
                  return (
                    <button onClick={() => setRounds('inf')} disabled={running} style={{
                      flex: '1 1 130px', minWidth: 130, padding: '11px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                      border: active ? `1.5px solid ${T.brand}` : `1px solid ${T.border}`,
                      background: active ? 'rgba(10,255,106,0.12)' : T.bg,
                      color: active ? T.brand : T.text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      ♾️ Unlimited {!isPro && <Lock size={11} color={T.yellow} />}
                    </button>
                  )
                })()}
              </div>
              <small style={{ display: 'block', color: T.muted, fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                Each round sends through all live sources (~{sources || 90} SMS per round).
              </small>
            </div>

            {/* Speed mode pills */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' }}>Sending Mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => switchMode('single')} disabled={running} style={{
                  flex: 1, padding: '12px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                  border: mode === 'single' ? `1.5px solid ${T.brand}` : `1px solid ${T.border}`,
                  background: mode === 'single' ? 'rgba(10,255,106,0.12)' : T.bg,
                  color: mode === 'single' ? T.brand : T.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <Phone size={14} /> Standard
                </button>
                <button onClick={() => switchMode('swarm')} disabled={running} style={{
                  flex: 1, padding: '12px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
                  border: mode === 'swarm' ? `1.5px solid ${T.cyan}` : `1px solid ${T.border}`,
                  background: mode === 'swarm' ? 'rgba(0,207,255,0.12)' : T.bg,
                  color: mode === 'swarm' ? T.cyan : T.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <Zap size={14} /> Turbo (Multi-Server) {!isPro && <Lock size={11} color={T.yellow} />}
                </button>
              </div>
              <small style={{ display: 'block', color: T.muted, fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                {mode === 'swarm'
                  ? `Turbo uses ${swarmWorkers} parallel servers for maximum delivery speed.`
                  : 'Standard sends through one server at a steady pace.'}
              </small>
            </div>

            {/* Smart Routing toggle */}
            <div onClick={toggleSmartRouting} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '12px 14px', background: T.bg, border: `1px solid ${dualVector ? T.brand : T.border}`,
              borderRadius: 10, cursor: 'pointer', marginBottom: 18, transition: 'border 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Shield size={18} color={dualVector ? T.brand : T.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                    Smart Routing (Anti-Block)
                    {!isPro && <Lock size={11} color={T.yellow} />}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Auto-fallback to backup sources when blocked.</div>
                </div>
              </div>
              <div style={{ width: 38, height: 22, borderRadius: 11, background: dualVector ? T.brand : T.dim, position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: dualVector ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
            </div>

            {err && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.1)', border: `1px solid ${T.red}`, borderRadius: 9, color: '#ffa1b3', fontSize: 13, marginBottom: 14 }}>{err}</div>
            )}

            {/* Big CTA */}
            {!running ? (
              <button onClick={launch} disabled={!up} style={{
                width: '100%', padding: '16px 20px', borderRadius: 11,
                background: up ? `linear-gradient(135deg, ${T.brand}, ${T.brandDim})` : T.dim,
                border: 'none', color: '#000', fontWeight: 900, fontSize: 15, letterSpacing: 0.6,
                cursor: up ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: up ? `0 6px 20px rgba(10,255,106,0.3)` : 'none', transition: 'all 0.2s',
              }}>
                <Play size={17} fill="#000" /> Start Sending
              </button>
            ) : (
              <button onClick={stopAll} style={{
                width: '100%', padding: '16px 20px', borderRadius: 11,
                background: 'linear-gradient(135deg, #ff4d6d, #d92e2e)',
                border: 'none', color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 0.6,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: '0 6px 20px rgba(255,77,109,0.4)',
              }}>
                <Square size={17} fill="#fff" /> Stop
              </button>
            )}
          </section>

          {/* ===== LIVE STATUS CARD ===== */}
          {(running || live.sent > 0 || live.blocked > 0) && (
            <section style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {running ? (
                      <><span style={{ width: 9, height: 9, borderRadius: '50%', background: T.brand, boxShadow: `0 0 10px ${T.brand}`, animation: 'pulse 1.2s infinite' }} /> Sending Now</>
                    ) : (
                      <><span style={{ width: 9, height: 9, borderRadius: '50%', background: T.muted }} /> Last Run</>
                    )}
                  </div>
                  {phone && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontFamily: T.mono }}>+91 {phone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Round</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.cyan, fontFamily: T.mono, lineHeight: 1 }}>{live.wave}{currentRounds !== 'inf' && <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}> / {currentRounds}</span>}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Delivered', value: live.sent,    color: T.brand },
                  { label: 'Blocked',   value: live.blocked, color: T.red },
                  { label: 'Limited',   value: live.rate,    color: T.yellow },
                ].map(s => (
                  <div key={s.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: T.mono, color: s.color, lineHeight: 1.15, marginTop: 3 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar (only when bounded) */}
              {currentRounds !== 'inf' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (live.wave / currentRounds) * 100)}%`, background: `linear-gradient(90deg, ${T.brand}, ${T.cyan})`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )}

              {/* Worker grid for swarm */}
              {isSwarm && swarmStatus?.worker_detail && Object.keys(swarmStatus.worker_detail).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Active Servers</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                    {Object.entries(swarmStatus.worker_detail).map(([wid, w]) => (
                      <div key={wid} style={{ background: T.bg, border: `1px solid ${w.error ? T.red : w.done ? T.dim : T.brand}`, borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: w.error ? T.red : w.done ? T.muted : T.brand, letterSpacing: 0.5 }}>SERVER {wid}</span>
                          <span style={{ fontSize: 9.5, color: T.muted, fontFamily: T.mono }}>{w.targets}</span>
                        </div>
                        {w.error
                          ? <div style={{ fontSize: 10, color: T.red }}>{w.error}</div>
                          : <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: T.mono, color: T.brand }}>{w.sent}</span>
                              <span style={{ fontSize: 10, color: w.done ? T.muted : T.brand, fontWeight: 600 }}>{w.done ? 'done' : 'sending'}</span>
                            </div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ===== ADVANCED SETTINGS ===== */}
          <section style={cardStyle}>
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={accordionHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={16} color={T.muted} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Advanced Settings</span>
              </div>
              {showAdvanced ? <ChevronDown size={16} color={T.muted} /> : <ChevronRight size={16} color={T.muted} />}
            </button>
            {showAdvanced && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={advLabel}>Test Mode</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['single', 'swarm', 'debug'] as const).map(m => {
                      const labelMap = { single: 'Standard', swarm: 'Turbo', debug: 'Test (Debug)' }
                      const active = mode === m
                      const locked = m === 'swarm' && !isPro
                      return (
                        <button key={m} onClick={() => switchMode(m)} disabled={running} style={{
                          flex: 1, padding: '8px 6px', fontSize: 12, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', borderRadius: 7,
                          border: active ? `1px solid ${T.brand}` : `1px solid ${T.border}`,
                          background: active ? 'rgba(10,255,106,0.1)' : T.bg,
                          color: active ? T.brand : T.text,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>{labelMap[m]}{locked && <Lock size={10} />}</button>
                      )
                    })}
                  </div>
                </div>

                {isSwarm && (
                  <div>
                    <label style={advLabel}>Number of Servers</label>
                    <select value={swarmWorkers} onChange={e => setSwarmWorkers(parseInt(e.target.value))} disabled={running} style={selectStyle}>
                      {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} servers</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={advLabel}>App Category Filter</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} disabled={running} style={selectStyle}>
                    <option value="all">All sources ({sms.api_count || 0})</option>
                    {cats.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                  </select>
                </div>

                <div>
                  <label style={advLabel}>Speed Precision (Gap Between Sends)</label>
                  <select value={stagger} onChange={e => setStagger(e.target.value)} disabled={running} style={selectStyle}>
                    <option value="0.0">⚡ Instant (no gap)</option>
                    <option value="0.1">🔥 Fast (0.1s gap)</option>
                    <option value="0.3">Normal (0.3s gap)</option>
                    <option value="0.5">Stealth (0.5s gap)</option>
                    <option value="1.0">Ghost (1s gap)</option>
                  </select>
                </div>

                <div>
                  <label style={advLabel}>Custom Round Count (0 = Unlimited)</label>
                  <input value={maxWaves} onChange={e => setMaxWaves(e.target.value.replace(/\D/g, ''))} disabled={running} style={selectStyle} />
                </div>
              </div>
            )}
          </section>

          {/* ===== LIVE ACTIVITY LOG ===== */}
          <section style={cardStyle}>
            <button onClick={() => setShowLogs(!showLogs)} style={accordionHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={16} color={T.muted} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Live Activity</span>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, padding: '1px 8px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>{logs.length}</span>
              </div>
              {showLogs ? <ChevronDown size={16} color={T.muted} /> : <ChevronRight size={16} color={T.muted} />}
            </button>
            {showLogs && (
              <div style={{ marginTop: 14 }}>
                <div ref={logRef} style={{ maxHeight: 320, overflowY: 'auto', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 0', fontFamily: T.mono }}>
                  {logs.length === 0 && (
                    <div style={{ color: T.dim, padding: '20px', textAlign: 'center', fontSize: 12 }}>
                      {up ? 'Waiting for activity… start a send to see live updates' : 'Server offline'}
                    </div>
                  )}
                  {logs.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 12px', fontSize: 11.5, lineHeight: 1.5 }}>
                      <span style={{ color: T.dim, minWidth: 56, flexShrink: 0 }}>{l.t}</span>
                      <span style={{ color: lvlColor(l.lvl), wordBreak: 'break-all', flex: 1 }}>{l.msg}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setLogs([])} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Clear log</button>
              </div>
            )}
          </section>

          {/* ===== INSIGHTS ===== */}
          <section style={cardStyle}>
            <button onClick={() => setShowInsights(!showInsights)} style={accordionHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart3 size={16} color={T.muted} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Delivery Insights</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={(e) => { e.stopPropagation(); fetchIntel() }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <RefreshCw size={13} color={T.muted} />
                </button>
                {showInsights ? <ChevronDown size={16} color={T.muted} /> : <ChevronRight size={16} color={T.muted} />}
              </div>
            </button>
            {showInsights && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {!intel && <div style={{ color: T.dim, fontSize: 12, textAlign: 'center', padding: 20 }}>{up ? 'Loading insights…' : 'Server offline'}</div>}
                {intel && (
                  <>
                    <div>
                      <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Top Performing Sources</div>
                      {intel.top_targets.length === 0 && <div style={{ color: T.dim, fontSize: 12 }}>No data yet — run a send to populate.</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {intel.top_targets.slice(0, 6).map((t, i) => {
                          const rate = t.total > 0 ? Math.round(t.otp_sent / t.total * 100) : 0
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, color: T.text, minWidth: 130, fontFamily: T.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                              <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${rate}%`, background: rate > 50 ? T.brand : rate > 20 ? T.yellow : T.red, transition: 'width 0.4s' }} />
                              </div>
                              <span style={{ fontSize: 11, color: rate > 50 ? T.brand : rate > 20 ? T.yellow : T.red, fontFamily: T.mono, fontWeight: 700, minWidth: 38, textAlign: 'right' }}>{rate}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Hit Rate by Category</div>
                      {intel.by_category.length > 0
                        ? <canvas ref={barCanvasRef} width={680} height={Math.min(intel.by_category.slice(0, 8).length * 22, 180)} style={{ display: 'block', width: '100%' }} />
                        : <div style={{ color: T.dim, fontSize: 12 }}>No data yet.</div>}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* SEO footer */}
          <footer style={{ padding: '20px 14px 0', textAlign: 'center', color: T.muted, fontSize: 11.5, lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>Best free SMS bomber online — 90+ live India app sources, real-time delivery tracking, instant anti-block fallback.</p>
            <p style={{ margin: '6px 0 0', opacity: 0.65 }}>For testing your own number only. Educational use.</p>
          </footer>
        </div>
      </main>

      {/* ───── UPSELL MODAL ───── */}
      {showUpsell && (
        <div onClick={() => setShowUpsell(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14, background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={26} color="#000" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800 }}>
              {showUpsell === 'turbo'    && 'Unlock Turbo Mode'}
              {showUpsell === 'unlimited' && 'Unlock Unlimited Sending'}
              {showUpsell === 'smart'    && 'Unlock Smart Routing'}
            </h3>
            <p style={{ margin: '0 0 20px', color: T.muted, fontSize: 13.5, lineHeight: 1.55 }}>
              {showUpsell === 'turbo'    && 'Turbo Mode uses up to 10 parallel servers to deliver SMS at maximum speed. Available on Pro.'}
              {showUpsell === 'unlimited' && 'Free tier is limited to 10 rounds per send. Upgrade to Pro for unlimited rounds.'}
              {showUpsell === 'smart'    && 'Smart Routing automatically falls back to backup sources when blocked, ensuring 100% delivery. Pro feature.'}
            </p>
            <button onClick={() => setShowUpsell(null)} style={{ width: '100%', padding: '12px', borderRadius: 9, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDim})`, border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 8 }}>Upgrade to Pro</button>
            <button onClick={() => setShowUpsell(null)} style={{ width: '100%', padding: '10px', borderRadius: 9, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* Floating help button (HYDRA-only) */}
      <button className="help-fab" onClick={() => setShowHelp(true)} aria-label="Help guide" title="How to use SMS Bomber">?</button>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        select option { background: ${T.surface}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }
      `}</style>
    </div>
  )
}

// ── Reusable inline styles (defined outside JSX to keep render clean) ──
const accordionHeaderStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: T.text,
}
const advLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
}
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: T.sans, outline: 'none', boxSizing: 'border-box',
}

export default HydraConsole
