# 🚀 ULTIMATE TRASH HUNTER: The 20-Phase AI Roadmap
**"From File Cleaner to System God"**

This roadmap outlines the evolution of Trash Hunter into the ultimate open-source system utility. Every phase leverages **Free Open Source Software (FOSS)**, **Local AI (Ollama)**, and **Native System APIs (Rust/PowerShell)**.

---

## 🏗️ PHASE 1: The Omni-Selector (Mission Control)
**Objective:** Give the user strategic control over the scan scope before the engine starts.
*   **Tech:** React (UI), Rust State Management.
*   **User Action:** A "War Room" screen with 3 big buttons:
    1.  **🌍 GLOBAL:** Full System Audit (The current default).
    2.  **💿 SECTOR:** Pick a specific Drive (C:, D:).
    3.  **🔬 SURGICAL:** Pick a specific Folder.
*   **Safety:** Prevents accidental scanning of backup drives or sensitive network shares.

## 🌑 PHASE 2: The Shadow Realm (System Restore)
**Objective:** Reclaim space hidden in "System Volume Information" (Restore Points).
*   **Tech:** PowerShell (`vssadmin list shadows`), Rust Command Wrapper.
*   **Intelligence:** Windows often keeps restore points from years ago.
*   **User Action:** "You have 50GB of Restore Points. Keep the last 2, delete the rest?"
*   **Safety:** Always keep the most recent restore point.

## 🌡️ PHASE 3: The Usage Heatmap (Abandonware)
**Objective:** Identify installed software that hasn't been used in months/years.
*   **Tech:** Rust `std::fs` reading `LastAccessTime` on `.exe` files in `Program Files`.
*   **Intelligence:** "Adobe Reader installed in 2021. Last used: Never."
*   **User Action:** List of "Ghost Apps" with a direct [Uninstall] button.
*   **Safety:** Only flags apps, doesn't auto-delete. Uses Registry to confirm it's an installed app.

## 📦 PHASE 4: The Bloatware Assassin
**Objective:** Remove pre-installed Windows "Crapware" (Candy Crush, Xbox Overlay, etc.).
*   **Tech:** PowerShell `Get-AppxPackage`.
*   **Intelligence:** Maintains a database of known bloatware Package IDs.
*   **User Action:** "Found 12 Bloatware Apps. [Purge All] or [Select]."
*   **Safety:** Whitelist critical apps (Calculator, Store, Photos).

## 🧠 PHASE 5: The Contextualizer (AI Folder Analysis)
**Objective:** Explain *what* a mysterious folder is before deleting it.
*   **Tech:** Ollama (Mistral/Llama3).
*   **Intelligence:** User asks "What is 'MSOCache'?" -> AI explains "It's Microsoft Office install cache. Safe to delete if you have the installer, but risky if you need to repair Office."
*   **User Action:** Right-click folder -> "Ask Cortex".

## 💾 PHASE 6: The Game Asset Compressor (CompactGUI)
**Objective:** Compress game folders (Steam/Epic) using Windows' built-in transparent compression.
*   **Tech:** Windows `compact.exe` (LZX Algorithm).
*   **Intelligence:** Can reduce game size by 20-40% with *zero* performance loss.
*   **User Action:** "Compress 'Cyberpunk 2077'? Save ~15GB."
*   **Safety:** Uses official Windows API. Files remain readable by the game.

## 🐳 PHASE 7: The Dev Container Cleaner
**Objective:** specialized cleaning for Developers (Docker, Node, Cargo, Python).
*   **Tech:** `docker system prune`, `cargo clean`, `pip cache purge`.
*   **Intelligence:** Detects project roots. Knows that `node_modules` can be re-installed.
*   **User Action:** "Prune all `node_modules` in projects not touched for 3 months?"
*   **Safety:** Checks `.git` presence to ensure it's a repo, not a system folder.

## 📸 PHASE 8: The Visual Duplicate Detective
**Objective:** Find duplicate photos that have different names (e.g., `IMG_001.jpg` and `Copy of IMG_001.jpg`).
*   **Tech:** Rust `image` crate + Perceptual Hashing (phash).
*   **Intelligence:** Compares *image content*, not just file size.
*   **User Action:** Show side-by-side preview. "Keep Best Quality".
*   **Safety:** User must manually confirm every deletion.

## 🕸️ PHASE 9: The Privacy Wiper
**Objective:** Clean browser traces (Cookies, Cache, History) across Chrome, Firefox, Edge.
*   **Tech:** SQLite (to read browser DBs), File Deletion.
*   **Intelligence:** Distinguishes between "Login Cookies" (Keep) and "Tracking Cookies" (Delete).
*   **User Action:** "Wipe Trackers" vs "Wipe Everything".
*   **Safety:** Don't delete saved passwords unless explicitly asked.

