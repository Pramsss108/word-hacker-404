# 🧠 AI Overseer: Development & Deployment Guide

## 🛠️ How to Run in Dev Mode
To see your changes instantly (Hot Reloading):
```powershell
npm run tauri dev
```
*   This starts the React frontend (localhost:1420) AND the Rust backend window.
*   You can edit `App.tsx` or `trash_hunter.rs` and see changes (Rust changes require a restart of the command).

## 📦 How to Build & Install (Production)
To create the final `.exe` or `.msi` installer:
```powershell
npm run tauri build
```
*   **Output Location:** `src-tauri/target/release/bundle/msi/` (or `nsis`).
*   **Action:** Double-click the installer to install "Word Hacker 404" to `C:\Program Files`.
*   **Result:** You get a Start Menu shortcut. No more `.bat` files needed.

## 👻 The "Silent Engine" Service
The background service (`trash-hunter-service.exe`) is separate.
*   **Dev Mode:** It won't run automatically unless you installed it previously.
*   **Production:** The installer should ideally register it, or you run `install-service.ps1` **once** after installation.

## 🧪 Testing the "AI Overseer"
1.  Run `npm run tauri dev`.
2.  Open the DevTools (Right Click -> Inspect).
3.  Type this in the Console to test the new scanner:
    ```javascript
    window.__TAURI__.invoke('get_running_processes').then(console.table)
    ```
4.  You should see a list of all running processes (PID, Name, RAM).

---

## 🚀 Next Steps (Phase 2 & 3)
Now that the Backend is ready, we need to:
1.  **Frontend:** Create the `SystemMonitor.tsx` page to display this data.
2.  **AI:** Connect the `GlobalAIWorker` to analyze these processes.
