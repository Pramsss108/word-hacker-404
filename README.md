# Word Hacker 404

An AI-powered word game application built with React, TypeScript, and Vite.

## 🎮 Game Features

- **Word Detective Mode**: Find hidden words with AI hints
- **Pattern Hunter**: Discover word patterns and connections (Coming Soon)
- **Speed Challenge**: Race against time with AI opponents (Coming Soon)
- **Black Ops**: Advanced Network Diagnostics & Security Tools (Requires WSL2 + Kali Linux)

## 🛡️ Black Ops Setup (Advanced)

To use the "Black Ops" features (Sniper, Vacuum, Ghost), you must have the **Kali Linux** engine installed.

### 1. Install the Engine
Run the automated setup script:
```powershell
./cyber-sentinel-edu/SETUP_BLACK_OPS.ps1
```

### 2. Enable USB Passthrough (Required for Real Attacks)
To access external Wi-Fi adapters for Monitor Mode:
1. Run `SETUP_USB_PASSTHROUGH.ps1` as Administrator.
2. Plug in your USB Wi-Fi Adapter.
3. Follow the on-screen instructions to bind the device.

### 3. Accessing the Tools
- Open the app.
- Go to the **Tools** page.
- Click the **Black Ops** (Shield) button.
- If you see "Simulation Mode", ensure you are running the Desktop App (`npm run tauri:dev`), not the web version.

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- npm (ships with Node)
- PowerShell 5+ (already on Windows)

### Option A — One-Click Setup For Non-Coders
If VS Code or the dev server ever crashes, just run the bundled automation script. It stops old processes, reinstalls dependencies, and launches the desktop downloader for you.

1. Open File Explorer → navigate to `D:\A scret project\Word hacker 404`.
2. Right-click `master-run.ps1` → choose **Run with PowerShell**.
3. Accept the execution-policy prompt if Windows asks.
4. Wait for the script to show all four steps:
	- Stop old dev servers.
	- Install root web-app dependencies.
	- Install desktop-app dependencies.
	- Launch the Electron downloader (`npm start`).

> 💡 First run may take a few minutes because npm downloads everything again. Subsequent runs are fast.

### Need a totally fresh install (new-user test)?
Use `desktop-fresh-start.ps1`. This script:
- Stops Electron/Vite/Node processes
- Deletes `node_modules` for both the web app and desktop app
- Reinstalls every dependency from scratch
- Wipes the Electron user-data folders (so the tutorial + first-time popup appear again)
- Launches the downloader when everything is ready

Right-click `desktop-fresh-start.ps1` → **Run with PowerShell**. Pass `-SkipWebSetup` if you only want to refresh the desktop app.

### Option B — Manual Steps

#### 1. Web App (`word-hacker-404`)
```bash
cd "D:/A scret project/Word hacker 404"
npm install        # install/update website deps
npm run dev        # starts Vite on http://localhost:3001 (auto-picks a free port)
```

#### 2. Desktop Downloader (`desktop-downloader`)
```bash
cd "D:/A scret project/Word hacker 404/desktop-downloader"
npm install        # install/update Electron deps
npm start          # launches the WH404 Social Media Downloader window
```

Keep both terminals open while you work. If the desktop window doesn’t open after a crash, re-run `master-run.ps1` or the manual commands above.

### Verification Checklist
- Web: open `http://localhost:3001` (or whatever port Vite prints).
- Desktop: green “Add to Queue” button visible, tutorial popup appears for first-time installs.
- Console: no red errors in the PowerShell window. If you see GPU cache warnings, close the app and delete `%LOCALAPPDATA%/word-hacker-desktop-downloader/GPUCache`, then relaunch.

## 🛠️ Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Internet Downloader Companion (Local Only)

- Location: `tools/internet-downloader`
- Bootstrap: `python -m venv .venv && pip install -r requirements.txt`
- Run interactive session: `python download.py`
- Optional cleanup: `python cleanup_downloads.py --path downloads`

The downloader uses `yt-dlp` + FFmpeg to fetch videos, playlists, channels, or MP3 audio. It never ships with the production bundle; keep it local and respect creator permissions.

### Desktop Downloader App (Alpha)

- Location: `desktop-downloader`
- Stack: Electron + `yt-dlp-exec` + `ffmpeg-static`
- Dev launch: `cd desktop-downloader && npm install && npm run dev`
- Package helper (Windows): `cd desktop-downloader && ./build-desktop.ps1 -Target win`

This creates a native window for non-technical teammates: paste links, pick MP4/MP3, click **Download**. Files drop into `~/Downloads/WordHackerDownloads`. Installers (electron-builder) will be wired up next so QA can double-click an `.exe`/`.dmg` without Node.

**GPU cache error on Windows?** Electron sometimes logs `cache_util_win.cc(20) Unable to move the cache (0x5)` when a previous preview crashed or antivirus locks the GPU cache folder. Fix: close the downloader, delete `%LOCALAPPDATA%/word-hacker-desktop-downloader/GPUCache` (or run `rd /s %LOCALAPPDATA%\word-hacker-desktop-downloader\GPUCache` from PowerShell), then relaunch. Running PowerShell as Administrator avoids permission locks.

## 🏗️ Project Structure

The current build focuses on lightweight, HTML-first utilities (dictionary, tone badges, and touch-friendly mini tools). Advanced RAW workflows have been removed to keep the experience approachable for non-technical teammates. Future media tooling will be documented separately in the new strategy guide.

```
src/
├── App.tsx          # Main application component
├── App.css          # Application styles
├── main.tsx         # Application entry point
└── index.css        # Global styles
```

## 🎨 Technologies Used

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Lucide React** - Icon library
- **CSS3** - Styling with modern features

## 📝 To-Do List

- [ ] Implement Word Detective game logic
- [ ] Add AI integration for hints and challenges
- [ ] Create Pattern Hunter game mode
- [ ] Implement Speed Challenge mode
- [ ] Add user authentication and progress tracking
- [ ] Create leaderboards and achievements
- [ ] Add sound effects and animations
- [ ] Implement difficulty levels

## 🚀 Deployment

To build for production:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## 📄 License

This project is private and not licensed for public use.

---

Built with ❤️ using React + TypeScript + Vite

---

Voice Encrypter documentation:
- See `VOICE_ENCRYPTER_ENGINE_PLAN.md` for the client-only audio engine plan, milestones, and acceptance criteria.