## 🚀 PHASE 10: The Startup Sentinel
**Objective:** Analyze and disable programs that slow down boot time.
*   **Tech:** Registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
*   **Intelligence:** AI rates startup items: "High Impact", "Necessary?", "Malware?".
*   **User Action:** Toggle switch to Enable/Disable.
*   **Safety:** Non-destructive (just disables, doesn't delete).

## 🧹 PHASE 11: The Broken Shortcut Sweeper
**Objective:** Remove `.lnk` files that point to deleted files.
*   **Tech:** Rust `ln` resolution.
*   **Intelligence:** Verifies if the target path exists.
*   **User Action:** "Found 50 dead shortcuts on Desktop/Start Menu. [Sweep]."
*   **Safety:** 100% Safe. A broken shortcut is useless by definition.

## 📝 PHASE 12: The Log File Analyst
**Objective:** Scan `*.log` files to find *why* the system is generating them.
*   **Tech:** Regex + Ollama.
*   **Intelligence:** "You have 2GB of logs from 'NVIDIA Telemetry'. It's failing to connect. Block it?"
*   **User Action:** [Clear Logs] and [Fix Cause].
*   **Safety:** Text analysis only.

## 🔒 PHASE 13: The Permission Fixer
**Objective:** Fix "Access Denied" errors on user's own files.
*   **Tech:** Windows ACL (Access Control Lists) via PowerShell.
*   **Intelligence:** Detects when the current user has lost ownership of their own data.
*   **User Action:** "Take Ownership" button.
*   **Safety:** Only applies to User folders, never Windows System folders.

## 🧩 PHASE 14: The Registry De-ragmenter
**Objective:** Remove empty keys and broken CLSIDs from the Registry.
*   **Tech:** Rust `winreg`.
*   **Intelligence:** "This key points to a DLL that was deleted 3 years ago."
*   **User Action:** [Clean Registry].
*   **Safety:** Auto-backup Registry (`.reg` file) before touching anything.

## 📥 PHASE 15: The Download Sorter (AI Powered)
**Objective:** Organize the chaotic "Downloads" folder.
*   **Tech:** Rust File Move + AI Classification.
*   **Intelligence:** AI looks at file content/name. "Invoice_2023.pdf" -> `/Documents/Finance`. "Setup.exe" -> `/Installers`.
*   **User Action:** "Organize Downloads".
*   **Safety:** Undo button (moves files back).

## 🕵️ PHASE 16: The Large File Treemap (Visualizer)
**Objective:** A visual "WinDirStat" style view inside the app.
*   **Tech:** D3.js or Canvas (React) + Rust Directory Walker.
*   **Intelligence:** Color-code by file type (Video = Red, System = Grey).
*   **User Action:** Click big blocks to delete.
*   **Safety:** "God Mode" safety checks apply.

## 📡 PHASE 17: The DNS & Network Flusher
**Objective:** Fix internet connection issues and clear old cache.
*   **Tech:** `ipconfig /flushdns`, `netsh winsock reset`.
*   **Intelligence:** Simple maintenance script.
*   **User Action:** "Reset Network Stack".
*   **Safety:** Standard Windows networking commands.

## 🗑️ PHASE 18: The "Empty Folder" Nuke (Enhanced)
**Objective:** Recursively delete folders that contain nothing (or only `.DS_Store`/`Thumbs.db`).
*   **Tech:** Recursive Rust Walker.
*   **Intelligence:** Ignore "System" empty folders that Windows needs.
*   **User Action:** "Nuke Empty Folders".
*   **Safety:** Whitelist `C:\Windows`, `Program Files`.

## 🛡️ PHASE 19: The Sensitive Data Shield
**Objective:** Scan plain text files for exposed passwords or API keys.
*   **Tech:** Regex Pattern Matching (Local only).
*   **Intelligence:** "Found 'API_KEY' in `desktop/notes.txt`. You should secure this."
*   **User Action:** [Encrypt] or [Delete].
*   **Safety:** Data never leaves the device.

## ⏪ PHASE 20: The Time Machine (Snapshot & Rollback)
**Objective:** The ultimate safety net.
*   **Tech:** JSON Logging (History) + File Move.
*   **Intelligence:** Before any major operation, create a "Manifest".
*   **User Action:** "Undo last cleanup" (Restores files from Recycle Bin / Moves them back).
*   **Safety:** Ensures user confidence.

---

**Signed:** *The Architect*
