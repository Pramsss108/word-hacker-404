const PRESET_LABELS = {
  'mp4-1080': '1080p Pro',
  'mp4-720': '720p HD',
  mp3: 'Audio only',
  social: 'Social'
}

const textarea = document.getElementById('url-input')
const queueList = document.getElementById('queue-list')
const queueCounter = document.getElementById('queue-counter')
const selectionCounter = document.getElementById('selection-counter')
const clearQueueBtn = document.getElementById('clear-queue')
const queueSelectAll = document.getElementById('queue-select-all')
const selectionClearBtn = document.getElementById('selection-clear')
const queueExportSelectedBtn = document.getElementById('queue-export-selected')
const queueExportAllBtn = document.getElementById('queue-export-all')
const fileMenu = document.getElementById('file-menu')
const statusDestination = document.getElementById('status-destination')
const statusLine = document.getElementById('status-line')
const statusQueue = document.getElementById('status-queue')
const statusPreset = document.getElementById('status-preset')
const statusEngine = document.getElementById('status-engine')
const menuTriggers = document.querySelectorAll('[data-menu-trigger]')

const previewVideo = document.getElementById('preview-video')
const previewCard = document.getElementById('preview-card')
const previewEmpty = document.getElementById('preview-empty')
const previewInfo = document.getElementById('preview-info')
const previewPlayBtn = document.getElementById('preview-play')
const previewStopBtn = document.getElementById('preview-stop')
const previewRestartBtn = document.getElementById('preview-restart')
const videoFormatBadge = document.getElementById('video-format-badge')
const trimStartInput = document.getElementById('trim-start')
const trimEndInput = document.getElementById('trim-end')
const trimStartLabel = document.getElementById('trim-start-label')
const trimEndLabel = document.getElementById('trim-end-label')
const trimDurationLabel = document.getElementById('trim-duration')
const trimFill = document.getElementById('trim-fill')

const exportPop = document.getElementById('export-pop')
const exportTarget = document.getElementById('export-target')
const exportBrowse = document.getElementById('export-browse')
const exportConfirm = document.getElementById('export-confirm')
const exportFormatSelect = document.getElementById('export-format')
const exportMessage = document.getElementById('export-message')
const exportPathInput = document.getElementById('export-path')
const exportCancel = document.getElementById('export-cancel')
const exportTypeSelect = document.getElementById('export-type')
const exportResolutionSelect = document.getElementById('export-resolution')

const formatCache = new Map()
const STORAGE_KEYS = {
  destination: 'wh404:destination'
}
let engineOffline = false
let queueId = 0

const state = {
  format: 'mp4-1080',
  queue: [],
  busy: false,
  exportId: null,
  autoRun: true,
  destination: '',
  queueSelection: new Set(),
  preview: {
    file: '',
    url: '',
    duration: 0,
    start: 0,
    end: 0,
    ready: false
  },
  exportContext: {
    targets: [],
    formats: [],
    resolutions: [],
    audioFormats: [],
    selectedResolution: null,
    selectedFormat: null,
    type: 'video'
  }
}

const DEFAULT_DEST_LABEL = 'Downloads/WordHackerDownloads'

const formatDestinationLabel = (value) => {
  if (!value) return DEFAULT_DEST_LABEL
  if (value.length <= 28) return value
  return `…${value.slice(-28)}`
}

const updateDestinationLabel = () => {
  const display = state.destination || DEFAULT_DEST_LABEL
  if (exportPathInput) {
    exportPathInput.value = display
  }
  if (statusDestination) {
    statusDestination.textContent = `Destination: ${formatDestinationLabel(display)}`
  }
}

const setDestination = (path) => {
  state.destination = path || ''
  updateDestinationLabel()
  try {
    window.localStorage?.setItem(STORAGE_KEYS.destination, state.destination)
  } catch (error) {
    console.warn('Unable to persist destination', error)
  }
}

const openDestinationFolder = () => {
  window.systemDialogs?.openFolder(state.destination || null)
}

const closeMenus = () => {
  document.querySelectorAll('.menu-dropdown').forEach((menu) => menu.classList.remove('open'))
}

const toggleMenu = (targetId) => {
  if (!targetId) return
  const menu = document.getElementById(`${targetId}-menu`)
  if (!menu) return
  const isOpen = menu.classList.contains('open')
  closeMenus()
  if (!isOpen) {
    menu.classList.add('open')
  }
}

const formatFileName = (filePath = '') => {
  if (!filePath) return 'Unnamed file'
  const parts = filePath.split(/[\\\/]/).filter(Boolean)
  return parts.pop() || filePath
}

const decodeDatasetPath = (value = '') => {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (error) {
    console.warn('Unable to decode dataset path', error)
    return value
  }
}

