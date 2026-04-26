# HYDRA v5.0 — User Guide
## Everything That Works, How to Use It, and What's Coming Next
> **Written for non-coders.** No technical background needed to understand this guide.

---

## What Is HYDRA?

HYDRA is an **OTP stress-testing tool**. It sends real "Send me an OTP" requests to Indian apps and platforms — the same requests your phone would send when you tap "Login" or "Register."

**Why would you use this?**
- You are testing your own phone number to see which apps have weak or no rate-limiting (they let you request unlimited OTPs)
- You are running authorized security research to find which platforms are vulnerable
- You are learning about API security and how Indian apps handle authentication

**One rule:** Only use on your own number or numbers you have written permission to test. That's it.

---

## What You Need Before Starting

1. **Python** — already set up in `.venv` folder (no action needed)
2. **Node.js** — already installed (used to run the browser dashboard)
3. **PHP** *(optional, for advanced mode)* — install with: `winget install PHP.PHP`
4. **Internet connection** — HYDRA talks to real APIs online

---

## How to Start HYDRA (Every Time)

Open **two** separate terminal windows in the project folder.

**Terminal 1 — Start the backend engine:**
```
.venv\Scripts\python.exe hydra_server.py
```
You will see: `* Running on http://0.0.0.0:4040`

**Terminal 2 — Start the browser dashboard:**
```
npm run dev
```
You will see: `Local: http://localhost:3001`

**Then open your browser:**
Go to → `http://localhost:3001`

Click the **HYDRA** button in the tools section. That's it. You're in.

---

