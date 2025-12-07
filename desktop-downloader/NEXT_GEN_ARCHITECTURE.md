# 🛡️ Next-Gen Architecture: Security, Tauri & Monetization

**Date**: December 7, 2025
**Status**: Strategic Plan

---

## 🚨 1. Fixing the "Dancing Engine" (Immediate Fix)

The "dancing engine" (instability/glitching) on your friend's PC is likely caused by **missing binaries** or **antivirus interference**.

### ✅ The Fix Applied
I have updated `src/main.js` to strictly validate that `yt-dlp.exe` and `ffmpeg.exe` exist when the app starts.
- **If missing**: The app will now show a clear Error Dialog listing exactly what is missing.
- **Why it happens**: Antivirus software often deletes `yt-dlp.exe` because it's a "hacking tool".
- **Solution**: Tell users to whitelist the app folder or the installer.

### 📦 Dependency Check
Ensure your friend has **Visual C++ Redistributable 2010+** installed. `yt-dlp` (Python-based) often requires it.
- **Action**: Include the VC++ Redist installer in your release or link to it.

---

## 🏰 2. The "God Mode" Security Strategy

As you correctly identified, **Client-Side = Insecure**. We will move the "Brain" to the server.

### ☁️ Architecture Shift
**Current**: App -> yt-dlp (Local) -> YouTube
**New**: App -> **Your API (Auth + Logic)** -> App -> yt-dlp (Local)

### 🔑 Implementation Plan (Cloudflare Workers / Python API)

1.  **The Gatekeeper API**:
    - User enters URL in Desktop App.
    - App sends `POST /api/v1/request-download` with `{ url, license_key, hwid }`.
    - **Server** validates License + HWID.
    - **Server** resolves the video metadata (title, formats) using its own `yt-dlp`.
    - **Server** signs a "Download Token" (JWT) and sends it back.

2.  **The Dumb Client**:
    - The Desktop App receives the Token.
    - It passes the Token + URL to the local `yt-dlp`.
    - **Crucial**: The local `yt-dlp` is just a "worker". It doesn't know *how* to decrypt or resolve the video without the server's help (for premium features).

3.  **Premium Features on Server**:
    - **AI Subtitles**: Upload audio to YOUR server -> Server runs Whisper -> Returns .srt file.
    - **Cloud Upload**: App uploads to YOUR server -> Server pushes to Drive/Dropbox.
    - **Logic is hidden**: The user never sees the Whisper model or the API keys for Drive.

---

## 🦀 3. Migration to Tauri (Rust)

Switching from Electron to Tauri is the **best move** for security and performance.

### 🏆 Why Tauri?
- **Binary Security**: Rust compiles to native machine code. Much harder to reverse than Electron's JS bundle.
- **Size**: Installer drops from ~150MB to ~5MB.
- **Performance**: Rust backend is blazing fast.
- **Memory**: Uses <100MB RAM vs Electron's 500MB+.

### 📅 Migration Roadmap

#### Phase 1: Backend Rewrite (Rust)
- Replace `src/main.js` (Node.js) with `src-tauri/src/main.rs` (Rust).
- Port IPC handlers (`downloader:download`, `export:video`) to Tauri Commands.
- Use `tauri-plugin-shell` to spawn `yt-dlp` and `ffmpeg`.

#### Phase 2: Frontend Adaptation
- Keep your React/Vite frontend (`src/renderer`).
- Replace `window.downloader` (preload.js) with `@tauri-apps/api`.
- Update UI to call Rust commands instead of Electron IPC.

#### Phase 3: Security Hardening
- Implement the "Server-Side Logic" checks inside the Rust backend.
- Use Rust's encryption libraries to store license keys securely.

---

## 💿 4. The "Modern Installer" (Stub Installer)

You want an installer like Canva/CapCut (small file, downloads the rest).

### 🏗️ How to Build It

1.  **The "Stub" (2MB .exe)**:
    - A tiny Rust or C# program.
    - **Logic**:
        1. Checks System (OS, RAM, VC++ Redist).
        2. Connects to your "Public Release Directory".
        3. Downloads the latest `WordHacker-Core.7z` (contains the heavy app).
        4. Unzips it to `%AppData%/WordHacker`.
        5. Creates shortcuts and launches.

2.  **Benefits**:
    - **Always Updated**: User always gets the latest version on install.
    - **Smart**: Can download different versions for different PCs (e.g., GPU-optimized version).
    - **Harder to Crack**: The installer can perform a server check before even downloading the app.

### 📂 Public Release Directory Structure
```
releases/
  ├── installer-stub.exe  (The tiny file you share)
  ├── latest.json         (Contains version info & hashes)
  ├── core-v1.0.1.7z      (The actual app files)
  └── redist/             (VC++ runtimes, etc.)
```

---

## 🚀 Next Steps

1.  **Immediate**: Test the "Dancing Engine" fix.
2.  **Short Term**: Set up the **Server API** (I can generate the code for a Cloudflare Worker or Python/FastAPI server).
3.  **Medium Term**: Begin **Tauri Migration** (I can set up the `src-tauri` structure).
4.  **Long Term**: Build the **Stub Installer**.

**Ready to execute? Just say "Start Tauri Migration" or "Build Server API".**