const copyToClipboard = async (text) => {
  if (!text) return false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.warn('Clipboard API failed', error)
    }
  }
  try {
    const temp = document.createElement('textarea')
    temp.value = text
    temp.style.position = 'fixed'
    temp.style.opacity = '0'
    temp.style.pointerEvents = 'none'
    document.body.appendChild(temp)
    temp.focus()
    temp.select()
    temp.setSelectionRange(0, text.length)
    const success = document.execCommand('copy')
    temp.remove()
    return success
  } catch (error) {
    console.warn('Clipboard fallback failed', error)
    return false
  }
}

const buildFileList = (item) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'slot-files'
  const title = document.createElement('p')
  title.className = 'slot-files-title'
  
  const isExported = item.exported && item.exportedFiles && item.exportedFiles.length
  const displayFiles = isExported ? item.exportedFiles : item.files
  
  if (isExported) {
    title.textContent = displayFiles.length === 1 ? '✓ Exported file' : `✓ Exported files (${displayFiles.length})`
  } else {
    title.textContent = displayFiles.length === 1 ? '⏳ Ready to export' : `⏳ Ready to export (${displayFiles.length} files)`
  }
  wrapper.appendChild(title)

  displayFiles.forEach((file) => {
    const row = document.createElement('div')
    row.className = 'slot-file'

    const info = document.createElement('div')
    info.className = 'slot-file-info'

    const name = document.createElement('p')
    name.className = 'slot-file-name'
    name.textContent = formatFileName(file)

    const pathLabel = document.createElement('p')
    pathLabel.className = 'slot-file-path'
    pathLabel.textContent = isExported ? file : '⏳ Temporary (not saved yet)'

    info.appendChild(name)
    info.appendChild(pathLabel)

    const actions = document.createElement('div')
    actions.className = 'slot-file-actions'

    if (isExported) {
      const revealBtn = document.createElement('button')
      revealBtn.className = 'ghost ghost-icon'
      revealBtn.title = 'Show in Explorer'
      revealBtn.dataset.action = 'reveal'
      revealBtn.dataset.path = encodeURIComponent(file)
      revealBtn.textContent = '📂'
      actions.appendChild(revealBtn)
    }

    const copyBtn = document.createElement('button')
    copyBtn.className = 'ghost ghost-icon'
    copyBtn.title = isExported ? 'Copy path' : 'Copy temp path'
    copyBtn.dataset.action = 'copy'
    copyBtn.dataset.path = encodeURIComponent(file)
    copyBtn.textContent = '📋'

    actions.appendChild(copyBtn)

    row.appendChild(info)
    row.appendChild(actions)
    wrapper.appendChild(row)
  })

  return wrapper
}

