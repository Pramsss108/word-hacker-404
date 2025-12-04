const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const os = require('os')
const dns = require('dns')
const fs = require('fs')
const osUtils = require('os-utils')
const ytdlp = require('yt-dlp-exec')
const sanitize = require('sanitize-filename')

const FORMAT_CACHE = new Map()

let mainWindow

// Fix paths for packed app (binaries are in app.asar.unpacked)
let ytdlpBinaryPath
let ffmpegPath
let ytdlpRunner = ytdlp

if (app.isPackaged) {
  // In production, binaries are unpacked to app.asar.unpacked
  const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
  ytdlpBinaryPath = path.join(unpackedPath, 'yt-dlp-exec', 'bin', 'yt-dlp.exe')
  ffmpegPath = path.join(unpackedPath, 'ffmpeg-static', 'ffmpeg.exe')
  ytdlpRunner = ytdlp.create(ytdlpBinaryPath)
} else {
  // In development, use normal paths
  ytdlpBinaryPath = require('yt-dlp-exec').path
  ffmpegPath = require('ffmpeg-static')
  ytdlpRunner = ytdlp
}

/**
 * Map UI format ids to yt-dlp format selectors.
 */
const FORMAT_MAP = {
  'mp4-1080': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
  'mp4-720': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best',
  mp3: 'bestaudio/best'
}

const OUTPUT_TEMPLATE = '%(title)s.%(ext)s'

const metrics = {
  speed: '0 MB/s',
  eta: '--:--',
  network: 'checking',
  cpu: 0,
  memory: 0
}

const summarizeFormat = (format = {}) => ({
  id: format.format_id,
  container: format.ext,
  note: format.format_note || '',
  width: format.width || null,
  height: format.height || null,
  fps: format.fps || null,
  vcodec: format.vcodec || null,
  acodec: format.acodec || null,
  abr: format.abr || null,
  tbr: format.tbr || null,
  filesize: format.filesize || format.filesize_approx || null
})

const probeFormats = async (url) => {
  if (!url) throw new Error('Missing URL to inspect.')
  if (FORMAT_CACHE.has(url)) {
    return FORMAT_CACHE.get(url)
  }

  const payload = await ytdlpRunner(url, {
    dumpSingleJson: true,
    skipDownload: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true
  })

  const summary = {
    title: payload.title,
    duration: payload.duration || 0,
    thumbnails: payload.thumbnails || [],
    formats: (payload.formats || []).map(summarizeFormat)
  }

  FORMAT_CACHE.set(url, summary)
  return summary
}

