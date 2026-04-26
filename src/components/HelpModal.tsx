import { useState } from 'react'

interface Props {
  onClose: () => void
}

const SECTIONS = [
  {
    emoji: '⚡',
    title: 'What is HYDRA?',
    color: '#0aff6a',
    content: `HYDRA is an SMS testing tool. It sends OTP (one-time password) requests to phone numbers using 90+ real app APIs — like Swiggy, JioMart, PhonePe, etc.

Use it to:
• Test if your own number is receiving SMS properly
• Stress-test API limits during development
• Check which services are active in your area

Think of it like a "ping test" — but for SMS.`,
  },
  {
    emoji: '📱',
    title: 'Step 1 — Enter a Phone Number',
    color: '#38bdf8',
    content: `Type the 10-digit mobile number in the TARGET box at the top left.

✅ Example: 9876543210
✅ +91 is added automatically — you don't need to type it.
❌ Don't add spaces or dashes.

The number you enter will receive the SMS messages.`,
  },
  {
    emoji: '🎯',
    title: 'Step 2 — Choose a Mode',
    color: '#a78bfa',
    content: `There are 3 modes:

🟢 SWARM — Multiple workers fire at once. Maximum speed. Best for serious testing.

🔵 WAVE — One wave at a time. Controlled, steady. Good for monitoring results.

🟡 DEBUG — Very slow, shows every detail. Use this to check if a specific API is working.

👉 For most users: start with SWARM.`,
  },
  {
    emoji: '📂',
    title: 'Step 3 — Pick a Category',
    color: '#fb923c',
    content: `The CATEGORY dropdown filters which apps will send SMS.

• ALL (90) — Use all 90 APIs at once. Maximum coverage.
• sms — Generic SMS services
• food — Food delivery apps (Swiggy, Zomato etc.)
• payment — PhonePe, Paytm, etc.
• ecommerce — Shopping apps
• telecom — Jio, Airtel, BSNL etc.

👉 Keep it on ALL for the strongest effect.`,
  },
  {
    emoji: '🔥',
    title: 'Step 4 — Fire Speed & Waves',
    color: '#f43f5e',
    content: `FIRE SPEED controls the delay between each API call:

• Slow — 2 second gap (safe, avoids rate limits)
• Normal — 0.5 second gap (balanced)
• Fast — 0.1 second gap (aggressive)
• Turbo — Almost no gap (maximum blast)

WAVES (the number box):
• 0 = Run forever until you press STOP
• 1, 2, 3... = Stop after that many rounds

👉 Start with Normal speed + 0 waves (unlimited) for a full test.`,
  },
  {
    emoji: '🚀',
    title: 'Step 5 — Launch!',
    color: '#0aff6a',
    content: `Press the big green LAUNCH SMS button.

You'll see the Live Stream panel start filling up with results in real-time:

✅ OTP_SENT — API worked, SMS sent!
⚠️ RATE_LIMITED — API blocked you temporarily (too many requests)
❌ BLOCKED — API rejected the request
🟡 200_FAKE — API said "ok" but probably didn't send

Press STOP at any time to end the attack.`,
  },
  {
    emoji: '📊',
    title: 'Reading the Stats',
    color: '#fbbf24',
    content: `The SMS STATS panel shows live counts:

• STATUS — IDLE (waiting) or RUNNING (active)
• WAVE — Which round you're on
• OTP SENT — How many SMS were successfully triggered
• BLOCKED — How many APIs rejected you
• RATE LIMIT — Temporary bans (resets automatically)
• 200 FAKE — APIs that lied (returned OK but did nothing)

Bottom right INTELLIGENCE panel shows which category has the best success rate.`,
  },
  {
    emoji: '🐝',
    title: 'SWARM Mode (Advanced)',
    color: '#a78bfa',
    content: `Switch to the SWARM tab at the top for multi-worker mode.

This splits the 90 APIs across multiple "workers" that run simultaneously — like having 3-5 phones attacking at once.

• Workers — How many parallel attackers (2–5 recommended)
• Each worker gets its own card showing its progress

👉 Use Swarm when you want the absolute maximum impact. It's significantly faster than single mode.`,
  },
  {
    emoji: '🔀',
    title: 'Dual-Vector Toggle',
    color: '#34d399',
    content: `The DUAL-VECTOR toggle (below fire speed) enables a second layer of attack using "recovery targets" — backup APIs that activate when main ones get blocked.

When ON: If main APIs get blocked, backup APIs automatically take over. Higher success rate.

When OFF: Only primary APIs are used.

👉 Keep Dual-Vector ON for best results.`,
  },
  {
    emoji: '📄',
    title: 'Reports',
    color: '#60a5fa',
    content: `After every attack, HYDRA automatically generates a report.

When the attack stops, a purple VIEW REPORT button appears at the bottom of the Live Stream panel.

The report shows:
• Total OTPs sent
• Which APIs worked best
• Blocked/rate-limited breakdown
• Timestamp of every wave

Reports are saved locally and can be opened in your browser.`,
  },
  {
    emoji: '🛠️',
    title: 'Tools Button (Top Left)',
    color: '#f472b6',
    content: `Click TOOLS in the top left to access extra features:

• Voice Encrypter — Record and scramble voice messages
• Neural Editor — AI-powered text editor
• Sarkari Compress — Compress PDF/images for government forms
• RAW Lab — Advanced file processing

These are completely separate from HYDRA SMS testing.`,
  },
  {
    emoji: '❓',
    title: 'Common Problems',
    color: '#f87171',
    content: `🔴 "Site is black / not loading"
→ Press Ctrl + Shift + R (hard refresh) in Chrome

🔴 "HYDRA shows 0 APIs"
→ Wait 5 seconds and refresh. The backend is still loading.

🔴 "All stats show 0 even after launch"
→ Check that the backend is running. Look for "Server ready — 90 live APIs" in the Live Stream.

🔴 "Rate Limited keeps going up"
→ Normal! APIs block fast requests. Switch to Slow speed or wait 60 seconds.

🔴 "OTP SENT is low"
→ Try a different Category, or make sure the phone number is a real active Indian number.`,
  },
]

