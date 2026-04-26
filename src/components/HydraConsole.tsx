import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Play, Square, RefreshCw, Zap, MessageSquare, Brain } from 'lucide-react'

const HYDRA_BASE = 'http://localhost:4040'

interface LogEntry { t: string; msg: string; lvl: 'info' | 'success' | 'error' | 'warn' | 'sys' | 'ping' }
interface AttackState { running: boolean; phone: string; wave: number; sent: number; blocked: number; ratelimited: number; fake200: number; api_count?: number }
interface Category { name: string; count: number }
interface IntelCat  { category: string; total: number; hits: number }
interface IntelTop  { name: string; total: number; otp_sent: number }
interface IntelData { top_targets: IntelTop[]; by_category: IntelCat[] }

// Phase 5 — Swarm interfaces
interface SwarmWorker { wave: number; sent: number; blocked: number; targets: number; done: boolean; error: string | null }
interface SwarmStatus  { available: boolean; running: boolean; phone: string; workers: number; wave: number; sent: number; blocked: number; ratelimited: number; fake200: number; targets: number; worker_detail: Record<string, SwarmWorker> }

// ── colours ──────────────────────────────────────────────
const C = {
  bg:       '#03040a',
  panel:    '#07090f',
  border:   '#0d1825',
  green:    '#0aff6a',
  cyan:     '#00cfff',
  red:      '#ff4d6d',
  yellow:   '#ffd54a',
  purple:   '#c074ff',
  dim:      '#2a3a52',
  muted:    '#4a607a',
  text:     '#c8d8e8',
  mono:     'JetBrains Mono, Consolas, monospace',
  sans:     'Inter, system-ui, sans-serif',
}

const lvlColor = (l: string) => ({ success: C.green, error: C.red, warn: C.yellow, sys: C.cyan, info: C.muted } as Record<string, string>)[l] || C.muted

// ── tiny primitives ───────────────────────────────────────
const Lbl = ({ children }: { children: string }) => (
  <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>{children}</div>
)

const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ width: '100%', padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 13, fontFamily: C.mono, outline: 'none', boxSizing: 'border-box', ...p.style }} />
)

