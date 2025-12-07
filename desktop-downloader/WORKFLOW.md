# 🔧 WH404 Downloader - Complete Technical Workflow

**Last Updated**: December 7, 2025  
**Purpose**: Comprehensive guide for developers continuing this project

---

## 📐 Architecture Overview

### Tech Stack
```
┌─────────────────────────────────────────┐
│         Electron Desktop App            │
├─────────────────────────────────────────┤
│  Main Process (Node.js)                 │
│  - Download orchestration               │
│  - FFmpeg video processing              │
│  - File system operations               │
│  - IPC handlers                         │
├─────────────────────────────────────────┤
│  Renderer Process (Browser)             │
│  - UI rendering & interactions          │
│  - Video preview & playback             │
│  - Queue management                     │
│  - State management                     │
├─────────────────────────────────────────┤
│  External Dependencies                  │
│  - yt-dlp (video extraction)            │
│  - FFmpeg (video processing)            │
│  - Chrome cookies (auth)                │
└─────────────────────────────────────────┘
```

### File Structure
```
desktop-downloader/
├── src/
│   ├── main.js              # Main process (download engine)
│   ├── preload.js           # IPC bridge (security boundary)
│   └── renderer/
│       ├── renderer.js      # UI logic & state management
│       ├── style.css        # Complete styling
│       └── index.html       # UI structure
├── package.json             # Dependencies & build config
├── build-desktop.ps1        # Windows build script
└── LAUNCH.bat              # Quick dev launcher
```

---

## 🎯 Core Workflows

### 1️⃣ **Download Flow** (Start to Finish)

#### Phase 1: User Initiates Download
```javascript
// User action: Paste URL + Click Download
1. User enters URL in #urlInput
2. Clicks #addButton
3. Triggers: addUrl() in renderer.js

// Validation & queue addition
addUrl() {
  - Validates URL format
  - Detects platform (YouTube, Instagram, Facebook, etc.)
  - Generates unique ID (timestamp + random)
  - Creates queue item object:
    {
      id: '1733602801234-abc',
      url: 'https://youtube.com/watch?v=...',
      label: 'YouTube Video',
      platform: 'youtube',
      status: 'pending',
      progress: 0,
      downloadPath: null,
      formatSelector: '1080p' // From quality preset
    }
  - Adds to state.queue array
  - Calls renderQueue()
  - Sends to main: window.downloader.download(...)
}
```

#### Phase 2: Main Process Download Orchestration
```javascript
// main.js: IPC handler receives request
ipcMain.handle('downloader:download', async (event, url, formatSelector) => {
  // 1. Create download job
  const job = {
    url,
    formatSelector,
    outputDir: app.getPath('temp') + '/wh-downloader-' + Date.now(),
    status: 'starting'
  }
  
  // 2. Ensure output directory exists
  await fs.mkdir(job.outputDir, { recursive: true })
  
  // 3. Run yt-dlp subprocess
  return runJob(url, label, formatSelector, job.outputDir, index, totalJobs, false)
})

// runJob() - Core download logic
async function runJob(url, label, formatSelector, outputDir, index, totalJobs, isRetry) {
  // Step 1: Build yt-dlp command
  const args = [
    '--no-warnings',
    '--progress',
    '--newline',
    '-f', formatSelector,  // e.g., 'bestvideo[height<=1080]+bestaudio/best'
    '-o', path.join(outputDir, '%(title)s.%(ext)s'),
    '--ffmpeg-location', ffmpegPath,
    '--merge-output-format', 'mp4'
  ]
  
  // Step 2: Add cookies for private content (if retry)
  if (isRetry) {
    const cookiesPath = await getChromeProfilePath()
    args.push('--cookies-from-browser', 'chrome')
  }
  
  // Step 3: Spawn yt-dlp subprocess
  const child = spawn(ytDlpPath, [...args, url], {
    cwd: outputDir,
    env: process.env
  })
  
  // Step 4: Track for cancellation
  activeDownloads.set(url, { process: child, cancelled: false })
  
  // Step 5: Listen to stdout for progress
  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n')
    lines.forEach(line => {
      // Parse: [download]  15.2% of 45.67MiB at 2.34MiB/s ETA 00:12
      if (line.includes('[download]')) {
        const match = line.match(/(\d+\.\d+)%/)
        if (match) {
          const percent = parseFloat(match[1])
          sendToRenderer('download:progress', {
            url,
            progress: percent,
            status: 'downloading',
            speed: extractSpeed(line),
            eta: extractETA(line)
          })
        }
      }
    })
  })
  
  // Step 6: Handle completion/errors
  child.on('close', (code) => {
    activeDownloads.delete(url)
    
    if (code === 0) {
      // Success: Find downloaded file
      const files = fs.readdirSync(outputDir)
      const videoFile = files.find(f => /\.(mp4|mkv|webm)$/.test(f))
      
      sendToRenderer('download:complete', {
        url,
        downloadPath: path.join(outputDir, videoFile),
        status: 'completed'
      })
    } else {
      // Error: Check if should retry with cookies
      const shouldRetry = !isRetry && ['facebook', 'instagram'].includes(platform)
      
      if (shouldRetry) {
        console.log('[RETRY] Attempting with cookies...')
        return runJob(url, label, formatSelector, outputDir, index, totalJobs, true)
      }
      
      sendToRenderer('download:error', {
        url,
        error: translateError(stderr),
        status: 'failed'
      })
    }
  })
}
```

