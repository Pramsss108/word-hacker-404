const PRESET_LABELS = {
  'mp4-1080': '1080p Pro',
  'mp4-720': '720p HD',
  mp3: 'Audio only',
  social: 'Social'
}

const textarea = document.getElementById('url-input')
const addToQueueBtn = document.getElementById('add-to-queue-btn')
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
const currentTimeDisplay = document.getElementById('current-time')
const totalTimeDisplay = document.getElementById('total-time')
const timelineHoverPreview = document.getElementById('timeline-hover')
const playheadIndicator = document.getElementById('playhead-indicator')
const timelineTrack = document.getElementById('trim-timeline-track')
const timelineMarkers = document.getElementById('timeline-markers')
const previewPane = document.querySelector('.preview-pane')
const metadataPane = document.getElementById('metadata-pane')
const metadataPopover = document.getElementById('metadata-popover')
const metadataPopoverTitle = document.getElementById('metadata-popover-title')
const metadataBackdrop = document.getElementById('metadata-backdrop')
const metadataCloseBtn = document.getElementById('metadata-close')
const summaryOpenTriggers = document.querySelectorAll('[data-open-panel]')
const metadataCards = document.querySelectorAll('[data-popover-panel]')
const summaryValueFields = {
  thumbnail: document.getElementById('summary-thumbnail'),
  title: document.getElementById('summary-title'),
  keywords: document.getElementById('summary-keywords'),
  description: document.getElementById('summary-description')
}
const summaryChipRefs = {
  thumbnail: document.querySelector('[data-summary-chip="thumbnail"]'),
  title: document.querySelector('[data-summary-chip="title"]'),
  keywords: document.querySelector('[data-summary-chip="keywords"]'),
  description: document.querySelector('[data-summary-chip="description"]')
}
const premiumRefreshBtn = document.getElementById('premium-refresh')
const premiumStatusLabel = document.getElementById('premium-status')
const premiumToggleControls = document.querySelectorAll('[data-premium-control]')
const premiumCardGroups = {
  thumbnail: Array.from(document.querySelectorAll('[data-premium-card="thumbnail"]')),
  seo: Array.from(document.querySelectorAll('[data-premium-card="seo"]')),
  story: Array.from(document.querySelectorAll('[data-premium-card^="story"]'))
}
const premiumThumbnailFrame = document.getElementById('premium-thumbnail')
const premiumThumbnailRatioLabel = document.getElementById('premium-thumbnail-ratio')
const premiumKeywordsField = document.getElementById('premium-keywords-string')
const premiumTitleField = document.getElementById('premium-title')
const premiumDescriptionField = document.getElementById('premium-description')
const exportMetaThumbnail = document.getElementById('export-meta-thumbnail')
const exportMetaKeywords = document.getElementById('export-meta-keywords')
const exportMetaTitle = document.getElementById('export-meta-title')
const featureSummaryMap = {
  thumbnail: ['thumbnail'],
  seo: ['keywords'],
  story: ['title', 'description']
}
const summaryFeatureLookup = {
  thumbnail: 'thumbnail',
  keywords: 'seo',
  title: 'story',
  description: 'story'
}
const panelTitleMap = {
  thumbnail: 'Smart thumbnail',
  keywords: 'SEO keywords',
  title: 'Story title',
  description: 'Caption draft'
}
const orderedPanelKeys = ['thumbnail', 'keywords', 'title', 'description']
const summaryReadyChecks = {
  thumbnail: () => Boolean(state.preview.metadata.thumbnail),
  keywords: () => Boolean(state.preview.metadata.keywords?.length),
  title: () => Boolean(state.preview.metadata.title?.trim()),
  description: () => Boolean(state.preview.metadata.description?.trim())
}

const GUIDE_STAGES = ['paste', 'queue', 'download', 'preview']
const guideProgress = GUIDE_STAGES.reduce((acc, stage) => ({ ...acc, [stage]: false }), {})

const getPreviewGuideMarkup = (message = 'Download a video to begin') => `
  <div class="hacker-loading">
    <div class="hacker-logo">
      <span class="glitch-text" data-text="WH404">WH404</span>
      <span class="hacker-subtitle">WORD HACKER</span>
    </div>
    <div class="hacker-logs">
      <div class="log-line">▸ ${message}</div>
      <div class="log-line">▸ We handle everything automatically</div>
      <div class="log-line">▸ Follow these 4 quick steps</div>
    </div>
    <ul class="guide-steps">
      <li class="guide-step" data-stage="paste"><span>1.</span> Paste a link and press Add to Queue</li>
      <li class="guide-step" data-stage="queue"><span>2.</span> Watch the queue progress</li>
      <li class="guide-step" data-stage="download"><span>3.</span> Let WH404 download the file</li>
      <li class="guide-step" data-stage="preview"><span>4.</span> Preview, trim, then export</li>
    </ul>
    <div class="progress-dots"><span>.</span><span>.</span><span>.</span></div>
  </div>
`

const showPreviewGuide = (message) => {
  if (!previewEmpty) return
  previewEmpty.innerHTML = getPreviewGuideMarkup(message)
  previewEmpty.classList.remove('hidden')
  applyGuideProgress()
}

const applyGuideProgress = () => {
  if (!previewEmpty) return
  previewEmpty.querySelectorAll('.guide-step').forEach((step) => {
    const stage = step.dataset.stage
    if (guideProgress[stage]) {
      step.classList.add('completed')
    } else {
      step.classList.remove('completed')
    }
  })
}

const updateGuideProgress = (stage) => {
  if (!Object.prototype.hasOwnProperty.call(guideProgress, stage)) return
  if (!guideProgress[stage]) {
    guideProgress[stage] = true
    applyGuideProgress()
  }
}

const resetGuideStage = (stage) => {
  if (!Object.prototype.hasOwnProperty.call(guideProgress, stage)) return
  guideProgress[stage] = false
  applyGuideProgress()
}

const DEFAULT_PREVIEW_MESSAGE = 'Paste any link to start decoding.'

// Check if timeline elements exist
if (!currentTimeDisplay || !totalTimeDisplay) {
  console.warn('[Init] Timeline display elements not found')
}
if (!timelineHoverPreview || !playheadIndicator) {
  console.warn('[Init] Timeline interaction elements not found')
}

const exportPop = document.getElementById('export-pop')
const exportTarget = document.getElementById('export-target')
const exportBrowse = document.getElementById('export-browse')
const exportConfirm = document.getElementById('export-confirm')
const exportFormatSelect = document.getElementById('export-format')
const exportMessage = document.getElementById('export-message')
const exportMessageText = document.getElementById('export-message-text')
const exportMessageDots = document.getElementById('export-message-dots')
const exportLoader = document.getElementById('export-loader')
const exportPathInput = document.getElementById('export-path')
const exportCancel = document.getElementById('export-cancel')
const exportTypeSelect = document.getElementById('export-type')
const exportResolutionSelect = document.getElementById('export-resolution')
const exportConfirmDefaultLabel = exportConfirm?.textContent || 'Export selection'

const formatCache = new Map()
const STORAGE_KEYS = {
  destination: 'wh404:destination'
}
let engineOffline = false
let queueId = 0
let lastPopoverAnchor = null

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
    activeId: null,
    duration: 0,
    start: 0,
    end: 0,
    ready: false,
    trimmedFile: null,
    trimProcessing: false,
    metadata: {
      title: '',
      description: '',
      keywords: [],
      thumbnail: '',
      fetched: false
    },
    premium: {
      thumbnail: true,
      seo: true,
      story: true
    },
    activePanel: 'thumbnail'
  },
  exportContext: {
    targets: [],
    formats: [],
    resolutions: [],
    audioFormats: [],
    selectedResolution: null,
    selectedFormat: null,
    type: 'video'
  },
  previewMode: 'video'
}

const DEFAULT_DEST_LABEL = 'Downloads/WordHackerDownloads'
const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
const clampValue = (value, min, max) => Math.min(Math.max(value, min), max)
const getSelectedQueueItems = () => state.queue.filter((item) => state.queueSelection.has(item.id))

