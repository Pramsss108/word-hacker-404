const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const os = require('os')
const dns = require('dns')
const fs = require('fs')
const osUtils = require('os-utils')
const ytdlp = require('yt-dlp-exec')
const sanitize = require('sanitize-filename')

const FORMAT_CACHE = new Map()
const METADATA_CACHE_TTL = 1000 * 60 * 10 // 10 minutes
const METADATA_CACHE = new Map()

// 🛡️ ELITE BYPASS STRATEGIES (Pro Developer Engine)
const RETRY_STRATEGIES = [
  { name: 'Standard', args: {} },
  { name: 'Chrome Auth', args: { cookiesFromBrowser: 'chrome' } },
  { name: 'Edge Auth', args: { cookiesFromBrowser: 'edge' } },
  { name: 'Firefox Auth', args: { cookiesFromBrowser: 'firefox' } },
  { name: 'Mobile Mode', args: { cookiesFromBrowser: 'chrome', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' } },
  { name: 'In-App Session', args: { cookies: path.join(app.getPath('userData'), 'instagram-cookies.txt') } }
]

// Platform detection and configuration
// ⚠️ ONLY INCLUDES PLATFORMS THAT WORK WITHOUT COOKIES
const SUPPORTED_PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    patterns: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
    extraArgs: [],
    requiresCookies: false
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    patterns: ['tiktok.com'],
    extraArgs: [],
    requiresCookies: false
  },
  twitter: {
    name: 'Twitter/X',
    icon: '🐦',
    patterns: ['twitter.com', 'x.com', 't.co'],
    extraArgs: [],
    requiresCookies: false
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    patterns: ['reddit.com', 'redd.it', 'v.redd.it'],
    extraArgs: [],
    requiresCookies: false
  },
  vimeo: {
    name: 'Vimeo',
    icon: '🎬',
    patterns: ['vimeo.com'],
    extraArgs: [],
    requiresCookies: false
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: '🔊',
    patterns: ['soundcloud.com'],
    extraArgs: [],
    requiresCookies: false
  },
  dailymotion: {
    name: 'Dailymotion',
    icon: '📺',
    patterns: ['dailymotion.com', 'dai.ly'],
    extraArgs: [],
    requiresCookies: false
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    patterns: ['instagram.com', 'instagr.am'],
    extraArgs: ['--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'],
    fallbackArgs: ['--cookies-from-browser', 'chrome'],
    requiresCookies: true
  },
  generic: {
    name: 'Generic',
    icon: '🌐',
    patterns: [],
    extraArgs: [],
    requiresCookies: false
  }
}

function detectPlatform(url) {
  const urlLower = url.toLowerCase()
  for (const [key, config] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (config.patterns.some(pattern => urlLower.includes(pattern))) {
      return key
    }
  }
  return 'generic'
}

const parseJsonOutput = (output) => {
  if (!output) return {}
  if (typeof output === 'string') {
    return JSON.parse(output)
  }
  if (Buffer.isBuffer(output)) {
    return JSON.parse(output.toString('utf8'))
  }
  if (typeof output.stdout === 'string' || Buffer.isBuffer(output.stdout)) {
    const source = Buffer.isBuffer(output.stdout) ? output.stdout.toString('utf8') : output.stdout
    return JSON.parse(source)
  }
  return output
}

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

