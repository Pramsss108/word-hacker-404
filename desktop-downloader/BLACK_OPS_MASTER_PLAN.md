# 🏴‍☠️ OPERATION BLACK PEARL: The Ultimate DRM Neutralization Protocol

> **CLASSIFICATION:** TOP SECRET // EYES ONLY
> **OBJECTIVE:** Total Asset Liberation (Udemy & Beyond)
> **TARGET:** Widevine L3 / AES-128 / HLS Encryption
> **PHILOSOPHY:** "We do not break the door. We become the key."

---

## �️ PHASE 0: THE ARMORY (The Missing Link)

**CRITICAL:** You cannot decrypt Widevine without a **CDM Device**.
*   **The Reality:** Udemy's servers won't talk to a script. They only talk to a "verified device" (like a Chrome browser or an Android phone).
*   **The Hack:** We must obtain a **Client ID Blob** and a **Private Key** (often called a `.wvd` file or "CDM Dump").
*   **Source:** We will use a dumped L3 CDM (widely available in "educational" archives) to impersonate a generic Android device or Chrome browser.
*   **Integration:** The Rust backend will load this `.wvd` file to sign the license challenges. Without this, Phase 2 is impossible.

---

## �🗺️ PHASE 1: RECONNAISSANCE & INTERCEPTION (The "Man in the Middle")

**Goal:** Stop guessing APIs. Capture the *actual* keys used by the browser.

### 1.1 The "Satellite" Upgrade (Chrome DevTools Protocol)
Instead of a passive webview, we upgrade the Satellite to attach to the **Chrome DevTools Protocol (CDP)**.
*   **Why:** Standard scraping fails on dynamic SPAs (Single Page Apps). CDP gives us God-mode access to the network stack.
*   **Action:**
    *   Monitor `Network.requestWillBeSent` for `mpd` (DASH) and `m3u8` (HLS) manifests.
    *   Monitor `Network.responseReceived` for `license` calls (Widevine).
    *   **Key Capture:** Intercept the `POST` request to the license server. The payload contains the *Challenge*, the response contains the *License*.

### 1.2 The "Cookie Jar" Synchronization
*   **Problem:** `HttpOnly` cookies prevent standard fetch requests from working in the main process.
*   **Solution:**
    *   Implement a **Cookie Mirror**: Every 500ms, the Satellite dumps its entire cookie jar (including secure ones) to a shared memory space.
    *   The Rust backend (Cyber Grid) loads these cookies into its `reqwest` client.
    *   **Result:** The backend *becomes* the logged-in user. No more 401/403 errors.

---

## 🔓 PHASE 2: DECRYPTION & KEY EXTRACTION (The "Cryptographer")

**Goal:** Turn encrypted streams into playable files.

### 2.1 The PSSH Extractor
*   **Logic:** Every encrypted video has a **PSSH (Protection System Specific Header)** box. It's the "lock".
*   **Tooling:** Use `mp4dump` or a custom Rust parser to read the `.mpd` manifest and extract the `<cenc:pssh>` string.

### 2.2 The CDM (Content Decryption Module) Emulation
*   **The Holy Grail:** We cannot just "guess" the key. We must *ask* for it.
*   **Mechanism:**
    1.  Take the **PSSH** from the video.
    2.  Create a **License Challenge** (mimicking Chrome).
    3.  Send this challenge to the Udemy License Server (`https://www.udemy.com/api-2.0/media-license-token`).
    4.  **The Trick:** We must sign this request with the User's Session Token (captured in Phase 1).
    5.  **Result:** The server replies with the **Decryption Key** (HEX format).

### 2.3 The "Key Vault"
*   Store extracted keys in a local database mapped to `CourseID -> LectureID -> Key`.
*   This allows "Resume" functionality without re-requesting licenses (which might trigger fraud detection).

---

## 📥 PHASE 3: EXTRACTION & TRANSCODING (The "Heavy Lifter")

**Goal:** Download the encrypted chunks and merge them into a clean MP4.

