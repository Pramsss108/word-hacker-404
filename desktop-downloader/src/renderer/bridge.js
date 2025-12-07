/**
 * WH404 Unified Bridge
 * Abstraction layer that routes calls to either Electron (IPC) or Tauri (Rust).
 * Handles platform differences and normalizes data formats.
 */

const isTauri = !!window.__TAURI__;

// Helper: Parse raw yt-dlp output (for Tauri)
// Matches the logic in Electron's main.js
const parseProgress = (line, url) => {
  // Match: [download]  15.2% of 45.67MiB at 2.34MiB/s ETA 00:12
  const match = line.match(/\[download\]\s+([0-9.]+)%.*?at\s+([0-9.]+[^\s]+)\s+ETA\s+([0-9:\-]+)/i) ||
                line.match(/\[download\]\s+([0-9.]+)%/i);

  if (match) {
    const rawPercent = Number(match[1]);
    const speed = match[2] || '-- MB/s';
    const eta = match[3] || '--:--';
    
    // Remap 0-100 to 15-100 (matching Electron's UX)
    const percent = 15 + (rawPercent * 0.85);
    
    return {
      url,
      percent: Math.round(percent),
      speed,
      eta,
      status: 'downloading'
    };
  }
  return null;
};

const bridge = {
  platform: isTauri ? 'tauri' : 'electron',

  // --- Core Actions ---

  download: async (url, format) => {
    if (isTauri) {
      const { invoke } = window.__TAURI__.tauri;
      return invoke('download_video', { url, format });
    } else {
      return window.downloader.download(url, format);
    }
  },

  cancelDownload: async (url) => {
    if (isTauri) {
      // TODO: Implement cancel in Rust
      console.warn('[Bridge] Cancel not implemented in Tauri yet');
      return { success: false };
    } else {
      return window.downloader.cancelDownload(url);
    }
  },

  // --- Events ---

  onProgress: (callback) => {
    if (isTauri) {
      const { listen } = window.__TAURI__.event;
      listen('download:progress', (event) => {
        // Rust sends { url, line }
        const { url, line } = event.payload;
        const data = parseProgress(line, url);
        if (data) callback(data);
      });
    } else {
      window.downloader.onProgress(callback);
    }
  },

  onComplete: (callback) => {
    if (isTauri) {
      const { listen } = window.__TAURI__.event;
      listen('download:complete', (event) => {
        // Rust sends { url, line: "done" }
        // Electron expects { url, downloadPath, ... }
        // For now, we just signal completion. Path handling needs Rust update.
        callback({ 
          url: event.payload.url, 
          status: 'completed',
          progress: 100 
        });
      });
    } else {
      window.downloader.onComplete(callback);
    }
  },

  // --- File System / Dialogs ---

  showSaveDialog: async (options) => {
    if (isTauri) {
      const { save } = window.__TAURI__.dialog;
      return save({
        defaultPath: options.defaultPath,
        filters: options.filters
      });
    } else {
      return window.downloader.showSaveDialog(options);
    }
  },

  // --- Metadata (Placeholder for Tauri) ---
  
  getVideoMetadata: async (url) => {
    if (isTauri) {
      // Mock for now until Rust metadata is implemented
      return {
        title: 'Metadata Loading...',
        thumbnail: '',
        description: 'Metadata not available in Tauri Alpha',
        keywords: []
      };
    } else {
      return window.downloader.getVideoMetadata(url);
    }
  }
};

// Expose as window.downloader to maintain compatibility with renderer.js
// If Electron is present, it might have already defined it.
// We wrap it if needed, but for Tauri, we define it.
if (isTauri) {
  window.downloader = bridge;
  console.log('🚀 WH404 Bridge: Tauri Mode Activated');
} else {
  // In Electron, window.downloader is already defined by preload.js
  // We don't overwrite it, but we could wrap it if we wanted to intercept.
  console.log('⚡ WH404 Bridge: Electron Mode Detected');
}
