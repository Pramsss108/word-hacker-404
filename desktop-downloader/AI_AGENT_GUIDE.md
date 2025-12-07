# 🤖 AI Agent Quick Start Guide

**For**: AI agents, assistants, and automated developers continuing this project  
**Updated**: December 7, 2025

---

## ⚡ 30-Second Context

You're working on **WH404 Downloader** — an Electron desktop app that downloads videos from 1000+ platforms (YouTube, Instagram, TikTok, etc.), lets users preview/trim videos, and export in multiple formats.

**Tech**: Electron + yt-dlp + FFmpeg  
**Status**: v1.0 complete, production-ready  
**Next**: Premium features (AI subtitles, playlists, cloud upload, etc.)

---

## 📋 First Actions (Always Do This)

```powershell
# 1. Navigate to project
cd "d:\A scret project\Word hacker 404\desktop-downloader"

# 2. Check if dependencies installed
npm list --depth=0

# 3. If missing, install
npm install

# 4. Start dev server
npm start
```

---

## 📚 Essential Reading Order

1. **[README.md](README.md)** (5 min) — High-level overview, quick start
2. **[FEATURES.md](FEATURES.md)** (15 min) — What the app does (user perspective)
3. **[WORKFLOW.md](WORKFLOW.md)** (45 min) — HOW it works (developer perspective) **← MOST IMPORTANT**
4. **[MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md)** (30 min) — Premium features & security

**Critical**: Read WORKFLOW.md thoroughly before making any code changes!

---

## 🏗️ Architecture Crash Course

### Electron Basics
```
┌─────────────────────────────────────┐
│  Main Process (src/main.js)         │  ← Node.js, file system, subprocesses
│  - Spawns yt-dlp & FFmpeg           │
│  - Handles file operations          │
│  - IPC handlers (download, export)  │
└─────────────────────────────────────┘
           ↕️ IPC Bridge
┌─────────────────────────────────────┐
│  Preload (src/preload.js)           │  ← Security boundary
│  - Exposes safe API via contextBridge│
└─────────────────────────────────────┘
           ↕️ window.downloader
┌─────────────────────────────────────┐
│  Renderer (src/renderer/)           │  ← Browser, UI, no direct file access
│  - renderer.js: State & logic       │
│  - index.html: UI structure         │
│  - style.css: Glass morphism design │
└─────────────────────────────────────┘
```

### Communication Pattern
```javascript
// Renderer wants to download
window.downloader.download(url, format)  // Calls preload
    ↓
// Preload forwards securely
ipcRenderer.invoke('downloader:download', url, format)
    ↓
// Main process handles
ipcMain.handle('downloader:download', async (event, url, format) => {
  // Spawn yt-dlp subprocess
  // Send progress updates via: sendToRenderer('download:progress', data)
})
    ↓
// Renderer receives updates
window.downloader.onProgress((data) => {
  // Update UI with progress
})
```

**Golden Rule**: Renderer NEVER accesses file system directly. Always goes through main process.

---

## 🎯 Common Tasks

### Add New Download Feature
1. **Update main.js**: Add IPC handler `ipcMain.handle('feature:action', ...)`
2. **Update preload.js**: Expose to renderer via `contextBridge.exposeInMainWorld`
3. **Update renderer.js**: Call `window.downloader.newFeature()`
4. **Update FEATURES.md**: Document the feature

### Add UI Element
1. **Update index.html**: Add HTML structure
2. **Update style.css**: Style with glass morphism theme
3. **Update renderer.js**: Wire up event listeners + state
4. **Test**: `npm start` and verify

### Fix Bug
1. **Enable DevTools**: In `main.js`, set `devTools: true`
2. **Check console logs**: Look for `[Context] Error:` patterns
3. **Read WORKFLOW.md**: "Common Issues & Solutions" section
4. **Fix & test**: Verify with `npm start`

### Add Export Format
1. **main.js**: Update FFmpeg args in `export:video` handler
2. **index.html**: Add `<option>` to format selector
3. **renderer.js**: Handle new format in `getExportSettings()`
4. **Test**: Export in new format

---

## 🚨 Critical Rules (Don't Break These!)

### ❌ Never Do
- ❌ Mix main process code with renderer code
- ❌ Access `fs`, `child_process`, `path` in renderer
- ❌ Use synchronous operations in main (blocks UI)
- ❌ Modify state directly (use `setState()` pattern)
- ❌ Forget to validate user input (security!)

### ✅ Always Do
- ✅ Use IPC for main ↔ renderer communication
- ✅ Validate all user inputs before using
- ✅ Log errors with context: `console.error('[Context] Error:', error)`
- ✅ Update state immutably
- ✅ Test both success and error paths
- ✅ Update docs when adding features

---

## 🔍 Code Locations (Quick Reference)

| What | Where |
|------|-------|
| Download logic | `src/main.js` lines ~200-500 |
| Export logic | `src/main.js` lines ~500-700 |
| Queue rendering | `src/renderer/renderer.js` lines ~500-800 |
| Preview system | `src/renderer/renderer.js` lines ~1000-1500 |
| Metadata system | `src/renderer/renderer.js` lines ~1800-2200 |
| IPC handlers | `src/main.js` lines ~100-800 |
| Security bridge | `src/preload.js` (entire file) |
| UI structure | `src/renderer/index.html` |
| Styling | `src/renderer/style.css` |