#### Phase 3: Renderer Updates UI
```javascript
// renderer.js: Listen to download events
window.downloader.onProgress((data) => {
  const item = state.queue.find(q => q.url === data.url)
  if (item) {
    item.progress = data.progress
    item.status = data.status
    item.speed = data.speed
    item.eta = data.eta
    renderQueue()  // Re-render updated queue
  }
})

window.downloader.onComplete((data) => {
  const item = state.queue.find(q => q.url === data.url)
  if (item) {
    item.status = 'completed'
    item.progress = 100
    item.downloadPath = data.downloadPath
    renderQueue()
    
    // Auto-load first completed video if none playing
    if (!state.preview.url) {
      loadPreview(item)
    }
  }
})
```

---

### 2️⃣ **Preview & Trim Workflow**

#### Phase 1: Load Video Preview
```javascript
// User clicks queue item or auto-loads first completed
function loadPreview(item) {
  // 1. Validate file exists
  if (!item.downloadPath || !fs.existsSync(item.downloadPath)) {
    showStatus('File not found', 'error')
    return
  }
  
  // 2. Update preview state
  state.preview = {
    url: item.url,
    path: item.downloadPath,
    ready: false,
    trimStart: 0,
    trimEnd: null,  // Will be set when metadata loads
    trimmedFile: null,  // Pre-processed trim cache
    trimProcessing: false
  }
  
  // 3. Load video element
  const video = document.getElementById('previewVideo')
  video.src = 'file://' + item.downloadPath
  
  // 4. Wait for metadata
  video.addEventListener('loadedmetadata', () => {
    state.preview.ready = true
    state.preview.trimEnd = video.duration
    
    // Initialize trim UI
    initializeTrimControls()
    updateTimelineDisplay()
  })
  
  // 5. Show preview section
  setPreviewMode('video')  // Shows video player + timeline
}
```

