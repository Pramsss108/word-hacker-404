# 🚀 Word Hacker 404 - Non-Coder Developer Guide

Welcome to the development control center. This guide is designed to help you run, update, and build the software without needing to understand the complex code underneath.

## 📍 Where Are We? (Status Update)
- **Project Type**: Desktop Application (Windows)
- **Technology**: Tauri (Rust + React) + Vite (Build Tool)
- **Current State**: 
  - ✅ **Premium UI**: Dark mode, custom window controls (no white title bars).
  - ✅ **Installer**: Professional `.exe` installer with custom branding.
  - ✅ **Performance**: Migrated to Vite for instant load times.
  - ✅ **Fixes**: "Glitch app" issue resolved; Preview pane collapse fixed.
  - ✅ **End-to-End**: Download -> Preview -> Export flow fully operational.

---

## 🛑 Developer Lessons (Read Before Coding)
**CRITICAL: Read this section to avoid breaking the app in future updates.**

### 1. Tauri vs Electron (The "Bridge" Trap)
- **The Trap**: Copying code from Electron projects (like `window.downloader.download`).
- **The Reality**: We are using **Tauri**. There is no `window.downloader` by default.
- **The Fix**: Always use `window.__TAURI__.invoke('command_name')` to talk to the backend. We have a `bridge.js` file that handles this translation. **Do not bypass `bridge.js`.**

### 2. The "Asset Protocol" (Why Video Previews Fail)
- **The Trap**: Trying to set `<video src="C:\Users\...">`.
- **The Reality**: Modern webviews BLOCK local file access for security.
- **The Fix**: You MUST convert the path using `convertFileSrc` (in `bridge.js`).
  - ❌ `video.src = "C:/Downloads/video.mp4"` (Blocked)
  - ✅ `video.src = "asset://localhost/C:/Downloads/video.mp4"` (Allowed)

### 3. Metadata Doesn't Just "Appear"
- **The Trap**: Expecting `yt-dlp` to automatically send thumbnail/title during download.
- **The Reality**: `yt-dlp` streams progress, not metadata.
- **The Fix**: We must explicitly call `get_video_metadata` (a Rust command) to fetch JSON data before or after the download to populate the UI chips.

### 4. Sidecar Hell (yt-dlp & ffmpeg)
- **The Trap**: Assuming `yt-dlp` is just "there" in the path.
- **The Reality**: In a packaged app, these are "sidecars". In dev mode, they are loose files.
- **The Fix**: The backend (`main.rs`) has special logic to manually find these files in both Dev and Prod modes. **Do not touch the path resolution logic in `main.rs` unless you know exactly what you are doing.**

---

## 🛠️ How to Run the App (Live Development)
Use this mode when you want to make changes and see them instantly.

1. **Open Terminal** in VS Code.
2. **Navigate** to the downloader folder:
   ```powershell
   cd "d:\A scret project\Word hacker 404\desktop-downloader"
   ```
3. **Start the Dev Server**:
   ```powershell
   npm run tauri:dev
   ```
   - **What happens**: The app will launch on your desktop.
   - **Live Updates**: Change any file in `src/`, and the app will update instantly without restarting.

---

## 📦 How to Build the Installer (Release)
Use this when you are ready to share the app with users.

1. **Navigate** (if not already there):
   ```powershell
   cd "d:\A scret project\Word hacker 404\desktop-downloader"
   ```
2. **Run the Build Command**:
   ```powershell
   npm run tauri:build
   ```
   - **Wait**: This takes about 1-2 minutes.
3. **Find Your Installer**:
   - Go to: `desktop-downloader/src-tauri/target/release/bundle/nsis/`
   - Look for: `WH404 Downloader_0.1.0_x64-setup.exe`

---

## ⚡ Shortcuts & Scripts (The "Magic" Buttons)

I have created several automation scripts to save you time. You can run these from the terminal.

### 1. `generate-assets.ps1`
- **What it does**: Takes your main `icon.png` and automatically generates the specific BMP images needed for the installer header and sidebar.
- **When to use**: If you change the app icon and want the installer to match.
- **Command**:
  ```powershell
  .\generate-assets.ps1
  ```

### 2. `quick-release.ps1`
- **What it does**: Automates the entire release process (Build -> Tag -> Push to GitHub).
- **Command**:
  ```powershell
  .\quick-release.ps1 -Version "1.0.1"
  ```

### 3. `npm run tauri:dev`
- **What it does**: Starts the app in "Developer Mode" with live reloading.

### 4. `npm run tauri:build`
- **What it does**: Compiles the final production `.exe` file.

---

## 📂 Important Folders (Map)

- **`src/`**: The "Brain" of the app.
  - `renderer/`: Contains the UI code (HTML, CSS, JS). Change colors/layout here.
  - `main.js`: The background logic.
- **`src-tauri/`**: The "Body" of the app (Rust).
  - `tauri.conf.json`: Configuration (Window size, icons, permissions).
  - `icons/`: Where your app icons live.
  - `src/main.rs`: The Rust backend (handles downloads & file system).
- **`dist/`**: The "Output" folder where the built web files go (you don't need to touch this).
- **`src-tauri/target/`**: Where the final `.exe` is born.

---

## 🆘 Troubleshooting

**"The build failed!"**
- Run this to clean everything and start fresh:
  ```powershell
  Remove-Item -Recurse -Force node_modules
  npm install
  ```

**"The window is blank!"**
- Check the terminal for errors.
- Make sure you didn't delete `index.html`.

**"I want to change the logo!"**
- Replace `src-tauri/icons/icon.png`.
- Run `.\generate-assets.ps1`.
- Run `npm run tauri:build`.
