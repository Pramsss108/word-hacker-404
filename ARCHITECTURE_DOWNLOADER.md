# YouTube Downloader Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Word Hacker 404 Website                       │
│                  (React + TypeScript + Vite)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              src/components/ToolsPage.tsx                │   │
│  │                                                           │   │
│  │  ┌──────────────────┐    ┌──────────────────┐          │   │
│  │  │  Device Check    │    │  Device Check    │          │   │
│  │  │  Desktop?        │    │  Mobile?         │          │   │
│  │  └────────┬─────────┘    └────────┬─────────┘          │   │
│  │           │                       │                     │   │
│  │           ▼                       ▼                     │   │
│  │  ┌──────────────────┐    ┌──────────────────┐          │   │
│  │  │ Desktop CTA      │    │  Mobile CTA      │          │   │
│  │  │ "Download App"   │    │ "Open Telegram"  │          │   │
│  │  └────────┬─────────┘    └────────┬─────────┘          │   │
│  └───────────┼──────────────────────┼────────────────────┘   │
└──────────────┼──────────────────────┼──────────────────────────┘
               │                       │
               │                       │
    ┌──────────▼──────────┐   ┌───────▼────────┐
    │  GitHub Releases    │   │  Telegram Bot  │
    │  or File Host       │   │  (Python)      │
    └──────────┬──────────┘   └───────┬────────┘
               │                       │
               │                       │
    ┌──────────▼──────────┐   ┌───────▼────────────┐
    │  Desktop Installer  │   │  @BotFather Token  │
    │  (.exe/.dmg/.AppI)  │   │  + Render/VPS      │
    └──────────┬──────────┘   └───────┬────────────┘
               │                       │
               │                       │
    ┌──────────▼──────────────────────▼───────────────────┐
    │                                                       │
    │              User's Device Experience                │
    │                                                       │
    │  ┌─────────────────────┐  ┌─────────────────────┐  │
    │  │  Desktop App        │  │  Telegram Chat      │  │
    │  │  (Electron)         │  │  (Mobile Bot)       │  │
    │  │                     │  │                     │  │
    │  │  1. Paste URL       │  │  1. Send URL        │  │
    │  │  2. Pick Format     │  │  2. Tap Button      │  │
    │  │  3. Click Download  │  │  3. Receive File    │  │
    │  │  4. File saved to   │  │                     │  │
    │  │     ~/Downloads/    │  │                     │  │
    │  └──────────┬──────────┘  └──────────┬──────────┘  │
    │             │                        │              │
    └─────────────┼────────────────────────┼──────────────┘
                  │                        │
                  │                        │
       ┌──────────▼────────────┬───────────▼──────────┐
       │                       │                      │
       │   yt-dlp-exec         │   yt-dlp (Python)    │
       │   + ffmpeg-static     │   + FFmpeg           │
       │   (Node packages)     │   (System binary)    │
       │                       │                      │
       └───────────────────────┴──────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  YouTube/Videos  │
                    │  (Download)      │
                    └──────────────────┘
```

---

## Data Flow Diagrams

### **Desktop App Flow**

```
User Input (URLs + Format)
    ↓
Renderer Process (renderer.js)
    ↓ IPC Call: 'downloader:start'
Main Process (main.js)
    ↓
Format Mapping (mp4-1080 → bestvideo[height<=1080])
    ↓
Create Temp Directory (os.tmpdir())
    ↓
yt-dlp-exec({ url, format, ffmpegLocation })
    ↓
Download to Temp (%(title)s.%(ext)s)
    ↓
Move Files to ~/Downloads/WordHackerDownloads/
    ↓
Return Job Summary (URLs, paths)
    ↓
Renderer Updates Status Log
    ↓
User Opens Downloads Folder
```

### **Telegram Bot Flow**

```
User Sends YouTube URL
    ↓
Bot Validates URL (youtube.com | youtu.be)
    ↓
Show InlineKeyboard (MP4 1080 | MP4 720 | MP3)
    ↓
User Taps Button
    ↓
Bot Callback Handler (format = 'mp4-1080')
    ↓
Download to Temp via yt-dlp CLI
    ↓
Check File Size (< MAX_UPLOAD_MB?)
    ↓ Yes
Upload via reply_video() or reply_audio()
    ↓
Clean Up Temp Files
    ↓
User Receives File in Chat
```

### **CI/CD Build Flow**

```
Developer Pushes Git Tag (desktop-v1.0.0)
    ↓
GitHub Actions Triggered (.github/workflows/build-desktop.yml)
    ↓
Matrix Build: [windows-latest, macos-latest, ubuntu-latest]
    ↓
    ├─ Windows: npm run package:win → .exe
    ├─ macOS:   npm run package:mac → .dmg
    └─ Linux:   npm run package:linux → .AppImage
    ↓
Upload Artifacts to Workflow
    ↓
Create GitHub Release Job
    ↓
Download All Artifacts
    ↓
softprops/action-gh-release (attach files to release)
    ↓
GitHub Release Published
    ↓