#### Phase 2: Trim Interaction
```javascript
// User drags trim handles on timeline
function onTrimHandleDrag(handle, newPosition) {
  // 1. Calculate new timestamp from pixel position
  const video = document.getElementById('previewVideo')
  const timeline = document.getElementById('timeline')
  const percent = newPosition / timeline.offsetWidth
  const newTime = percent * video.duration
  
  // 2. Update state
  if (handle === 'start') {
    state.preview.trimStart = Math.max(0, newTime)
  } else {
    state.preview.trimEnd = Math.min(video.duration, newTime)
  }
  
  // 3. Clamp ranges (ensure start < end)
  clampPreviewRanges()
  
  // 4. Update UI
  updateTrimHandlePositions()
  updateTimeDisplay()
  
  // 5. Seek video to trim start
  video.currentTime = state.preview.trimStart
  
  // 6. Trigger background processing (debounced 2s)
  debouncedBackgroundTrim()
}

// Background trim processing
let trimDebounceTimer = null
function debouncedBackgroundTrim() {
  clearTimeout(trimDebounceTimer)
  trimDebounceTimer = setTimeout(() => {
    processBackgroundTrim()
  }, 2000)  // Wait 2s after user stops adjusting
}

async function processBackgroundTrim() {
  // 1. Show processing indicator
  state.preview.trimProcessing = true
  showStatus('Processing trim...', 'info')
  
  // 2. Call main process to trim
  const result = await window.downloader.backgroundTrim({
    sourcePath: state.preview.path,
    start: state.preview.trimStart,
    end: state.preview.trimEnd,
    outputPath: getTempPath('trimmed-' + Date.now() + '.mp4')
  })
  
  // 3. Cache trimmed file
  if (result.success) {
    state.preview.trimmedFile = result.outputPath
    state.preview.trimProcessing = false
    showStatus('✓ Trim ready - export will be instant!', 'success')
  } else {
    state.preview.trimProcessing = false
    showStatus('Trim processing failed, will process during export', 'warning')
  }
}
```

#### Phase 3: Background Trim Processing (Main Process)
```javascript
// main.js: IPC handler for background trim
ipcMain.handle('export:background-trim', async (event, options) => {
  const { sourcePath, start, end, outputPath } = options
  
  // FFmpeg command: stream copy (no re-encoding, instant)
  const args = [
    '-ss', start.toFixed(3),      // Seek to start
    '-i', sourcePath,              // Input file
    '-to', (end - start).toFixed(3),  // Duration
    '-c', 'copy',                  // Copy streams (no re-encode)
    '-avoid_negative_ts', 'make_zero',  // Fix timestamp issues
    '-y',                          // Overwrite
    outputPath
  ]
  
  return new Promise((resolve) => {
    const ffmpeg = spawn(ffmpegPath, args)
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve({ success: true, outputPath })
      } else {
        resolve({ success: false, error: 'FFmpeg failed' })
      }
    })
  })
})
```

---

### 3️⃣ **Export Workflow**

#### Phase 1: User Initiates Export
```javascript
// User clicks export button
async function startExport() {
  // 1. Get export settings from UI
  const settings = {
    resolution: document.getElementById('resolutionSelect').value,  // '1080p'
    format: document.getElementById('formatSelect').value,          // 'mp4'
    audioOnly: document.getElementById('audioOnlyCheckbox').checked,
    quality: document.getElementById('qualitySlider').value         // 0-100
  }
  
  // 2. Determine source file
  let sourcePath = state.preview.path
  let needsTrim = false
  
  // If trimmed and background processing complete, use cached trim
  if (state.preview.trimmedFile && fs.existsSync(state.preview.trimmedFile)) {
    sourcePath = state.preview.trimmedFile
    console.log('[Export] Using pre-trimmed file (instant export)')
  } 
  // Otherwise, need to trim during export
  else if (hasTrimChanges()) {
    needsTrim = true
    console.log('[Export] Will trim during export')
  }
  
  // 3. Ask user where to save
  const savePath = await window.downloader.showSaveDialog({
    defaultPath: generateFileName(),
    filters: [{ name: 'Video', extensions: [settings.format] }]
  })
  
  if (!savePath) return  // User cancelled
  
  // 4. Show export modal
  showExportModal()
  
  // 5. Call main process to export
  const result = await window.downloader.exportVideo({
    sourcePath,
    outputPath: savePath,
    settings,
    trim: needsTrim ? {
      start: state.preview.trimStart,
      end: state.preview.trimEnd
    } : null
  })
  
  // 6. Handle result
  if (result.success) {
    showStatus('Exported successfully!', 'success')
    hideExportModal()
  } else {
    showStatus('Export failed: ' + result.error, 'error')
  }
}
```