// Verify binaries exist (Critical for "Dancing Engine" fix)
if (app.isPackaged) {
  const missing = []
  if (!fs.existsSync(ytdlpBinaryPath)) missing.push('yt-dlp.exe')
  if (!fs.existsSync(ffmpegPath)) missing.push('ffmpeg.exe')
  
  if (missing.length > 0) {
    // Delay dialog to ensure app is ready
    setTimeout(() => {
      dialog.showErrorBox(
        'Engine Error', 
        `Critical components are missing:\n${missing.join(', ')}\n\nThis usually happens if the antivirus blocked the installer.\nPlease try reinstalling or adding an exception.`
      )
    }, 1000)
  }
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

// Track active downloads for cancellation
const activeDownloads = new Map()

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
  // Use absolute path for preload - critical for dev mode
  const preloadPath = app.isPackaged 
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, '..', 'src', 'preload.js')
  
  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] Preload path:', preloadPath)
  console.log('[Main] Preload exists:', fs.existsSync(preloadPath))
  
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#05070a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.removeMenu()
  mainWindow.maximize() // Open maximized to device width
  
  // Add error handler
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Page failed to load:', errorCode, errorDescription)
  })
  
  // Load the HTML file - use correct path for dev mode
  const htmlPath = path.join(__dirname, '..', 'index.html')
  
  console.log('[Main] Loading HTML from:', htmlPath)
  console.log('[Main] HTML exists:', fs.existsSync(htmlPath))
  
  mainWindow.loadFile(htmlPath)
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
      throw new Error('Add at least one link.')
    }
    const formatSelector = FORMAT_MAP[format] || FORMAT_MAP['mp4-1080']
    const outputDir = resolveOutputDir(destination)

    const summary = []
    for (let index = 0; index < cleaned.length; index += 1) {
      const url = cleaned[index]
      
      // Check if cancelled before starting
      if (activeDownloads.has(url) && activeDownloads.get(url).cancelled) {
        console.log('[Download] Skipping cancelled:', url)
        continue
      }
      
      sendToRenderer('download:job-start', { url, index, total: cleaned.length })
      const jobLabel = sanitize(url.replace(/https?:\/\//, '').slice(0, 40)) || 'job'
      
      let success = false
      let lastError = null

      // 🔄 SMART RETRY LOOP (Pro Engine Logic)
      for (const strategy of RETRY_STRATEGIES) {
        try {
          if (strategy.name !== 'Standard') {
            console.log(`[Download] Attempting strategy: ${strategy.name} for ${url}`)
          }
          
          summary.push(await runJob(url, jobLabel, formatSelector, outputDir, index, cleaned.length, strategy.args))
          success = true
          break // Stop if successful
        } catch (error) {
          lastError = error
          if (error.message?.includes('cancelled')) {
            console.log('[Download] Job cancelled:', url)
            break // Don't retry if cancelled
          }
          console.warn(`[Download] Strategy ${strategy.name} failed:`, error.message)
        }
      }

      if (!success && lastError) {
        // If all strategies fail, throw the last error
        if (!lastError.message?.includes('cancelled')) {
           console.error('[Download] All strategies exhausted. Download failed.')
           throw lastError
        }
      }
    }

    updateMetrics({ speed: '0 MB/s', eta: '--:--' })

    return {
      outputDir,
      jobs: summary
    }
  })

  ipcMain.handle('downloader:cancel', (_event, url) => {
    console.log('[Cancel] Requested for:', url)
    const download = activeDownloads.get(url)
    if (download && download.process) {
      download.cancelled = true
      try {
        download.process.kill('SIGTERM')
        console.log('[Cancel] Process killed:', url)
      } catch (error) {
        console.error('[Cancel] Error killing process:', error)
      }
      activeDownloads.delete(url)
      sendToRenderer('download:job-cancelled', { url })
      return { success: true }
    }
    return { success: false, message: 'Download not found or already completed' }
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

  ipcMain.handle('metadata:fetch', async (_event, url) => {
    if (!url) {
      throw new Error('Missing URL for metadata request')
    }
    const normalizedUrl = url.trim()
    const cached = METADATA_CACHE.get(normalizedUrl)
    if (cached && Date.now() - cached.timestamp < METADATA_CACHE_TTL) {
      return cached.payload
    }

    try {
      const baseOptions = {
        dumpSingleJson: true,
        skipDownload: true,
        flatPlaylist: true,
        noWarnings: true,
        noCheckCertificates: true,
        simulate: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }

      let raw
      let success = false
      let lastError = null

      // 🔄 SMART RETRY LOOP (Pro Engine Logic)
      for (const strategy of RETRY_STRATEGIES) {
        try {
          if (strategy.name !== 'Standard') {
            console.log(`[Metadata] Attempting strategy: ${strategy.name} for ${normalizedUrl}`)
          }
          
          const options = { ...baseOptions, ...strategy.args }
          raw = await ytdlpRunner(normalizedUrl, options)
          success = true
          break // Stop if successful
        } catch (err) {
          lastError = err
          console.warn(`[Metadata] Strategy ${strategy.name} failed:`, err.message)
        }
      }

      if (!success) {
        throw lastError || new Error('Metadata fetch failed after all strategies.')
      }

      const parsed = parseJsonOutput(raw)
      const keywordSource = Array.isArray(parsed?.tags) && parsed.tags.length
        ? parsed.tags
        : Array.isArray(parsed?.categories) && parsed.categories.length
          ? parsed.categories
          : Array.isArray(parsed?.keywords)
            ? parsed.keywords
            : []
      const keywords = keywordSource
        .map((word) => (typeof word === 'string' ? word.trim() : ''))
        .filter(Boolean)
      const thumbnails = Array.isArray(parsed?.thumbnails) ? parsed.thumbnails : []
      const bestThumb = thumbnails.reduce((best, current) => {
        if (!current?.url) return best
        if (!best) return current
        const currentArea = (current.width || 0) * (current.height || 0)
        const bestArea = (best.width || 0) * (best.height || 0)
        return currentArea > bestArea ? current : best
      }, null)

      const payload = {
        title: parsed?.title || '',
        description: parsed?.description || '',
        keywords,
        thumbnail: bestThumb?.url || parsed?.thumbnail || '',
        fetched: true
      }
      METADATA_CACHE.set(normalizedUrl, { timestamp: Date.now(), payload })
      return payload
    } catch (error) {
      console.error('[Metadata] Failed to fetch metadata:', error)
      throw new Error(error?.stderr || error?.message || 'Metadata fetch failed')
    }
  })

  ipcMain.handle('auth:login', async (_event, platform) => {
    if (platform !== 'instagram') return { success: false, message: 'Platform not supported' }
    
    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        parent: mainWindow,
        modal: true,
        title: 'Login to Instagram',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      authWindow.loadURL('https://www.instagram.com/accounts/login/')

      // Check for successful login by monitoring cookies
      const checkLogin = setInterval(async () => {
        try {
          const cookies = await authWindow.webContents.session.cookies.get({ domain: 'instagram.com' })
          const sessionCookie = cookies.find(c => c.name === 'sessionid')
          
          if (sessionCookie) {
            clearInterval(checkLogin)
            // Save cookies for yt-dlp
            const cookiePath = path.join(app.getPath('userData'), 'instagram-cookies.txt')
            // Format: domain flag path secure expiration name value
            const cookieContent = cookies.map(c => {
              return `${c.domain}\tTRUE\t${c.path}\t${c.secure ? 'TRUE' : 'FALSE'}\t${Math.floor(c.expirationDate || Date.now()/1000 + 31536000)}\t${c.name}\t${c.value}`
            }).join('\n')
            
            fs.writeFileSync(cookiePath, '# Netscape HTTP Cookie File\n' + cookieContent)
            
            authWindow.close()
            resolve({ success: true, cookiePath })
          }
        } catch (e) {
          // Ignore errors during check
        }
      }, 1000)

      authWindow.on('closed', () => {
        clearInterval(checkLogin)
        resolve({ success: false, message: 'Login window closed' })
      })
    })
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

  ipcMain.handle('export:background-trim', async (_event, payload = {}) => {
    const { start, end, sourceFile } = payload
    if (!sourceFile || !fs.existsSync(sourceFile)) {
      throw new Error('Source file not found')
    }
    
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-trim-'))
    const ext = path.extname(sourceFile)
    const trimmedPath = path.join(tmpDir, `trimmed${ext}`)
    
    console.log('[Background Trim] Processing:', { start, end, sourceFile })
    
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process')
      const args = [
        '-i', sourceFile,
        '-ss', String(start),
        '-to', String(end),
        '-c', 'copy', // Use copy for instant processing (no re-encoding)
        '-avoid_negative_ts', 'make_zero',
        '-y',
        trimmedPath
      ]
      
      console.log('[Background Trim] FFmpeg command:', ffmpegPath, args.join(' '))
      
      const ffmpeg = spawn(ffmpegPath, args, { windowsHide: true })
      let stderr = ''
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(trimmedPath)) {
          console.log('[Background Trim] Success:', trimmedPath)
          resolve({ trimmedFile: trimmedPath })
        } else {
          console.error('[Background Trim] Error:', stderr)
          reject(new Error(`Background trim failed with code ${code}`))
        }
      })
      
      ffmpeg.on('error', (error) => {
        console.error('[Background Trim] Spawn error:', error)
        reject(error)
      })
    })
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
        
        // Send immediate "starting" signal
        sendToRenderer('export:progress', { 
          file: baseName, 
          percent: 0, 
          status: 'Preparing...' 
        })
        
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
              args.push('-preset', 'fast') // Faster encoding for better UX
              args.push('-crf', '23')
              args.push('-pix_fmt', 'yuv420p') // Ensure compatibility
              args.push('-c:a', 'aac')
              args.push('-b:a', '192k')
              args.push('-movflags', '+faststart')
            }
            
            args.push('-y')  // Overwrite output
            args.push(destPath)
            
            console.log('[FFmpeg] Command:', ffmpegPath, args.join(' '))
            
            const ffmpeg = spawn(ffmpegPath, args, { windowsHide: true })
            let stderr = ''
            
            // Calculate total duration for progress
            let totalDurationSec = 0
            if (trim && trim.start !== undefined && trim.end !== undefined) {
              totalDurationSec = trim.end - trim.start
            }
            
            let lastProgressSent = Date.now()
            let hasFirstFrame = false

            ffmpeg.stderr.on('data', (data) => {
              const text = data.toString()
              stderr += text
              
              // Parse duration if we don't have it (fallback)
              if (!totalDurationSec && text.includes('Duration:')) {
                const match = text.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
                if (match) {
                  totalDurationSec = (parseInt(match[1]) * 3600) + (parseInt(match[2]) * 60) + parseFloat(match[3])
                  console.log('[FFmpeg] Detected duration:', totalDurationSec)
                }
              }
              
              // Detect first frame to show we've started processing
              if (!hasFirstFrame && (text.includes('frame=') || text.includes('time='))) {
                hasFirstFrame = true
                sendToRenderer('export:progress', { 
                  file: baseName, 
                  percent: 1, 
                  status: 'Converting' 
                })
              }
              
              // Parse time for progress
              const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
              if (timeMatch) {
                const currentSec = (parseInt(timeMatch[1]) * 3600) + (parseInt(timeMatch[2]) * 60) + parseFloat(timeMatch[3])
                
                // Throttle updates to max 2 per second
                const now = Date.now()
                if (now - lastProgressSent < 500) return
                lastProgressSent = now
                
                let percent = 0
                if (totalDurationSec > 0) {
                  percent = Math.min(100, Math.round((currentSec / totalDurationSec) * 100))
                } else {
                  // Fake progress if duration unknown (better than 0)
                  percent = Math.min(99, Math.round((currentSec / 300) * 100)) // Assume 5 mins max if unknown
                }
                
                sendToRenderer('export:progress', { 
                  file: baseName, 
                  percent, 
                  status: `Converting ${percent}%` 
                })
              }
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

async function runJob(url, label, formatSelector, outputDir, index, totalJobs, strategyArgs = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-downloader-'))
  
  // Detect platform
  const platform = detectPlatform(url)
  const platformConfig = SUPPORTED_PLATFORMS[platform]
  console.log(`[Platform] Detected: ${platformConfig.name} ${platformConfig.icon}`)
  
  // Send platform info to renderer
  sendToRenderer('download:platform', { url, platform: platformConfig.name, icon: platformConfig.icon })
  
  // Verify ffmpeg path exists before starting
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg not found at: ${ffmpegPath}. Please reinstall the application.`)
  }
  
  console.log('[Job Start] URL:', url)
  console.log('[Job Start] FFmpeg:', ffmpegPath)
  console.log('[Job Start] Temp dir:', tmpDir)
  console.log('[Job Start] Strategy:', JSON.stringify(strategyArgs))
  
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
    retries: 3,
    addMetadata: true,
    embedThumbnail: true,
    restrictFilenames: false,
    forceIpv4: true,
    // ⚡ PARALLEL DOWNLOAD OPTIMIZATION
    concurrentFragments: 8,        // Download 8 fragments simultaneously
    // ⚡ SPEED ENHANCEMENTS
    bufferSize: '16K',              // Larger buffer for faster processing
    httpChunkSize: 10485760,        // 10MB chunks for optimal speed
    // ⚡ RETRY & STABILITY
    fragmentRetries: 10,            // Retry failed fragments
    skipUnavailableFragments: true,  // Skip bad fragments, don't fail entire download
    ...strategyArgs // Apply strategy overrides (cookies, UA, etc)
  }

  // Add cookies if platform requires it and not already in strategy
  if (!args.cookiesFromBrowser) {
    if (platformConfig && platformConfig.fallbackArgs && platformConfig.fallbackArgs.includes('--cookies-from-browser')) {
       // Default to chrome if platform strictly requires it and no strategy set
       // But usually strategyArgs will handle this now.
    } else if (platformConfig && platformConfig.extraArgs && platformConfig.extraArgs.length > 0) {
      if (platformConfig.extraArgs.includes('--cookies-from-browser')) {
        args.cookiesFromBrowser = 'chrome'
      }
    }
  }

  if (formatSelector === FORMAT_MAP.mp3) {
    args.extractAudio = true
    args.audioFormat = 'mp3'
    args.audioQuality = '3'
  }

  console.log('[yt-dlp] Starting with args:', JSON.stringify(args, null, 2))
  
  const child = ytdlpRunner.exec(url, args, { windowsHide: true })
  
  // Track this download for cancellation
  activeDownloads.set(url, { process: child, cancelled: false })

  let lastProgressTime = Date.now()
  let lastPercent = 0
  let hasStarted = false
  
  // Send initial progress to show download started
  console.log('[Progress] Sending initial 0%')
  sendToRenderer('download:progress', { url, label, percent: 0, speed: 'Connecting...', eta: '--:--' })
  
  // Progress comes from BOTH stderr and stdout depending on yt-dlp version
  const handleProgressLine = (line) => {
    // Match various progress formats from yt-dlp
    const match = line.match(/\[download\]\s+([0-9.]+)%.*?at\s+([0-9.]+[^\s]+)\s+ETA\s+([0-9:\-]+)/i) ||
                  line.match(/\[download\]\s+([0-9.]+)%/i)
    
    if (match) {
      const rawPercent = Number(match[1])
      const speed = match[2] || '-- MB/s'
      const eta = match[3] || '--:--'
      
      // Remap download progress: 0% → 15%, 100% → 100% (smooth continuation from metadata)
      const percent = 15 + (rawPercent * 0.85)
      
      lastProgressTime = Date.now()
      lastPercent = percent
      hasStarted = true
      
      // Send EVERY progress update immediately - no filtering, no throttling
      updateMetrics({ speed, eta })
      const payload = { url, label, percent: Math.round(percent), speed, eta }
      console.log('[MAIN→RENDERER] Sending progress:', JSON.stringify(payload))
      sendToRenderer('download:progress', payload)
      return true
    }
    
    // Detect extraction/metadata phase with REAL progress (0-15% range)
    if (line.includes('[info]') || line.includes('Extracting') || line.includes('Downloading')) {
      if (!hasStarted) {
        console.log('[yt-dlp] Metadata phase:', line)
        
        // Calculate metadata progress in 0-15% range (leaves 15-100% for actual download)
        let metaPercent = 0
        let metaStatus = 'Starting'
        
        if (line.includes('Extracting URL')) {
          metaPercent = 2
          metaStatus = 'Reading link'
        } else if (line.includes('Downloading webpage')) {
          metaPercent = 4
          metaStatus = 'Loading page'
        } else if (line.includes('Downloading android') || line.includes('player API')) {
          metaPercent = 7
          metaStatus = 'Fetching formats'
        } else if (line.includes('Downloading web') || line.includes('safari')) {
          metaPercent = 9
          metaStatus = 'Analyzing quality'
        } else if (line.includes('m3u8')) {
          metaPercent = 11
          metaStatus = 'Checking streams'
        } else if (line.includes('Downloading 1 format')) {
          metaPercent = 13
          metaStatus = 'Preparing download'
        } else if (line.includes('Downloading video thumbnail')) {
          metaPercent = 14
          metaStatus = 'Getting thumbnail'
        } else if (line.includes('Writing video thumbnail')) {
          metaPercent = 15
          metaStatus = 'Ready to start'
        }
        
        sendToRenderer('download:progress', { 
          url, 
          label, 
          percent: metaPercent, 
          speed: metaStatus, 
          eta: 'Preparing' 
        })
      }
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
    // Add timeout detection with escalating warnings
    let stallWarningCount = 0
    const progressTimeout = setInterval(() => {
      const timeSinceProgress = Date.now() - lastProgressTime
      
      if (timeSinceProgress > 15000 && !hasStarted) {
        // Still connecting after 15s
        console.warn(`[Connecting] ${timeSinceProgress}ms elapsed, still connecting...`)
        sendToRenderer('download:progress', { 
          url, 
          label, 
          percent: 0, 
          speed: 'Connecting...', 
          eta: 'Please wait' 
        })
      } else if (timeSinceProgress > 45000 && hasStarted) {
        // Stalled after starting
        stallWarningCount++
        console.warn(`[Stall Warning ${stallWarningCount}] No progress for ${timeSinceProgress}ms`)
        sendToRenderer('download:progress', { 
          url, 
          label, 
          percent: lastPercent, 
          speed: 'Stalled', 
          eta: 'Retrying...' 
        })
      }
    }, 5000)

    await child
    clearInterval(progressTimeout)
    
    // Check if cancelled
    const downloadState = activeDownloads.get(url)
    if (downloadState && downloadState.cancelled) {
      activeDownloads.delete(url)
      throw new Error('Download cancelled by user')
    }
    
    // Clean up tracking
    activeDownloads.delete(url)

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
    // Clean up tracking
    activeDownloads.delete(url)
    
    console.error('[Download error]', error)
    console.error('[Error details]', {
      message: error.message,
      stderr: error.stderr?.slice(-500),
      stdout: error.stdout?.slice(-500),
      code: error.exitCode
    })
    
    let userMessage = error.message
    const stderrLower = (error.stderr || '').toLowerCase()
    const stdoutLower = (error.stdout || '').toLowerCase()
    
    // Check if this is a Facebook/Instagram error and we should retry with cookies
    const shouldRetryWithCookies = !isRetry && 
                                   platformConfig && 
                                   platformConfig.fallbackArgs && 
                                   (url.includes('facebook') || url.includes('instagram')) &&
                                   (stderrLower.includes('login') || 
                                    stderrLower.includes('sign in') || 
                                    stderrLower.includes('private') ||
                                    stderrLower.includes('unavailable') ||
                                    stdoutLower.includes('login required'))
    
    if (shouldRetryWithCookies) {
      console.log('[RETRY] Public download failed, retrying with cookies from Chrome...')
      try {
        // Clean up failed attempt's temp directory
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('[Cleanup warning]', cleanupError)
      }
      
      // Retry with cookies
      return runJob(url, label, formatSelector, outputDir, index, totalJobs, true)
    }
    
    // Login required or private content
    if (stderrLower.includes('login') || stderrLower.includes('sign in') || 
        stderrLower.includes('private') || stdoutLower.includes('login required')) {
      const platformName = url.includes('facebook') ? 'Facebook' : 
                          url.includes('instagram') ? 'Instagram' : 'this site'
      userMessage = `🔒 This ${platformName} video is private or requires login.\n\n` +
                   `To download:\n` +
                   `1. Close Google Chrome completely\n` +
                   `2. Make sure you're logged into ${platformName} in Chrome\n` +
                   `3. Try downloading again\n\n` +
                   `OR share a public video link instead.`
    }
    // Chrome cookie database locked (only show if login was attempted)
    else if ((stderrLower.includes('could not copy chrome cookie database') || 
        stderrLower.includes('cookie database')) && 
        (url.includes('facebook') || url.includes('instagram'))) {
      const platformName = url.includes('facebook') ? 'Facebook' : 'Instagram'
      userMessage = `Unable to download from ${platformName}.\n\n` +
                   `For public videos: Just paste and download!\n` +
                   `For private videos: Close Chrome first, then try again.`
    }
    // FFmpeg errors
    else if (error.message?.includes('ffmpeg') || error.message?.includes('path')) {
      userMessage = 'FFmpeg error. Please check the app installation or try reinstalling.'
    }
    // Rate limiting
    else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      userMessage = 'Rate limited. Please wait a few minutes and try again.'
    }
    // Network errors
    else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      userMessage = 'Network error. Check your internet connection and try again.'
    }
    // Video unavailable
    else if (stderrLower.includes('unavailable') || stderrLower.includes('not found') ||
             stderrLower.includes('deleted') || error.exitCode === 1) {
      userMessage = 'Video unavailable, deleted, or link is invalid. Please check the URL.'
    }
    
    sendToRenderer('download:job-error', { url, label, message: userMessage })
    
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.warn('[Cleanup warning]', cleanupError)
    }
    
    throw new Error(userMessage)
  }
  // Note: temp directory is NOT deleted here - will be cleaned up on export or app exit
}
