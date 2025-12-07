# 🦀 Tauri Migration Guide

**Status**: Ready for Build
**Architecture**: Hybrid (Electron + Tauri)

---

## ✅ What Has Been Done

1.  **Tauri Project Initialized**: `src-tauri` folder created with secure configuration.
2.  **Backend Ported**: `src-tauri/src/main.rs` now contains the Rust version of the download logic.
3.  **Frontend Bridge**: `src/renderer/bridge.js` automatically detects Tauri vs Electron.
4.  **Sidecars Configured**: `yt-dlp` and `ffmpeg` are set up in `src-tauri/bin`.

---

## 🛠️ How to Build & Run

Since this is a new Rust project, you need the Rust compiler.

### 1. Install Prerequisites
-   **Install Rust**: Download from [rustup.rs](https://rustup.rs/) (run `rustup-init.exe`).
-   **Install C++ Build Tools**: Ensure "Desktop development with C++" is installed in Visual Studio.

### 2. Run in Development Mode
```powershell
# 1. Open a NEW terminal (to load Rust PATH)
cd "d:\A scret project\Word hacker 404\desktop-downloader"

# 2. Start the App
npm run tauri dev
```
*Note: The first run will take a few minutes to compile dependencies.*

### 3. Build for Production
```powershell
npm run tauri build
```
*Output will be in `src-tauri/target/release/bundle/msi`.*

---

## 🧩 Architecture Notes

-   **Bridge**: The frontend uses `window.downloader` which maps to `window.__TAURI__.invoke` in Tauri mode.
-   **Sidecars**: Binaries in `src-tauri/bin` are bundled with the app.
-   **Security**: `tauri.conf.json` strictly limits file system access to `$DOWNLOAD`, `$TEMP`, and `$APP`.

---

## 🚀 Next Steps (After Build)

1.  **Verify Downloads**: Test if `yt-dlp` runs correctly inside the Tauri sandbox.
2.  **Implement Cancel**: Update `main.rs` to handle the `cancel_download` command.
3.  **Implement Metadata**: Update `main.rs` to handle `get_metadata`.