const setPremiumStatus = (text, variant = 'idle') => {
  if (!premiumStatusLabel) return
  premiumStatusLabel.textContent = text
  premiumStatusLabel.classList.remove('loading', 'error', 'success')
  if (variant !== 'idle') {
    premiumStatusLabel.classList.add(variant)
  }
}

const simplifyAspectRatio = (width, height) => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const divisor = gcd(safeWidth, safeHeight) || 1
  return {
    w: Math.round(safeWidth / divisor),
    h: Math.round(safeHeight / divisor)
  }
}

const getAspectRatioLabel = (width, height) => {
  if (!width || !height) return '--'
  const ratio = width / height
  const common = [
    { label: '9:16', value: 9 / 16 },
    { label: '4:5', value: 4 / 5 },
    { label: '3:4', value: 3 / 4 },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 }
  ]
  const closest = common.reduce((prev, candidate) => {
    return Math.abs(candidate.value - ratio) < Math.abs(prev.value - ratio) ? candidate : prev
  })
  if (Math.abs(closest.value - ratio) <= 0.08) {
    return closest.label
  }
  const simplified = simplifyAspectRatio(width, height)
  return `${simplified.w}:${simplified.h}`
}

const updateThumbnailRatioLabel = () => {
  if (!premiumThumbnailRatioLabel) return
  const width = previewVideo?.videoWidth
  const height = previewVideo?.videoHeight
  premiumThumbnailRatioLabel.textContent = width && height ? `Aspect: ${getAspectRatioLabel(width, height)}` : 'Aspect: --'
}

const formatTitleSummary = () => {
  const title = state.preview.metadata.title?.trim()
  if (!title) return 'Title not ready'
  return title.length > 42 ? `${title.slice(0, 42)}…` : title
}

const formatKeywordSummary = () => {
  const keywords = (state.preview.metadata.keywords || []).map((word) => word.trim()).filter(Boolean)
  if (!keywords.length) return 'Waiting'
  if (keywords.length === 1) return keywords[0]
  if (keywords.length === 2) return `${keywords[0]}, ${keywords[1]}`
  return `${keywords.slice(0, 2).join(', ')} +${keywords.length - 2}`
}

const formatDescriptionSummary = () => {
  const description = state.preview.metadata.description?.trim()
  if (!description) return 'Waiting'
  const words = description.split(/\s+/).filter(Boolean)
  if (!words.length) return 'Waiting'
  if (words.length < 12) return description.length > 60 ? `${description.slice(0, 57)}…` : description
  return `${words.length} words`
}

const formatThumbnailSummary = () => {
  if (!state.preview.metadata.thumbnail) return 'Waiting'
  const width = previewVideo?.videoWidth
  const height = previewVideo?.videoHeight
  if (width && height) {
    return `${getAspectRatioLabel(width, height)} ready`
  }
  return 'Ready'
}

const summaryFormatters = {
  thumbnail: formatThumbnailSummary,
  keywords: formatKeywordSummary,
  title: formatTitleSummary,
  description: formatDescriptionSummary
}

const getNormalizedPanelKey = (panel) => (orderedPanelKeys.includes(panel) ? panel : 'thumbnail')
const getFirstEnabledPanel = () => {
  return orderedPanelKeys.find((panel) => {
    const feature = summaryFeatureLookup[panel]
    return feature ? state.preview.premium[feature] : true
  }) || 'thumbnail'
}
const resolvePanelKey = (panel) => {
  const normalized = getNormalizedPanelKey(panel)
  const feature = summaryFeatureLookup[normalized]
  if (feature && !state.preview.premium[feature]) {
    return getFirstEnabledPanel()
  }
  return normalized
}

const updatePopoverAnchor = (chip) => {
  if (!chip || !metadataPopover || !previewPane) return
  const chipRect = chip.getBoundingClientRect()
  const paneRect = previewPane.getBoundingClientRect()
  if (!chipRect.width || !paneRect.width) return
  
  const popoverWidth = Math.min(420, paneRect.width - 54)
  const halfPopover = popoverWidth / 2
  const chipCenterX = chipRect.left + chipRect.width / 2 - paneRect.left
  
  const minX = halfPopover + 20
  const maxX = paneRect.width - halfPopover - 20
  const clampedX = clampValue(chipCenterX, minX, maxX)
  
  const anchorY = chipRect.bottom - paneRect.top + 16
  const maxY = Math.max(120, paneRect.height - 140)
  const clampedY = clampValue(anchorY, 90, maxY)
  
  metadataPopover.style.setProperty('--popover-x', `${clampedX}px`)
  metadataPopover.style.setProperty('--popover-y', `${clampedY}px`)
  lastPopoverAnchor = chip
}

const setActiveMetadataPanel = (panelKey = 'thumbnail', anchorChip) => {
  const normalized = resolvePanelKey(panelKey)
  state.preview.activePanel = normalized
  metadataCards.forEach((card) => {
    card.classList.toggle('active', card.dataset.popoverPanel === normalized)
  })
  if (metadataPopoverTitle) {
    metadataPopoverTitle.textContent = panelTitleMap[normalized] || 'Metadata toolkit'
  }
  if (anchorChip) {
    updatePopoverAnchor(anchorChip)
  } else if (lastPopoverAnchor) {
    updatePopoverAnchor(lastPopoverAnchor)
  }
  updateSummaryChips()
}

const updateSummaryChips = () => {
  Object.entries(summaryValueFields).forEach(([key, node]) => {
    if (!node) return
    const feature = summaryFeatureLookup[key]
    if (feature && !state.preview.premium[feature]) {
      node.textContent = 'Disabled'
      return
    }
    node.textContent = summaryFormatters[key]?.() || 'Waiting'
  })

  Object.entries(summaryFeatureLookup).forEach(([summaryKey, feature]) => {
    const enabled = state.preview.premium[feature]
    const chip = summaryChipRefs[summaryKey]
    if (!chip) return
    const ready = enabled && Boolean(summaryReadyChecks[summaryKey]?.())
    chip.classList.toggle('disabled', !enabled)
    chip.classList.toggle('ready', ready)
    chip.classList.toggle('active', state.previewMode === 'insights' && state.preview.activePanel === summaryKey)
    chip.setAttribute('aria-expanded', state.previewMode === 'insights' && state.preview.activePanel === summaryKey ? 'true' : 'false')
  })
}

const applyPremiumToggleUI = () => {
  Object.entries(premiumCardGroups).forEach(([feature, cards]) => {
    cards.forEach((card) => card?.classList.toggle('disabled', !state.preview.premium[feature]))
  })
  const activeFeature = summaryFeatureLookup[state.preview.activePanel]
  if (activeFeature && !state.preview.premium[activeFeature]) {
    setActiveMetadataPanel(getFirstEnabledPanel())
  } else {
    updateSummaryChips()
  }
  renderExportMetadata()
}

const renderExportMetadata = () => {
  if (exportMetaThumbnail) {
    if (!state.preview.premium.thumbnail) {
      exportMetaThumbnail.textContent = 'Disabled'
    } else if (state.preview.metadata.thumbnail) {
      // Changed to Download button as requested
      exportMetaThumbnail.innerHTML = ''
      const btn = document.createElement('button')
      btn.className = 'ghost ghost-sm'
      btn.textContent = 'Download'
      btn.title = 'Save thumbnail'
      btn.onclick = (e) => {
        e.stopPropagation()
        triggerDownloadFromUrl(state.preview.metadata.thumbnail, 'thumbnail.jpg')
      }
      exportMetaThumbnail.appendChild(btn)
    } else {
      exportMetaThumbnail.textContent = 'Waiting for clip'
    }
  }
  if (exportMetaKeywords) {
    if (!state.preview.premium.seo) {
      exportMetaKeywords.textContent = 'Disabled'
    } else if (state.preview.metadata.keywords?.length) {
      exportMetaKeywords.textContent = `${state.preview.metadata.keywords.length} tags ready`
    } else {
      exportMetaKeywords.textContent = 'Waiting for clip'
    }
  }
  if (exportMetaTitle) {
    if (!state.preview.premium.story) {
      exportMetaTitle.textContent = 'Disabled'
    } else if (state.preview.metadata.title) {
      exportMetaTitle.textContent = 'Attached'
    } else {
      exportMetaTitle.textContent = 'Waiting for clip'
    }
  }
}

