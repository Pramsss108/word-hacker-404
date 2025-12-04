# Word Hacker 404

An AI-powered word game application built with React, TypeScript, and Vite.

## 🎮 Game Features

- **Word Detective Mode**: Find hidden words with AI hints
- **Pattern Hunter**: Discover word patterns and connections (Coming Soon)
- **Speed Challenge**: Race against time with AI opponents (Coming Soon)

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd word-hacker-404
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

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