## The Browser Dashboard — What Each Part Does

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Tools    ⚡ HYDRA v5.0    [SINGLE] [SWARM]    ● ONLINE·76 APIs│
├──────────┬──────────┬─────────────────────┬──────────────────────┤
│ CONTROLS │  STATS   │   LIVE STREAM        │   INTELLIGENCE       │
│ (left)   │ (numbers)│   (what's happening) │   (smart analysis)   │
└──────────┴──────────┴─────────────────────┴──────────────────────┘
```

### The Green Dot in the Top Right
- **Green dot + "ONLINE · 76 APIs"** = backend is running, ready to attack
- **Red dot + "OFFLINE"** = you forgot to start `hydra_server.py` in Terminal 1. Start it.

---

## Two Ways to Run an Attack

### Mode 1: SINGLE Tab (one attack at a time)

Click the **SINGLE** tab at the top. You'll see 4 columns:

#### Controls Column (left side)
| Field | What to enter |
|---|---|
| **Target (+91 auto)** | Your 10-digit mobile number. No +91 prefix needed. Example: `9876543210` |
| **Mode** | See mode table below |
| **Category** | Filter which type of apps to test. "ALL" tests everything. |
| **Fire Speed** | How fast to send requests. See speed table below. |
| **Waves (0=∞)** | How many rounds to run. `0` = run forever until you press STOP. |
| **DUAL-VECTOR** | Toggle (on/off). When ON: also triggers forgot-password SMS flows at the same time. |

**Modes:**
| Mode | What it does |
|---|---|
| SWARM | Runs waves in a loop automatically. Best for stress testing. |
| WAVE | Fires all APIs once, shows results, stops automatically. |
| DEBUG | Same as WAVE but also shows the raw response from each API. Useful for checking what a blocked response looks like. |

**Fire Speed:**
| Speed | Delay between requests | Use when |
|---|---|---|
| ⚡ Instant | 0ms | Maximum speed, highest chance of getting blocked fast |
| 🔥 Fast | 100ms | Good balance of speed and stealth |
| Normal | 300ms | Default. Works well for most platforms. |
| Stealth | 500ms | Slower but harder to detect as automated |
| Ghost | 1000ms | Very slow, mimics human speed. Best evasion. |

#### Stats Column (numbers)
Shows what's happening right now:
- **Status** — LIVE (attack running) or IDLE (waiting)
- **Wave** — which round number you're on
- **OTP Sent** — number of platforms that sent an actual OTP ✅ (this is a vulnerability)
- **Blocked** — platforms that detected and blocked the request ❌
- **Rate Limit** — platforms that said "too many requests" ⚠️
- **200 Fake** — platforms that returned "success" but didn't actually send SMS (deceptive API) 🟡

#### Live Stream Column (middle, widest)
Real-time log of every request as it happens. Color coded:
- 🟢 Green text = OTP was sent (vulnerability confirmed)
- 🔴 Red text = blocked
- 🟡 Yellow text = rate limited
- Grey = system message

#### Intelligence Column (right side, Phase 3.4)
After you run at least one attack, this shows:
- **Hit Rate by Category** — bar chart showing which category of apps (finance, food, transport, etc.) has the highest OTP success rate
- **Top Performers** — specific apps that consistently send OTPs (most vulnerable)
- **Summary counters** — quick numbers

---

### Mode 2: SWARM Tab (multiple attacks at once)

Click the **SWARM** tab at the top. This runs **2 to 10 parallel attack processes** at the same time, dividing the 76 APIs between them.

| Field | What to enter |
|---|---|
| **TARGET** | Your 10-digit number |
| **WORKERS** | How many parallel processes. 3 is a good start. |
| **SPEED** | Same as Single mode |
| **WAVES (0=∞)** | Same as Single mode |
| **DUAL-VEC** | Toggle — enables account recovery SMS in addition to login OTP |

Click **LAUNCH SWARM** to start. You'll see cards appear — one per worker — each showing their own Wave/OTP/Blocked counts.

Click **STOP SWARM** to stop all workers at once.

---

## After the Attack — The Report

After any attack finishes (when you press STOP), a purple **VIEW REPORT** button appears in the top bar.

Click it. It opens a professional HTML pentest report in your browser showing:
- Session summary (phone tested, time, waves, total requests)
- Which platforms sent OTPs (the vulnerabilities found)
- OWASP classification for each finding (M4: Insecure Authentication, M9: API exposed)
- Response body snapshots as evidence (hashed with SHA256 for tamper-proof chain of custody)
- Auto-generated executive summary paragraph

The report is also saved as both HTML and JSON in the `hydra_reports/` folder.

---

## What Verdicts Mean

Every API response gets one of these labels:

| Verdict | Plain English | What it means |
|---|---|---|
| **OTP_SENT** | ✅ Vulnerable | The platform sent a real SMS. No rate limiting. |
| **RATE_LIMITED** | ⚠️ Has some protection | Platform said "too many requests." Has basic protection. |
| **BLOCKED** | 🔴 Fully blocked | Platform detected automation and refused. Good security. |
| **200_FAKE** | 🟡 Deceptive | API returned "success" but no SMS came. Fake success response. |
| **TIMEOUT** | ⏱️ Dead or slow | No response within 8 seconds. Server may be down. |
| **ERROR** | 💀 Dead endpoint | DNS failed or connection refused. API no longer exists. |
| **PHP_BRIDGE** | 🔵 Alternate stack | Was blocked via Python, auto-switched to PHP cURL (different fingerprint). |

---

## All Features — Complete List of What Works

### ✅ Core Engine
| Feature | What it does |
|---|---|
| **76 Indian APIs** | 47 static endpoints + 29 auto-fetched from TBomb. Categories: e-commerce, food, transport, finance, healthcare, education, real-estate, gaming, logistics, insurance |
| **Wave engine** | Fires all APIs in parallel threads per wave |
| **Graceful stop** | Press STOP in UI or Ctrl+C in terminal — cleanly finishes current wave, saves log, then stops. Press Ctrl+C twice to force-quit. |
| **Unlimited mode** | Waves=0 means it runs forever until you press STOP |

### ✅ Evasion Engine (Why It Bypasses Blocks)
| Feature | What it does |
|---|---|
| **50 User-Agents** | Rotates between 50 real device fingerprints (Android 12/13/14, iOS 16/17, Windows Chrome) — never looks like the same device twice |
| **Dynamic headers** | Every request gets randomized Accept-Language, X-Request-ID, X-Forwarded-For (spoofed IP) |
| **Payload morphing** | Same request sent with different field names per wave — `{"phone": X}` vs `{"mobile": X}` vs `{"mobileNumber": X}` — so pattern matching can't catch it |
| **Gaussian timing** | Delays are random (like a human) not fixed — defeats time-series fingerprinting |
| **curl_cffi Chrome120** | Uses Chrome's actual TLS fingerprint instead of Python's — defeats TLS fingerprint detection |
| **WAF auto-throttle** | If more than 50% of a wave gets blocked, automatically slows down for the next wave |

### ✅ Intelligence (Memory & Learning)
| Feature | What it does |
|---|---|
| **SQLite session DB** | Every request result saved locally (`hydra_data/sessions.db`) — HYDRA remembers across sessions |
| **Smart Wave Composer** | Before each wave, ranks APIs by 7-day success rate. Best performers fire first. Chronically blocked ones get skipped. |
| **Response body parser** | Reads the JSON response from each API to detect "otp sent," "too many requests," cooldown timers — feeds real data into verdicts |
| **Hit rate chart** | Bar chart in Intelligence panel showing OTP success rate per app category |
| **Top performers list** | Which specific apps consistently send OTPs |

### ✅ Multi-Vector (More Attack Surface)
| Feature | What it does |
|---|---|
| **Dual-Vector mode** | Fires both login OTP endpoints AND account recovery (forgot password) SMS flows at the same time — double the surface area |
| **10 Recovery targets** | Dedicated "forgot password" flows for major platforms — triggers a different SMS code type |
| **Platform profiles** | 15 platform fingerprint profiles stored in `hydra_data/platform_profiles.json` — knows each app's OTP expiry, lockout rules |

### ✅ Distributed Swarm (Phase 5)
| Feature | What it does |
|---|---|
| **Multi-process swarm** | 2–10 parallel worker processes, each handling a subset of APIs |
| **No duplicate targeting** | Swarm coordinator ensures two workers never fire the same API at the same second |
| **Per-worker dashboard** | Each worker gets its own stats card in the browser UI |
| **Resource governor** | Monitors CPU — if it goes above 70%, automatically reduces thread count so your computer doesn't freeze |

### ✅ Reporting (Phase 6)
| Feature | What it does |
|---|---|
| **Auto HTML report** | Generated automatically after every attack — opens with VIEW REPORT button |
| **JSON machine report** | Same data in JSON format for programmatic use |
| **OWASP classification** | Each vulnerability mapped to OWASP Mobile Top 10 (M4, M9) |
| **SHA256 evidence hashes** | Response body snapshots are hashed — tamper-proof chain of evidence |
| **Executive summary** | Auto-written paragraph summarizing findings — paste-ready for a pentest report |

### ✅ Auto-Sync Engine (Phase 8)
| Feature | What it does |
|---|---|
| **Live endpoint fetch** | On startup, fetches fresh endpoints from TBomb (GitHub) and XBomber (GitHub) — always up to date |
| **Offline cache** | If GitHub is unreachable, uses `hydra_autosync_cache.json` — never fails cold |
| **Background refresh** | During long swarm runs, re-fetches endpoint lists every few minutes — new endpoints added without restart |
| **Auto deduplication** | If TBomb or XBomber has an API already in the static list, it's not doubled |

### ✅ PHP Bridge (Phase 9)
| Feature | What it does |
|---|---|
| **PHP cURL subprocess** | If Python requests keep getting blocked, fires the same request through PHP's cURL — completely different TLS stack and HTTP fingerprint |
| **Auto-switch** | After 3 consecutive BLOCKED verdicts on the same target, automatically switches to PHP bridge — no manual action needed |
| **Manual tag** | Add `"php_bridge": true` to any target entry to always use PHP for that API |
| **PHP status in banner** | Shows `[PHP bridge: AVAILABLE]` or `[PHP bridge: NOT FOUND]` in terminal banner |
| **API status** | `/api/status` endpoint includes `php_bridge: true/false` — shown in UI server info |

---

## Files and Folders — What Each One Is

```
hydra_v4.py              ← The main engine. 2300+ lines. All 76 APIs. Fire logic.
hydra_server.py          ← Flask web server. Talks to the browser dashboard.
hydra_swarm_manager.py   ← Manages parallel worker processes (Phase 5).
hydra_autosync.py        ← Fetches fresh endpoints from GitHub at startup (Phase 8).
hydra_mailtm.py          ← Email OTP capture using temp mail (Phase 4.2).
hydra_reporter.py        ← Generates HTML + JSON pentest reports (Phase 6).

hydra_data/
  sessions.db            ← Local SQLite database. Stores all past request results.
  platform_profiles.json ← 15 platform fingerprint profiles (OTP expiry, lockout rules).

hydra_logs/
  hydra_YYYYMMDD_HHMMSS.json  ← Full session log per attack (auto-saved).

hydra_reports/
  report_YYYYMMDD_HHMMSS.html  ← HTML pentest report (auto-saved after each attack).
  report_YYYYMMDD_HHMMSS.json  ← JSON version of same report.

hydra_autosync_cache.json  ← Offline cache of fetched endpoints. Auto-managed.

src/components/HydraConsole.tsx  ← The browser UI (React). All 4 columns + Swarm panel.
```

---

## Common Problems and Fixes

### "ALL (0)" showing in the category dropdown
**Cause:** `hydra_server.py` is not running.
**Fix:** Open a terminal and run: `.venv\Scripts\python.exe hydra_server.py`

### Red dot "OFFLINE" in the browser
**Cause:** Same as above — backend not running.
**Fix:** Same fix. Run the server first.

### Attack starts but every result is BLOCKED or TIMEOUT
**Possible causes:**
1. Your internet is slow — try Normal or Stealth speed
2. The platform has updated its WAF — HYDRA will auto-slow via WAF throttle
3. PHP bridge not installed — install it: `winget install PHP.PHP`

### VIEW REPORT button doesn't appear
**Cause:** Report only generates when an attack actually ran (at least 1 wave fired) then stopped.
**Fix:** Run at least 1 wave, then press STOP. The button appears after stop.

### `hydra_data/sessions.db` not found
**Cause:** No attack has ever been run — DB is created on first run automatically.
**Fix:** Just run an attack once. The file will be created.

### PHP bridge shows NOT FOUND
**Cause:** PHP is not installed on your computer.
**Fix:** Run in terminal: `winget install PHP.PHP`
After install, restart `hydra_server.py` and it will detect PHP automatically.

---

## Quick Command Reference

```powershell
# Start backend (Terminal 1 — always keep this running)
.venv\Scripts\python.exe hydra_server.py

# Start frontend (Terminal 2)
npm run dev

# Type-check (catch any TypeScript errors before push)
npm run type-check

# Build (production build — what GitHub Pages deploys)
npm run build

# Check if PHP is installed
php --version

# Install PHP (if not installed)
winget install PHP.PHP

# Run HYDRA from command line (no browser, classic terminal mode)
.venv\Scripts\python.exe hydra_v4.py
```

---

## Future Improvements — What's Planned

These are features in the roadmap that are **not yet built**:

### Short-term (easy wins, high value)

| Feature | What it would do | Effort |
|---|---|---|
| **APK endpoint scanner** | Automatically scan Indian app APKs to discover new OTP endpoints. Zero manual work to find new APIs. | Medium |
| **Endpoint confidence scoring** | Track which APIs work best over time. Sort the wave queue by highest past success rate automatically. | Low |
| **Line chart for waves** | Show OTP_SENT count over time as a line graph in the Intelligence panel. Currently only bar chart exists. | Low |
| **Email OTP capture UI** | Currently `hydra_mailtm.py` is coded but not wired into the browser. Would let you capture the actual OTP code from email. | Low |

### Medium-term

| Feature | What it would do | Effort |
|---|---|---|
| **Node.js bridge** | Third HTTP stack alongside Python and PHP. Node.js fetch has a different TLS fingerprint again. Even harder to block. | Medium |
| **Endpoint freshness scoring** | Track when each endpoint was last seen in a live source. Auto-age-out APIs that haven't been updated in 30+ days. | Medium |
| **GitHub API watcher** | Automatically watch GitHub for new Indian OTP bomber repos. If a new one appears with a parseable format, auto-add its endpoints. | Medium |

### Long-term

| Feature | What it would do | Effort |
|---|---|---|
| **Category expansion** | Add more Indian apps in gaming, crypto, gig economy (Swiggy, WinZO, CoinSwitch). Currently 76 → target 150+. | High |
| **Headless browser mode** | For platforms that require JavaScript to generate the OTP request — use a headless Chrome subprocess. | High |
| **Residential proxy pool** | Route requests through real residential IPs for maximum stealth on hardened platforms. | High |

---

## Summary — What Phase Is Done

| Phase | Name | Status |
|---|---|---|
| 1.3 | Liveness health check on startup | ✅ Done |
| 2.1 | Dynamic request fingerprinting | ✅ Done |
| 2.2 | 50-UA device pool | ✅ Done |
| 2.3 | Gaussian timing jitter | ✅ Done |
| 2.4 | Payload morphing (3+ variants) | ✅ Done |
| 3.1 | SQLite session memory | ✅ Done |
| 3.2 | Smart wave composer | ✅ Done |
| 3.3 | Response body parser | ✅ Done |
| 3.4 | Intelligence dashboard panel | ✅ Done |
| 4.1 | Dual-vector strike (SMS + recovery) | ✅ Done |
| 4.2 | Email OTP (hydra_mailtm.py) | ✅ Engine done (UI not wired) |
| 4.3 | WAF adaptive throttle | ✅ Done |
| 4.4 | 9 new recon target endpoints | ✅ Done |
| 4.5 | Platform fingerprint map (15 platforms) | ✅ Done |
| 5.1 | Swarm process manager | ✅ Done |
| 5.2 | Wave coordinator (no duplicates) | ✅ Done |
| 5.3 | Swarm browser UI panel | ✅ Done |
| 5.4 | Resource governor (CPU throttle) | ✅ Done |
| 6.1 | HTML + JSON session report | ✅ Done |
| 6.2 | OWASP vulnerability classification | ✅ Done |
| 6.3 | SHA256 PoC snapshots | ✅ Done |
| 6.4 | Executive summary + VIEW REPORT button | ✅ Done |
| 7 | External engine audit (TBomb, XBomber research) | ✅ Done |
| 8.0 | Auto-sync live engine | ✅ Done |
| 8.2 | Background scheduled refresh | ✅ Done |
| 9.1 | PHP subprocess bridge | ✅ Done |
| 9.2 | Auto-switch after 3 BLOCKEDs | ✅ Done |
| 10.1 | Graceful cooperative stop | ✅ Done |
| 10.2 | Unlimited bombing mode | ✅ Done |
| 10.3 | Gaussian wave timing | ✅ Done |
| 1.1 | APK autodiscovery scanner | ❌ Not yet |
| 1.4 | Endpoint confidence scoring | ❌ Not yet |
| 4.2 UI | Email OTP in browser | ❌ Not yet |
| 8.3 | Endpoint freshness scoring | ❌ Not yet |
| 8.4 | GitHub API monitoring | ❌ Not yet |
| 9.3 | Node.js bridge | ❌ Not yet |

---

*Last updated: April 26, 2026 — HYDRA v5.0 — Phases 1–10 complete (core). 76 live APIs.*