const renderPremiumMetadata = () => {
  if (premiumThumbnailFrame) {
    if (state.preview.metadata.thumbnail) {
      premiumThumbnailFrame.style.backgroundImage = `url("${state.preview.metadata.thumbnail}")`
      premiumThumbnailFrame.innerHTML = ''
    } else {
      premiumThumbnailFrame.style.backgroundImage = 'none'
      premiumThumbnailFrame.innerHTML = '<p>Thumbnail not ready</p>'
    }
  }

  updateThumbnailRatioLabel()

  if (premiumKeywordsField) {
    const keywords = (state.preview.metadata.keywords || []).map((word) => word.trim()).filter(Boolean)
    premiumKeywordsField.textContent = keywords.length ? keywords.join(', ') : 'Keywords will appear here'
  }

  if (premiumTitleField) {
    premiumTitleField.textContent = state.preview.metadata.title || 'Title not ready'
  }
  if (premiumDescriptionField) {
    premiumDescriptionField.textContent = state.preview.metadata.description || 'Description will appear here when a clip is selected.'
  }
  updateSummaryChips()
  renderExportMetadata()
}

const setPreviewMode = (mode = 'video') => {
  if (!previewPane) return
  const nextMode = mode === 'insights' ? 'insights' : 'video'
  state.previewMode = nextMode
  previewPane.dataset.mode = nextMode
  metadataPopover?.setAttribute('aria-hidden', nextMode === 'video' ? 'true' : 'false')
  updateSummaryChips()
  if (nextMode === 'insights') {
    const activeChip = summaryChipRefs[state.preview.activePanel]
    if (activeChip) {
      updatePopoverAnchor(activeChip)
    }
    try {
      previewVideo.pause()
    } catch (error) {
      // ignore
    }
  } else if (state.preview.ready) {
    previewEmpty.classList.add('hidden')
  }
}

const buildFallbackMetadata = (item = {}) => {
  let keywords = []
  try {
    const urlObj = new URL(item.url || '')
    keywords = urlObj.pathname
      .split('/')
      .filter(Boolean)
      .slice(-4)
      .map((segment) => segment.replace(/[-_]/g, ' ')
        .replace(/\d+/g, '')
        .trim())
      .filter(Boolean)
  } catch (err) {
    keywords = []
  }
  if (!keywords.length && item.platform?.name) {
    keywords = [item.platform.name.toLowerCase(), 'word hacker 404']
  }
  const fallbackTitle = item.platform ? `${item.platform.name} capture` : 'Word Hacker capture'
  return {
    title: fallbackTitle,
    description: `Auto-generated notes for ${fallbackTitle}. Add your hook before publishing.`,
    keywords,
    thumbnail: item.thumbnail || (item.url ? `https://image.thum.io/get/width/900/crop/600/${encodeURIComponent(item.url)}` : ''),
    fetched: false
  }
}

const fetchPremiumMetadata = async (item) => {
  if (!item || !item.url) {
    setPremiumStatus('Select a clip to load metadata.')
    return
  }
  setPremiumStatus('Generating insights...', 'loading')
  const fallback = buildFallbackMetadata(item)
  let response = null
  try {
    if (typeof window.downloader?.fetchMetadata === 'function') {
      response = await window.downloader.fetchMetadata(item.url)
    } else if (typeof window.downloader?.getSeoMetadata === 'function') {
      response = await window.downloader.getSeoMetadata(item.url)
    }
  } catch (err) {
    console.warn('[Premium] Metadata fetch failed', err)
  }

  const normalized = {
    title: response?.title || fallback.title,
    description: response?.description || fallback.description,
    keywords: Array.isArray(response?.keywords) && response.keywords.length ? response.keywords : fallback.keywords,
    thumbnail: response?.thumbnail || fallback.thumbnail,
    fetched: Boolean(response)
  }

  state.preview.metadata = normalized
  renderPremiumMetadata()
  setPremiumStatus(normalized.fetched ? 'Premium insights ready.' : 'Using offline cues. Tap refresh to retry.', normalized.fetched ? 'success' : 'error')
}

const buildMetadataPayload = () => {
  const payload = {}
  if (state.preview.premium.thumbnail && state.preview.metadata.thumbnail) {
    payload.thumbnail = state.preview.metadata.thumbnail
  }
  if (state.preview.premium.seo && state.preview.metadata.keywords?.length) {
    payload.keywords = state.preview.metadata.keywords
  }
  if (state.preview.premium.story) {
    if (state.preview.metadata.title) payload.title = state.preview.metadata.title
    if (state.preview.metadata.description) payload.description = state.preview.metadata.description
  }
  return Object.keys(payload).length ? payload : null
}

const triggerDownloadFromUrl = (url, filename = 'wordhacker-asset') => {
  if (!url) return false
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}

const getBatchStatusMeta = (item) => {
  if (item.status === 'complete' && (item.exported || (item.files && item.files.length))) {
    return { icon: '✓', label: 'Ready', className: 'ready' }
  }
  if (item.status === 'error') {
    return { icon: '⚠', label: 'Needs attention', className: 'error' }
  }
  return { icon: '...', label: 'Processing', className: 'waiting' }
}

const buildBatchSummaryMarkup = (items) => {
  return `
    <div class="batch-summary">
      <p class="batch-summary-header">${items.length} clips selected</p>
      <div class="batch-summary-list">
        ${items
          .map((item, idx) => {
            const meta = getBatchStatusMeta(item)
            const label = escapeHtml(item.platform ? item.platform.name : `Clip ${idx + 1}`)
            const safeUrl = escapeHtml(item.url)
            return `
              <div class="batch-summary-row">
                <div>
                  <strong>${label}</strong>
                  <div class="mono">${safeUrl}</div>
                </div>
                <div class="batch-summary-status ${meta.className}">
                  <span>${meta.icon}</span>
                  <span>${meta.label}</span>
                </div>
              </div>
            `
          })
          .join('')}
      </div>
      <p class="batch-summary-footer">Run Export Selected to process them together.</p>
    </div>
  `
}

let syncPreviewWithSelection = () => {}

const handlePremiumCopy = async (target) => {
  let payload = ''
  if (target === 'thumbnail') {
    payload = state.preview.metadata.thumbnail
  } else if (target === 'keywords') {
    payload = (state.preview.metadata.keywords || []).join(', ')
  } else if (target === 'title') {
    payload = state.preview.metadata.title
  } else if (target === 'description') {
    payload = state.preview.metadata.description
  }
  if (!payload) {
    setPremiumStatus('Nothing to copy yet.', 'error')
    return
  }
  const copied = await copyToClipboard(payload)
  if (copied) {
    setPremiumStatus('Copied to clipboard!', 'success')
  } else {
    setPremiumStatus('Unable to copy right now.', 'error')
  }
}

const handleExportCopy = async (target) => {
  if (target === 'thumbnail') {
    const success = await copyToClipboard(state.preview.metadata.thumbnail || '')
    setPremiumStatus(success ? 'Thumbnail link copied.' : 'Nothing to copy yet.', success ? 'success' : 'error')
    return
  }
  if (target === 'keywords') {
    const success = await copyToClipboard((state.preview.metadata.keywords || []).join(', '))
    setPremiumStatus(success ? 'Keywords copied.' : 'Nothing to copy yet.', success ? 'success' : 'error')
    return
  }
  if (target === 'story') {
    const story = `${state.preview.metadata.title || ''}\n\n${state.preview.metadata.description || ''}`.trim()
    const success = await copyToClipboard(story)
    setPremiumStatus(success ? 'Title & description copied.' : 'Nothing to copy yet.', success ? 'success' : 'error')
  }
}

let exportDotsTimer = null

const startExportDots = () => {
  if (!exportMessageDots || exportDotsTimer) return
  const frames = ['.', '..', '...']
  let index = 0
  exportMessageDots.textContent = frames[index]
  exportDotsTimer = setInterval(() => {
    index = (index + 1) % frames.length
    exportMessageDots.textContent = frames[index]
  }, 320)
}