const formatTime = (value) => {
  const total = Math.max(0, Math.floor(value || 0))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const setStatus = (text) => {
  statusLine.textContent = text
}

const updatePresetChip = () => {
  statusPreset.textContent = `Preset: ${PRESET_LABELS[state.format] || state.format}`
}

const updateQueueChip = () => {
  queueCounter.textContent = `${state.queue.length} item${state.queue.length === 1 ? '' : 's'}`
  statusQueue.textContent = `Queue: ${state.queue.length}`
  updateSelectionCounter()
}

const updateSelectionCounter = () => {
  const selections = state.queue.filter((item) => state.queueSelection.has(item.id)).length
  selectionCounter.textContent = `${selections} selected`
  if (queueSelectAll) {
    queueSelectAll.checked = selections > 0 && selections === state.queue.length && state.queue.length > 0
  }
}

const updateEngineChip = () => {
  if (engineOffline) {
    statusEngine.textContent = 'Engine: offline'
    return
  }
  statusEngine.textContent = state.busy ? 'Engine: running' : 'Engine: idle'
}

const parseUrls = () => textarea.value
  .replace(/\n/g, ' ')
  .split(/\s+/)
  .map((url) => url.trim())
  .filter((url) => url.length > 0)

const createQueueItem = (url) => ({
  id: `slot-${++queueId}`,
  url,
  status: 'pending',
  percent: 0,
  speed: '0 MB/s',
  eta: '--:--',
  files: []
})

const ensureQueueItem = (url) => {
  let item = state.queue.find((entry) => entry.url === url)
  if (!item) {
    item = createQueueItem(url)
    state.queue.push(item)
  }
  return item
}

const addToQueue = (urls) => {
  let added = 0
  urls.forEach((url) => {
    if (!url) return
    if (!state.queue.some((entry) => entry.url === url)) {
      state.queue.push(createQueueItem(url))
      added += 1
    }
  })
  renderQueue()
  return added
}

const pruneSelection = () => {
  const validIds = new Set(state.queue.map((item) => item.id))
  Array.from(state.queueSelection).forEach((id) => {
    if (!validIds.has(id)) {
      state.queueSelection.delete(id)
    }
  })
}

const pushLog = (text) => {
  setStatus(text)
}

const toFileUrl = (filePath = '') => {
  if (!filePath) return ''
  if (filePath.startsWith('file://')) return filePath
  // Properly handle Windows paths and special characters
  const normalized = filePath.replace(/\\/g, '/')
  const withDrive = normalized.replace(/^([a-zA-Z]):/, '/$1:')
  // Encode each path segment to handle special chars, but not the slashes
  const encoded = withDrive.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `file://${encoded.startsWith('/') ? '' : '/'}${encoded}`
}

const loadPreviewFromItem = (item) => {
  if (!item.files || !item.files.length) {
    setStatus('Preview not ready yet. Finish the download first.')
    return
  }
  
  // Find the first video/audio file
  const source = item.files.find(f => 
    f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv') || f.endsWith('.mp3') || f.endsWith('.m4a')
  ) || item.files[0]
  
  state.preview.file = source
  state.preview.url = item.url
  
  // Clear any previous errors
  previewVideo.removeAttribute('poster')
  previewEmpty.classList.add('hidden')
  
  // Set source with proper encoding (toFileUrl now handles encoding)
  const fileUrl = toFileUrl(source)
  console.log('[Preview] Loading:', source)
  console.log('[Preview] File URL:', fileUrl)
  
  previewVideo.src = fileUrl
  previewVideo.load()
  previewInfo.textContent = item.url
  
  // Show loading state
  setStatus('Loading preview...')
}

const detectVideoFormat = () => {
  const width = previewVideo.videoWidth
  const height = previewVideo.videoHeight
  const aspectRatio = width / height
  
  // Remove all format classes
  previewCard.classList.remove('video-horizontal', 'video-vertical', 'video-shorts')
  
  let format = 'Unknown'
  
  if (height > width) {
    // Vertical video (likely Shorts, Reels, TikTok)
    if (aspectRatio < 0.6) {
      format = '9:16 Shorts'
      previewCard.classList.add('video-shorts')
    } else {
      format = 'Vertical'
      previewCard.classList.add('video-vertical')
    }
  } else {
    // Horizontal video
    if (aspectRatio >= 1.7) {
      format = '16:9 HD'
    } else if (aspectRatio >= 1.3) {
      format = '4:3 Standard'
    } else {
      format = 'Square'
    }
    previewCard.classList.add('video-horizontal')
  }
  
  videoFormatBadge.textContent = `${format} · ${width}×${height}`
  console.log(`[Preview] Format: ${format} (${width}×${height}, ratio: ${aspectRatio.toFixed(2)})`)
}

const resetPreviewRanges = (duration) => {
  state.preview.duration = duration
  state.preview.start = 0
  state.preview.end = duration
  trimStartInput.max = duration
  trimEndInput.max = duration
  trimStartInput.value = 0
  trimEndInput.value = duration
  trimStartLabel.textContent = formatTime(0)
  trimEndLabel.textContent = formatTime(duration)
  trimDurationLabel.textContent = formatTime(duration)
  state.preview.ready = true
  updateTrimFill()
}

const clampPreviewRanges = () => {
  const start = Number(trimStartInput.value)
  let end = Number(trimEndInput.value)
  if (end <= start + 0.1) {
    end = Math.min(state.preview.duration, start + 0.1)
    trimEndInput.value = end
  }
  state.preview.start = start
  state.preview.end = end
  trimStartLabel.textContent = formatTime(start)
  trimEndLabel.textContent = formatTime(end)
  trimDurationLabel.textContent = formatTime(end - start)
  updateTrimFill()
}

const updateTrimFill = () => {
  if (!trimFill) return
  const duration = state.preview.duration || 0
  if (!duration) {
    trimFill.style.left = '0%'
    trimFill.style.width = '0%'
    return
  }
  const startPercent = (state.preview.start / duration) * 100
  const endPercent = (state.preview.end / duration) * 100
  trimFill.style.left = `${startPercent}%`
  trimFill.style.width = `${Math.max(0, endPercent - startPercent)}%`
}

const togglePreviewPlayback = () => {
  if (!state.preview.ready) return
  if (previewVideo.paused) {
    previewVideo.currentTime = state.preview.start
    previewVideo.play()
    previewPlayBtn.textContent = '❚❚'
  } else {
    previewVideo.pause()
    previewPlayBtn.textContent = '▶'
  }
}

const stopPreview = () => {
  if (!state.preview.ready) return
  previewVideo.pause()
  previewVideo.currentTime = state.preview.start
  previewPlayBtn.textContent = '▶'
}

const restartPreview = () => {
  if (!state.preview.ready) return
  previewVideo.currentTime = state.preview.start
  previewVideo.play()
  previewPlayBtn.textContent = '❚❚'
}

const renderQueue = () => {
  updateQueueChip()
  queueList.innerHTML = ''
  pruneSelection()

  if (!state.queue.length) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = 'Queue is empty. Add links on the right.'
    queueList.appendChild(empty)
    return
  }

  state.queue.forEach((item, idx) => {
    const slot = document.createElement('article')
    slot.className = `queue-item ${item.status}`
    const selected = state.queueSelection.has(item.id)
    slot.innerHTML = `
      <div class="slot-head">
        <div>
          <div class="slot-meta">
            <label class="slot-select">
              <input type="checkbox" data-select ${selected ? 'checked' : ''} />
              <span class="slot-index">#${String(idx + 1).padStart(2, '0')}</span>
            </label>
            <div>
              <p class="slot-url">${item.url}</p>
              <p class="slot-status">${item.status === 'pending' ? 'Waiting' : item.status === 'downloading' ? 'Processing' : item.status === 'complete' ? 'Done' : 'Error'}</p>
            </div>
          </div>
        </div>
        <div class="slot-actions">
          <button class="ghost ghost-icon" data-move="-1" title="Move up">↑</button>
          <button class="ghost ghost-icon" data-move="1" title="Move down">↓</button>
          <button class="ghost ghost-icon export-btn" title="Export">⤓</button>
        </div>
      </div>
      <div class="slot-progress">
        <div class="progress-bar" style="--progress:${Math.min(100, item.percent || 0).toFixed(1)}%">
          <span></span>
        </div>
        <p class="slot-metrics">${item.percent?.toFixed(1) || 0}% · ${item.speed || 'Pending'} · ETA ${item.eta || '--:--'}</p>
      </div>
    `

    slot.addEventListener('click', (event) => {
      if (event.target.closest('.slot-actions')) return
      loadPreviewFromItem(item)
    })

    const selectInput = slot.querySelector('[data-select]')
    selectInput.addEventListener('click', (event) => event.stopPropagation())
    selectInput.addEventListener('change', () => {
      if (selectInput.checked) {
        state.queueSelection.add(item.id)
      } else {
        state.queueSelection.delete(item.id)
      }
      updateSelectionCounter()
    })

    slot.querySelector('.export-btn').addEventListener('click', (event) => {
      event.stopPropagation()
      openExportDrawer([item])
    })

    slot.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation()
        moveQueueItem(item.id, Number(btn.dataset.move))
      })
    })

    if (item.status === 'complete' && Array.isArray(item.files) && item.files.length) {
      const filesBlock = buildFileList(item)
      filesBlock.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]')
        if (!button) return
        event.stopPropagation()
        const action = button.dataset.action
        const decodedPath = decodeDatasetPath(button.dataset.path || '')
        if (!decodedPath) return
        if (action === 'reveal') {
          await window.systemDialogs?.revealFile(decodedPath)
        } else if (action === 'copy') {
          const copied = await copyToClipboard(decodedPath)
          pushLog(copied ? 'Copied file path to clipboard.' : 'Unable to copy path automatically.')
        }
      })
      slot.appendChild(filesBlock)
    }

    queueList.appendChild(slot)
  })
}

