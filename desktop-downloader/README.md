# 🎬 WH404 Social Media Downloader

**Download from 1000+ platforms** | **Professional preview & trim** | **Batch processing** | **Lightning fast**

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platforms](https://img.shields.io/badge/platforms-1000+-orange)
![Electron](https://img.shields.io/badge/electron-latest-blue)

</div>

---

## 🚀 Quick Start

```powershell
# Navigate to project
cd "d:\A scret project\Word hacker 404\desktop-downloader"

# Install dependencies
npm install

# Launch app (dev mode)
npm start
```

**That's it!** App opens → Paste URL → Download → Preview/Trim → Export 🎉

---

## 📚 Documentation

### Essential Guides

| Document | Purpose | Read When... |
|----------|---------|-------------|
| **[📖 FEATURES.md](FEATURES.md)** | Complete feature list | You want to know what the app can do |
| **[🔧 WORKFLOW.md](WORKFLOW.md)** | Technical deep-dive | You're developing or debugging |
| **[💰 MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md)** | Premium features & security | You're planning business/monetization |
| **[🌐 SUPPORTED_PLATFORMS.md](SUPPORTED_PLATFORMS.md)** | All 1000+ platforms | You need the full platform list |
| **[🚀 RELEASE_GUIDE.md](RELEASE_GUIDE.md)** | Build & deploy | You're ready to release |
| **[⚡ SPEED_OPTIMIZATION.md](SPEED_OPTIMIZATION.md)** | Performance tuning | You want faster downloads |

### Quick Navigation

**👤 New User?** Start with [FEATURES.md](FEATURES.md)  
**👨‍💻 New Developer?** Read [WORKFLOW.md](WORKFLOW.md)  
**💼 Business Planning?** Check [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md)  
**🐛 Having Issues?** See "Common Issues" in [WORKFLOW.md](WORKFLOW.md)

---

## ✨ What Can It Do?

### 🎥 Download from Anywhere
- YouTube, Instagram, Facebook, TikTok, Twitter/X, Reddit, Vimeo, SoundCloud
- **1000+ platforms supported** via yt-dlp

### ⚡ Lightning Fast
- **8-fragment parallel downloading** for maximum speed
- Smart retry on failures
- Real-time progress tracking

### ✂️ Professional Editing
- **Preview** videos before exporting
- **Trim** with visual timeline (drag handles)
- **Background processing** for instant exports

### 📤 Flexible Export
- Multiple formats: MP4, MKV, AVI, WebM
- Audio extraction: MP3, M4A, OGG, WAV
- Quality control: 1080p, 720p, 480p, 360p
- Batch export selected items

### 🎨 Beautiful UI
- Modern glass morphism design
- Dark theme (easy on eyes)
- Smooth 60fps animations
- Intuitive controls

---

## 🛠️ Tech Stack

```
Electron 
├── Main Process (Node.js)
│   ├── yt-dlp (video extraction)
│   ├── FFmpeg (video processing)
│   └── IPC handlers (downloads, export, metadata)
│
└── Renderer Process (Browser)
    ├── HTML5 video player
    ├── Timeline & trim controls
    └── Queue management UI
```

---

## 📦 Building for Production

### Windows
```powershell
.\build-desktop.ps1
```
Output: `release/WH404-Downloader-Setup.exe`

### macOS (requires macOS host)
```bash
npm run package:mac
```

### Linux
```bash
npm run package:linux
```

---

## 🎯 Project Structure

```
desktop-downloader/
├── src/
│   ├── main.js              # Download engine, FFmpeg, IPC
│   ├── preload.js           # Security bridge (IPC)
│   └── renderer/
│       ├── index.html       # UI structure
│       ├── renderer.js      # State management, UI logic
│       └── style.css        # Glass morphism styling
│
├── package.json             # Dependencies & scripts
├── build-desktop.ps1        # Build script (Windows)
└── LAUNCH.bat              # Quick dev launcher
```

---

## 🤝 Contributing

### For Developers
1. **Read** [WORKFLOW.md](WORKFLOW.md) (essential!)
2. **Understand** Electron architecture (main/renderer/preload)
3. **Follow** IPC patterns and state management
4. **Test** before committing

### For Feature Requests
- Check [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md) (might be planned!)
- Open issue with clear description
- Explain use case and value

---

## 🐛 Common Issues

### "FFmpeg not found"
**Solution**: Ensure FFmpeg is bundled in `resources/bin/ffmpeg.exe`

### Downloads stuck at 0%
**Check**: Network connection, yt-dlp updates, platform changes

### Chrome cookie errors (Facebook/Instagram)
**Solution**: Close Chrome before downloading private content

### Export fails silently
**Check**: FFmpeg logs in console, disk space, file permissions

**More solutions**: See "Common Issues & Solutions" in [WORKFLOW.md](WORKFLOW.md)

---

## 🔐 Privacy & Security

- ✅ **100% local processing** — No data sent to servers
- ✅ **No tracking or analytics** — Zero telemetry
- ✅ **No ads** — Clean experience
- ✅ **Open source** — Audit the code yourself

---

## 🗺️ Roadmap

### ✅ Current (v1.0)
- Multi-platform downloads (1000+ sites)
- Preview & trim system
- Batch processing
- Multi-format export
- Metadata extraction

### 🚧 Coming Soon (v2.0)
- 🤖 AI subtitle generation (Whisper)
- 📚 Playlist bulk downloader
- ☁️ Cloud storage integration (Drive, Dropbox)
- 🎨 Watermark & branding tools
- 🎵 Audio mastering & vocal isolation

**Full roadmap**: See [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md)

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) — Desktop framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Universal video downloader
- [FFmpeg](https://ffmpeg.org/) — Video processing powerhouse

---

<div align="center">

**Made with ❤️ by the Word Hacker 404 team**

[Report Bug](https://github.com/Pramsss108/word-hacker-404/issues) · [Request Feature](https://github.com/Pramsss108/word-hacker-404/issues) · [Documentation](FEATURES.md)

</div>
