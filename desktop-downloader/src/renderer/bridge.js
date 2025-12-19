/**
 * WH404 Unified Bridge (Tauri Edition)
 * Routes calls to Tauri (Rust) backend.
 */

console.log('[Bridge] Initializing in TAURI mode');

let jobStartCallback = null;

const bridge = {
  platform: 'tauri',

  // Stub for onJobCancelled
  onJobCancelled: (callback) => {
    console.log('[Bridge] onJobCancelled registered (stub)');
  },

  onExportProgress: (callback) => {
    console.log('[Bridge] onExportProgress registered (stub)');
  },

  // --- Core Actions ---

  checkFileExists: async (filePath) => {
    console.log(`[Bridge] Checking existence of: ${filePath}`);
    try {
      const { exists } = window.__TAURI__.fs;
      const fileExists = await exists(filePath);
      console.log(`[Bridge] File exists check: ${filePath} = ${fileExists}`);
      return fileExists;
    } catch (e) {
      console.error('[Bridge] checkFileExists failed:', e);
      return false;
    }
  },

  readDir: async (dirPath) => {
    try {
      const { readDir } = window.__TAURI__.fs;
      const entries = await readDir(dirPath);
      console.log(`[Bridge] Found ${entries.length} files in ${dirPath}`);
      return entries.map(e => e.name);
    } catch (e) {
      console.error('[Bridge] readDir failed:', e);
      return [];
    }
  },

  readVideoFile: async (filePath) => {
    try {
      const { readBinaryFile } = window.__TAURI__.fs;
      console.log('[Bridge] Reading video file into memory:', filePath);
      const data = await readBinaryFile(filePath);
      
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
  },

  convertPath: (filePath) => {
    try {
      const normalized = filePath.replace(/\\/g, '/');
      const { convertFileSrc } = window.__TAURI__.tauri;
      const url = convertFileSrc(normalized);
      console.log('[Bridge] Converted to asset URL:', url);
      return url;
    } catch (e) {
      console.error('[Bridge] convertPath failed:', e);
      return null;
    }
  },

  downloadThumbnail: async (thumbnailUrl, defaultFilename = 'thumbnail.jpg') => {
    try {
      const { save } = window.__TAURI__.dialog;
      const { writeBinaryFile } = window.__TAURI__.fs;
      
      console.log('[Bridge] Starting thumbnail download:', thumbnailUrl);
      
      const savePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp']
        }]
      });
      
      if (!savePath) {
        console.log('[Bridge] Download cancelled by user');
        return { success: false, cancelled: true };
      }
      
      console.log('[Bridge] Downloading to:', savePath);
      
      const response = await fetch(thumbnailUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      
      await writeBinaryFile(savePath, new Uint8Array(buffer));
      
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
  },

  saveFile: async (path, data) => {
    try {
      const { writeBinaryFile } = window.__TAURI__.fs;
      const binaryData = data instanceof Uint8Array ? data : new Uint8Array(data);
      await writeBinaryFile(path, binaryData);
      console.log('[Bridge] File saved:', path);
      return true;
    } catch (e) {
      console.error('[Bridge] saveFile failed:', e);
      throw e;
    }
  },

  openFolderLocation: async (filePath) => {
    try {
      console.log('[Bridge] Opening location:', filePath);
      
      try {
        const { invoke } = window.__TAURI__.tauri;
        await invoke('open_folder', { path: filePath });
        console.log('[Bridge] ✅ Folder opened successfully via Rust');
        return { success: true };
      } catch (rustError) {
        console.error('[Bridge] Rust open_folder failed:', rustError);
        
        try {
          const directory = filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
          const { shell } = window.__TAURI__;
          await shell.open(directory);
          return { success: true };
        } catch (shellError) {
          console.error('[Bridge] Fallback shell.open failed:', shellError);
          return { success: false, error: rustError || shellError };
        }
      }
    } catch (e) {
      console.error('[Bridge] openFolderLocation failed:', e);
      return { success: false, error: e.message };
    }
  },

  startDownload: async ({ urls, format, destination }) => {
    const { invoke } = window.__TAURI__.tauri;
    console.log('[Bridge] Starting batch download:', urls.length);
    
    if (jobStartCallback) {
        urls.forEach(url => jobStartCallback({ url }));
    }
    
    const promises = urls.map(url => 
      invoke('download_video', { url, format })
        .then(res => console.log('[Bridge] Started:', url))
        .catch(err => console.error('[Bridge] Failed to start:', url, err))
    );
    
    return { success: true, count: urls.length, message: 'Batch started' };
  },

  download: async (url, format) => {
    const { invoke } = window.__TAURI__.tauri;
    return invoke('download_video', { url, format });
  },

  cancelDownload: async (url) => {
    console.warn('[Bridge] Cancel not implemented in Tauri yet');
    return { success: false };
  },

  // --- Events ---

  onJobStart: (callback) => {
    jobStartCallback = callback;
  },

  onStatus: (callback) => {
    callback({ network: 'online' });
  },

  onProgress: (callback) => {
    const { listen } = window.__TAURI__.event;
    listen('download_progress', (event) => {
      const { url, progress, status } = event.payload;
      callback({
          url,
          percent: progress,
          status,
          speed: 'Processing...',
          eta: '...'
      });
    });
  },

  onJobComplete: (callback) => {
    const { listen } = window.__TAURI__.event;
    listen('download_complete', (event) => {
      const { url, filename } = event.payload;
      
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
  },

  onJobError: (callback) => {
    const { listen } = window.__TAURI__.event;
    listen('download_error', (event) => {
      callback({ 
        url: event.payload.url, 
        message: event.payload.status 
      });
    });
  },

  // --- File System / Dialogs ---

  showSaveDialog: async (options) => {
    const { save } = window.__TAURI__.dialog;
    return save({
      defaultPath: options.defaultPath,
      filters: options.filters
    });
  },

  // --- Metadata ---
  
  probeFormats: async (url) => {
    const { invoke } = window.__TAURI__.tauri;
    try {
      const meta = await invoke('get_video_metadata', { url });
      return meta;
    } catch (e) {
      console.error('[Bridge] Tauri metadata fetch failed:', e);
      const errorMsg = (e.message || e.toString()).toLowerCase();
      
      if (errorMsg.includes('inappropriate') || 
          errorMsg.includes('private') ||
          errorMsg.includes('sign in') ||
          errorMsg.includes('confirm your age') ||
          errorMsg.includes('unavailable')) {
          throw new Error('⚠️ This is a PRIVATE video. Only PUBLIC videos can be downloaded. Please use a public link.');
      }
      throw e;
    }
  },

  getVideoMetadata: async (url) => {
    const { invoke } = window.__TAURI__.tauri;
    try {
        const meta = await invoke('get_video_metadata', { url });
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
  },

  fetchMetadata: async (url) => {
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
  }
};

// Expose as window.downloader
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
    try {
      // Check current state (not directly available, so we toggle based on a local var or just set it)
      // Since we don't track state here, let's assume the UI tracks it.
      // But wait, the UI asks for the new state.
      // Let's use a simple toggle logic if possible, or just return true/false.
      // Tauri doesn't easily give "isAlwaysOnTop" sync.
      // We'll assume the UI passes the DESIRED state? No, the UI calls togglePin().
      
      // Let's try to get the current state from the UI class if possible, or just toggle blindly.
      // Better: Let's just toggle it.
      // Actually, let's just set it to true if the button doesn't have 'active' class?
      // The UI code: const pinned = await window.windowControls?.togglePin()
      // if (typeof pinned === 'boolean') { pinBtn.classList.toggle('active', pinned) }
      
      // We'll use a static variable to track state since we can't easily query it sync
      this._pinned = !this._pinned;
      await appWindow.setAlwaysOnTop(this._pinned);
      return this._pinned;
    } catch (e) {
      console.error('Pin failed:', e);
      return false;
    }
  }
};
window.windowControls._pinned = false;