const moveQueueItem = (id, delta) => {
  const index = state.queue.findIndex((item) => item.id === id)
  if (index === -1) return
  const target = index + delta
  if (target < 0 || target >= state.queue.length) return
  const [entry] = state.queue.splice(index, 1)
  state.queue.splice(target, 0, entry)
  renderQueue()
  pushLog(`Reordered queue item ${entry.url}`)
}

const setBusy = (busy) => {
  state.busy = busy
  updateEngineChip()
}

const queueLinks = () => {
  const urls = parseUrls()
  if (!urls.length) {
    pushLog('No links detected.')
    return 0
  }
  const added = addToQueue(urls)
  textarea.value = ''
  pushLog(`Queued ${added} link${added === 1 ? '' : 's'}.`)
  if (added > 0) {
    startQueueIfIdle()
  }
  return added
}

const collectDownloadUrls = () => {
  const pending = state.queue
    .filter((item) => item.status === 'pending' || item.status === 'error')
    .map((item) => item.url)
  if (pending.length) return pending
  const fresh = parseUrls()
  if (fresh.length) {
    addToQueue(fresh)
    textarea.value = ''
  }
  return fresh
}

const onDownload = async () => {
  const urls = collectDownloadUrls()
  if (!urls.length) {
    pushLog('Add at least one YouTube link before downloading.')
    return
  }
  try {
    setBusy(true)
    pushLog(`Starting ${urls.length} job(s) in preset ${PRESET_LABELS[state.format]}.`)
    const result = await window.downloader.startDownload({ urls, format: state.format, destination: state.destination || undefined })
    if (result?.outputDir) {
      setDestination(result.outputDir)
    }
    pushLog(`Download complete. ${urls.length} file${urls.length === 1 ? '' : 's'} ready. Click Export to save.`)
  } catch (error) {
    console.error(error)
    pushLog(`⚠ ${error?.message || 'Download failed.'}`)
  } finally {
    setBusy(false)
    startQueueIfIdle()
  }
}

