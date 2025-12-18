# Export System Reference

This document details the architecture of the export system in Word Hacker 404 Desktop Downloader.

## 1. Overview

The export system is designed to be "bulletproof" against the unpredictable nature of `yt-dlp` filenames. Since `yt-dlp` often sanitizes filenames (removing emojis, special characters, etc.) in ways that are hard to predict, the frontend cannot simply guess the filename.

Instead, we use a **Fuzzy Resolution System**.

## 2. The Resolution Process (`resolveItemFiles`)

Located in `src/index.js`.

1.  **Exact Match Check:** First, it checks if the file exists exactly as `yt-dlp` reported it.
2.  **Directory Scan:** If the file is missing, it scans the entire temporary directory.
3.  **Normalization:** It normalizes both the expected filename and the files on disk:
    *   Removes extensions.
    *   Removes format codes (e.g., `.f123`).
    *   Removes all non-alphanumeric characters.
    *   Converts to lowercase.
4.  **Fuzzy Match:** It compares the normalized strings. If a file on disk matches the expected file (even partially), it is accepted as the correct source file.
5.  **Update:** The `item.files` array is updated *in place* with the corrected path.

## 3. The Bridge (`bridge.js`)

Located in `src/renderer/bridge.js`.

*   **Pre-Flight Check:** Before sending any command to the Rust backend, the bridge verifies that the file *actually exists* using `window.__TAURI__.fs.exists`.
*   **Payload Logging:** It logs the exact JSON payload being sent to the backend, which is critical for debugging.

## 4. The Backend (`main.rs`)

Located in `src-tauri/src/main.rs`.

*   **`export_files` Command:**
    *   Receives the source file path and destination directory.
    *   **Auto-Renaming:** If a file with the same name exists in the destination, it automatically appends `(1)`, `(2)`, etc.
    *   **FFmpeg Trimming:** If `trim` data is provided, it uses FFmpeg to cut the video.
    *   **Copying:** If no trim is needed, it performs a fast file copy.
*   **`open_folder` Command:**
    *   Uses the system's native file explorer (Explorer on Windows, Finder on Mac) to highlight the specific file.

## 5. Debugging

If "Source file not found" occurs:
1.  Open DevTools (F12).
2.  Look for `[Resolve]` logs.
    *   `[Resolve] Checking file...`
    *   `[Resolve] Reading directory...`
    *   `[Resolve] ✅ Found match: ...`
3.  If the match is found but export fails, check `[Bridge] Exporting payload` to ensure the *resolved* path was passed.

## 6. Key Functions

*   `resolveItemFiles(item)`: The core fuzzy search logic.
*   `window.downloader.exportFiles(payload)`: The bridge function.
*   `export_files` (Rust): The backend handler.

## 6. UI & Navigation Updates (v1.0.1)

### Open Folder Functionality
We enhanced the 'Open Folder' feature to improve user experience:

1.  **Direct File Selection**:
    - Previously, clicking 'Open Folder' would open the parent directory.
    - **Fix**: Updated 'bridge.js' to pass the full file path to the backend. The Rust backend ('main.rs') now uses the OS shell to open the folder *and* select the specific file.

2.  **Success Modal**:
    - Added a direct ' Open Folder' button to the success modal after an export completes.
    - This allows users to immediately locate their exported file without navigating the batch list.

3.  **Batch List Icons**:
    - Fixed the folder icon in the batch list to ensure it is clickable and visually consistent.