const stopExportDots = () => {
  if (exportDotsTimer) {
    clearInterval(exportDotsTimer)
    exportDotsTimer = null
  }
  if (exportMessageDots) {
    exportMessageDots.textContent = ''
  }
}

const updateExportMessage = (text, { loading = false, variant } = {}) => {
  if (exportMessageText) {
    exportMessageText.textContent = text
  } else {
    exportMessage.textContent = text
  }

  if (exportMessage) {
    exportMessage.classList.remove('success', 'error')
    if (variant) {
      exportMessage.classList.add(variant)
    }
  }

  if (loading) {
    exportLoader?.classList.add('active')
    startExportDots()
  } else {
    exportLoader?.classList.remove('active')
    stopExportDots()
  }
}

const formatDestinationLabel = (value) => {
  if (!value) return DEFAULT_DEST_LABEL
  if (value.length <= 28) return value
  return `...${value.slice(-28)}`
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

const generateTimelineMarkers = (duration) => {
  if (!timelineMarkers || !duration) return
  
  // Generate 5 time markers evenly spaced
  const markerCount = 5
  const markers = []
  
  for (let i = 0; i < markerCount; i++) {
    const time = (i / (markerCount - 1)) * duration
    markers.push(`<span>${formatTime(time)}</span>`)
  }
  
  timelineMarkers.innerHTML = markers.join('')
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
  const selectedItems = getSelectedQueueItems()
  const selections = selectedItems.length
  selectionCounter.textContent = `${selections} selected`
  if (queueSelectAll) {
    queueSelectAll.checked = selections > 0 && selections === state.queue.length && state.queue.length > 0
  }
  syncPreviewWithSelection(selectedItems)
}

const updateEngineChip = () => {
  if (engineOffline) {
    statusEngine.textContent = 'Engine: offline'
    return
  }
  statusEngine.textContent = state.busy ? 'Engine: running' : 'Engine: idle'
}

const detectPlatformFromUrl = (url) => {
  const urlLower = url.toLowerCase()
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return { name: 'YouTube', icon: '▶️', color: '#ff0000' }
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return { name: 'Instagram', icon: '📷', color: '#e4405f' }
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.')) return { name: 'Facebook', icon: '👥', color: '#1877f2' }
  if (urlLower.includes('tiktok.com')) return { name: 'TikTok', icon: '🎵', color: '#00f2ea' }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return { name: 'Twitter/X', icon: '🐦', color: '#1da1f2' }
  if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return { name: 'Reddit', icon: '🤖', color: '#ff4500' }
  if (urlLower.includes('vimeo.com')) return { name: 'Vimeo', icon: '🎬', color: '#1ab7ea' }
  if (urlLower.includes('soundcloud.com')) return { name: 'SoundCloud', icon: '🔊', color: '#ff7700' }
  if (urlLower.includes('dailymotion.com')) return { name: 'Dailymotion', icon: '📺', color: '#0066dc' }
  if (urlLower.includes('twitch.tv')) return { name: 'Twitch', icon: '🟣', color: '#9146ff' }
  if (urlLower.includes('udemy.com')) return { name: 'Udemy', icon: '📚', color: '#a435f0' }
  return { name: 'Other', icon: '🌐', color: '#9aa3b2' }
}

const parseUrls = () => {
  // Enhanced parser: supports comma, newline, and space separation
  const urls = textarea.value
    .split(/[\n,\s]+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith('http'))
  // Remove duplicates while preserving order
  return Array.from(new Set(urls))
}

const createQueueItem = (url) => {
  const platform = detectPlatformFromUrl(url)
  return {
    id: `slot-${++queueId}`,
    url,
    platform,
    status: 'pending',
    percent: 0,
    speed: '0 MB/s',
    eta: '--:--',
    files: []
  }
}

const ensureQueueItem = (url) => {
  let item = state.queue.find((entry) => entry.url === url)
  if (!item) {
    item = createQueueItem(url)
    state.queue.push(item)
  }
  return item
}

const addToQueue = (urls) => {
  console.log('[Queue] addToQueue called with:', urls)
  let added = 0
  urls.forEach((url) => {
    if (!url) return
    if (!state.queue.some((entry) => entry.url === url)) {
      console.log('[Queue] Adding new item:', url)
      state.queue.push(createQueueItem(url))
      added += 1
    } else {
      console.log('[Queue] Duplicate URL skipped:', url)
    }
  })
  console.log('[Queue] Calling renderQueue, total items:', state.queue.length)
  renderQueue()
  console.log('[Queue] renderQueue completed')
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

  // DO NOT use convertPath here - we want Blob loading to be tried first
  // This function is now only a fallback for non-Tauri environments
  
  if (filePath.startsWith('file://')) return filePath
  // Properly handle Windows paths and special characters
  const normalized = filePath.replace(/\\/g, '/')
  const withDrive = normalized.replace(/^([a-zA-Z]):/, '/$1:')
  // Encode each path segment to handle special chars, but not the slashes
  const encoded = withDrive.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `file://${encoded.startsWith('/') ? '' : '/'}${encoded}`
}

const loadPreviewFromItem = async (item) => {
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
  
  // Detect audio mode
  const isAudio = source.endsWith('.mp3') || source.endsWith('.m4a') || source.endsWith('.wav') || source.endsWith('.aac');
  if (isAudio) {
    previewCard.classList.add('audio-mode');
    if (item.thumbnail) {
      previewVideo.poster = item.thumbnail;
    }
  } else {
    previewCard.classList.remove('audio-mode');
    previewVideo.removeAttribute('poster');
  }

  // Clear any previous errors
  previewEmpty.classList.add('hidden')
  
  // FORCE RESET: Pause and clear src to ensure clean state
  // Remove error listener during reset to avoid false positives
  previewVideo.onerror = null
  
  try {
    previewVideo.pause()
    previewVideo.removeAttribute('src')
    previewVideo.load()
  } catch (e) { console.warn('Video reset warning:', e) }
  
  console.log('[Preview] Loading:', source)
  console.log('[Preview] CODE VERSION: BLOB_FIX_v3')
  
  // Try Blob loading first (Bypasses asset protocol issues)
  let fileUrl = null;
  try {
    if (window.downloader && window.downloader.readVideoFile) {
        fileUrl = await window.downloader.readVideoFile(source);
        if (fileUrl) console.log('[Preview] Using Blob URL:', fileUrl);
    }
  } catch (e) {
    console.error('[Preview] Blob load failed:', e);
  }
  
  // Fallback to asset URL if Blob failed
  if (!fileUrl) {
      fileUrl = toFileUrl(source);
      console.log('[Preview] Using Asset URL (Fallback):', fileUrl);
  }
  
  // Delay setting src slightly to allow reset to take effect
  setTimeout(() => {
    // Attach error listener only when we are ready to load
    previewVideo.onerror = (e) => {
      console.error('[Preview] Video Error:', previewVideo.error, e)
      // Only show error if we actually have a src
      if (previewVideo.src) {
        const errCode = previewVideo.error ? previewVideo.error.code : 'Unknown';
        const errMsg = previewVideo.error ? previewVideo.error.message : 'No message';
        setStatus(`Video error: ${errMsg} (Code: ${errCode}) - ${previewVideo.src}`);
      }
    }

    previewVideo.src = fileUrl
    previewVideo.load()
    
    previewInfo.textContent = item.url
    updateGuideProgress('preview')
    fetchPremiumMetadata(item)
    
    // Ensure we stay on this video even if others complete
    state.preview.activeId = item.id
  }, 100)
}

const syncPreviewWithSelection = (selectedItems = getSelectedQueueItems()) => {
  if (!previewEmpty) return
  if (!selectedItems.length) {
    previewCard.classList.remove('batch-mode')
    if (state.preview.ready) {
      previewEmpty.classList.add('hidden')
    } else {
      showPreviewGuide(DEFAULT_PREVIEW_MESSAGE)
    }
    return
  }
  if (selectedItems.length === 1) {
    previewCard.classList.remove('batch-mode')
    const target = selectedItems[0]
    if (target.status === 'complete' && (target.files?.length || target.exportedFiles?.length)) {
      loadPreviewFromItem(target)
    } else {
      showPreviewGuide('Selected item is still processing. Please wait for the download to finish.')
    }
    return
  }
  previewCard.classList.add('batch-mode')
  try {
    previewVideo.pause()
  } catch (error) {
    // ignore
  }
  previewEmpty.classList.remove('hidden')
  previewEmpty.innerHTML = buildBatchSummaryMarkup(selectedItems)
}
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
  
  // Safe timeline display updates
  if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0)
  if (totalTimeDisplay) totalTimeDisplay.textContent = formatTime(duration)
  
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
  
  // Trigger background trim processing
  debouncedBackgroundTrim()
}