const startQueueIfIdle = () => {
  if (!state.autoRun || state.busy) return
  const pending = state.queue.some((item) => item.status === 'pending' || item.status === 'error')
  if (pending) {
    onDownload()
  }
}

const closeExportDrawer = () => {
  state.exportId = null
  state.exportContext.targets = []
  exportPop.classList.remove('open')
  exportPop.setAttribute('aria-hidden', 'true')
}

const describePreset = (preset) => {
  const resolution = preset.height ? `${preset.height}p` : 'Adaptive'
  const fps = preset.fps ? `${preset.fps}fps` : ''
  const audio = preset.acodec === 'none' ? 'No audio' : 'Audio embedded'
  const size = preset.filesize ? `${(preset.filesize / (1024 * 1024)).toFixed(1)}MB` : 'Size dynamic'
  return `${resolution} ${fps}`.trim() + ` · ${size} · ${audio}`
}

const extractResolutionsFromFormats = (formats) => {
  const videoFormats = formats.filter(fmt => fmt.height && fmt.vcodec && fmt.vcodec !== 'none')
  const resolutions = new Map()
  
  videoFormats.forEach(fmt => {
    const key = `${fmt.height}p`
    if (!resolutions.has(key) || (resolutions.get(key).tbr || 0) < (fmt.tbr || 0)) {
      resolutions.set(key, {
        id: fmt.id,
        height: fmt.height,
        label: `${fmt.height}p${fmt.fps ? ` (${fmt.fps}fps)` : ''}`,
        container: fmt.container || 'mp4',
        vcodec: fmt.vcodec,
        acodec: fmt.acodec,
        tbr: fmt.tbr
      })
    }
  })
  
  return Array.from(resolutions.values()).sort((a, b) => b.height - a.height)
}

const extractAudioFormatsFromFormats = (formats) => {
  const audioFormats = formats.filter(fmt => fmt.acodec && fmt.acodec !== 'none' && (!fmt.vcodec || fmt.vcodec === 'none'))
  const qualities = new Map()
  
  audioFormats.forEach(fmt => {
    const key = Math.floor(fmt.abr || 128)
    if (!qualities.has(key) || (qualities.get(key).abr || 0) < (fmt.abr || 0)) {
      qualities.set(key, {
        id: fmt.id,
        label: `${Math.floor(fmt.abr || 128)}kbps`,
        container: fmt.container || 'mp3',
        acodec: fmt.acodec,
        abr: fmt.abr
      })
    }
  })
  
  return Array.from(qualities.values()).sort((a, b) => (b.abr || 0) - (a.abr || 0))
}

const updateExportResolutionSelect = () => {
  const type = state.exportContext.type
  if (type === 'video') {
    const resolutions = state.exportContext.resolutions
    exportResolutionSelect.innerHTML = resolutions.length
      ? resolutions.map(r => `<option value="${r.id}">${r.label}</option>`).join('')
      : '<option>No video formats available</option>'
    state.exportContext.selectedResolution = resolutions[0] || null
  } else {
    const audioFormats = state.exportContext.audioFormats
    exportResolutionSelect.innerHTML = audioFormats.length
      ? audioFormats.map(a => `<option value="${a.id}">${a.label}</option>`).join('')
      : '<option>No audio formats available</option>'
    state.exportContext.selectedResolution = audioFormats[0] || null
  }
}

const renderExportOptions = (formats) => {
  const resolutions = extractResolutionsFromFormats(formats)
  const audioFormats = extractAudioFormatsFromFormats(formats)
  
  state.exportContext.resolutions = resolutions
  state.exportContext.audioFormats = audioFormats
  
  updateExportResolutionSelect()

  const outputFormats = state.exportContext.type === 'video' 
    ? ['mp4', 'mkv', 'avi', 'webm']
    : ['mp3', 'm4a', 'ogg', 'wav']
  
  exportFormatSelect.innerHTML = outputFormats
    .map((format) => `<option value="${format}">${format.toUpperCase()}</option>`)
    .join('')
  
  state.exportContext.selectedFormat = outputFormats[0]
  exportMessage.textContent = 'Ready to export.'
}

const formatExportTargetLabel = (targets) => {
  if (targets.length === 1) {
    return targets[0].url
  }
  return `${targets.length} items selected`
}