---

## 🐛 Debugging Checklist

### App Won't Start
```powershell
# Check Node/npm versions
node --version  # Should be 18+
npm --version   # Should be 9+

# Clean reinstall
Remove-Item -Recurse -Force node_modules
npm install
npm start
```

### Downloads Fail
1. Check console for `[yt-dlp]` errors
2. Verify FFmpeg path: `console.log(ffmpegPath)`
3. Test yt-dlp manually: `yt-dlp [url]` in PowerShell
4. Check network connectivity

### UI Not Updating
1. Check state object: `console.log('State:', state)`
2. Verify event listeners: Are callbacks firing?
3. Check for JavaScript errors in DevTools console
4. Ensure `renderQueue()` is being called

### Export Fails
1. Check FFmpeg stderr: Console shows full output
2. Verify file permissions: Can write to output directory?
3. Check disk space: Is there enough room?
4. Test FFmpeg manually: Copy command from logs

---

## 📝 State Management Pattern

```javascript
// Centralized state object
const state = {
  queue: [],              // All download items
  selection: new Set(),   // Selected item IDs
  engineBusy: false,      // Is download engine running?
  
  preview: {
    url: null,            // Current video URL
    path: null,           // File path
    ready: false,         // Video loaded?
    trimStart: 0,         // Trim start (seconds)
    trimEnd: null,        // Trim end (seconds)
    trimmedFile: null,    // Pre-processed trim cache
    activePanel: null,    // Open metadata panel
    premium: { /* metadata */ }
  },
  
  previewMode: 'video',   // 'video' | 'insights'
  settings: { /* export settings */ }
}

// Update pattern (don't mutate directly!)
function updateState(path, value) {
  // Example: updateState('preview.trimStart', 10)
  // Sets state.preview.trimStart = 10
  // Then triggers re-render
}
```

---

## 🎨 CSS Class Naming

Follow these patterns:
- **Containers**: `.preview-pane`, `.export-modal`, `.metadata-popover`
- **Buttons**: `.btn-primary`, `.btn-danger`, `.export-btn`
- **States**: `.active`, `.disabled`, `.ready`, `.processing`
- **Components**: `.summary-chip`, `.metadata-card`, `.queue-item`

**Use kebab-case**, not camelCase or snake_case.

---

## 🚀 Adding Premium Features

See [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md) for:
- 27 planned premium features
- Anti-piracy implementation (license server, hardware fingerprinting)
- Pricing tiers (Pro $9.99, Business $29.99, Enterprise $99)

**High-priority features**:
1. AI subtitle generation (Whisper)
2. Playlist bulk downloader
3. Cloud storage integration
4. Audio mastering & vocal isolation

---

## 🧪 Testing Protocol

### Before Committing
```powershell
# 1. Type check
npm run type-check

# 2. Run app
npm start

# 3. Test core flows
# - Add URL → Download → Preview → Trim → Export
# - Try multiple platforms (YouTube, Instagram, TikTok)
# - Test error cases (invalid URL, network error)

# 4. Check console for errors
# - No red errors should appear

# 5. Build test
npm run package:win
# Verify installer works
```

---

## 📦 Building for Release

```powershell
# Quick build (Windows)
.\build-desktop.ps1

# Output location
cd release
# Find: WH404-Downloader-Setup.exe
```

**Pre-release checklist**:
- [ ] All features working
- [ ] No console errors
- [ ] Version bumped in package.json
- [ ] README updated
- [ ] FEATURES.md updated
- [ ] Test installer on clean machine

---

## 🎓 Learning Path

**Day 1**: Read docs (README → FEATURES → WORKFLOW)  
**Day 2**: Explore codebase, understand IPC flow  
**Day 3**: Make small change (add button, modify text)  
**Day 4**: Add feature (new export format, UI improvement)  
**Day 5**: Implement premium feature (from roadmap)

---

## 💡 Pro Tips

1. **Search first**: Use Ctrl+Shift+F to find function definitions
2. **Log everything**: `console.log('[Context]', variable)` is your friend
3. **Test incrementally**: Don't write 100 lines then test
4. **Follow patterns**: Copy existing IPC handlers, don't invent new patterns
5. **Ask questions**: If workflow unclear, check WORKFLOW.md or ask user

---

## 🆘 When Stuck

1. **Re-read WORKFLOW.md** section related to feature
2. **Search codebase** for similar functionality
3. **Check console logs** for error details
4. **Enable DevTools** (`main.js`: `devTools: true`)
5. **Simplify**: Break problem into smaller steps
6. **Ask user**: Clarify requirements if ambiguous

---

## 🎯 Your Mission

**Goal**: Continue development following established patterns  
**Constraints**: Don't break existing functionality, maintain code quality  
**Resources**: Complete docs in this folder, clean codebase, working dev environment

**You got this!** 🚀

---

**Last Updated**: December 7, 2025  
**Next Agent**: Good luck! Read WORKFLOW.md first, seriously.