let trimDebounceTimer = null
const debouncedBackgroundTrim = () => {
  if (trimDebounceTimer) clearTimeout(trimDebounceTimer)
  
  // Wait 2 seconds after user stops adjusting trim handles
  trimDebounceTimer = setTimeout(() => {
    processBackgroundTrim()
  }, 2000)
}

const processBackgroundTrim = async () => {
  // Only process if trim is active and ready
  if (!state.preview.ready || !state.preview.file) return
  
  const isTrimmed = state.preview.start > 0 || state.preview.end < state.preview.duration
  if (!isTrimmed) {
    state.preview.trimmedFile = null
    return
  }
  
  if (state.preview.trimProcessing) return
  
  console.log('[Background Trim] Starting pre-processing...')
  state.preview.trimProcessing = true
  setStatus('Pre-processing trim in background...')
  
  try {
    const trimData = {
      start: state.preview.start,
      end: state.preview.end,
      sourceFile: state.preview.file
    }
    
    // Process trim in background
    const result = await window.systemDialogs?.backgroundTrim(trimData)
    
    if (result && result.trimmedFile) {
      state.preview.trimmedFile = result.trimmedFile
      console.log('[Background Trim] Complete:', result.trimmedFile)
      setStatus('✓ Trim ready - export will be instant!')
    }
  } catch (error) {
    console.error('[Background Trim] Error:', error)
    setStatus('Background trim failed - will process on export')
    state.preview.trimmedFile = null
  } finally {
    state.preview.trimProcessing = false
  }
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

const resetPreviewPlayer = (message = DEFAULT_PREVIEW_MESSAGE) => {
  if (!previewVideo) return

  try {
    previewVideo.pause()
  } catch (err) {
    console.warn('[Preview] pause failed during reset', err)
  }

  previewVideo.removeAttribute('src')
  previewVideo.removeAttribute('poster')
  previewVideo.load()
  previewPlayBtn.textContent = '▶'
  previewCard?.classList.remove('video-horizontal', 'video-vertical', 'video-shorts')

  if (videoFormatBadge) {
    videoFormatBadge.textContent = 'No media loaded'
  }
  if (previewInfo) {
    previewInfo.textContent = 'No video loaded'
  }

  state.preview.file = ''
  state.preview.url = ''
  state.preview.duration = 0
  state.preview.start = 0
  state.preview.end = 0
  state.preview.ready = false
  state.preview.trimmedFile = null
  state.preview.trimProcessing = false
  state.preview.metadata = {
    title: '',
    description: '',
    keywords: [],
    thumbnail: '',
    fetched: false
  }
  state.preview.activePanel = resolvePanelKey('thumbnail')

  if (trimStartInput) {
    trimStartInput.value = 0
    trimStartInput.max = 0
  }
  if (trimEndInput) {
    trimEndInput.value = 0
    trimEndInput.max = 0
  }
  if (trimStartLabel) trimStartLabel.textContent = formatTime(0)
  if (trimEndLabel) trimEndLabel.textContent = formatTime(0)
  if (trimDurationLabel) trimDurationLabel.textContent = formatTime(0)
  if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0)
  if (totalTimeDisplay) totalTimeDisplay.textContent = formatTime(0)

  updateTrimFill()

  resetGuideStage('preview')
  showPreviewGuide(message)
  renderPremiumMetadata()
  setPremiumStatus('Select a clip to load metadata.')
}