const openExportDrawer = async (items = []) => {
  const completed = items.filter((item) => item.status === 'complete')
  if (!completed.length) {
    pushLog('Only completed downloads can be exported.')
    return
  }
  state.exportContext.targets = completed
  state.exportContext.type = 'video'
  exportTypeSelect.value = 'video'
  exportTarget.textContent = formatExportTargetLabel(completed)
  exportPop.classList.add('open')
  exportPop.setAttribute('aria-hidden', 'false')
  exportMessage.textContent = 'Loading available formats...'

  try {
    const targetUrl = completed[0].url
    const meta = formatCache.get(targetUrl) || await window.downloader.probeFormats(targetUrl)
    formatCache.set(targetUrl, meta)
    const mapped = (meta.formats || []).map((fmt) => ({
      id: fmt.id,
      container: fmt.container || 'mp4',
      note: fmt.note,
      height: fmt.height,
      fps: fmt.fps,
      vcodec: fmt.vcodec,
      acodec: fmt.acodec,
      abr: fmt.abr,
      tbr: fmt.tbr,
      filesize: fmt.filesize
    }))
    state.exportContext.formats = mapped
    renderExportOptions(mapped)
  } catch (error) {
    console.error(error)
    exportMessage.textContent = error?.message || 'Unable to fetch stream metadata.'
  }
}

const bindPreviewEvents = () => {
  previewVideo.addEventListener('loadedmetadata', () => {
    resetPreviewRanges(previewVideo.duration || 0)
    previewPlayBtn.textContent = '▶'
    state.preview.ready = true
    detectVideoFormat()
    setStatus(`Preview ready: ${Math.round(previewVideo.duration)}s`)
    console.log('[Preview] Loaded successfully, duration:', previewVideo.duration)
  })
  
  previewVideo.addEventListener('error', (e) => {
    console.error('[Preview] Error loading video:', e)
    console.error('[Preview] Error details:', previewVideo.error)
    const errorMsg = previewVideo.error ? 
      `Video error: ${previewVideo.error.message || 'Could not load file'}` : 
      'Failed to load video'
    setStatus(errorMsg)
    previewEmpty.classList.remove('hidden')
    previewEmpty.textContent = `⚠️ ${errorMsg}. The file might be corrupted or in an unsupported format.`
  })
  
  previewVideo.addEventListener('canplay', () => {
    console.log('[Preview] Video can play')
  })

  previewVideo.addEventListener('timeupdate', () => {
    if (!state.preview.ready) return
    if (previewVideo.currentTime >= state.preview.end) {
      previewVideo.pause()
      previewVideo.currentTime = state.preview.start
      previewPlayBtn.textContent = '▶'
    }
  })

  previewVideo.addEventListener('pause', () => {
    previewPlayBtn.textContent = '▶'
  })

  previewVideo.addEventListener('play', () => {
    previewPlayBtn.textContent = '❚❚'
  })

  previewPlayBtn.addEventListener('click', togglePreviewPlayback)
  previewStopBtn.addEventListener('click', stopPreview)
  previewRestartBtn.addEventListener('click', restartPreview)

  // Magnetic snap functionality for trim timeline
  let activeTrimHandle = null
  const SNAP_THRESHOLD = 30 // pixels for magnetic snap
  
  const handleTrimTimelineClick = (event) => {
    if (!state.preview.ready) return
    const timeline = event.currentTarget
    const rect = timeline.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickPercent = (clickX / rect.width) * 100
    const clickTime = (clickPercent / 100) * state.preview.duration
    
    // Calculate distances to both handles
    const startDistance = Math.abs(state.preview.start - clickTime)
    const endDistance = Math.abs(state.preview.end - clickTime)
    
    // Snap to nearest handle if within threshold
    const threshold = (SNAP_THRESHOLD / rect.width) * state.preview.duration
    
    if (startDistance < threshold && startDistance < endDistance) {
      // Snap to start handle
      trimStartInput.value = clickTime
      activeTrimHandle = 'start'
    } else if (endDistance < threshold) {
      // Snap to end handle
      trimEndInput.value = clickTime
      activeTrimHandle = 'end'
    }
    
    clampPreviewRanges()
  }
  
  const trimTimeline = document.querySelector('.trim-timeline')
  if (trimTimeline) {
    trimTimeline.addEventListener('click', handleTrimTimelineClick)
    
    // Add drag support for magnetic handles
    let isDragging = false
    
    trimTimeline.addEventListener('mousedown', (event) => {
      if (event.target.classList.contains('trim-track') || event.target.classList.contains('trim-range-fill')) {
        handleTrimTimelineClick(event)
        isDragging = true
      }
    })
    
    trimTimeline.addEventListener('mousemove', (event) => {
      if (!isDragging || !activeTrimHandle) return
      const rect = trimTimeline.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const clickPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
      const clickTime = (clickPercent / 100) * state.preview.duration
      
      if (activeTrimHandle === 'start') {
        trimStartInput.value = clickTime
      } else {
        trimEndInput.value = clickTime
      }
      clampPreviewRanges()
    })
    
    document.addEventListener('mouseup', () => {
      isDragging = false
      activeTrimHandle = null
    })
  }

  trimStartInput.addEventListener('input', clampPreviewRanges)
  trimEndInput.addEventListener('input', clampPreviewRanges)
}

