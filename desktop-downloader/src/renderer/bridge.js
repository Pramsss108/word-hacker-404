/**
 * WH404 Unified Bridge
 * Abstraction layer that routes calls to either Electron (IPC) or Tauri (Rust).
 * Handles platform differences and normalizes data formats.
 */

// Force Electron mode - this is an Electron app, never Tauri
const isTauri = false; // !!window.__TAURI__;
console.log(`[Bridge] Initializing in ${isTauri ? 'TAURI' : 'ELECTRON'} mode`);

let jobStartCallback = null;


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

  // Stub for onJobCancelled to prevent startup errors
  onJobCancelled: (callback) => {
    // TODO: Implement cancellation events
    console.log('[Bridge] onJobCancelled registered (stub)');
  },

  onExportProgress: (callback) => {
    // TODO: Implement export progress events
    console.log('[Bridge] onExportProgress registered (stub)');
  },

  // --- Core Actions ---

  // Check if a file exists and return corrected path
  checkFileExists: async (filePath) => {
    if (isTauri) {
      try {
        const { exists } = window.__TAURI__.fs;
        const fileExists = await exists(filePath);
        console.log(`[Bridge] File exists check: ${filePath} = ${fileExists}`);
        return fileExists;
      } catch (e) {
        console.error('[Bridge] checkFileExists failed:', e);
        return false;
      }
    }
    return false;
  },

  // List files in a directory
  readDir: async (dirPath) => {
    if (isTauri) {
      try {
        const { readDir } = window.__TAURI__.fs;
        const entries = await readDir(dirPath);
        console.log(`[Bridge] Found ${entries.length} files in ${dirPath}`);
        return entries.map(e => e.name);
      } catch (e) {
        console.error('[Bridge] readDir failed:', e);
        return [];
      }
    }
    return [];
  },

  // Read file directly into memory (Bypasses asset protocol issues)
  readVideoFile: async (filePath) => {
    if (isTauri) {
      try {
        const { readBinaryFile } = window.__TAURI__.fs;
        console.log('[Bridge] Reading video file into memory:', filePath);
        const data = await readBinaryFile(filePath);
        
        // Guess mime type
        let mime = 'video/mp4';
        if (filePath.endsWith('.m4a')) mime = 'audio/mp4';
        if (filePath.endsWith('.mp3')) mime = 'audio/mpeg';
        if (filePath.endsWith('.webm')) mime = 'video/webm';
        
        const blob = new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        console.log('[Bridge] Blob URL created:', url);
        return url;
      } catch (e) {
        console.error('[Bridge] readVideoFile failed:', e);
        throw e;
      }
    }
    return null;
  },

  convertPath: (filePath) => {
    if (isTauri) {
      try {
        // CRITICAL: Normalize backslashes to forward slashes BEFORE conversion
        // Tauri's convertFileSrc doesn't handle backslashes correctly on Windows
        const normalized = filePath.replace(/\\/g, '/');
        
        const { convertFileSrc } = window.__TAURI__.tauri;
        const url = convertFileSrc(normalized);
        console.log('[Bridge] Converted to asset URL:', url);
        return url;
      } catch (e) {
        console.error('[Bridge] convertPath failed:', e);
        return null;
      }
    }
    return null;
  },

  // Download thumbnail with native Save As dialog
  downloadThumbnail: async (thumbnailUrl, defaultFilename = 'thumbnail.jpg') => {
    if (isTauri) {
      try {
        const { save } = window.__TAURI__.dialog;
        const { fetch } = window.__TAURI__.http;
        const { writeBinaryFile } = window.__TAURI__.fs;
        
        console.log('[Bridge] Starting thumbnail download:', thumbnailUrl);
        
        // Show Save As dialog
        const savePath = await save({
          defaultPath: defaultFilename,
          filters: [{
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'webp']
          }]
        });
        
        // User cancelled
        if (!savePath) {
          console.log('[Bridge] Download cancelled by user');
          return { success: false, cancelled: true };
        }
        
        console.log('[Bridge] Downloading to:', savePath);
        
        // Download image
        const response = await fetch(thumbnailUrl, {
          method: 'GET',
          responseType: 2 // ResponseType.Binary
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.data}`);
        }
        
        // Write to chosen location
        await writeBinaryFile(savePath, response.data);
        
        console.log('[Bridge] Thumbnail saved successfully');
        return {
          success: true,
          path: savePath,
          cancelled: false
        };
        
      } catch (e) {
        console.error('[Bridge] downloadThumbnail failed:', e);
        return {
          success: false,
          error: e.message || 'Download failed',
          cancelled: false
        };
      }
    }
    
    // Fallback for Electron (if needed)
    console.warn('[Bridge] downloadThumbnail not implemented for Electron');
    return { success: false, error: 'Not implemented for this platform' };
  },

  // Open folder location in file explorer
  openFolderLocation: async (filePath) => {
    if (isTauri) {
      try {
        const { Command } = window.__TAURI__.shell;
        
        // Extract directory from full path
        const directory = filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        
        console.log('[Bridge] Opening folder:', directory);
        
        // Windows: Use explorer to select the file
        if (navigator.platform.includes('Win')) {
          const command = new Command('explorer', ['/select,', filePath.replace(/\//g, '\\')]);
          await command.execute();
        } else if (navigator.platform.includes('Mac')) {
          const command = new Command('open', ['-R', filePath]);
          await command.execute();
        } else {
          // Linux: Just open the directory
          const command = new Command('xdg-open', [directory]);
          await command.execute();
        }
        
        return { success: true };
      } catch (e) {
        console.error('[Bridge] openFolderLocation failed:', e);
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Not implemented for this platform' };
  },

  startDownload: async ({ urls, format, destination }) => {
    if (isTauri) {
      const { invoke } = window.__TAURI__.tauri;
      console.log('[Bridge] Starting batch download:', urls.length);
      
      // Notify UI that jobs are starting
      if (jobStartCallback) {
          urls.forEach(url => jobStartCallback({ url }));
      }
      
      // Fire off downloads for each URL
      // We don't await them all to finish, just to start
      const promises = urls.map(url => 
        invoke('download_video', { url, format })
          .then(res => console.log('[Bridge] Started:', url))
          .catch(err => console.error('[Bridge] Failed to start:', url, err))
      );
      
      return { success: true, count: urls.length, message: 'Batch started' };
    } else {
      return window.downloader.startDownload({ urls, format, destination });
    }
  },

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

  onJobStart: (callback) => {
    if (isTauri) {
      jobStartCallback = callback;
    } else {
      window.downloader.onJobStart(callback);
    }
  },

  onStatus: (callback) => {
    if (isTauri) {
      // Mock status update
      callback({ network: 'online' });
    } else {
      window.downloader.onStatus(callback);
    }
  },

  onProgress: (callback) => {
    if (isTauri) {
      const { listen } = window.__TAURI__.event;
      listen('download_progress', (event) => {
        // Rust sends { url, progress, status }
        const { url, progress, status } = event.payload;
        callback({
            url,
            percent: progress,
            status,
            speed: 'Processing...', // Placeholder
            eta: '...'      // Placeholder
        });
      });
    } else {
      window.downloader.onProgress(callback);
    }
  },

  onJobComplete: (callback) => {
    if (isTauri) {
      const { listen } = window.__TAURI__.event;
      listen('download_complete', (event) => {
        const { url, filename } = event.payload;
        // Convert local path to asset URL if needed, or just pass path
        // For now, pass path. Renderer might need to handle it.
        // In Tauri, to show local video, we usually need convertFileSrc
        
        let files = [];
        if (filename) {
            files = [filename];
        }

        callback({ 
          url: url, 
          status: 'completed',
          progress: 100,
          files: files,
          tempDir: '' 
        });
      });
    } else {
      window.downloader.onJobComplete(callback);
    }
  },

  onJobError: (callback) => {
    if (isTauri) {
      const { listen } = window.__TAURI__.event;
      listen('download_error', (event) => {
        callback({ 
          url: event.payload.url, 
          message: event.payload.status 
        });
      });
    } else {
      window.downloader.onJobError(callback);
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

  // --- Metadata ---
  
  probeFormats: async (url) => {
      // Always use Electron path
      if (false) { // Disabled Tauri
          const { invoke } = window.__TAURI__.tauri;
          try {
              const meta = await invoke('get_video_metadata', { url });
              return meta;
          } catch (e) {
              console.error('Metadata fetch failed:', e);
              return { formats: [] };
          }
      } else {
          try {
            return await window.downloader.probeFormats(url);
          } catch (error) {
            console.error('[Bridge] Probe error details:', error);
            const errorMsg = (error.message || error.toString()).toLowerCase();
            
            // 🛡️ INTERCEPT AUTH ERRORS
            // Catches: "Sign in to confirm your age", "Private video", "Login required", etc.
            if (errorMsg.includes('inappropriate') || 
                errorMsg.includes('login') || 
                errorMsg.includes('private') ||
                errorMsg.includes('sign in') ||
                errorMsg.includes('confirm your age') ||
                errorMsg.includes('bot') ||
                errorMsg.includes('checkpoint')) {
              
              console.log('[Bridge] 🛡️ Triggering Privacy Bridge for:', url);
              
              return new Promise((resolve, reject) => {
                  // Show the modal
                  if (window.privacyBridge) {
                      window.privacyBridge.show(url);
                      
                      // Handle Success
                      const successHandler = (e) => {
                          cleanup();
                          resolve(e.detail);
                      };
                      
                      // Handle Cancel
                      const cancelHandler = () => {
                          cleanup();
                          reject(new Error('User cancelled privacy verification'));
                      };
                      
                      const cleanup = () => {
                          window.removeEventListener('privacy-bridge-success', successHandler);
                          window.removeEventListener('privacy-bridge-cancel', cancelHandler);
                      };
                      
                      window.addEventListener('privacy-bridge-success', successHandler);
                      window.addEventListener('privacy-bridge-cancel', cancelHandler);
                  } else {
                      console.error('PrivacyBridge not found!');
                      reject(error);
                  }
              });
            }
            throw error;
          }
      }
  },

  getVideoMetadata: async (url) => {
    if (isTauri) {
      const { invoke } = window.__TAURI__.tauri;
      try {
          const meta = await invoke('get_video_metadata', { url });
          // Normalize keywords if needed
          return {
              ...meta,
              keywords: meta.tags || ['word-hacker']
          };
      } catch (e) {
          console.error('Metadata fetch failed:', e);
          return {
            title: 'Word Hacker Capture',
            thumbnail: `https://image.thum.io/get/width/900/crop/600/${encodeURIComponent(url)}`,
            description: 'Metadata unavailable',
            keywords: []
          };
      }
    } else {
      return window.downloader.getVideoMetadata(url);
    }
  },

  fetchMetadata: async (url) => {
    if (isTauri) {
      const { invoke } = window.__TAURI__.tauri;
      try {
          const meta = await invoke('get_video_metadata', { url });
          return {
              ...meta,
              keywords: meta.tags || ['word-hacker']
          };
      } catch (e) {
          return {
            title: 'Word Hacker Capture',
            thumbnail: `https://image.thum.io/get/width/900/crop/600/${encodeURIComponent(url)}`,
            description: 'Metadata unavailable',
            keywords: []
          };
      }
    } else {
      return window.downloader.fetchMetadata(url);
    }
  }
};

