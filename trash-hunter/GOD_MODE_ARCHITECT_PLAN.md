# 🏛️ GOD MODE: The AI System Architect (Master Plan)

**Status:** DRAFTING  
**Objective:** Build the most advanced, context-aware system analyzer in existence.  
**Philosophy:** "Don't just sweep the floor. Renovate the house."

---

## 1. 🎛️ The "Omni-Selector" (Scope Control)

The user must first define the **Theater of Operation**. This is not just a dropdown; it's a strategic choice.

### A. 🌍 GLOBAL SYSTEM (The "God View")
*   **Target:** All connected drives, Registry, Windows Component Store, User Profiles.
*   **Time:** 2-5 Minutes (Deep Analysis).
*   **Goal:** Full system audit. "Why is my PC slow? Where did my 2TB go?"

### B. 💿 SECTOR TARGET (Drive Level)
*   **Target:** Specific Drive (e.g., `C:\`, `D:\`).
*   **Time:** 30-60 Seconds.
*   **Goal:** "My Game Drive is full. Fix it."

### C. 🔬 SURGICAL STRIKE (Folder Level)
*   **Target:** Specific Folder (e.g., `C:\Users\Name\AppData`).
*   **Time:** 10-20 Seconds.
*   **Goal:** "What is inside this specific 'Other' folder?"

---

## 2. 🕵️‍♂️ The "Deep Stasis" Scan (The 2-Minute Heavy Lift)

This is **NOT** a simple file search. This is a forensic investigation. The software will "hang" (show a detailed progress log) while it gathers intelligence that no other cleaner sees.

### 🧠 Intelligence Gathering Modules (Rust Backend)

#### 1. **The Registry Mapper (Software DNA)**
*   **Action:** Scans `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`.
*   **Data:** Maps every installed App Name -> Install Location -> Uninstall String.
*   **Insight:** "I know exactly what is *supposed* to be here."

#### 2. **The Ghost Hunter (Orphan Detection)**
*   **Action:** Scans `AppData\Local`, `AppData\Roaming`, `ProgramData`, and `Documents`.
*   **Logic:** Compare every folder against the **Registry Map**.
*   **Result:** "Found folder `C:\Users\Me\AppData\Local\Cyberpunk2077`. **Registry Check:** FAILED. Game not installed. **Verdict:** 100% Ghost Data (Safe to Delete)."

#### 3. **The Driver Archaeologist**
*   **Action:** Analyzes the Windows Driver Store (`FileRepository`).
*   **Logic:** Detects multiple versions of the same GPU driver (NVIDIA/AMD).
*   **Result:** "You have 12 versions of NVIDIA drivers stored. You only need the current one. **Wasted Space:** 8 GB."

#### 4. **The Installer Graveyard**
*   **Action:** Scans `C:\Windows\Installer`.
*   **Logic:** Checks for `.msi` and `.msp` files that no longer link to active software.
*   **Result:** "Orphaned Installers found. These are setup files for apps you removed years ago."

#### 5. **The Shadow Realm (System Restore)**
*   **Action:** Queries `vssadmin` (Volume Shadow Copy Service).
*   **Result:** "System Restore is using 15% of your disk (50 GB) for restore points from 2022."

#### 6. **The Usage Heatmap (Time vs. Space)**
*   **Action:** Scans `LastAccessTime` on executables (`.exe`) in `Program Files`.
*   **Result:** "Adobe Premiere Pro (Install Date: 2021). Last Launched: Feb 2023. **Status:** Abandonware."

---

## 3. 🤖 The AI Architect (The Strategy)

Once the data is gathered, the AI doesn't just list files. It acts as a **Senior Consultant**.

### Scenario A: The "Gamer's Graveyard"
**AI Analysis:**
> "I've analyzed your D: Drive. You have 'Call of Duty: Warzone' installed (150 GB).
> **Usage Data:** You haven't launched it in 8 months.
> **Update Status:** It requires a 40 GB update to even run.
> **Strategy:** Uninstalling this single game will reclaim more space than cleaning your Temp folder 500 times.
> **Action:** Click [Uninstall] to trigger Steam."

### Scenario B: The "Developer's Hoard"
**AI Analysis:**
> "Scanning `D:\Projects`. I found 40,000 small files in `node_modules` folders.
> **Context:** These belong to projects last edited in 2022.
> **Strategy:** 'Prune Dependencies'. We will delete the `node_modules` folders (reclaim 12 GB) but KEEP your source code (`.js`, `.ts`, `.json`). You can always `npm install` later if you need them.
> **Action:** Click [Prune Stale Deps]."

### Scenario C: The "Ghost of Software Past"
**AI Analysis:**
> "Critical Alert: I found a 20 GB folder named `Windows.old`.
> **Context:** This is a backup of your previous Windows installation.
> **Risk:** If your current Windows is stable, this is useless dead weight.
> **Strategy:** Execute Windows Cleanup Protocol.
> **Action:** Click [Purge System Backup]."

---

## 4. 🛠️ Implementation Plan (Revamped)

### Phase 1: The Selector UI (React)
*   Create a new **"Mission Control"** dashboard in the Brain tab.
*   Three big cards: **GLOBAL**, **SECTOR**, **SURGICAL**.

### Phase 2: The Rust Forensics Engine
*   `fn scan_registry_map()`: Build the "Truth Table" of installed apps.
*   `fn scan_orphans()`: The logic to compare Folders vs. Registry.
*   `fn scan_driver_store()`: specialized logic for `FileRepository`.

### Phase 3: The "Thinking" State
*   The UI must show *exactly* what is happening during the 1-2 minute scan to keep the user engaged.
    *   *Log:* "Accessing Windows Registry..."
    *   *Log:* "Cross-referencing 1,402 AppData folders..."
    *   *Log:* "Analyzing Driver Store versions..."
    *   *Log:* "Calculating Entropy of 'Users' folder..."

### Phase 4: The AI Report Card
*   A beautiful, structured report (like the one we made for the file inspector, but bigger).
*   Sections: **"The Good"**, **"The Bad"**, **"The Ugly (Ghosts)"**.
*   **One-Click Actions** for each strategy.

---

**Signed:** *The Architect*
