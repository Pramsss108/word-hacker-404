# Fix Report: Thumbnail Download & 4K Support

## 1. Thumbnail Download Fix
**Issue:** Users could not save thumbnails because the file system permissions were too restrictive (only allowed Downloads folder).
**Fix:** Updated `tauri.conf.json` to allow saving to:
- Desktop (`$DESKTOP/**`)
- Documents (`$DOCUMENTS/**`)
- Pictures (`$PICTURES/**`)
- Videos (`$VIDEOS/**`)

## 2. 4K / Lossless Video Support
**Issue:** The "1080p Pro" preset was hardcoded to cap resolution at 1080p (`height<=1080`).
**Fix:**
- **Backend (`main.rs`):** Updated the `mp4-1080` mapping to use `bestvideo+bestaudio` without height restrictions. It now fetches the best available quality (4K, 8K, etc.).
- **Frontend (`index.js`):** Renamed the preset label from "1080p Pro" to "Best Quality (4K+)".

## 3. Responsive Video Preview
**Verification:** Confirmed that `style.css` uses `vh` (viewport height) units for the video player.
- Horizontal videos: Max height 70vh
- Vertical videos: Max height 80vh
- Shorts: Max height 85vh
This ensures the video fits within the screen without being cut off.

## How to Build
Run the standard build command:
```powershell
npm run build
npm run tauri:build
```