console.log('🚀 WH404 Bridge: Tauri Mode Activated');

// System Dialogs & File Operations
window.systemDialogs = {
  saveFile: async (options) => {
    const { save } = window.__TAURI__.dialog;
    return save({
      defaultPath: options.defaultPath,
      filters: options.filters
    });
  },
  openFolder: async (path) => {
    if (!path) return;
    const { invoke } = window.__TAURI__.tauri;
    try {
      await invoke('open_folder', { path });
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  },
  chooseFolder: async () => {
    const { open } = window.__TAURI__.dialog;
    return open({ directory: true, multiple: false });
  },
  revealFile: async (path) => {
    console.log('Reveal file:', path);
  },
  youtubeOAuthLogin: async () => {
    const { invoke } = window.__TAURI__.tauri;
    try {
      return await invoke('youtube_oauth_login');
    } catch (err) {
      console.error('[Bridge] YouTube OAuth failed:', err);
      return { success: false, message: err.toString() };
    }
  },
  exportFiles: async (payload) => {
    const { invoke } = window.__TAURI__.tauri;
    console.log('[Bridge] Exporting payload:', JSON.stringify(payload, null, 2));
    
    if (payload.files && payload.files.length > 0) {
      for (const f of payload.files) {
         const exists = await bridge.checkFileExists(f);
         console.log(`[Bridge] Pre-flight check for ${f}: ${exists}`);
      }
    }

    try {
      const result = await invoke('export_files', { payload });
      console.log('[Bridge] Export success:', result);
      return result;
    } catch (error) {
      console.error('[Bridge] Export failed:', error);
      throw new Error(`Export failed: ${error}`);
    }
  },
  backgroundTrim: async (trimData) => {
    return { trimmedFile: trimData.sourceFile };
  }
};