const handleMenuAction = (action) => {
  switch (action) {
    case 'set-destination':
      chooseDestinationFolder()
      break
    case 'open-destination':
      openDestinationFolder()
      break
    case 'check-updates':
      checkForUpdates()
      break
    default:
      break
  }
}

const checkForUpdates = async () => {
  pushLog('Checking for updates...')
  try {
    const response = await fetch('https://api.github.com/repos/Pramsss108/word-hacker-404/releases/latest')
    const data = await response.json()
    const latestVersion = data.tag_name || data.name
    pushLog(`Latest version: ${latestVersion}`)
    window.alert(`Latest version: ${latestVersion}\n\nCheck GitHub for updates: https://github.com/Pramsss108/word-hacker-404/releases`)
  } catch (error) {
    pushLog('Failed to check for updates. Please visit GitHub manually.')
    window.alert('Failed to check for updates.\n\nPlease visit: https://github.com/Pramsss108/word-hacker-404/releases')
  }
}

const wireEvents = () => {
  menuTriggers.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      toggleMenu(btn.dataset.menuTrigger)
    })
  })

  fileMenu?.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-menu-action]')
    if (!actionElement) return
    event.stopPropagation()
    closeMenus()
    handleMenuAction(actionElement.dataset.menuAction)
  })

  // About menu handler
  const aboutMenu = document.getElementById('about-menu')
  aboutMenu?.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-menu-action]')
    if (actionElement) {
      event.stopPropagation()
      closeMenus()
      handleMenuAction(actionElement.dataset.menuAction)
    }
  })

  // Help menu handler
  const helpMenu = document.getElementById('help-menu')
  helpMenu?.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-menu-action]')
    if (actionElement) {
      event.stopPropagation()
      closeMenus()
      handleMenuAction(actionElement.dataset.menuAction)
    }
  })

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu-group')) {
      closeMenus()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus()
    }
  })

  const storedDestination = window.localStorage?.getItem(STORAGE_KEYS.destination)
  if (storedDestination) {
    state.destination = storedDestination
  }
  updateDestinationLabel()

  queueSelectAll?.addEventListener('change', () => {
    if (queueSelectAll.checked) {
      state.queue.forEach((item) => state.queueSelection.add(item.id))
    } else {
      state.queueSelection.clear()
    }
    updateSelectionCounter()
    renderQueue()
  })

  selectionClearBtn?.addEventListener('click', () => {
    state.queueSelection.clear()
    updateSelectionCounter()
    renderQueue()
  })

  const exportSelectionHandler = () => {
    const selectedItems = state.queue.filter((item) => state.queueSelection.has(item.id) && item.status === 'complete')
    if (!selectedItems.length) {
      pushLog('Select completed items before exporting.')
      return
    }
    openExportDrawer(selectedItems)
  }

  queueExportSelectedBtn?.addEventListener('click', exportSelectionHandler)

  queueExportAllBtn?.addEventListener('click', () => {
    const completed = state.queue.filter((item) => item.status === 'complete')
    if (!completed.length) {
      pushLog('Finish at least one download before exporting all.')
      return
    }
    openExportDrawer(completed)
  })

  clearQueueBtn.addEventListener('click', () => {
    state.queue = []
    state.queueSelection.clear()
    renderQueue()
    pushLog('Cleared queue.')
  })

  textarea.addEventListener('paste', () => {
    setTimeout(() => {
      if (textarea.value.trim().length) {
        queueLinks()
      }
    }, 0)
  })

  document.querySelectorAll('[data-window]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.windowControls?.control(btn.dataset.window)
    })
  })

  const pinBtn = document.querySelector('[data-pin]')
  pinBtn?.addEventListener('click', async () => {
    const pinned = await window.windowControls?.togglePin()
    if (typeof pinned === 'boolean') {
      pinBtn.classList.toggle('active', pinned)
    }
  })

  exportBrowse.addEventListener('click', async () => {
    const selected = await window.systemDialogs?.chooseFolder()
    if (selected) {
      exportPathInput.value = selected
    }
  })

  exportConfirm.addEventListener('click', async () => {
    const targets = state.exportContext.targets
    if (!targets.length) {
      exportMessage.textContent = 'No items to export.'
      return
    }
    
    // Collect all temp files from selected items
    const allFiles = []
    targets.forEach(item => {
      if (item.files && item.files.length) {
        allFiles.push(...item.files)
      }
    })
    
    if (!allFiles.length) {
      exportMessage.textContent = 'No files available to export.'
      return
    }
    
    try {
      exportMessage.textContent = 'Exporting files...'
      const destination = exportPathInput.value || state.destination || undefined
      const outputFormat = exportFormatSelect.value || 'mp4'
      
      // Include trim points if preview is ready and has been trimmed
      const trimData = state.preview.ready && 
                       (state.preview.start > 0 || state.preview.end < state.preview.duration)
        ? { start: state.preview.start, end: state.preview.end }
        : null
      
      const result = await window.systemDialogs?.exportFiles({ 
        files: allFiles, 
        destination,
        outputFormat,
        trim: trimData
      })
      
      if (result && result.exported) {
        pushLog(`✔ Exported ${result.exported.length} file${result.exported.length === 1 ? '' : 's'} to ${result.outputDir}`)
        closeExportDrawer()
        window.alert(`Successfully exported ${result.exported.length} file${result.exported.length === 1 ? '' : 's'}!\\n\\nLocation: ${result.outputDir}`)
        
        // Update items to show exported status
        targets.forEach(item => {
          item.exported = true
          item.exportedFiles = result.exported
        })
        renderQueue()
      }
    } catch (error) {
      console.error(error)
      exportMessage.textContent = `Export failed: ${error?.message || 'Unknown error'}`
      pushLog(`⚠ Export failed: ${error?.message || 'Unknown error'}`)
    }
  })

  exportTypeSelect.addEventListener('change', () => {
    state.exportContext.type = exportTypeSelect.value
    updateExportResolutionSelect()
    
    const outputFormats = exportTypeSelect.value === 'video' 
      ? ['mp4', 'mkv', 'avi', 'webm']
      : ['mp3', 'm4a', 'ogg', 'wav']
    
    exportFormatSelect.innerHTML = outputFormats
      .map((format) => `<option value="${format}">${format.toUpperCase()}</option>`)
      .join('')
    
    state.exportContext.selectedFormat = outputFormats[0]
  })

  exportResolutionSelect.addEventListener('change', () => {
    const selectedId = exportResolutionSelect.value
    if (state.exportContext.type === 'video') {
      state.exportContext.selectedResolution = state.exportContext.resolutions.find(r => r.id === selectedId)
    } else {
      state.exportContext.selectedResolution = state.exportContext.audioFormats.find(a => a.id === selectedId)
    }
  })

  exportFormatSelect.addEventListener('change', () => {
    state.exportContext.selectedFormat = exportFormatSelect.value
  })

  exportPop.addEventListener('click', (event) => {
    if (event.target === exportPop) {
      closeExportDrawer()
    }
  })

  exportCancel.addEventListener('click', closeExportDrawer)

  bindPreviewEvents()
}

