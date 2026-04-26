import { useState } from 'react'

interface Props {
  onClose: () => void
}

const SECTIONS = [
  {
    emoji: '⚡',
    title: 'What is SMS Bomber Pro?',
    color: '#0aff6a',
    content: `SMS Bomber Pro is a free SMS testing tool. It sends one-time-password (OTP) requests to phone numbers using 90+ verified Indian app sources — like Swiggy, JioMart, PhonePe, etc.

Use it to:
• Test if your own number is receiving SMS properly
• Stress-test API limits during development
• Check which services are active in your area

Think of it like a ping test — but for SMS.`,
  },
  {
    emoji: '📱',
    title: 'Step 1 — Enter a Phone Number',
    color: '#38bdf8',
    content: `Type the 10-digit mobile number in the PHONE NUMBER box.

✅ Example: 9876543210
✅ +91 is added automatically — you don't need to type it.
❌ Don't add spaces or dashes.

The number you enter will receive the SMS messages.`,
  },
  {
    emoji: '🎯',
    title: 'Step 2 — Choose How Many Rounds',
    color: '#a78bfa',
    content: `Pick a round count using the round chips:

• 1 round   — ~90 SMS (one pass through every source)
• 3 rounds  — ~270 SMS (good default test)
• 5 rounds  — ~450 SMS (heavy test)
• 10 rounds — ~900 SMS (max for free tier)
• ♾️ Unlimited — keeps sending until you press Stop (Pro only)

👉 Start with 3 rounds for a clean delivery test.`,
  },
  {
    emoji: '�',
    title: 'Step 3 — Choose Sending Mode',
    color: '#fb923c',
    content: `Pick how SMS Bomber sends:

• Standard — Sends through one server at a steady pace. Free for everyone.
• ⚡ Turbo (Multi-Server) — Splits the work across 3–10 parallel servers for maximum speed. Pro only 🔒.

👉 If you want fast bulk delivery, choose Turbo.
👉 If you want a controlled, steady test, choose Standard.`,
  },
  {
    emoji: '�️',
    title: 'Step 4 — Smart Routing (Anti-Block)',
    color: '#34d399',
    content: `The Smart Routing toggle keeps your delivery rate at 100%.

When ON: If a main source gets blocked, backup sources automatically take over. Highest delivery success.

When OFF: Only the primary sources are used.

👉 Keep Smart Routing ON for best results. Pro feature 🔒.`,
  },
  {
    emoji: '🚀',
    title: 'Step 5 — Press Start Sending!',
    color: '#0aff6a',
    content: `Press the big green "Start Sending" button.

A Live Status card will appear showing:

✅ Delivered — SMS that arrived successfully
⚠️ Limited — source blocked you temporarily (rate limit)
❌ Blocked — source rejected the request

Press the red Stop button at any time to end early.`,
  },
  {
    emoji: '📊',
    title: 'Reading the Live Status',
    color: '#fbbf24',
    content: `The Live Status card shows three big numbers:

• Delivered — SMS that successfully arrived
• Blocked  — sources that rejected your request
• Limited  — sources you hit too fast (resets in ~60s)

The Round counter (top right) shows current round vs total.

The progress bar shows how far through your run you are.`,
  },
  {
    emoji: '🐝',
    title: 'Turbo Mode (Multi-Server)',
    color: '#a78bfa',
    content: `Switch to Turbo mode to use multiple parallel servers — like having 3–10 phones sending at once.

In Advanced Settings, choose how many servers (2–10). Each server gets its own card showing live progress.

👉 Use Turbo when you want maximum delivery speed. It's significantly faster than Standard mode. Pro feature 🔒.`,
  },
  {
    emoji: '🔀',
    title: 'Smart Routing Explained',
    color: '#34d399',
    content: `Smart Routing enables a backup layer of sources that automatically activates when main ones get blocked.

When ON: If main sources get blocked, backup sources automatically take over. Highest delivery rate.

When OFF: Only primary sources are used.

👉 Keep Smart Routing ON for best results. Pro feature 🔒.`,
  },
  {
    emoji: '📄',
    title: 'Reports',
    color: '#60a5fa',
    content: `After every send, SMS Bomber Pro automatically generates a report.

When sending stops, a purple "Last Report" button appears in the top bar.

The report shows:
• Total SMS delivered
• Which sources worked best
• Blocked / rate-limited breakdown
• Timestamp of every round

Reports are saved locally and can be opened in your browser.`,
  },
  {
    emoji: '�',
    title: 'Advanced Settings',
    color: '#f472b6',
    content: `Tap "Advanced Settings" to fine-tune your send:

• Test Mode — super-slow debug mode that shows every API call (good for troubleshooting)
• Number of Servers — only used in Turbo mode (2 to 10)
• App Category Filter — limit to a specific category (food, payment, telecom...)
• Speed Precision — fine-grained gap between sends (Instant, Fast, Normal, Stealth, Ghost)
• Custom Round Count — type any number; 0 means unlimited

Most users never need to touch these.`,
  },
  {
    emoji: '❓',
    title: 'Common Problems',
    color: '#f87171',
    content: `🔴 "Site is black / not loading"
→ Press Ctrl + Shift + R (hard refresh) in Chrome

🔴 "Status pill says Offline"
→ The HYDRA backend isn't running. Wait 5–10s, then click the refresh icon in the status pill.

🔴 "All numbers stay at 0 even after Start"
→ Check the Live Activity panel. If it stays empty, the backend is offline.

🔴 "Limited keeps going up"
→ Normal! Sources block fast requests. Switch Speed Precision to Stealth or Ghost to slow down.

🔴 "Delivered count is low"
→ Try a different App Category Filter, or make sure the phone number is a real active Indian number. Turn on Smart Routing for best results.`,
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
