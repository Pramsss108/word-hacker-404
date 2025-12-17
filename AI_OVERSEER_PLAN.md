# 🧠 Project Expansion: "The AI Overseer"

## 🎯 The Goal
Transform the app from a simple tool into a **Living System Guardian**.
It will run in the background, monitor every process, and use the **Local AI Engine** (LaMini-Flan-T5) to diagnose threats in real-time.

---

## 🛠️ Feature 1: The "Ghost Monitor" (System Tray)
**"Always Watching, Never Sleeping."**
*   **Function:** The app minimizes to the System Tray (near the clock) instead of closing.
*   **Capabilities:**
    *   Right-click menu: "Scan Now", "Silent Mode", "Open Dashboard".
    *   Background Resource Watcher: Alerts you if RAM/CPU spikes.

## 🛠️ Feature 2: The "X-Ray" Task Manager
**"See What Windows Hides."**
*   **Function:** A new UI panel that lists all running processes.
*   **Data Points:**
    *   Real Name vs. Display Name (detects spoofing).
    *   Digital Signature Status (Verified/Unsigned).
    *   Network Activity (Is it phoning home?).
    *   Memory Usage (RAM Eating).

## 🛠️ Feature 3: "Ask The AI" (The Judge)
**"Your Personal Cybersecurity Analyst."**
*   **Interaction:**
    1.  User sees a suspicious process (e.g., `svchost.exe` using 90% CPU).
    2.  User clicks **"Analyze with AI"**.
    3.  **The AI (Local LLM)** reads the process metadata (Path, Hash, Parent Process).
    4.  **The Verdict:**
        *   ✅ **SAFE:** "This is a core Windows process. Do not touch."
        *   ⚠️ **SUSPICIOUS:** "This process is unsigned and running from Temp. Recommended: DELETE."
        *   ❌ **MALWARE:** "Known signature match for Miner.X. Killing process..."

## 🛠️ Feature 4: Smart Notification System (The "Filter")
**"Only the Important Stuff."**
*   **Problem:** Too many notifications = User uninstalls the app.
*   **Solution:** We implement a **"Noise Filter"**.
    *   **Ignored:** "Temp file deleted", "Chrome updated", "Minor RAM fluctuation".
    *   **NOTIFIED:**
        *   🚨 "New Startup App Detected: `miner.exe`"
        *   🛡️ "Blocked unauthorized camera access"
        *   ⚠️ "System RAM Critical (>90%)"
*   **Result:** When we speak, the user listens.

## 🛠️ Feature 5: The "War Map" (Event Log)
**"A History of Violence."**
*   **Function:** A visual timeline/map showing exactly what the Silent Engine did while you were away.
*   **Visuals:**
    *   "Deleted 500MB Junk (10:00 AM)"
    *   "Blocked Suspicious Connection (11:30 AM)"
    *   "Optimized RAM (2:00 PM)"
*   **Why:** Users need to *see* the value of the background service.

---

## 📝 Implementation Plan

### Phase 1: Backend (Rust)
1.  **Add `tauri-plugin-system-info`**: To get real-time CPU/RAM data.
2.  **Update `trash_hunter.rs`**: Add `get_running_processes()` to fetch the process list with security details (Signatures, Paths).
3.  **System Tray**: Add `SystemTray` code to `lib.rs`.

### Phase 2: AI Integration (TypeScript)
1.  **Upgrade `GlobalAIWorker`**: Teach the LLM a new prompt template:
    *   *"Analyze this process: Name={name}, Path={path}, Signed={bool}. Is it safe?"*
2.  **Connect UI**: Add the "Ask AI" button to the Task Manager row.

### Phase 3: Frontend (React)
1.  **New Page**: `SystemMonitor.tsx`.
2.  **Visuals**: A cyberpunk-style list of processes with "Health Bars" for CPU/RAM.

---

## 🚀 Shall we begin with Phase 1 (Backend)?