const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} style={{ width: '100%', padding: '7px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 11, fontFamily: C.sans, outline: 'none', boxSizing: 'border-box', ...p.style }} />
)

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px' }}>
      <div style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color, fontSize: 18, fontFamily: C.mono, fontWeight: 600, lineHeight: 1.3, marginTop: 1 }}>{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────
function HydraConsole({ onBack }: { onBack: () => void }) {
  const [phone, setPhone]       = useState('')
  const [mode, setMode]         = useState<'single' | 'debug' | 'swarm'>('swarm')
  const [category, setCategory] = useState('all')
  const [stagger, setStagger]   = useState('0.3')
  const [maxWaves, setMaxWaves] = useState('0')
  const [dualVector, setDualVector] = useState(false)

  const [logs, setLogs]           = useState<LogEntry[]>([])
  const [sms, setSms]             = useState<AttackState>({ running: false, phone: '', wave: 0, sent: 0, blocked: 0, ratelimited: 0, fake200: 0 })
  const [cats, setCats]           = useState<Category[]>([])
  const [up, setUp]               = useState<boolean | null>(null)
  const [err, setErr]             = useState<string | null>(null)
  const [intel, setIntel]         = useState<IntelData | null>(null)
  const [swarmWorkers, setSwarmWorkers] = useState(3)
  const [swarmStatus, setSwarmStatus]   = useState<SwarmStatus | null>(null)
  const [showSwarm, setShowSwarm]       = useState(false)
  const logRef                    = useRef<HTMLDivElement>(null)
  const barCanvasRef              = useRef<HTMLCanvasElement>(null)

  const probe = async () => {
    try {
      const j = await fetch(`${HYDRA_BASE}/api/status`, { cache: 'no-store' }).then(r => r.json())
      setSms(j); setUp(true); setErr(null)
      const cats = await fetch(`${HYDRA_BASE}/api/categories`).then(r => r.json())
      setCats(cats)
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
    const id = setInterval(() => {
      fetch(`${HYDRA_BASE}/api/status`).then(r => r.json()).then(setSms).catch(() => {})
    }, 2000)
    fetchIntel()
    const intelId = setInterval(fetchIntel, 10000)
    fetchSwarm()
    const swarmId = setInterval(fetchSwarm, 3000)
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

  // Draw category bar chart when intel updates
  useEffect(() => {
    if (!barCanvasRef.current || !intel?.by_category?.length) return
    const canvas = barCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cats = intel.by_category.slice(0, 8)
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const barH = Math.floor((H - 10) / cats.length) - 4
    cats.forEach((c, i) => {
      const pct = c.total > 0 ? c.hits / c.total : 0
      const y = 5 + i * (barH + 4)
      // track
      ctx.fillStyle = '#0d1825'
      ctx.fillRect(0, y, W - 52, barH)
      // fill
      const fillW = Math.round((W - 52) * pct)
      const grad = ctx.createLinearGradient(0, 0, fillW, 0)
      grad.addColorStop(0, '#0aff6a')
      grad.addColorStop(1, '#00cfff')
      ctx.fillStyle = grad
      ctx.fillRect(0, y, fillW, barH)
      // label
      ctx.fillStyle = '#9aa3b2'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillText(c.category.slice(0, 12), W - 50, y + barH - 3)
      // pct text
      ctx.fillStyle = '#e9eef6'
      ctx.fillText(`${(pct * 100).toFixed(0)}%`, fillW > 28 ? fillW - 26 : fillW + 2, y + barH - 3)
    })
  }, [intel])

  const startSms = async () => {
    setErr(null)
    if (!/^\d{10}$/.test(phone.trim())) { setErr('10-digit number required'); return }
    try {
      const j = await fetch(`${HYDRA_BASE}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim(), mode, category, stagger: parseFloat(stagger) || 0.3, maxWaves: parseInt(maxWaves) || 0, dualVector }) }).then(r => r.json())
      if (!j.ok) setErr(j.error)
    } catch { setErr('Cannot reach server') }
  }

  const stop = async () => { try { await fetch(`${HYDRA_BASE}/api/stop`, { method: 'POST' }) } catch {} }

  const startSwarm = async () => {
    setErr(null)
    if (!/^\d{10}$/.test(phone.trim())) { setErr('10-digit number required'); return }
    try {
      await fetch(`${HYDRA_BASE}/api/swarm/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim(), workers: swarmWorkers, stagger: parseFloat(stagger) || 0.3, maxWaves: parseInt(maxWaves) || 0, dualVector }) })
      await fetchSwarm()
    } catch { setErr('Cannot reach swarm server') }
  }

  const stopSwarm = async () => {
    try { await fetch(`${HYDRA_BASE}/api/swarm/stop`, { method: 'POST' }) } catch {}
  }
  const running = sms.running

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg, color: C.text, fontFamily: C.sans }}>

      {/* ── TOPBAR 44px ─────────────────────────────────── */}
      <header style={{ height: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 8 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${C.dim}`, color: C.green, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
          <ArrowLeft size={13} /> Tools
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Zap size={15} color={C.green} />
          <span style={{ color: C.green, fontWeight: 800, letterSpacing: 1.5, fontSize: 13 }}>HYDRA</span>
          <span style={{ color: C.dim, fontSize: 11 }}>v5.0</span>
        </div>

        {/* centre — mode tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowSwarm(false)} style={{ padding: '4px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, border: `1px solid ${!showSwarm ? C.green : C.dim}`, background: !showSwarm ? 'rgba(10,255,106,0.12)' : 'transparent', color: !showSwarm ? C.green : C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MessageSquare size={11} /> SINGLE
          </button>
          <button onClick={() => setShowSwarm(true)} style={{ padding: '4px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, border: `1px solid ${showSwarm ? C.cyan : C.dim}`, background: showSwarm ? 'rgba(0,207,255,0.12)' : 'transparent', color: showSwarm ? C.cyan : C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={11} /> SWARM
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontFamily: C.mono }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: up ? C.green : C.red, boxShadow: up ? `0 0 6px ${C.green}` : `0 0 6px ${C.red}`, flexShrink: 0 }} />
          {up === null ? 'PROBING' : up ? `ONLINE · ${sms.api_count || 0} SMS APIs` : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              OFFLINE <button onClick={probe} style={{ background: 'transparent', border: `1px solid ${C.dim}`, color: C.muted, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 10 }}><RefreshCw size={9} /></button>
            </span>
          )}
        </div>

        {running && (
          <button onClick={stop} style={{ padding: '4px 12px', background: 'rgba(255,77,109,0.15)', border: `1px solid ${C.red}`, color: C.red, borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Square size={11} /> STOP
          </button>
        )}
      </header>

      {/* ── BODY: columns (Single mode or Swarm mode) ─── */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>

      {showSwarm ? (
        /* ══════════════════════════════════════════════════
           PHASE 5 SWARM PANEL
           ══════════════════════════════════════════════════ */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Swarm Controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>TARGET</span>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" disabled={swarmStatus?.running} style={{ width: 110, padding: '5px 8px', background: '#07090f', border: `1px solid ${C.dim}`, color: C.text, borderRadius: 4, fontSize: 12, fontFamily: C.mono, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>WORKERS</span>
              <select value={swarmWorkers} onChange={e => setSwarmWorkers(parseInt(e.target.value))} disabled={swarmStatus?.running} style={{ padding: '5px 8px', background: '#07090f', border: `1px solid ${C.dim}`, color: C.text, borderRadius: 4, fontSize: 12, fontFamily: C.mono, outline: 'none' }}>
                {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} workers</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>SPEED</span>
              <select value={stagger} onChange={e => setStagger(e.target.value)} disabled={swarmStatus?.running} style={{ padding: '5px 8px', background: '#07090f', border: `1px solid ${C.dim}`, color: C.text, borderRadius: 4, fontSize: 12, fontFamily: C.mono, outline: 'none' }}>
                <option value="0.0">⚡ Instant</option>
                <option value="0.1">🔥 Fast</option>
                <option value="0.3">Normal</option>
                <option value="0.5">Stealth</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>WAVES (0=∞)</span>
              <input value={maxWaves} onChange={e => setMaxWaves(e.target.value)} disabled={swarmStatus?.running} style={{ width: 60, padding: '5px 8px', background: '#07090f', border: `1px solid ${C.dim}`, color: C.text, borderRadius: 4, fontSize: 12, fontFamily: C.mono, outline: 'none' }} />
            </div>
            {/* Dual-Vector toggle */}
            <div onClick={() => !swarmStatus?.running && setDualVector(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 5, border: `1px solid ${dualVector ? C.cyan : C.dim}`, background: dualVector ? 'rgba(0,207,255,0.07)' : 'transparent', cursor: swarmStatus?.running ? 'not-allowed' : 'pointer', userSelect: 'none', marginTop: 14 }}>
              <div style={{ width: 26, height: 13, borderRadius: 7, background: dualVector ? C.cyan : C.dim, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: dualVector ? 13 : 2, width: 9, height: 9, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: dualVector ? C.cyan : C.muted }}>DUAL-VEC</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {!swarmStatus?.running
                ? <button onClick={startSwarm} disabled={!up} style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#00cfff,#0075ff)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 1.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={12} /> LAUNCH SWARM</button>
                : <button onClick={stopSwarm} style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#ff4d6d,#d92e2e)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 1.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Square size={12} /> STOP SWARM</button>
              }
            </div>
          </div>

          {/* Swarm Stats + Worker Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Aggregate row */}
            {swarmStatus && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'STATUS',    val: swarmStatus.running ? 'LIVE' : 'IDLE',     color: swarmStatus.running ? C.green : C.muted },
                  { label: 'WORKERS',   val: swarmStatus.workers || swarmWorkers,       color: C.cyan },
                  { label: 'TARGETS',   val: swarmStatus.targets || '—',               color: C.cyan },
                  { label: 'OTP SENT',  val: swarmStatus.sent,                         color: C.green },
                  { label: 'BLOCKED',   val: swarmStatus.blocked,                      color: C.red },
                  { label: 'RATE-LTD',  val: swarmStatus.ratelimited,                  color: C.yellow },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: '1 1 100px', background: '#07090f', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', minWidth: 90 }}>
                    <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: C.mono, color }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-worker cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
              {swarmStatus?.worker_detail && Object.entries(swarmStatus.worker_detail).map(([wid, w]) => (
                <div key={wid} style={{ background: '#07090f', border: `1px solid ${w.error ? C.red : w.done ? C.dim : C.green}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: w.error ? C.red : w.done ? C.muted : C.green, letterSpacing: 1 }}>WORKER-{wid}</span>
                    <span style={{ fontSize: 9, color: C.muted, fontFamily: C.mono }}>{w.targets} APIs</span>
                  </div>
                  {w.error
                    ? <div style={{ fontSize: 10, color: C.red }}>{w.error}</div>
                    : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {[['Wave', w.wave, C.cyan], ['OTP', w.sent, C.green], ['Blk', w.blocked, C.red]].map(([k, v, c]) => (
                          <div key={String(k)}>
                            <div style={{ fontSize: 9, color: C.muted }}>{k}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: C.mono, color: c as string }}>{v}</div>
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize: 9, color: C.muted }}>State</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: w.done ? C.muted : C.green }}>{w.done ? 'DONE' : 'FIRING'}</div>
                        </div>
                      </div>
                    )
                  }
                </div>
              ))}
              {(!swarmStatus?.worker_detail || Object.keys(swarmStatus.worker_detail).length === 0) && (
                <div style={{ color: C.dim, fontSize: 12, padding: 20, gridColumn: '1/-1' }}>
                  {up ? 'Launch a swarm to see per-worker panels here.' : 'Backend offline.'}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* ── COL 1: CONTROLS 230px ────────────────────── */}
        <div style={{ width: 230, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: 8, overflow: 'hidden' }}>

          {/* Phone */}
          <div>
            <Lbl>Target (+91 auto)</Lbl>
            <Inp
              value={phone}
              onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.startsWith('91') && v.length === 12) v = v.slice(2); setPhone(v) }}
              placeholder="9876543210"
              maxLength={10}
              disabled={running}
            />
          </div>

          {/* Mode */}
              <div>
                <Lbl>Mode</Lbl>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['swarm', 'single', 'debug'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} disabled={sms.running} style={{ flex: 1, padding: '5px 4px', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', borderRadius: 4, border: `1px solid ${mode === m ? C.green : C.dim}`, background: mode === m ? 'rgba(10,255,106,0.1)' : 'transparent', color: mode === m ? C.green : C.muted }}>
                      {m === 'swarm' ? 'SWARM' : m === 'single' ? 'WAVE' : 'DEBUG'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <Lbl>Category</Lbl>
                <Sel value={category} onChange={e => setCategory(e.target.value)} disabled={sms.running}>
                  <option value="all">ALL ({sms.api_count || 0})</option>
                  {cats.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                </Sel>
              </div>

              {/* Speed + Waves row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6 }}>
                <div>
                  <Lbl>Fire Speed</Lbl>
                  <Sel value={stagger} onChange={e => setStagger(e.target.value)} disabled={sms.running}>
                    <option value="0.0">⚡ Instant</option>
                    <option value="0.1">🔥 Fast</option>
                    <option value="0.3">Normal</option>
                    <option value="0.5">Stealth</option>
                    <option value="1.0">Ghost</option>
                  </Sel>
                </div>
                <div>
                  <Lbl>Waves (0=∞)</Lbl>
                  <Inp value={maxWaves} onChange={e => setMaxWaves(e.target.value)} disabled={sms.running} style={{ padding: '7px 8px' }} />
                </div>
              </div>

          {/* Dual-Vector toggle (Phase 4.1) */}
          <div
            onClick={() => !sms.running && setDualVector(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 5, border: `1px solid ${dualVector ? C.cyan : C.dim}`, background: dualVector ? 'rgba(0,207,255,0.07)' : 'transparent', cursor: sms.running ? 'not-allowed' : 'pointer', userSelect: 'none' }}
          >
            <div style={{ width: 28, height: 14, borderRadius: 7, background: dualVector ? C.cyan : C.dim, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: dualVector ? 14 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: dualVector ? C.cyan : C.muted }}>DUAL-VECTOR</span>
          </div>
          {err && <div style={{ padding: '6px 9px', background: 'rgba(255,77,109,0.1)', border: `1px solid ${C.red}`, borderRadius: 5, color: '#ff8da3', fontSize: 11 }}>{err}</div>}

          {/* Fire button */}
          <div style={{ marginTop: 'auto' }}>
            {!sms.running ? (
              <button onClick={startSms} disabled={!up} style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#0aff6a,#07c06b)', border: 'none', borderRadius: 7, color: C.bg, fontWeight: 900, fontSize: 12, letterSpacing: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Play size={13} /> LAUNCH SMS
              </button>
            ) : (
              <button onClick={stop} style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#ff4d6d,#d92e2e)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Square size={13} /> STOP
              </button>
            )}
          </div>
        </div>

        {/* ── COL 2: STATS 180px ───────────────────────── */}
        <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '10px 10px', gap: 6, overflow: 'hidden' }}>

          {/* Section label */}
          <div style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: C.green, textTransform: 'uppercase', marginBottom: 2 }}>
            ⚡ SMS STATS
          </div>

          <StatCard label="Status"     value={sms.running ? 'LIVE' : 'IDLE'}  color={sms.running ? C.green : C.muted} />
          <StatCard label="Wave"        value={sms.wave}                        color={C.cyan} />
          <StatCard label="OTP Sent"    value={sms.sent}                        color={C.green} />
          <StatCard label="Blocked"     value={sms.blocked}                     color={C.red} />
          <StatCard label="Rate Limit"  value={sms.ratelimited}                 color={C.yellow} />
          <StatCard label="200 Fake"    value={sms.fake200}                     color={C.purple} />

          {/* Live pulse dot */}
          {running && (
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse 1.2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5 }}>ATTACK ACTIVE</span>
            </div>
          )}
        </div>

        {/* ── COL 3: LIVE LOG (flex-1) ─────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: C.muted }}>LIVE STREAM</span>
            <button onClick={() => setLogs([])} style={{ background: 'transparent', border: `1px solid ${C.dim}`, color: C.muted, padding: '2px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 10 }}>Clear</button>
          </div>

          <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0', background: C.bg, fontFamily: C.mono }}>
            {logs.length === 0 && (
              <div style={{ color: C.dim, padding: '30px 20px', textAlign: 'center', fontSize: 12 }}>
                {up ? 'Stream ready — launch an attack to see live output' : 'Backend offline — click Reconnect'}
              </div>
            )}
            {logs.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '1.5px 14px', fontSize: 11.5, lineHeight: 1.55 }}>
                <span style={{ color: C.dim, minWidth: 58, flexShrink: 0 }}>{l.t}</span>
                <span style={{ color: lvlColor(l.lvl), wordBreak: 'break-all', flex: 1 }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── COL 4: INTELLIGENCE (Phase 3.4) ─────────────── */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <Brain size={12} color={C.purple} />
            <span style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: C.muted }}>INTELLIGENCE</span>
            <button onClick={fetchIntel} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}>
              <RefreshCw size={11} color={C.dim} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!intel && (
              <div style={{ color: C.dim, fontSize: 11, textAlign: 'center', paddingTop: 20 }}>
                {up ? 'Loading...' : 'Server offline'}
              </div>
            )}

            {intel && (
              <>
                {/* Category hit-rate bar chart */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 1.2, color: C.muted, marginBottom: 6 }}>HIT RATE BY CATEGORY</div>
                  {intel.by_category.length > 0
                    ? <canvas ref={barCanvasRef} width={196} height={Math.min(intel.by_category.slice(0,8).length * 18, 144)} style={{ display: 'block', width: '100%' }} />
                    : <div style={{ color: C.dim, fontSize: 10 }}>No data yet</div>
                  }
                </div>

                {/* Top performers list */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 1.2, color: C.muted, marginBottom: 6 }}>TOP PERFORMERS</div>
                  {intel.top_targets.slice(0, 5).length === 0 && (
                    <div style={{ color: C.dim, fontSize: 10 }}>No data yet</div>
                  )}
                  {intel.top_targets.slice(0, 5).map((t, i) => {
                    const rate = t.total > 0 ? Math.round(t.otp_sent / t.total * 100) : 0
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, fontFamily: C.mono }}>{t.name}</span>
                        <span style={{ fontSize: 10, color: rate > 50 ? C.green : rate > 20 ? C.yellow : C.red, fontFamily: C.mono, flexShrink: 0 }}>{rate}%</span>
                      </div>
                    )
                  })}
                </div>

                {/* Quick summary counters */}
                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                  {[
                    ['APIs live', sms.api_count ?? '—'],
                    ['OTP sent', sms.sent],
                    ['Blocked', sms.blocked],
                    ['Rate-Ltd', sms.ratelimited],
                  ].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0' }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ color: C.green, fontFamily: C.mono }}>{v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </>
      )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        select option { background: #07090f; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2640; border-radius: 2px; }
      `}</style>
    </div>
  )
}

export default HydraConsole
