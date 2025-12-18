# Safe Enhancement Plan: Word Hacker 404 Downloader

This plan outlines a safe, incremental strategy to enhance the desktop downloader without breaking existing functionality. Each phase builds upon the previous one.

## Phase 1: Stability & Core Experience (The Foundation)
*Focus: Ensuring the app works perfectly every time.*

1.  **Unified Error Handling System**
    *   **Action:** Create a central error handler in `bridge.js` that catches all Rust/Tauri errors and displays user-friendly toasts instead of raw error codes.
    *   **Benefit:** Users won't see "Error: -4058" but rather "Could not find file. Please check the path."

2.  **Persistent Settings Manager**
    *   **Action:** Enhance `localStorage` usage to save *all* user preferences (last format, last quality, dark/light mode preference, last destination) and restore them on launch.
    *   **Benefit:** The app "remembers" exactly how the user left it.

3.  **Network Resilience Mode**
    *   **Action:** Implement auto-retry logic in `bridge.js` for downloads that fail due to temporary network glitches (e.g., retry 3 times with 5s delay).
    *   **Benefit:** Downloads don't fail instantly on minor connection drops.

4.  **Clipboard Monitor (Smart Paste)**
    *   **Action:** Add an optional toggle to automatically detect YouTube links in the clipboard when the window gains focus and offer to paste them.
    *   **Benefit:** Reduces friction; "Copy link -> Open App -> It's already there."

5.  **Disk Space Pre-Check**
    *   **Action:** Before starting a download, check available disk space in the destination folder (via Rust) and warn if space is low (<500MB).
    *   **Benefit:** Prevents corrupted downloads due to full disks.

## Phase 2: Visual & UI Polish (The Look)
*Focus: Making the app feel premium and responsive.*

6.  **Smooth Transition Animations**
    *   **Action:** Add CSS view transitions (or Framer Motion) for switching between "Home", "Downloads", and "Settings" tabs.
    *   **Benefit:** The app feels like a fluid native experience, not a web page.

7.  **Download Progress Taskbar**
    *   **Action:** Integrate with Windows Taskbar API (via Tauri) to show a green progress bar on the app icon in the taskbar.
    *   **Benefit:** Users can monitor downloads while doing other things.

8.  **Dynamic Theme Engine**
    *   **Action:** Allow users to pick accent colors (Neon Green, Cyber Blue, Glitch Red) that update all buttons, glows, and borders instantly.
    *   **Benefit:** Personalization makes the app feel like *theirs*.

9.  **Skeleton Loading States**
    *   **Action:** Replace spinning loaders with "skeleton" placeholders (gray pulsing shapes) when fetching video metadata.
    *   **Benefit:** Perceived performance improves; feels faster and more modern.

10. **Glassmorphism 2.0**
    *   **Action:** Refine the "Media Studio" modal with better backdrop-filter blur and noise textures to match the "Hacker" aesthetic.
    *   **Benefit:** Reinforces the brand identity.

## Phase 3: Feature Expansion (The Power)
*Focus: Adding new capabilities safely.*

11. **Audio-Only Smart Mode**
    *   **Action:** Add a "Music Mode" toggle that automatically selects "MP3 320kbps" and strips video metadata, adding ID3 tags (Artist, Title) from the video title.
    *   **Benefit:** Perfect for building music libraries.

12. **Batch Playlist Downloader**
    *   **Action:** Detect if a link is a playlist. If so, show a checklist modal to let users select which videos to download (instead of just one).
    *   **Benefit:** Massive time saver for downloading courses or albums.

13. **History & "Redownload"**
    *   **Action:** Keep a local JSON log of the last 50 downloads. Add a "History" tab where users can click to redownload or open the file.
    *   **Benefit:** "Where did I find that video?" -> Solved.

14. **Custom Filename Templates**
    *   **Action:** Allow users to define patterns like `{title} - {channel}.{ext}` or `{date}_{title}.{ext}` in settings.
    *   **Benefit:** Power users get organized files automatically.

15. **Subtitle Extractor**
    *   **Action:** Add a checkbox to "Also download subtitles" (SRT/VTT) alongside the video.
    *   **Benefit:** Essential for accessibility and non-native speakers.

## Phase 4: Performance & Security (The Shield)
*Focus: Optimization and protection.*

16. **FFmpeg Binary Verification**
    *   **Action:** On startup, calculate the hash of the `ffmpeg.exe` and `yt-dlp.exe` to ensure they haven't been corrupted or replaced.
    *   **Benefit:** Security against malware replacing core tools.

17. **Memory Leak Protection**
    *   **Action:** Implement a cleanup routine that revokes all `URL.createObjectURL` blobs when the "Media Studio" is closed.
    *   **Benefit:** Prevents the app from getting slower over time.

18. **Update Channel Selector**
    *   **Action:** Allow users to switch between "Stable" and "Beta" update channels to test new features early.
    *   **Benefit:** Engages the community in testing.

19. **Privacy Mode (Incognito)**
    *   **Action:** A toggle that, when active, does not save history, last folder, or cookies for that session.
    *   **Benefit:** Privacy-conscious users feel safer.

20. **Automated Log Rotation**
    *   **Action:** Ensure application logs (if any) are rotated and deleted after 7 days to save space and maintain privacy.
    *   **Benefit:** Good housekeeping.