Developer Updates ToolsPage.tsx with Download URL
```

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                     Desktop App Components                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  index.html                                                  │
│      ↕ loads                                                 │
│  renderer.js ←─────────────── preload.js                    │
│      ↕ IPC                           ↕ exposes             │
│  main.js                      window.downloader API         │
│      ↕ spawns                                                │
│  yt-dlp-exec                                                 │
│      ↕ calls                                                 │
│  ffmpeg-static                                               │
│      ↕ merges                                                │
│  File System (fs, path, os)                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Telegram Bot Components                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  bot.py                                                      │
│      ↕ reads                                                 │
│  .env (BOT_TOKEN, MAX_UPLOAD_MB)                            │
│      ↕ uses                                                  │
│  python-telegram-bot (Application)                           │
│      ↕ handles                                               │
│  MessageHandler (URL validation)                             │
│  CallbackQueryHandler (format selection)                     │
│      ↕ spawns                                                │
│  subprocess (yt-dlp CLI)                                     │
│      ↕ uploads                                               │
│  Telegram API (sendVideo, sendAudio)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Dependency Graph

```
Desktop App:
package.json
    ├─ electron (dev)
    ├─ electron-builder (dev)
    ├─ yt-dlp-exec
    ├─ ffmpeg-static
    └─ sanitize-filename

main.js
    ├─ electron (app, BrowserWindow, ipcMain)
    ├─ yt-dlp-exec (default export)
    ├─ ffmpeg-static (path to binary)
    └─ sanitize-filename (clean URL strings)

renderer.js
    └─ preload.js (window.downloader API)

preload.js
    └─ electron (contextBridge, ipcRenderer)

---

Telegram Bot:
requirements.txt
    ├─ python-telegram-bot>=21.0
    ├─ yt-dlp>=2024.10.0
    └─ python-dotenv>=1.0.0

bot.py
    ├─ telegram (Application, filters, InlineKeyboard)
    ├─ yt_dlp (version check via CLI)
    ├─ dotenv (load .env)
    └─ subprocess (run yt-dlp commands)

.env
    ├─ BOT_TOKEN (secret)
    └─ MAX_UPLOAD_MB (config)

---

GitHub Actions:
.github/workflows/build-desktop.yml
    ├─ actions/checkout@v4
    ├─ actions/setup-node@v4
    ├─ actions/upload-artifact@v4
    └─ softprops/action-gh-release@v1
```

---

## State Management

### **Desktop App**

```
Application State (Main Process):
- downloadJobs: Array<{ url, format, status, files }>
- downloadsDir: string (~/Downloads/WordHackerDownloads)

UI State (Renderer):
- urlsText: string (textarea value)
- selectedFormat: 'mp4-1080' | 'mp4-720' | 'mp3'
- logs: Array<string> (status messages)
- isDownloading: boolean
```

### **Telegram Bot**

```
Bot State (In-Memory):
- pendingDownloads: Map<userId, { url, format }>
- activeJobs: Set<userId> (rate limiting)

Telegram State (External):
- chat_id: number (user identifier)
- message_id: number (message to edit/reply to)
- callback_query: { data: string, message: Message }
```

---

## Error Handling Flow

```
Desktop App:
User Input Error → Show Alert Dialog
    ↓
Network Error → Retry (yt-dlp --retries 2)
    ↓
yt-dlp Error → Log to Status Panel
    ↓
File System Error → Log + Suggest Manual Path

Telegram Bot:
Invalid URL → Send "❌ Invalid YouTube URL" Message
    ↓
Download Failure → Send "⚠️ Download failed, try again"
    ↓
File Too Large → Send "📦 File exceeds 48 MB limit"
    ↓
Upload Failure → Retry 3x → Send Error Message
```

---

## Security & Privacy

```
Desktop App:
✓ contextIsolation: true (no direct Node.js in renderer)
✓ nodeIntegration: false (IPC only)
✓ Sandboxed downloads (temp dir → user-controlled folder)
✓ No telemetry (all processing local)

Telegram Bot:
✓ Bot token in .env (never committed)
✓ File cleanup after upload (temp files deleted)
✓ URL validation (only youtube.com/youtu.be)
✓ Rate limiting (one job per user at a time)
⚠ Logs may contain URLs (consider sanitizing for production)
```

---

## Performance Considerations

```
Desktop App:
- Parallel downloads: Yes (yt-dlp spawns one process per URL)
- Memory usage: ~200 MB (Electron overhead)
- Disk usage: Temp files cleaned after move
- Network: Limited by yt-dlp + user bandwidth

Telegram Bot:
- Concurrent users: Async handlers (handle 10+ users simultaneously)
- Memory usage: ~50 MB idle, +100 MB per active download
- Disk usage: Temp files cleaned after upload
- Network: Render free tier = 750 hours/month (enough for 24/7)
- File size limit: 48 MB (Telegram API restriction)
```

---

**Visual Guide Version**: 1.0  
**Last Updated**: 2025-01-17  
**Maintained By**: AI Agent (refer to YOUTUBE_DOWNLOADER_SUMMARY.md for details)