// Expose as window.downloader to maintain compatibility with renderer.js
// If Electron is present, it might have already defined it.
// We wrap it if needed, but for Tauri, we define it.
if (isTauri) {
  window.downloader = bridge;
  
  // Window Controls for Custom UI
  const { appWindow } = window.__TAURI__.window;
  window.windowControls = {
    control: (action) => {
      switch (action) {
        case 'minimize': appWindow.minimize(); break;
        case 'maximize': appWindow.toggleMaximize(); break;
        case 'close': appWindow.close(); break;
      }
    },
    togglePin: async () => {
      // Basic toggle implementation
      // Note: Requires allowlist "window": { "setAlwaysOnTop": true } in tauri.conf.json
      return false; 
    }
  };

  console.log('🚀 WH404 Bridge: Tauri Mode Activated');

  // System Dialogs & File Operations
  window.systemDialogs = {
    openFolder: async (path) => {
      // TODO: Implement open folder in Rust
      console.log('Open folder:', path);
    },
    chooseFolder: async () => {
      const { open } = window.__TAURI__.dialog;
      return open({ directory: true, multiple: false });
    },
    revealFile: async (path) => {
      // TODO: Implement reveal file
      console.log('Reveal file:', path);
    },
    exportFiles: async (payload) => {
      // Payload: { files, destination, outputFormat, trim, metadata }
      // For now, we just copy the file to the destination if provided, or Downloads
      // Real implementation needs ffmpeg in Rust
      
      const { invoke } = window.__TAURI__.tauri;
      console.log('[Bridge] Exporting:', payload);
      
      // Mock export for now - just return success
      // In a real app, we would call a Rust command to run ffmpeg
      return {
        exported: payload.files,
        outputDir: payload.destination || 'Downloads'
      };
    },
    backgroundTrim: async (trimData) => {
      // Mock background trim
      return { trimmedFile: trimData.sourceFile };
    }
  };

} else {
  // In Electron, window.downloader is already defined by preload.js
  // We wrap it to intercept errors for the Privacy Bridge
  console.log('⚡ WH404 Bridge: Electron Mode Detected');
  
  // Helper to install the interceptor
  const installInterceptor = () => {
      if (!window.downloader) {
          console.warn('⏳ window.downloader not ready yet, will retry...');
          return false;
      }
      if (window.downloader._isIntercepted) {
          console.log('✅ Privacy Bridge already installed');
          return true;
      }
      
      console.log('🛡️ Installing Privacy Bridge Interceptor...');
      const originalProbe = window.downloader.probeFormats;
      
      window.downloader.probeFormats = async (url) => {
          console.log('[Bridge] Probing:', url);
          try {
              return await originalProbe(url);
          } catch (error) {
              console.error('[Bridge] Probe error details:', error);
              const errorMsg = (error.message || error.toString()).toLowerCase();
              
              // 🛡️ INTERCEPT AUTH ERRORS
              // Expanded keywords and logic
              if (errorMsg.includes('inappropriate') || 
                  errorMsg.includes('login') || 
                  errorMsg.includes('private') ||
                  errorMsg.includes('sign in') ||
                  errorMsg.includes('confirm your age') ||
                  errorMsg.includes('bot') ||
                  errorMsg.includes('checkpoint') ||
                  errorMsg.includes('401') || // Unauthorized
                  errorMsg.includes('403') || // Forbidden
                  errorMsg.includes('unavailable') || // Generic unavailable
                  (url.includes('instagram.com') && errorMsg.includes('metadata'))) { // Catch-all for IG metadata failures
                
                console.log('[Bridge] 🛡️ Triggering Privacy Bridge for:', url);
                
                return new Promise((resolve, reject) => {
                    if (window.privacyBridge) {
                        window.privacyBridge.show(url);
                        
                        const successHandler = (e) => {
                            cleanup();
                            resolve(e.detail);
                        };
                        
                        const cancelHandler = () => {
                            cleanup();
                            reject(new Error('User cancelled privacy verification'));
                        };
                        
                        const cleanup = () => {
                            window.removeEventListener('privacy-bridge-success', successHandler);
                            window.removeEventListener('privacy-bridge-cancel', cancelHandler);
                        };
                        
                        window.addEventListener('privacy-bridge-success', successHandler);
                        window.addEventListener('privacy-bridge-cancel', cancelHandler);
                    } else {
                        console.error('PrivacyBridge UI not found!');
                        reject(error);
                    }
                });
              }
              throw error;
          }
      };
      window.downloader._isIntercepted = true;
      console.log('🛡️ Privacy Bridge Interceptor Active');
      return true;
  };

  // Try immediately
  if (installInterceptor()) {
      console.log('✅ Interceptor installed on first try');
  }

  // Also watch for it appearing (if preload is slow)
  let attempts = 0;
  const checkInterval = setInterval(() => {
      if (window.downloader) {
          installInterceptor();
          clearInterval(checkInterval);
      }
      attempts++;
      if (attempts > 20) clearInterval(checkInterval); // Stop after 2s
  }, 100);
}

// Debug helper
window.debugBridge = () => {
    if (window.privacyBridge) {
        window.privacyBridge.show('https://instagram.com/debug-test');
    } else {
        console.error('PrivacyBridge not loaded');
    }
};

// Force check for downloader availability
if (!isTauri) {
    setTimeout(() => {
        if (!window.downloader) {
            console.error('CRITICAL: window.downloader is missing after 1s!');
        } else if (!window.downloader._isIntercepted) {
            console.warn('WARNING: Interceptor was not installed correctly. Retrying...');
            // Re-run the installation logic if needed (copy-paste logic or refactor)
            // For now, just log it.
        }
    }, 1000);
}