#### Phase 2: Main Process Export
```javascript
// main.js: Export handler
ipcMain.handle('export:video', async (event, options) => {
  const { sourcePath, outputPath, settings, trim } = options
  
  // Build FFmpeg command based on settings
  const args = []
  
  // Input with optional trim
  if (trim) {
    args.push('-ss', trim.start.toFixed(3))
  }
  args.push('-i', sourcePath)
  if (trim) {
    args.push('-to', (trim.end - trim.start).toFixed(3))
  }
  
  // Video encoding settings
  if (settings.audioOnly) {
    // Audio only export
    args.push(
      '-vn',  // No video
      '-acodec', getAudioCodec(settings.format),
      '-ab', '320k'
    )
  } else {
    // Video + audio export
    const resolution = parseResolution(settings.resolution)  // '1920x1080'
    
    args.push(
      '-vf', `scale=${resolution}`,  // Resize
      '-c:v', 'libx264',             // Video codec
      '-preset', 'fast',             // Encoding speed
      '-crf', getCRF(settings.quality),  // Quality (0-51, lower = better)
      '-c:a', 'aac',                 // Audio codec
      '-b:a', '192k'                 // Audio bitrate
    )
  }
  
  args.push('-y', outputPath)  // Overwrite output
  
  // Spawn FFmpeg with progress tracking
  return new Promise((resolve) => {
    const ffmpeg = spawn(ffmpegPath, args)
    
    // Parse progress from stderr
    ffmpeg.stderr.on('data', (chunk) => {
      const line = chunk.toString()
      
      // Parse: frame= 1234 fps=45 time=00:00:30.00 ...
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
      if (timeMatch && trim) {
        const currentSeconds = parseInt(timeMatch[1]) * 3600 + 
                              parseInt(timeMatch[2]) * 60 + 
                              parseFloat(timeMatch[3])
        const totalSeconds = trim.end - trim.start
        const percent = (currentSeconds / totalSeconds) * 100
        
        sendToRenderer('export:progress', {
          progress: Math.min(99, percent),
          status: 'encoding'
        })
      }
    })
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        sendToRenderer('export:progress', { progress: 100, status: 'complete' })
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'FFmpeg encoding failed' })
      }
    })
  })
})
```

---

### 4️⃣ **Metadata & Premium Intelligence**

#### Phase 1: Fetch Metadata
```javascript
// Triggered when video completes download
async function fetchPremiumMetadata(item) {
  // 1. Show loading state
  setPremiumStatus('Analyzing...', 'loading')
  
  // 2. Extract metadata from yt-dlp
  const metadata = await window.downloader.getVideoMetadata(item.url)
  
  // 3. Store in state
  state.preview.premium = {
    thumbnail: metadata.thumbnail,
    title: metadata.title,
    description: metadata.description,
    keywords: extractKeywords(metadata),
    platform: item.platform,
    views: metadata.view_count,
    duration: metadata.duration,
    uploader: metadata.uploader
  }
  
  // 4. Update UI chips to "ready" state
  updateSummaryChips()
  setPremiumStatus('Ready', 'success')
}

// Extract SEO keywords
function extractKeywords(metadata) {
  const text = (metadata.title + ' ' + metadata.description).toLowerCase()
  const words = text.split(/\s+/)
  
  // Filter common words, count frequency
  const wordCounts = {}
  words.forEach(word => {
    if (word.length > 3 && !STOPWORDS.includes(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  })
  
  // Return top 10 keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
```