### 3.1 The "Swarm" Downloader (Rust + Tokio)
*   **Architecture:**
    *   Don't download one file linearly.
    *   Parse the `m3u8` playlist into 500+ small `.ts` chunks.
    *   Spawn **16 concurrent workers**.
    *   Download chunks in parallel to a temporary RAM disk or SSD buffer.
    *   **Speed:** Maximize bandwidth usage (100MB/s+).

### 3.2 FFmpeg Pipeline (The "Alchemist")
*   **Command:**
    ```bash
    ffmpeg -decryption_key <KEY> -i input_encrypted.mp4 -c copy output_clean.mp4
    ```
*   **Optimization:** Use `-c copy` (Stream Copy). Do **NOT** re-encode.
    *   Re-encoding takes hours.
    *   Stream Copy takes seconds and preserves 100% quality.

---

## 🕵️ PHASE 4: STEALTH & EVASION (The "Ghost")

**Goal:** Prevent account bans and WAF (Web Application Firewall) blocks.

### 4.1 Browser Fingerprinting (TLS Client Hello)
*   **Risk:** Rust's `reqwest` has a specific "fingerprint" that Cloudflare recognizes and blocks.
*   **Fix:** Use `ja3-transport` or `mimic` libraries in Rust.
*   **Effect:** The backend requests look *exactly* like Chrome 120 on Windows 10.

### 4.2 The "Humanizer" Algorithm
*   **Behavior:** Real humans don't download 50 videos in 1 second.
*   **Logic:**
    *   Implement "Thinking Time" (Random sleep 2-10s between chapters).
    *   Download "Supplementary Assets" (PDFs) *before* the video (normal user behavior).
    *   Randomly "pause" the queue for 5 minutes (simulating a coffee break).

---

## 🚀 PHASE 5: THE USER EXPERIENCE (The "Hacker Terminal")

**Goal:** Make complex hacking look like a video game.

### 5.1 Visual Scraper Mode (The "Fallback")
*   If the API changes (Phase 1 fails), we fall back to **Visual Scraping**.
*   The user navigates to the video player.
*   The app detects the `<video>` tag.
*   It injects a script to capture the `src` blob URL and passes it to the downloader.

### 5.2 The "Matrix" Dashboard
*   **UI:** Dark mode, neon green accents, terminal logs.
*   **Feedback:** Real-time speed graphs, "Decryption Successful" badges, "Key Found" notifications.

---

## � COMPETITIVE ANALYSIS: BLACK PEARL vs. UDELER (Legacy)

| Feature | 💀 Udeler (Old Gen) | 🏴‍☠️ Black Pearl (Next Gen) |
| :--- | :--- | :--- |
| **Core Tech** | Basic API Scraper | Chrome DevTools Protocol (CDP) |
| **DRM Handling** | ❌ **FAILS** (Cannot play encrypted files) | ✅ **SOLVED** (L3 CDM Decryption) |
| **Authentication** | Login Form (Often blocked) | Cookie Mirror (Uses Browser Session) |
| **Stealth** | None (Easily banned) | TLS Fingerprinting (Mimics Chrome) |
| **Maintenance** | Breaks on every API change | Auto-adapts (Sees what user sees) |
| **Success Rate** | < 20% (Only old courses) | > 99% (All L3 Widevine Content) |

---

## ⚠️ RISK ASSESSMENT & MITIGATION

1.  **CDM Revocation:**
    *   *Risk:* Google blacklists our "digital hand" (the .wvd file).
    *   *Mitigation:* The architecture supports "Hot-Swapping" CDMs. We just drop in a new file.

2.  **VMP (Verified Media Path):**
    *   *Risk:* Udemy forces L1 (Hardware) encryption.
    *   *Mitigation:* Fallback to **Visual Stream Capture** (recording the raw pixel buffer from the GPU). Slower, but 100% unblockable.

---

## �🏁 EXECUTION ROADMAP

1.  **Week 1:** Build the **CDP Interceptor** (Phase 1). Prove we can see the license keys.
2.  **Week 2:** Build the **Rust Downloader** (Phase 3). Prove we can download encrypted chunks.
3.  **Week 3:** Integrate **FFmpeg Decryption** (Phase 2). Prove we can play the file.
4.  **Week 4:** Polish the **UI & Stealth** (Phase 4/5). Release "God Mode".

*"Information wants to be free. We just help it escape."*