const bindIpc = () => {
  console.log('[IPC] Binding IPC handlers...')
  
  window.downloader.onStatus((payload = {}) => {
    engineOffline = payload.network === 'offline'
    updateEngineChip()
  })

  window.downloader.onJobStart(({ url }) => {
    console.log('[IPC] Job started:', url)
    const item = ensureQueueItem(url)
    item.status = 'downloading'
    item.percent = 0
    item.speed = 'Initializing...'
    item.eta = '--:--'
    renderQueue()
    pushLog(`▶ Starting download: ${url}`)
  })

  console.log('[IPC] Registering onProgress handler...')
  window.downloader.onProgress(({ url, percent, speed, eta }) => {
    console.log('[RENDERER←MAIN] Received progress:', { url, percent, speed, eta })
    const item = state.queue.find((entry) => entry.url === url)
    if (!item) {
      console.warn('[RENDERER] No queue item found for URL:', url)
      return
    }
    
    // Update immediately - no animation, show exactly what yt-dlp reports
    item.status = 'downloading'
    item.percent = percent
    item.speed = speed
    item.eta = eta
    
    console.log('[RENDERER] Updated item:', { id: item.id, percent: item.percent, speed: item.speed })
    
    // Render immediately for real-time updates
    renderQueue()
  })

  window.downloader.onJobComplete(({ url, files, tempDir }) => {
    const item = state.queue.find((entry) => entry.url === url)
    if (item) {
      item.status = 'complete'
      item.percent = 100
      item.speed = '0 MB/s'
      item.eta = '00:00'
      item.files = files || []
      item.tempDir = tempDir
      
      console.log('[Download Complete]', { url, files, tempDir })
      
      // Auto-load preview for the first completed item
      if (state.queue.filter(i => i.status === 'complete').length === 1) {
        setTimeout(() => loadPreviewFromItem(item), 500)
      }
    }
    renderQueue()
    pushLog(`✔ Downloaded ${url} - ready to export`)
  })

  window.downloader.onJobError(({ url, message }) => {
    const item = ensureQueueItem(url)
    item.status = 'error'
    renderQueue()
    pushLog(`⚠ ${message || 'Failed'} for ${url}`)
  })
}

// Loading screen handler
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen')
  const mainWindow = document.querySelector('.window')
  
  setTimeout(() => {
    loadingScreen.classList.add('hidden')
    mainWindow.classList.add('loaded')
  }, 2200) // Wait for loading animation to complete
}

wireEvents()
bindIpc()
renderQueue()
updatePresetChip()
updateEngineChip()
hideLoadingScreen()