const sendToRenderer = (channel, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

const updateMetrics = (patch) => {
  Object.assign(metrics, patch)
  sendToRenderer('status:update', metrics)
}

const ensureDownloadsDir = () => {
  const downloadRoot = app.getPath('downloads')
  const targetDir = path.join(downloadRoot, 'WordHackerDownloads')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  return targetDir
}

const resolveOutputDir = (customPath) => {
  if (!customPath) return ensureDownloadsDir()
  try {
    fs.mkdirSync(customPath, { recursive: true })
    return customPath
  } catch (error) {
    console.warn('Unable to use custom destination, falling back to default.', error)
    return ensureDownloadsDir()
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#05070a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.removeMenu()
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const startTelemetryLoops = () => {
  const sampleUsage = () => {
    osUtils.cpuUsage((value) => {
      const cpu = Math.max(0, Math.min(100, Math.round(value * 100)))
      const total = os.totalmem()
      const used = total - os.freemem()
      const memory = Math.max(0, Math.min(100, Math.round((used / total) * 100)))
      updateMetrics({ cpu, memory })
    })
  }

  sampleUsage()
  setInterval(sampleUsage, 4000)

  const checkNetwork = () => {
    dns.lookup('google.com', (err) => {
      updateMetrics({ network: err ? 'offline' : 'online' })
    })
  }

  checkNetwork()
  setInterval(checkNetwork, 8000)
}

app.whenReady().then(() => {
  ipcMain.handle('downloader:start', async (_event, payload = {}) => {
    const { urls, format, destination } = payload
    const cleaned = (urls || [])
      .map((url) => typeof url === 'string' ? url.trim() : '')
      .filter((url) => url.length > 0)
    if (cleaned.length === 0) {
      throw new Error('Add at least one YouTube link.')
    }
    const formatSelector = FORMAT_MAP[format] || FORMAT_MAP['mp4-1080']
    const outputDir = resolveOutputDir(destination)

    const summary = []
    for (let index = 0; index < cleaned.length; index += 1) {
      const url = cleaned[index]
      sendToRenderer('download:job-start', { url, index, total: cleaned.length })
      const jobLabel = sanitize(url.replace(/https?:\/\//, '').slice(0, 40)) || 'job'
      summary.push(await runJob(url, jobLabel, formatSelector, outputDir, index, cleaned.length))
    }

    updateMetrics({ speed: '0 MB/s', eta: '--:--' })

    return {
      outputDir,
      jobs: summary
    }
  })

  ipcMain.handle('window:control', (_event, action) => {
    if (!mainWindow) return
    switch (action) {
      case 'minimize':
        mainWindow.minimize()
        break
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize()
        } else {
          mainWindow.maximize()
        }
        break
      case 'close':
        mainWindow.close()
        break
      default:
        break
    }
  })

  ipcMain.handle('window:toggle-pin', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(next)
    return next
  })

  ipcMain.handle('downloader:probe', async (_event, url) => {
    try {
      return await probeFormats(url)
    } catch (error) {
      throw new Error(error?.message || 'Unable to inspect stream formats.')
    }
  })

  ipcMain.handle('dialog:choose-folder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('file:reveal', (_event, targetPath) => {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath)
    }
  })

  ipcMain.handle('folder:open', (_event, folderPath) => {
    const target = folderPath && fs.existsSync(folderPath) ? folderPath : ensureDownloadsDir()
    shell.openPath(target)
  })

  ipcMain.handle('export:files', async (_event, payload = {}) => {
    const { files, destination, outputFormat, trim } = payload
    if (!files || !files.length) {
      throw new Error('No files to export.')
    }
    const outputDir = resolveOutputDir(destination)
    const exported = []
    
    for (const tempPath of files) {
      if (!fs.existsSync(tempPath)) continue
      
      const ext = path.extname(tempPath)
      const baseName = path.basename(tempPath, ext)
      const targetFormat = outputFormat || 'mp4'
      
      // Check if we need FFmpeg processing (trim or format conversion)
      const needsProcessing = (trim && trim.start !== undefined && trim.end !== undefined) || 
                             (targetFormat && targetFormat !== ext.slice(1))
      
      if (needsProcessing) {
        // Use FFmpeg to process the file
        const isAudioFile = ['.mp3', '.m4a', '.ogg', '.wav', '.aac'].includes(ext.toLowerCase())
        const outputFileName = `${baseName}.${targetFormat}`
        const destPath = path.join(outputDir, outputFileName)
        
        try {
          await new Promise((resolve, reject) => {
            const { spawn } = require('child_process')
            const args = ['-i', tempPath]
            
            // Add trim parameters if specified
            if (trim && trim.start !== undefined && trim.end !== undefined) {
              args.push('-ss', String(trim.start))
              args.push('-to', String(trim.end))
            }
            
            // Add output format parameters based on file type
            if (isAudioFile || ['mp3', 'm4a', 'ogg', 'wav'].includes(targetFormat)) {
              // Audio only
              args.push('-vn')  // No video
              if (targetFormat === 'mp3') {
                args.push('-c:a', 'libmp3lame')
                args.push('-b:a', '192k')
              } else if (targetFormat === 'm4a') {
                args.push('-c:a', 'aac')
                args.push('-b:a', '192k')
              } else if (targetFormat === 'ogg') {
                args.push('-c:a', 'libvorbis')
                args.push('-q:a', '5')
              } else {
                args.push('-c:a', 'copy')
              }
            } else {
              // Video with audio
              args.push('-c:v', 'libx264')
              args.push('-preset', 'medium')
              args.push('-crf', '23')
              args.push('-c:a', 'aac')
              args.push('-b:a', '192k')
            }
            
            args.push('-y')  // Overwrite output
            args.push(destPath)
            
            console.log('[FFmpeg] Command:', ffmpegPath, args.join(' '))
            
            const ffmpeg = spawn(ffmpegPath, args, { windowsHide: true })
            let stderr = ''
            
            ffmpeg.stderr.on('data', (data) => {
              stderr += data.toString()
            })
            
            ffmpeg.on('close', (code) => {
              if (code === 0) {
                console.log('[FFmpeg] Success:', destPath)
                resolve()
              } else {
                console.error('[FFmpeg] Error:', stderr)
                reject(new Error(`FFmpeg failed with code ${code}`))
              }
            })
            
            ffmpeg.on('error', (err) => {
              console.error('[FFmpeg] Spawn error:', err)
              reject(err)
            })
          })
          
          exported.push(destPath)
        } catch (error) {
          console.error('[Export] FFmpeg processing failed:', error)
          throw new Error(`Failed to process video: ${error.message}`)
        }
      } else {
        // Simple copy without processing
        const filename = path.basename(tempPath)
        const destPath = path.join(outputDir, filename)
        fs.copyFileSync(tempPath, destPath)
        exported.push(destPath)
      }
    }
    
    return { exported, outputDir }
  })

  startTelemetryLoops()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

async function runJob(url, label, formatSelector, outputDir, index, totalJobs) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-downloader-'))
  const args = {
    output: path.join(tmpDir, OUTPUT_TEMPLATE),
    format: formatSelector,
    ffmpegLocation: ffmpegPath,
    mergeOutputFormat: 'mp4',
    progress: true,
    noColor: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    retries: 2,
    addMetadata: true,
    embedThumbnail: true,
    restrictFilenames: false
  }

  if (formatSelector === FORMAT_MAP.mp3) {
    args.extractAudio = true
    args.audioFormat = 'mp3'
    args.audioQuality = '3'
  }

  const child = ytdlpRunner.exec(url, args, { windowsHide: true })

  let lastProgressTime = Date.now()
  let lastPercent = 0
  
  // Send initial progress to show download started
  sendToRenderer('download:progress', { url, label, percent: 0, speed: 'Starting...', eta: '--:--' })
  
  // Progress comes from BOTH stderr and stdout depending on yt-dlp version
  const handleProgressLine = (line) => {
    // Match various progress formats from yt-dlp
    const match = line.match(/\[download\]\s+([0-9.]+)%.*?at\s+([0-9.]+[^\s]+)\s+ETA\s+([0-9:\-]+)/i) ||
                  line.match(/\[download\]\s+([0-9.]+)%/i)
    
    if (match) {
      const percent = Number(match[1])
      const speed = match[2] || '-- MB/s'
      const eta = match[3] || '--:--'
      lastProgressTime = Date.now()
      lastPercent = percent
      
      // Send EVERY progress update immediately - no filtering, no throttling
      updateMetrics({ speed, eta })
      const payload = { url, label, percent, speed, eta }
      console.log('[MAIN→RENDERER] Sending progress:', JSON.stringify(payload))
      sendToRenderer('download:progress', payload)
      return true
    }
    return false
  }
  
  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/)
    lines.forEach((line) => {
      const isProgress = handleProgressLine(line)
      if (!isProgress && line.trim()) {
        console.log('[yt-dlp stderr]', line)
      }
    })
  })
  
  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/)
    lines.forEach((line) => {
      const isProgress = handleProgressLine(line)
      if (!isProgress && line.trim() && !line.includes('[download]')) {
        console.log('[yt-dlp stdout]', line)
      }
    })
  })

  try {
    // Add timeout detection
    const progressTimeout = setInterval(() => {
      const timeSinceProgress = Date.now() - lastProgressTime
      if (timeSinceProgress > 60000) { // 60 seconds no progress
        console.warn(`[Timeout warning] No progress for ${timeSinceProgress}ms`)
        sendToRenderer('download:progress', { 
          url, 
          label, 
          percent: 0, 
          speed: 'Stalled', 
          eta: 'Checking...' 
        })
      }
    }, 10000)

    await child
    clearInterval(progressTimeout)

    const producedFiles = fs.readdirSync(tmpDir)
    
    if (producedFiles.length === 0) {
      throw new Error('No files were downloaded. The video might be unavailable or restricted.')
    }
    
    const tempFiles = []
    for (const file of producedFiles) {
      const tempPath = path.join(tmpDir, file)
      console.log('[Downloaded file]', tempPath)
      tempFiles.push(tempPath)
    }

    if (index === totalJobs - 1) {
      updateMetrics({ speed: '0 MB/s', eta: '--:--' })
    }

    sendToRenderer('download:job-complete', { url, label, files: tempFiles, tempDir: tmpDir })

    return {
      label,
      url,
      files: tempFiles,
      tempDir: tmpDir
    }
  } catch (error) {
    console.error('[Download error]', error)
    sendToRenderer('download:job-error', { url, label, message: error.message })
    fs.rmSync(tmpDir, { recursive: true, force: true })
    throw error
  }
  // Note: temp directory is NOT deleted here - will be cleaned up on export or app exit
}
