# Word Hacker 404 — Automation & Enhancement Playbook

_Last updated: 2025-12-04_

This playbook guarantees non-coders can keep the desktop downloader and the web experience running, observe changes live, and roll new builds without touching raw commands. It also tracks the 20-step professional roadmap so we never lose sight of the planned upgrades.

---

## 1. Zero-Code Automation Stack

### Desktop Downloader (Electron)
- **Instant Launch**: Double-click `desktop-downloader/LAUNCH.bat`. It auto-installs dependencies (first run) and starts Electron with `npm start` so UI changes reload instantly. Keep this script open while editing.
- **One-Click Build**: Run `desktop-downloader/build-desktop.ps1 -Target win`. This wraps `electron-builder` and drops the portable EXE in `desktop-downloader/release/`. No extra flags needed.
- **CI Builds**: `.github/workflows/build-desktop.yml` already mirrors the PowerShell script. Pushing to `main` (or tagging a release) automatically produces Windows/macOS/Linux artifacts under the Actions tab.
- **Live Reload** tip: When `LAUNCH.bat` is running, edits inside `desktop-downloader/src/renderer/*` hot-reload. Changes to `main.js` trigger an Electron restart handled by the dev server.

### Web Experience (Vite React)
- **Watcher**: `npm run dev` (already baked into VS Code task "Word Hacker 404 - Dev Server"). Use the command palette → "Tasks: Run Task" → choose the dev server. Browser auto-refreshes on save.
- **Verification**: `npm run type-check` and `npm run build` tasks live under the same VS Code task list. Run them before committing to catch regressions.

### Combined Workflow for Non-Coders
1. Double-click `QUICK_DEPLOY.bat` (opens two PowerShell panes: one for Vite dev server, one for desktop launcher). _If this batch ever goes missing, recreate it by chaining `npm run dev` and `desktop-downloader\LAUNCH.bat`._
2. Work inside VS Code. Electron + Vite refresh on save.
3. When happy, run `desktop-downloader/build-desktop.ps1 -Target win` to get the latest EXE.
4. Commit + push. GitHub Actions builds installers for other platforms automatically.

> **Phrase reminder**: _"Build like a pro, run like a fan."_ Add this tagline into any splash/help screen to keep branding aligned.

---

## 2. Continuous Build & Access Flow
| Stage | Tool | Trigger | Output | Notes |
| --- | --- | --- | --- | --- |
| Local Preview | `desktop-downloader/LAUNCH.bat` | Double-click | Live Electron window | Auto-installs deps if missing |
| Local Web HMR | VS Code Task → `npm run dev` | Command Palette | http://localhost:3001 | Matrix rain background verifies assets |
| Quality Gate | VS Code Task → `npm run type-check` | On-demand | TS diagnostics | Run before packaging |
| Desktop Build | `build-desktop.ps1 -Target win` | Manual | `release/Word Hacker Downloader <ver>.exe` | Also updates `release/win-unpacked` for inspection |
| CI Packaging | GitHub Actions `build-desktop.yml` | Push/tag | `.exe`, `.dmg`, `.AppImage` artifacts | Download from Actions tab |

This flow means a non-coder can always access the latest code and ship an installer without touching Node/Electron internals.

---

## 3. 20-Step Professional Enhancement Roadmap

| # | Phase | Feature Capsule | Status | Notes & Dependencies |
| --- | --- | --- | --- | --- |
| 1 | Visual | Animated neon splash + Matrix intro | 🚧 Planned | Needs SVG logo + splash component in renderer |
| 2 | Visual | Deep violet theme & accents | ✅ Base palette | Extend to Electron CSS + desktop window chrome |
| 3 | Visual | Advanced animations (progress particles etc.) | 🚧 Planned | Hook into queue progress events |
| 4 | Visual | Pro status bar metrics | 🚧 Planned | Capture yt-dlp speed/ETA, add perf monitor |
| 5 | Visual | Custom window controls + titlebar | 🚧 Planned | Use Electron `BrowserWindow` frameless mode |
| 6 | Power | Batch download queue | ✅ MVP | Needs drag reorder + auto-paste start |
| 7 | Power | Smart format presets & auto-detect | 🚧 Planned | Extend preset JSON + heuristics |
| 8 | Power | Audio mastering toggles | 🚧 Planned | Chain FFmpeg filters + metadata writer |
| 9 | Power | Video trimming, speed, GIF | 🚧 Planned | Expand IPC payload + ffmpeg args |
|10 | Power | Download history/library | 🚧 Planned | Persist JSON + gallery view |
|11 | Pro Tools | Subtitle workflow | 🚧 Planned | Pull `--write-subs/--embed-subs` flags |
|12 | Pro Tools | Playlist/channel automation | ✅ Basic support | Build UI controls + skip logic |
|13 | Pro Tools | Thumbnail extractor | 🚧 Planned | Use yt-dlp `--write-thumbnail` |
|14 | Pro Tools | Preview player | 🚧 Planned | Embed video element with local temp stream |
|15 | Pro Tools | Auto-update system | 🚧 Planned | Integrate electron-updater + binary refresh |
|16 | Monetize | License tiers (Free/Pro/Enterprise) | 🚧 Planned | Need local key store + gating logic |
|17 | Monetize | Analytics dashboard | 🚧 Planned | Aggregate stats per session |
|18 | Monetize | Cloud sync + remote trigger | 🚧 Planned | Placeholder API hooks only |
|19 | Monetize | Referral / invite UI | 🚧 Planned | Light backend or stored codes |
|20 | Monetize | Branding + distribution polish | 🚧 Planned | Custom installer theme + sig cert |

Use this table as the single source for sprint planning. Update the **Status** column as features land (`✅ Done`, `🚧 In Progress`, `📝 Scoped`, etc.).

---

## 4. Quick-Win Execution Order
1. **Splash Screen (Step 1)** — Delivers instant perceived quality. Implement HTML/CSS overlay + fade.
2. **Queue UX (Step 6 polish)** — Add reorder + auto-start by listening to clipboard paste.
3. **Format Presets (Step 7)** — Define JSON config + toggleable chips in renderer.
4. **History View (Step 10)** — Save job summaries to disk; render in new panel.
5. **License Toggle (Step 16)** — Stub UI + local key validation to prep for monetization.

Each can ship independently while keeping installers buildable through the automation stack above.

---

## 5. FAQ for Non-Coders
- **Why enhance again if software already builds?** Because the restored EXE is a baseline. The 20 features above elevate UX, reliability, and monetization. This doc proves the effort is intentional, measurable, and always shippable.
- **How do I see changes in real time?** Keep `desktop-downloader/LAUNCH.bat` and `npm run dev` running. Both apps refresh as you save files.
- **What if builds fail?** Rerun `npm install` in both root and `desktop-downloader/`. If PowerShell complains, use GitHub Actions build artifacts.

Keep this playbook pinned; it is the single reference for running, viewing, and enhancing Word Hacker 404 like a pro.