#### Phase 2: Display Metadata in Popover
```javascript
// User clicks metadata chip (thumbnail, keywords, title, description)
function openMetadataPanel(panelName) {
  // 1. Set active panel
  state.preview.activePanel = panelName
  
  // 2. Update chip states (green active highlight)
  updateSummaryChips()
  
  // 3. Show corresponding card in popover
  document.querySelectorAll('.metadata-card').forEach(card => {
    card.classList.toggle('active', card.dataset.popoverPanel === panelName)
  })
  
  // 4. Position popover near clicked chip
  updatePopoverAnchor(chipElement)
  
  // 5. Switch to insights mode
  setPreviewMode('insights')
}

// Dynamic popover positioning
function updatePopoverAnchor(chipElement) {
  const popover = document.getElementById('metadataPopover')
  const chipRect = chipElement.getBoundingClientRect()
  const paneRect = document.getElementById('previewPane').getBoundingClientRect()
  
  // Calculate position
  let x = chipRect.left - paneRect.left + (chipRect.width / 2)
  
  // Prevent edge cutoff
  const popoverWidth = 420
  const halfPopover = popoverWidth / 2
  const minX = halfPopover + 20
  const maxX = paneRect.width - halfPopover - 20
  
  x = Math.max(minX, Math.min(maxX, x))
  
  // Apply via CSS custom properties
  popover.style.setProperty('--popover-x', x + 'px')
  popover.style.setProperty('--popover-y', (chipRect.bottom - paneRect.top + 12) + 'px')
}
```

#### Phase 3: Copy Metadata Actions
```javascript
// User clicks copy button in metadata card
function handleExportCopy(fieldName) {
  const metadata = state.preview.premium
  let textToCopy = ''
  
  switch (fieldName) {
    case 'thumbnail':
      textToCopy = metadata.thumbnail
      break
    case 'title':
      textToCopy = metadata.title
      break
    case 'description':
      textToCopy = metadata.description
      break
    case 'keywords':
      textToCopy = metadata.keywords.join(', ')
      break
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(textToCopy)
  showStatus(`Copied ${fieldName}!`, 'success')
}
```

---

### 5️⃣ **Queue Management**

#### Batch Selection
```javascript
// Multi-select queue items
function toggleQueueSelection(itemId, shiftKey) {
  if (shiftKey && state.selection.size > 0) {
    // Shift+click: select range
    const lastSelected = Array.from(state.selection).pop()
    const startIdx = state.queue.findIndex(q => q.id === lastSelected)
    const endIdx = state.queue.findIndex(q => q.id === itemId)
    
    const range = state.queue.slice(
      Math.min(startIdx, endIdx),
      Math.max(startIdx, endIdx) + 1
    )
    
    range.forEach(item => state.selection.add(item.id))
  } else {
    // Regular click: toggle
    if (state.selection.has(itemId)) {
      state.selection.delete(itemId)
    } else {
      state.selection.add(itemId)
    }
  }
  
  renderQueue()
  updateSelectionCounter()
}

// Batch export selected items
async function exportSelected() {
  const selectedItems = state.queue.filter(q => state.selection.has(q.id))
  
  // Ask for output directory
  const dirPath = await window.downloader.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!dirPath) return
  
  // Export each selected item
  for (const item of selectedItems) {
    const outputPath = path.join(dirPath, sanitizeFilename(item.label) + '.mp4')
    await window.downloader.exportVideo({
      sourcePath: item.downloadPath,
      outputPath,
      settings: getDefaultExportSettings()
    })
  }
  
  showStatus(`Exported ${selectedItems.length} files`, 'success')
}
```

#### Cancel Downloads
```javascript
// User clicks cancel button during download
async function cancelDownload(url) {
  // 1. Send cancel request to main
  await window.downloader.cancelDownload(url)
  
  // 2. Update UI immediately (optimistic)
  const item = state.queue.find(q => q.url === url)
  if (item) {
    item.status = 'cancelled'
    item.progress = 0
    renderQueue()
  }
}

// main.js: Cancel handler
ipcMain.handle('downloader:cancel', async (event, url) => {
  const download = activeDownloads.get(url)
  
  if (download && !download.cancelled) {
    download.cancelled = true
    download.process.kill('SIGTERM')  // Terminate subprocess
    
    // Clean up temp files
    const outputDir = getTempDirForUrl(url)
    await fs.rm(outputDir, { recursive: true, force: true })
    
    sendToRenderer('download:job-cancelled', { url })
    return { success: true }
  }
  
  return { success: false, error: 'Download not found' }
})
```

---

## 🔐 Security & State Management

