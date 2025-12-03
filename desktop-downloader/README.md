# Word Hacker Desktop Downloader

Installable helper that bundles **Electron + yt-dlp + FFmpeg** so anyone can fetch YouTube video/audio without touching PowerShell.

## Prerequisites
- Node.js 18+
- npm 9+

## Development
```powershell
cd desktop-downloader
npm install
npm run dev
```
The `dev` script launches Electron with auto-reload. Paste YouTube links, pick MP4/MP3, and click **Download**. Files land in your OS `Downloads/WordHackerDownloads` folder.

## Packaging (next step)
Electron Builder is configured. Run one of the following from this folder:

```powershell
# Windows portable EXE + NSIS installer
npm run package:win

# macOS dmg (requires macOS host)
npm run package:mac

# Linux AppImage
npm run package:linux

# Everything
npm run package

# Or run the helper script (detects npm install automatically)
./build-desktop.ps1 -Target win
```

## How it works
1. Renderer collects links and desired format.
2. Main process spawns `yt-dlp` via [`yt-dlp-exec`](https://github.com/mifi/yt-dlp-exec) and pipes FFmpeg (using [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)).
3. Temporary files are moved to the downloads folder and surfaced back to the UI.