resetPreviewPlayer()
applyPremiumToggleUI()
setPreviewMode('video')
setActiveMetadataPanel('thumbnail')

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
    const platformBadge = item.platform ? `<span class="platform-badge" style="--platform-color: ${item.platform.color}">${item.platform.icon} ${item.platform.name}</span>` : ''
    const showCancel = item.status === 'downloading'
    const isReady = item.status === 'complete'
    
    slot.innerHTML = `
      <div class="slot-head">
        <div>
          <div class="slot-meta">
            <label class="slot-select">
              <input type="checkbox" data-select ${selected ? 'checked' : ''} />
              <span class="slot-index">#${String(idx + 1).padStart(2, '0')}</span>
            </label>
            <div>
              <div class="slot-url-row">
                <p class="slot-url">${item.url}</p>
                ${platformBadge}
                ${isReady ? '<span class="ready-badge">Ready</span>' : ''}
              </div>
              <p class="slot-status">${item.status === 'pending' ? 'Waiting' : item.status === 'downloading' ? 'Processing' : item.status === 'complete' ? 'Done' : item.status === 'cancelled' ? 'Cancelled' : 'Error'}</p>
            </div>
          </div>
        </div>
        <div class="slot-actions">
          ${showCancel ? '<button class="ghost ghost-danger" data-cancel title="Cancel download">✕</button>' : ''}
          <button class="ghost ghost-icon" data-move="-1" title="Move up">↑</button>
          <button class="ghost ghost-icon" data-move="1" title="Move down">↓</button>
          <button class="ghost ghost-danger" data-delete title="Delete from queue">🗑</button>
          <button class="premium-download-btn export-btn" title="Export & Save">
            <span class="download-icon">⬇</span>
            <span class="download-glow"></span>
          </button>
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
    
    const cancelBtn = slot.querySelector('[data-cancel]')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async (event) => {
        event.stopPropagation()
        try {
          const result = await window.downloader.cancelDownload(item.url)
          if (result.success) {
            pushLog(`Cancelled download: ${item.url}`)
          } else {
            pushLog(`Could not cancel: ${result.message || 'Unknown error'}`)
          }
        } catch (error) {
          console.error('[Cancel error]', error)
          pushLog('Failed to cancel download')
        }
      })
    }

    slot.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation()
        moveQueueItem(item.id, Number(btn.dataset.move))
      })
    })
    
    const deleteBtn = slot.querySelector('[data-delete]')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation()
        deleteQueueItem(item.id)
      })
    }

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

const deleteQueueItem = (id) => {
  const index = state.queue.findIndex((item) => item.id === id)
  if (index === -1) return
  
  const item = state.queue[index]
  
  // If this item is currently loaded in preview, clear the player
  if (state.preview.url === item.url) {
    resetPreviewPlayer('Preview cleared. Paste a new link to restart the flow.')
    setStatus('Video removed from player')
  }

  if (item.status === 'complete' && !item.exported) {
    updateHistoryStatus(item.url, 'retry')
  }
  
  // Remove from queue
  state.queue.splice(index, 1)
  state.queueSelection.delete(id)
  
  renderQueue()
  updateSelectionCounter()
  pushLog(`Deleted: ${item.url}`)
}

const setBusy = (busy) => {
  state.busy = busy
  updateEngineChip()
}

const queueLinks = () => {
  console.log('[Queue] queueLinks called')
  const urls = parseUrls()
  console.log('[Queue] Parsed URLs:', urls)
  if (!urls.length) {
    pushLog('No links detected.')
    return 0
  }
  const added = addToQueue(urls)
  console.log('[Queue] Added', added, 'items to queue')
  textarea.value = ''
  pushLog(`Queued ${added} link${added === 1 ? '' : 's'}.`)
  if (added > 0) {
    updateGuideProgress('queue')
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
    updateGuideProgress('queue')
  }
  return fresh
}

const onDownload = async () => {
  console.log('[Download] onDownload called')
  const urls = collectDownloadUrls()
  console.log('[Download] Collected URLs:', urls)
  if (!urls.length) {
    pushLog('Add at least one link before downloading.')
    return
  }
  if (!window.downloader || !window.downloader.startDownload) {
    console.error('[Download] window.downloader not available!')
    pushLog('⚠ Download system not ready. Please restart the app.')
    return
  }
  try {
    setBusy(true)
    updateEngineChip()
    pushLog(`🚀 Starting ${urls.length} job(s) in preset ${PRESET_LABELS[state.format]}.`)
    console.log('[Download] Calling window.downloader.startDownload with:', { urls, format: state.format, destination: state.destination })
    const result = await window.downloader.startDownload({ urls, format: state.format, destination: state.destination || undefined })
    console.log('[Download] Result:', result)
    if (result?.outputDir) {
      setDestination(result.outputDir)
    }
    pushLog(`✔ Download complete. ${urls.length} file${urls.length === 1 ? '' : 's'} ready. Click Export to save.`)
  } catch (error) {
    console.error('[Download error]', error)
    pushLog(`⚠ ${error?.message || 'Download failed. Check your connection and try again.'}`)
  } finally {
    setBusy(false)
    updateEngineChip()
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
  document.body.classList.remove('exporting')
  updateExportMessage('Choose resolution and format for export.')
  exportConfirm.disabled = false
  exportConfirm.textContent = exportConfirmDefaultLabel
  exportConfirm.style.background = ''
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
  // Relaxed filter: Accept any format with audio codec
  const audioFormats = formats.filter(fmt => fmt.acodec && fmt.acodec !== 'none')
  const qualities = new Map()
  
  audioFormats.forEach(fmt => {
    // Use ABR (Audio Bitrate) or fallback to TBR (Total Bitrate) or estimate from filesize
    let bitrate = fmt.abr || fmt.tbr || 0
    
    // If bitrate is missing, try to guess from format ID (often contains bitrate)
    if (!bitrate && fmt.id) {
      const match = fmt.id.match(/-(\d+)/)
      if (match) bitrate = parseInt(match[1])
    }
    
    // If still 0, use a unique key based on ID to ensure it shows up
    const key = bitrate > 0 ? Math.floor(bitrate) : `unknown-${fmt.id}`
    
    // If we already have this bitrate, prefer audio-only source over video+audio source
    const existing = qualities.get(key)
    const isAudioOnly = !fmt.vcodec || fmt.vcodec === 'none'
    
    // Always overwrite if:
    // 1. New one is audio-only and existing is not
    // 2. We don't have this bitrate yet
    // 3. It's a "better" container (m4a/mp3 > webm for audio usually)
    if (!existing || (isAudioOnly && existing.vcodec !== 'none')) {
      qualities.set(key, {
        id: fmt.id,
        label: bitrate > 0 ? `${Math.floor(bitrate)}kbps (${fmt.ext || 'audio'})` : `Audio (${fmt.ext || 'm4a'})`,
        container: fmt.container || 'mp3',
        acodec: fmt.acodec,
        abr: bitrate,
        vcodec: fmt.vcodec
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
  updateExportMessage('Ready to export.')
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
  
  document.body.classList.add('exporting')
  updateExportMessage('Preparing export options', { loading: true })
  
  state.exportContext.targets = completed
  state.exportContext.type = 'video'
  exportTypeSelect.value = 'video'
  exportTarget.textContent = formatExportTargetLabel(completed)
  exportPop.classList.add('open')
  exportPop.setAttribute('aria-hidden', 'false')
  
  const targetUrl = completed[0].url
  const cached = formatCache.get(targetUrl)

  if (cached) {
    // Instant load from cache
    populateExportOptions(cached)
    updateExportMessage('Ready to export.')
  } else {
    // Show loading state if not cached
    updateExportMessage('Analyzing media formats', { loading: true })
    exportConfirm.disabled = true
    exportFormatSelect.disabled = true
    exportResolutionSelect.disabled = true

    try {
      const meta = await window.downloader.probeFormats(targetUrl)
      formatCache.set(targetUrl, meta)
      populateExportOptions(meta)
      updateExportMessage('Ready to export.')
    } catch (error) {
      console.error(error)
      updateExportMessage(error?.message || 'Unable to fetch stream metadata.', { variant: 'error' })
    }
  }
}

const populateExportOptions = (meta) => {
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
  
  // Enable controls
  exportConfirm.disabled = false
  exportFormatSelect.disabled = false
  exportResolutionSelect.disabled = false
  updateExportMessage('Ready to export.')
}

const bindPreviewEvents = () => {
  previewVideo.addEventListener('loadedmetadata', () => {
    resetPreviewRanges(previewVideo.duration || 0)
    previewPlayBtn.textContent = '▶'
    state.preview.ready = true
    detectVideoFormat()
    updateThumbnailRatioLabel()
    generateTimelineMarkers(previewVideo.duration)
    setStatus(`Preview ready: ${Math.round(previewVideo.duration)}s`)
    updateGuideProgress('preview')
    console.log('[Preview] Loaded successfully, duration:', previewVideo.duration)
  })
  
  // Update current time display and playhead during playback
  previewVideo.addEventListener('timeupdate', () => {
    if (state.preview.ready && previewVideo.duration) {
      const currentTime = previewVideo.currentTime
      
      // Safe update for timeline display
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = formatTime(currentTime)
      }
      
      // Update playhead position
      if (playheadIndicator) {
        const progress = (currentTime / previewVideo.duration) * 100
        playheadIndicator.style.left = `${progress}%`
        playheadIndicator.classList.add('active')
      }
      
      // Auto-stop at trim end
      if (currentTime >= state.preview.end) {
        previewVideo.pause()
        previewVideo.currentTime = state.preview.start
        previewPlayBtn.textContent = '▶'
      }
    }
  })
  
  previewVideo.addEventListener('play', () => {
    previewPlayBtn.textContent = '⏸'
  })
  
  previewVideo.addEventListener('pause', () => {
    previewPlayBtn.textContent = '▶'
  })
  
  previewVideo.addEventListener('error', (e) => {
    console.error('[Preview] Error loading video:', e)
    console.error('[Preview] Error details:', previewVideo.error)
    
    // Get the source that failed
    const failedSrc = previewVideo.src || previewVideo.currentSrc || 'unknown';
    
    const errorMsg = previewVideo.error ? 
      `Video error: ${previewVideo.error.message || 'Format error'} (URL: ${failedSrc})` : 
      `Failed to load video (URL: ${failedSrc})`
      
    setStatus(errorMsg)
    // Don't reset immediately so we can see the error
    // resetPreviewPlayer('Video reset. Load another link to keep going.')
  })
  
  previewVideo.addEventListener('canplay', () => {
    console.log('[Preview] Video can play')
  })
  
  // Timeline hover preview
  if (timelineTrack && timelineHoverPreview) {
    timelineTrack.addEventListener('mousemove', (e) => {
      if (!state.preview.ready || !previewVideo.duration) return
      
      const rect = timelineTrack.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = (x / rect.width) * 100
      const time = (percent / 100) * previewVideo.duration
      
      timelineHoverPreview.textContent = formatTime(time)
      timelineHoverPreview.style.left = `${percent}%`
      timelineHoverPreview.classList.add('visible')
    })
    
    timelineTrack.addEventListener('mouseleave', () => {
      timelineHoverPreview.classList.remove('visible')
    })
  }
  
  // Button event listeners
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
    } else {
      // Click-to-seek: Jump playback to clicked position within trim range
      const trimStart = state.preview.start
      const trimEnd = state.preview.end
      
      // Only seek if click is within trim range
      if (clickTime >= trimStart && clickTime <= trimEnd) {
        previewVideo.currentTime = clickTime
        console.log(`[Timeline] Seek to ${clickTime.toFixed(2)}s within trim range`)
      }
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
  const currentVersion = 'v1.0.0'
  const appName = 'WH404 - YT Downloader 1.0'
  
  pushLog('Checking for updates...')
  window.alert(`${appName}\n\nCurrent version: 1.0.0\n\nChecking GitHub for updates...`)
  
  try {
    const response = await fetch('https://api.github.com/repos/Pramsss108/word-hacker-404/releases/latest')
    const data = await response.json()
    const latestVersion = data.tag_name || data.name || 'v1.0.0'
    
    pushLog(`Latest version: ${latestVersion}`)
    
    if (latestVersion === currentVersion) {
      window.alert(`${appName}\n\n✅ You're up to date!\n\nCurrent: ${currentVersion}\nLatest: ${latestVersion}`)
    } else {
      window.alert(`${appName}\n\n🆕 Update available!\n\nCurrent: ${currentVersion}\nLatest: ${latestVersion}\n\nDownload: https://github.com/Pramsss108/word-hacker-404/releases`)
    }
  } catch (error) {
    pushLog('Failed to check for updates. Please visit GitHub manually.')
    window.alert(`${appName}\n\nCurrent version: 1.0.0\n\n⚠️ Could not check for updates.\n\nVisit: https://github.com/Pramsss108/word-hacker-404/releases`)
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
      if (state.previewMode === 'insights') {
        setPreviewMode('video')
      }
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

  clearQueueBtn?.addEventListener('click', () => {
    state.queue = []
    state.queueSelection.clear()
    renderQueue()
    pushLog('Cleared queue.')
  })

  // Add to Queue button click
  addToQueueBtn?.addEventListener('click', () => {
    console.log('[Button] Add to Queue clicked')
    if (textarea.value.trim().length) {
      queueLinks()
    } else {
      pushLog('Please paste a link first.')
    }
  })

  // Enter key in textarea
  textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      console.log('[Keyboard] Enter pressed')
      if (textarea.value.trim().length) {
        queueLinks()
      }
    }
  })

  const handlePasteProgress = () => {
    if (!textarea) return
    if (textarea.value.trim().length) {
      updateGuideProgress('paste')
    }
  }

  textarea?.addEventListener('input', handlePasteProgress)
  textarea?.addEventListener('paste', handlePasteProgress)

  // Removed auto-paste processing - user must manually click "Add to Queue" or press Enter

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

  summaryOpenTriggers.forEach((chip) => {
    chip.addEventListener('click', () => {
      const panel = chip.dataset.openPanel
      setActiveMetadataPanel(panel, chip)
      setPreviewMode('insights')
    })
  })

  metadataBackdrop?.addEventListener('click', () => setPreviewMode('video'))
  metadataCloseBtn?.addEventListener('click', () => setPreviewMode('video'))

  window.addEventListener('resize', () => {
    if (state.previewMode !== 'insights') return
    const anchor = lastPopoverAnchor || summaryChipRefs[state.preview.activePanel]
    if (anchor) {
      updatePopoverAnchor(anchor)
    }
  })

  document.querySelectorAll('[data-premium-copy]').forEach((btn) => {
    btn.addEventListener('click', () => handlePremiumCopy(btn.dataset.premiumCopy))
  })

  document.querySelectorAll('[data-premium-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.preview.metadata.thumbnail) {
        setPremiumStatus('Thumbnail not ready yet.', 'error')
        return
      }
      triggerDownloadFromUrl(state.preview.metadata.thumbnail, 'wh404-thumbnail.jpg')
      setPremiumStatus('Downloading thumbnail...', 'success')
    })
  })

  document.querySelectorAll('[data-export-copy]').forEach((btn) => {
    btn.addEventListener('click', () => handleExportCopy(btn.dataset.exportCopy))
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
      updateExportMessage('No items to export.', { variant: 'error' })
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
      updateExportMessage('No files available to export.', { variant: 'error' })
      return
    }
    
    try {
      // INSTANT feedback - no delay
      exportConfirm.disabled = true
      exportConfirm.textContent = 'Processing...'
      exportConfirm.style.opacity = '0.7'
      updateExportMessage('Starting export', { loading: true })
      
      // Start heartbeat to show we're alive
      let heartbeatCount = 0
      activeHeartbeat = setInterval(() => {
        heartbeatCount++
        if (heartbeatCount % 2 === 0) {
          updateExportMessage('Processing files', { loading: true })
        } else {
          updateExportMessage('Converting media', { loading: true })
        }
      }, 800)
      const destination = exportPathInput.value || state.destination || undefined
      const outputFormat = exportFormatSelect.value || 'mp4'
      
      // Use pre-processed trim file if available, otherwise pass trim data
      let trimData = null
      let exportFiles = allFiles
      
      if (state.preview.ready && (state.preview.start > 0 || state.preview.end < state.preview.duration)) {
        if (state.preview.trimmedFile) {
          // Use pre-processed file for instant export
          console.log('[Export] Using pre-processed trim file')
          exportFiles = [state.preview.trimmedFile]
          trimData = null // No need to trim again
        } else {
          // Fall back to real-time trimming
          console.log('[Export] Processing trim in real-time')
          trimData = { start: state.preview.start, end: state.preview.end }
        }
      }
      
      const metadataPayload = buildMetadataPayload()
      const exportPayload = {
        files: exportFiles,
        destination,
        outputFormat,
        trim: trimData
      }
      if (metadataPayload) {
        exportPayload.metadata = metadataPayload
      }

      const result = await window.systemDialogs?.exportFiles(exportPayload)
      
      if (activeHeartbeat) {
        clearInterval(activeHeartbeat)
        activeHeartbeat = null
      }
      
      if (result && result.exported) {
        pushLog(`✔ Exported ${result.exported.length} file${result.exported.length === 1 ? '' : 's'} to ${result.outputDir}`)
        
        // Show success state in the modal - NO POPUP
        updateExportMessage(`✓ Saved ${result.exported.length} file${result.exported.length === 1 ? '' : 's'}!`, { variant: 'success' })
        exportConfirm.textContent = '✓ Done'
        exportConfirm.style.background = 'var(--highlight)'
        exportConfirm.style.opacity = '1'
        
        // Update items to show exported status
        targets.forEach(item => {
          item.exported = true
          item.exportedFiles = result.exported
          updateHistoryStatus(item.url, 'exported')
        })
        renderQueue()
        
        // Auto-close smoothly after showing success
        setTimeout(() => {
          closeExportDrawer()
        }, 1800)
      }
    } catch (error) {
      if (activeHeartbeat) {
        clearInterval(activeHeartbeat)
        activeHeartbeat = null
      }
      console.error(error)
      updateExportMessage(`Export failed: ${error?.message || 'Unknown error'}`, { variant: 'error' })
      pushLog(`⚠ Export failed: ${error?.message || 'Unknown error'}`)
      exportConfirm.style.opacity = '1'
    } finally {
      if (exportPop.classList.contains('open')) {
        if (!exportMessage?.classList.contains('success')) {
          exportConfirm.disabled = false
          exportConfirm.textContent = exportConfirmDefaultLabel
          exportConfirm.style.background = ''
        }
      }
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

// ========================================
// DOWNLOAD HISTORY DROPDOWN
// ========================================

const HISTORY_STORAGE_KEY = 'wh404:download:history'
const MAX_HISTORY_ITEMS = 50
const HISTORY_STATUS_META = {
  exported: { icon: '📁', label: 'Saved to folder', className: 'history-status--exported' },
  retry: { icon: '↺', label: 'Retry export', className: 'history-status--retry' },
  downloaded: { icon: '⟳', label: 'Process pending', className: 'history-status--pending' }
}

const getHistoryStatusMeta = (status = 'downloaded') => {
  return HISTORY_STATUS_META[status] || HISTORY_STATUS_META.downloaded
}

const initHistoryDropdown = () => {
  const historyToggle = document.getElementById('history-toggle')
  const historyDropdown = document.getElementById('history-dropdown')
  const historyClearAll = document.getElementById('history-clear-all')
  
  if (!historyToggle || !historyDropdown) return
  
  // Toggle dropdown
  historyToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    historyDropdown.classList.toggle('open')
    if (historyDropdown.classList.contains('open')) {
      renderHistory()
    }
  })
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!historyDropdown.contains(e.target) && e.target !== historyToggle) {
      historyDropdown.classList.remove('open')
    }
  })
  
  // Clear all history
  if (historyClearAll) {
    historyClearAll.addEventListener('click', () => {
      if (confirm('Clear all download history?')) {
        localStorage.removeItem(HISTORY_STORAGE_KEY)
        renderHistory()
        pushLog('History cleared')
      }
    })
  }
  
  renderHistory()
}