### IPC Security Boundary
```javascript
// preload.js: Exposes safe API to renderer
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('downloader', {
  // Downloads
  download: (url, formatSelector) => 
    ipcRenderer.invoke('downloader:download', url, formatSelector),
  
  cancelDownload: (url) => 
    ipcRenderer.invoke('downloader:cancel', url),
  
  // Events (one-way: main → renderer)
  onProgress: (callback) => 
    ipcRenderer.on('download:progress', (_, data) => callback(data)),
  
  onComplete: (callback) => 
    ipcRenderer.on('download:complete', (_, data) => callback(data)),
  
  // File system (restricted to safe operations)
  showSaveDialog: (options) => 
    ipcRenderer.invoke('dialog:save', options),
  
  // No direct file system access from renderer!
  // All file operations go through main process
})
```

### State Management Pattern
```javascript
// renderer.js: Centralized state object
const state = {
  queue: [],              // Download queue items
  selection: new Set(),   // Selected item IDs
  engineBusy: false,      // Download engine status
  
  preview: {
    url: null,            // Currently previewed video URL
    path: null,           // File path
    ready: false,         // Video loaded and ready
    trimStart: 0,         // Trim start time (seconds)
    trimEnd: null,        // Trim end time (seconds)
    trimmedFile: null,    // Pre-processed trim cache path
    trimProcessing: false,// Background trim in progress
    activePanel: null,    // Open metadata panel ('thumbnail', 'title', etc.)
    
    premium: {
      thumbnail: null,
      title: null,
      description: null,
      keywords: [],
      // ... other metadata
    }
  },
  
  previewMode: 'video',   // 'video' | 'insights'
  settings: {
    resolution: '1080p',
    format: 'mp4',
    audioOnly: false,
    quality: 85
  }
}

// UI updates triggered by state changes
function setState(updates) {
  Object.assign(state, updates)
  render()  // Re-render affected UI
}
```

---

## 🛠️ Development Commands

### Quick Start
```powershell
cd "d:\A scret project\Word hacker 404\desktop-downloader"
npm install
npm start
```

### Build for Production
```powershell
# Windows executable
.\build-desktop.ps1

# Output: release/WH404-Downloader-Setup.exe
```

### Debug Mode
```javascript
// main.js: Enable DevTools
const win = new BrowserWindow({
  webPreferences: {
    devTools: true  // Set to false in production
  }
})

// Renderer: Check console for logs
console.log('[Debug] Download started:', url)
```

---

## 🐛 Common Issues & Solutions

### Issue: "FFmpeg not found"
**Solution**: Ensure FFmpeg is bundled in `resources/bin/ffmpeg.exe`

### Issue: Downloads stuck at 0%
**Check**: Network connection, yt-dlp updates, platform changes

### Issue: Chrome cookie errors
**Solution**: User must close Chrome before retry with cookies

### Issue: Export fails silently
**Check**: FFmpeg stderr logs, disk space, file permissions

---

## 📚 Key Concepts for New Developers

1. **Electron Process Separation**: Main (Node.js backend) vs Renderer (browser frontend)
2. **IPC Communication**: Secure message passing via preload bridge
3. **Subprocess Management**: yt-dlp and FFmpeg run as child processes
4. **Progress Parsing**: Extract progress from subprocess stdout/stderr
5. **State-driven UI**: All UI reflects centralized state object
6. **Debounced Processing**: Background trim waits 2s after user stops adjusting
7. **Optimistic UI**: Update UI immediately, confirm with backend
8. **Stream Copy vs Re-encode**: `-c copy` is instant, re-encoding is slow

---

## 🎓 Learning Path for Contributors

1. **Week 1**: Understand Electron architecture (main, renderer, preload)
2. **Week 2**: Study yt-dlp CLI and progress output format
3. **Week 3**: Learn FFmpeg basics (trimming, encoding, formats)
4. **Week 4**: Master IPC patterns and state management
5. **Week 5**: Implement a new feature following workflow patterns

---

**Next Steps**: See `MONETIZATION_ROADMAP.md` for premium features and security strategies.
