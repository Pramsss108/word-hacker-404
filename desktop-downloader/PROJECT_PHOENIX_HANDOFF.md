# 🦅 PROJECT PHOENIX: CLASSIFIED OPERATIONAL DOSSIER

> [!CAUTION]
> **CLEARANCE: LEVEL 5 (OMNI)**
> **STATUS:** GOD MODE ACTIVE
> **PROTOCOL:** DEEP INFILTRATION

---

## 🌎 1. THE ARCHITECTURE ("The Hybrid Engine")

This is not a standard web scraper. It is a **Hybrid Interceptor** combining a **Rust Backend** (Cyber Grid) with a **Javascript Frontend** (Satellite).

### 📁 PROJECT STRUCTURE
*   **Root:** `desktop-downloader/`
*   **The Brain (Rust):** `src-tauri/src/` -> Handles Encryption, FFMPEG processing, and direct API calls.
*   **The Eyes (JS):** `src/renderer/sniffer.js` -> Injected into the target browser to steal credentials.

---

## �️ 2. THE SATELLITE (JavaScript / Frontend)

> **File:** `src/renderer/sniffer.js`
> **Role:** Token Extraction & UI Overlay.

The Satellite is a "Parasitic Script" injected into a secure WebView. It bypasses `HttpOnly` cookie protections by using the user's authenticated session to "sniff" the keys.

### 🧠 INTELLIGENCE MODULES:

#### A. The "Smart Parser" (`smartParse()`)
*   **Location:** `sniffer.js` line ~380
*   **Capability:** It doesn't just look for keys. It analyzes **ENTIRE DUMPS**.
*   **Regex Engine:**
    *   Target 1: `/access_token[\s\t=]+("?)([\w\-\._:~+\/%]+)\1/` -> Catches Opaque API Tokens (even with `+` `%` symbols).
    *   Target 2: `/ud_user_jwt[\s\t=]+("?)(ey[\w\-\._]+)\1/` -> Catches Identity Tokens (JWTs).
*   **Behavior:** It recursively scans Clipboard content, Raw Text Inputs, and JSON objects to find the valid key.

#### B. The "Clipboard Poller" (`checkClipboardForToken()`)
*   **Logic:** Runs on a 1000ms heartbeat.
*   **Action:** If the user copies *anything* that looks like a cookie string or token (from standard Chrome/Edge), this function auto-extracts it and logs them in.
*   **Zero-Click:** The user never presses "Submit". The app just *knows*.

#### C. The "Hacker Terminal" (UI)
*   **Overlay:** A custom DOM element (`#black-ops-overlay`) injected into the victim site.
*   **Status:** Displays "ACCESS GRANTED" or "SCANNING..." directly on top of the web page.

---

## 🛡️ 3. THE CYBER GRID (Rust / Backend)

> **File:** `src-tauri/src/services/udemy_api.rs`
> **Role:** Heavy Lifting & Decryption.

Once the Satellite extracts the key (`GLOBAL_TOKEN`), it is passed here via Tauri IPC.

### 🔑 AUTHENTICATION LAYER (`UdemyClient`)
*   **Header Injection:** Automatically injects `Authorization: Bearer <TOKEN>` into every request.
*   **Traffic Shaping:** Uses "Ghost Jitter" (random sleep 300-1200ms) to mimic human behavior and evade WAF (Web Application Firewall) bans.

### 🔎 DEEP SCAN (`get_curriculum`)
*   **URL:** `/courses/{id}/curriculum-items`
*   **Fields:** We explicitly request the *entire* matrix:
    *   `media_sources`: Contains the HLS/M3U8 playlists (often hidden).
    *   `stream_urls`: Direct MP4 links (encrypted or clear).
    *   `caption_tracks`: VTT/SRT subtitles.

---

## ⚠️ 4. CURRENT MISSION STATUS & NEXT MOVES

### ✅ SECTOR 1: AUTHENTICATION (SOLVED)
*   **Status:** **OPERATIONAL.**
*   **Victory:** We defeated the `403 Forbidden` error. The `smartParse` logic now correctly identifies Opaque Tokens vs JWTs.
*   **Proof:** Logs show "Access Granted" and the backend receives the key.

### 🚧 SECTOR 2: TARGET ACQUISITION (BUGS)
*   **Status:** **PARTIAL FAILURE.**
*   **Symptom:** The backend logs "Found 0 courses", even though the cookie dump proves the user has an active course ("AI Agentic Bootcamp").
*   **Diagnosis:** The `get_courses` API call in `udemy_api.rs` is likely missing filter parameters (e.g., `is_archived=true`) or sorting controls.

### � ORDERS FOR THE NEXT AGENT (EXECUTION PLAN)

**Priority 1: Fix the Course Fetch**
1.  Open `src-tauri/src/services/udemy_api.rs`.
2.  Locate `get_courses()`.
3.  **MODIFY THE URL:** Change the endpoint to:
    ```rust
    // GOD MODE QUERY: Force generic sort and default fields
    let url = format!("{}/users/me/subscribed-courses?page_size=50&ordering=-last_accessed&fields[course]=@all", BASE_URL);
    ```
4.  **Recompile & Test.**

**Priority 2: The Download Loop**
1.  Once the course list appears in the UI, verify the "FORCE EXTRACT" button.
2.  Ensure it calls `download_video` in `main.rs`.
3.  Verify that `ffmpeg` correctly merges the `m3u8` segments if the source is HLS.

---

**"WE DO NOT KNOCK. WE ENTER."**
*End of Line.*
