const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const ytdlp = require('yt-dlp-exec')
const ffmpegPath = require('ffmpeg-static')
const sanitize = require('sanitize-filename')

/**
 * Map UI format ids to yt-dlp format selectors.
 */
const FORMAT_MAP = {
  'mp4-1080': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
  'mp4-720': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best',
  mp3: 'bestaudio/best'
}

const OUTPUT_TEMPLATE = '%(title)s.%(ext)s'

const ensureDownloadsDir = () => {
  const downloadRoot = app.getPath('downloads')
  const targetDir = path.join(downloadRoot, 'WordHackerDownloads')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  return targetDir
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    backgroundColor: '#05070a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.removeMenu()
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('downloader:start', async (_event, payload) => {
    const { urls, format } = payload
    const cleaned = (urls || [])
      .map((url) => typeof url === 'string' ? url.trim() : '')
      .filter((url) => url.length > 0)
    if (cleaned.length === 0) {
      throw new Error('Add at least one YouTube link.')
    }
    const formatSelector = FORMAT_MAP[format] || FORMAT_MAP['mp4-1080']
    const outputDir = ensureDownloadsDir()

    const summary = []
    for (const url of cleaned) {
      const jobLabel = sanitize(url.replace(/https?:\/\//, '').slice(0, 40)) || 'job'
      summary.push(await runJob(url, jobLabel, formatSelector, outputDir))
    }

    return {
      outputDir,
      jobs: summary
    }
  })

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

async function runJob(url, label, formatSelector, outputDir) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-downloader-'))
  const args = {
    output: path.join(tmpDir, OUTPUT_TEMPLATE),
    format: formatSelector,
    ffmpegLocation: ffmpegPath,
    mergeOutputFormat: 'mp4',
    progress: true,
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

  await ytdlp(url, args)

  const producedFiles = fs.readdirSync(tmpDir)
  const moved = []
  for (const file of producedFiles) {
    const source = path.join(tmpDir, file)
    const destination = path.join(outputDir, file)
    fs.copyFileSync(source, destination)
    moved.push(destination)
  }

  fs.rmSync(tmpDir, { recursive: true, force: true })

  return {
    label,
    url,
    files: moved
  }
}