const addToHistory = (url, platform, filename, status = 'downloaded') => {
  try {
    const history = getHistory()
    const entry = {
      url,
      platform: platform || 'Unknown',
      filename: filename || 'download',
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      status
    }
    
    // Remove duplicates and add to front
    const filtered = history.filter(h => h.url !== url)
    filtered.unshift(entry)
    
    // Keep only recent items
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS)
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
    renderHistory()
  } catch (err) {
    console.error('[History] Failed to save:', err)
  }
}

const getHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (err) {
    console.error('[History] Failed to load:', err)
    return []
  }
}

const updateHistoryStatus = (url, status) => {
  try {
    const history = getHistory()
    const index = history.findIndex((item) => item.url === url)
    if (index === -1) return
    history[index].status = status
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    renderHistory()
  } catch (err) {
    console.error('[History] Failed to update status:', err)
  }
}

const renderHistory = () => {
  const historyList = document.getElementById('history-list')
  if (!historyList) return
  
  const history = getHistory()
  
  if (history.length === 0) {
    historyList.innerHTML = '<p class="history-empty">No download history yet</p>'
    return
  }
  
  historyList.innerHTML = history.map(item => {
    const statusMeta = getHistoryStatusMeta(item.status)
    return `
      <div class="history-item" data-url="${item.url}">
        <div class="history-item-header">
          <div class="history-item-meta">
            <span class="history-platform">${item.platform}</span>
            <span class="history-date">${formatHistoryDate(item.timestamp)}</span>
          </div>
          <div class="history-status ${statusMeta.className}" title="${statusMeta.label}">
            <span class="history-status-icon">${statusMeta.icon}</span>
            <span class="history-status-text">${statusMeta.label}</span>
          </div>
        </div>
        <div class="history-url">${item.url}</div>
        <div class="history-filename">${item.filename}</div>
      </div>
    `
  }).join('')
  
  // Add click handlers
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url
      const textarea = document.getElementById('url-input')
      if (textarea) {
        textarea.value = url
        textarea.focus()
        updateGuideProgress('paste')
        pushLog('Loaded from history: ' + url)
      }
      document.getElementById('history-dropdown').classList.remove('open')
    })
  })
}