export default function HelpModal({ onClose }: Props) {
  const [active, setActive] = useState(0)
  const section = SECTIONS[active]

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="help-header">
          <div className="help-title-row">
            <span className="help-logo">⚡ HYDRA</span>
            <span className="help-subtitle mono">User Guide · Plain Language</span>
          </div>
          <button className="help-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="help-body">
          {/* Sidebar nav */}
          <nav className="help-nav">
            {SECTIONS.map((s, i) => (
              <button
                key={i}
                className={`help-nav-item ${i === active ? 'active' : ''}`}
                onClick={() => setActive(i)}
                style={{ '--nav-color': s.color } as React.CSSProperties}
              >
                <span className="help-nav-emoji">{s.emoji}</span>
                <span className="help-nav-label">{s.title}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="help-content">
            <div className="help-section-header" style={{ borderColor: section.color }}>
              <span className="help-section-emoji">{section.emoji}</span>
              <h2 className="help-section-title" style={{ color: section.color }}>{section.title}</h2>
            </div>
            <div className="help-section-body">
              {section.content.split('\n').map((line, i) =>
                line === '' ? <br key={i} /> :
                line.startsWith('•') || line.startsWith('✅') || line.startsWith('❌') || line.startsWith('⚠️') || line.startsWith('🟢') || line.startsWith('🔵') || line.startsWith('🟡') || line.startsWith('🔴') ? (
                  <p key={i} className="help-bullet">{line}</p>
                ) : line.startsWith('👉') ? (
                  <p key={i} className="help-tip">{line}</p>
                ) : (
                  <p key={i} className="help-para">{line}</p>
                )
              )}
            </div>

            {/* Prev / Next */}
            <div className="help-nav-arrows">
              <button
                className="help-arrow-btn"
                disabled={active === 0}
                onClick={() => setActive(a => a - 1)}
              >← Previous</button>
              <span className="help-progress mono">{active + 1} / {SECTIONS.length}</span>
              <button
                className="help-arrow-btn"
                disabled={active === SECTIONS.length - 1}
                onClick={() => setActive(a => a + 1)}
              >Next →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
