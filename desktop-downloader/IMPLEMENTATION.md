# 🛠️ Implementation Roadmap: Next-Gen Architecture

**Goal**: Transition WH404 Downloader to a secure, high-performance, monetizable platform.
**Strategy**: Server-Side Logic + Tauri (Rust) + Smart Installer.

---

##  Phase 1: The "God Mode" API (Security Core) 🛡️
*Move the "Brain" to the server to enable secure monetization.*

### Step 1.1: Server Setup
- [ ] **Choose Stack**: Python (FastAPI) or Node.js (Express) on a VPS (DigitalOcean/Hetzner) OR Cloudflare Workers (Serverless).
- [ ] **Database**: PostgreSQL (Supabase/Neon) for License Keys & User Data.
- [ ] **Repo**: Create `server-api` repository.

### Step 1.2: License System
- [ ] **Database Schema**: `users`, `licenses`, `hwids`, `activations`.
- [ ] **API Endpoint**: `POST /v1/activate` (Validate Key + HWID).
- [ ] **API Endpoint**: `POST /v1/heartbeat` (Periodic check).

### Step 1.3: "Secret Sauce" Logic
- [ ] **Token Generation**: Move `yt-dlp` metadata resolution to server (optional but recommended for high security).
- [ ] **Premium Features**:
    - [ ] **AI Subtitles**: Endpoint receives audio -> runs Whisper -> returns SRT.
    - [ ] **Cloud Upload**: Endpoint receives file -> uploads to Drive/S3.

---

## Phase 2: Tauri Migration (The "Armored Box") 🦀
*Replace Electron with Rust for performance and binary security.*

### Step 2.1: Environment Setup
- [ ] Install Rust & Cargo.
- [ ] Install Tauri CLI: `cargo install tauri-cli`.
- [ ] Initialize Tauri in project: `npm run tauri init`.

### Step 2.2: Backend Rewrite (Node.js -> Rust)
- [ ] **Main Process**: Port `src/main.js` logic to `src-tauri/src/main.rs`.
- [ ] **Sidecars**: Configure `yt-dlp` and `ffmpeg` as Tauri sidecars.
- [ ] **Commands**: Rewrite IPC handlers as Tauri Commands:
    - [ ] `download_video(url, options)`
    - [ ] `get_metadata(url)`
    - [ ] `cancel_download(id)`
    - [ ] `export_video(options)`

### Step 2.3: Frontend Adaptation
- [ ] **API Bridge**: Replace `window.downloader` (Electron IPC) with `@tauri-apps/api`.
- [ ] **File System**: Use Tauri's `fs` API (restricted scope) instead of Node's `fs`.
- [ ] **UI Updates**: Ensure React components work with new API.

### Step 2.4: Security Hardening
- [ ] **Obfuscation**: Apply Rust obfuscation techniques.
- [ ] **Anti-Debug**: Implement checks for debuggers in Rust.

---

## Phase 3: The Modern Installer (The "Stub") 💿
*Smart, small installer that downloads the latest version.*

### Step 3.1: Public Release Directory
- [ ] **Structure**: Define JSON schema for `latest.json` (version, hash, url).
- [ ] **Hosting**: Set up S3 bucket or GitHub Releases to host the core files (`.7z` or `.msi`).

### Step 3.2: Stub Builder
- [ ] **Language**: Rust or C# (native Windows UI).
- [ ] **Logic**:
    1.  Check System Requirements (VC++, RAM).
    2.  Fetch `latest.json`.
    3.  Download Core Package (with progress bar).
    4.  Extract to `%AppData%`.
    5.  Create Shortcuts.
    6.  Launch App.

---

## Phase 4: Monetization & Launch 🚀

### Step 4.1: Payment Integration
- [ ] **Stripe/LemonSqueezy**: Set up payment links.
- [ ] **Webhook**: Connect payment success -> Generate License Key -> Email User.

### Step 4.2: Beta Testing
- [ ] **Closed Beta**: Release to small group (Discord/Telegram).
- [ ] **Bug Hunting**: Fix "Dancing Engine" issues on diverse hardware.

### Step 4.3: Public Launch
- [ ] **Marketing**: Website update, YouTube demo.
- [ ] **Distribution**: Push Stub Installer to public.

---

## 📝 Immediate Next Actions (Checklist)

1.  [ ] **Fix "Dancing Engine"**: Verify the `src/main.js` fix works on friend's PC.
2.  [ ] **Decide Server Stack**: Python (FastAPI) vs Node.js? (Recommendation: Python for AI compatibility).
3.  [ ] **Init Tauri**: Run `npm run tauri init` to create the folder structure.