const formatHistoryDate = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(timestamp).toLocaleDateString()
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
    item.speed = 'Connecting...'
    item.eta = 'Please wait'
    setBusy(true)
    updateEngineChip()
    renderQueue()
    pushLog(`▶ Connecting to server: ${url}`)
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
      
      // Add to history
      const filename = files && files.length > 0 ? files[0].split(/[/\\]/).pop() : 'download'
      const platform = item.platform ? item.platform.name : 'Unknown'
      addToHistory(url, platform, filename)
      updateGuideProgress('download')
      window.tutorial?.triggerAfterFirstDownload?.()
      
      console.log('[Download Complete]', { url, files, tempDir })
      
      // Auto-load preview for the first completed item ONLY if nothing is currently loaded
      // This prevents switching away from what the user is currently watching
      if (!state.preview.file && state.queue.filter(i => i.status === 'complete').length === 1) {
        setTimeout(() => loadPreviewFromItem(item), 500)
      }

      // Pre-fetch metadata for export so the menu opens instantly later
      console.log('[Metadata] Pre-fetching formats for:', url)
      window.downloader.probeFormats(url)
        .then(meta => {
          console.log('[Metadata] Cached:', url)
          formatCache.set(url, meta)
        })
        .catch(err => console.warn('[Metadata] Background probe failed:', err))
    }
    renderQueue()
    pushLog(`✔ Downloaded ${url} - ready to export`)
  })

  window.downloader.onJobError(({ url, message }) => {
    console.error('[Job Error]', { url, message })
    const item = ensureQueueItem(url)
    item.status = 'error'
    item.speed = 'Failed'
    item.eta = 'Retry'
    renderQueue()
    pushLog(`⚠ Error: ${message || 'Download failed'}`)
    
    // Check if all jobs are done to update engine state
    const hasActive = state.queue.some(i => i.status === 'downloading' || i.status === 'pending')
    if (!hasActive) {
      setBusy(false)
      updateEngineChip()
    }
  })
  
  window.downloader.onJobCancelled(({ url }) => {
    console.log('[Job Cancelled]', url)
    const item = ensureQueueItem(url)
    item.status = 'cancelled'
    item.speed = 'Cancelled'
    item.eta = '--:--'
    item.percent = 0
    renderQueue()
    pushLog(`🚫 Cancelled: ${url}`)
    
    // Check if all jobs are done
    const hasActive = state.queue.some(i => i.status === 'downloading' || i.status === 'pending')
    if (!hasActive) {
      setBusy(false)
      updateEngineChip()
    }
  })

  let lastExportUpdate = 0
  let activeHeartbeat = null
  
  window.downloader.onExportProgress(({ file, percent, status }) => {
    if (!exportPop.classList.contains('open')) return
    
    // Stop heartbeat when real progress arrives
    if (activeHeartbeat && percent > 0) {
      clearInterval(activeHeartbeat)
      activeHeartbeat = null
    }
    
    // Throttle updates to max 2 per second to avoid UI spam
    const now = Date.now()
    if (now - lastExportUpdate < 500 && percent < 100) return
    lastExportUpdate = now
    
    const safePercent = Math.min(100, Math.max(0, Math.round(percent ?? 0)))
    const fileName = file.length > 25 ? file.slice(0, 22) + '...' : file
    
    updateExportMessage(`Converting ${fileName}`, { loading: true })
    exportConfirm.textContent = `${safePercent}%`
    exportConfirm.style.background = `linear-gradient(90deg, var(--highlight) ${safePercent}%, rgba(255, 255, 255, 0.08) ${safePercent}%)`
    exportConfirm.style.opacity = '1'
  })
}

// Loading screen handler
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen')
  const mainWindow = document.querySelector('.window')
  
  console.log('[Startup] Hiding loading screen immediately...')
  
  // IMMEDIATE visibility - no delays
  if (loadingScreen) {
    loadingScreen.style.display = 'none'
    loadingScreen.classList.add('hidden')
    console.log('[Startup] Loading screen hidden')
  }
  if (mainWindow) {
    mainWindow.style.opacity = '1'
    mainWindow.style.visibility = 'visible'
    mainWindow.classList.add('loaded')
    console.log('[Startup] Main window visible')
  }
}

// Initialize app
console.log('[Startup] Initializing renderer...')

try {
  wireEvents()
  console.log('[Startup] Events wired')
} catch (err) {
  console.error('[Startup] wireEvents failed:', err)
}

try {
  bindIpc()
  console.log('[Startup] IPC bound')
} catch (err) {
  console.error('[Startup] bindIpc failed:', err)
}

try {
  renderQueue()
  console.log('[Startup] Queue rendered')
} catch (err) {
  console.error('[Startup] renderQueue failed:', err)
}

try {
  updatePresetChip()
  console.log('[Startup] Preset chip updated')
} catch (err) {
  console.error('[Startup] updatePresetChip failed:', err)
}

try {
  updateEngineChip()
  console.log('[Startup] Engine chip updated')
} catch (err) {
  console.error('[Startup] updateEngineChip failed:', err)
}

// Initialize history dropdown
try {
  initHistoryDropdown()
  console.log('[Startup] History dropdown initialized')
} catch (err) {
  console.error('[Startup] History init failed:', err)
}

// Hide loading screen after a brief moment - FORCE IT
setTimeout(() => {
  console.log('[Startup] FORCING loading screen removal...')
  const loadingScreen = document.getElementById('loading-screen')
  const mainWindow = document.querySelector('.window')
  
  if (loadingScreen) {
    loadingScreen.style.display = 'none'
    loadingScreen.remove() // COMPLETELY REMOVE IT
  }
  if (mainWindow) {
    mainWindow.style.opacity = '1'
    mainWindow.style.visibility = 'visible'
  }
  console.log('[Startup] UI should be visible now!')
}, 500)

console.log('[Startup] Renderer initialized')

