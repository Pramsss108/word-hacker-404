# ⚠️ CRITICAL: TAURI ARCHITECTURE NOTICE

**FOR ALL AI AGENTS AND DEVELOPERS:**

## This is a TAURI Application (NOT Electron!)

### Technology Stack:
- **Backend:** Rust (Tauri) - Located in `src-tauri/`
- **Frontend:** React + TypeScript + Vite
- **Build System:** Tauri CLI (`npm run tauri:build`)
- **Dev Server:** `npm run tauri:dev` (port 3000)

### What This Means:

#### ✅ DO:
- Use Tauri commands for backend communication
- Access APIs via `window.__TAURI__`
- Write Rust code in `src-tauri/src/main.rs` for backend features
- Use Tauri's invoke system for frontend-backend communication
- Run with `npm run tauri:dev`

#### ❌ DO NOT:
- Try to fix Electron-specific issues (preload.js, contextBridge, etc.)
- Look for `window.downloader` or Electron IPC
- Use `electron-builder` or Electron APIs
- Create or modify preload scripts
- Run with `npm run dev` alone (Vite only, no backend)

### File Structure:
```
desktop-downloader/
├── src/                    # React frontend
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── main.rs       # Main Tauri/Rust code
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── index.html            # Entry point
└── package.json          # npm scripts
```

### Common Issues:

1. **"window.downloader is not defined"**
   - This is NORMAL for Tauri (only exists in Electron)
   - Use `window.__TAURI__` instead

2. **"Preload script not loading"**
   - Tauri doesn't use preload scripts
   - Backend communication is via Rust commands

3. **"IPC not working"**
   - Tauri uses `invoke()`, not Electron's IPC
   - Check `src-tauri/src/main.rs` for command definitions

### How to Add Backend Features:

1. Add Rust command in `src-tauri/src/main.rs`
2. Expose via `tauri::generate_handler!`
3. Call from frontend using `window.__TAURI__.invoke('command_name')`

### Reference:
- Tauri Docs: https://tauri.app/
- Rust Commands: `src-tauri/src/main.rs`
- Frontend Bridge: `src/renderer/bridge.js`

---

**Last Updated:** December 9, 2025  
**Critical:** Always check this file before making architectural changes!
