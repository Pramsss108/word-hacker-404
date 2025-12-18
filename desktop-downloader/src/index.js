/* eslint-disable */
console.log('[Init] Loaded index.js v11 - FORCE RELOAD - EXPORT FIX APPLIED');

const PRESET_LABELS = {
  'mp4-1080': 'Best Quality (4K+)',
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
// OLD TIMELINE ELEMENTS DELETED - they don't exist in HTML
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
const metadataUIEnabled = Boolean(metadataPane && metadataPopover && metadataCards.length)
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
// OLD timeline warnings deleted

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
      thumbnail: false,
      seo: false,
      story: false
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

// Export heartbeat for progress indicator
let activeHeartbeat = null

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

const updateMediaStatusHeader = () => {
  const statusIndicator = document.getElementById('media-status-indicator')
  const statusText = document.getElementById('media-status-text')
  
  if (!statusIndicator || !statusText) return
  
  if (state.preview.ready && previewVideo?.src) {
    const width = previewVideo.videoWidth
    const height = previewVideo.videoHeight
    const duration = state.preview.duration || 0
    
    statusIndicator.classList.add('active')
    statusText.textContent = `${width}×${height} • ${formatTime(duration)}`
  } else {
    statusIndicator.classList.remove('active')
    statusText.textContent = 'No media'
  }
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
  // With fixed modal positioning, we don't need chip-based anchoring
  // Modal is always centered, so this is now a no-op
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
  // This function is kept for backward compatibility but no longer used for overlay
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

const updateInsightData = () => {
  // Thumbnail
  const thumbImage = document.getElementById('thumb-image')
  const thumbRatio = document.getElementById('thumb-ratio')
  const thumbDownload = document.getElementById('thumb-download')
  const thumbPreview = document.getElementById('thumb-preview')
  
  if (thumbImage && state.preview.metadata.thumbnail) {
    thumbImage.src = state.preview.metadata.thumbnail
    thumbDownload.disabled = false
    
    // Detect aspect ratio
    const img = new Image()
    img.onload = () => {
      const ratioVal = img.width / img.height
      const ratio = ratioVal.toFixed(2)
      const common = {
        '1.78': '16:9',
        '0.56': '9:16',
        '1.00': '1:1',
        '1.33': '4:3',
        '0.75': '3:4'
      }
      thumbRatio.textContent = common[ratio] || `${img.width}x${img.height}`
      
      // Auto-adjust container aspect ratio to match image
      if (thumbPreview) {
        thumbPreview.style.aspectRatio = `${img.width} / ${img.height}`
      }
    }
    img.src = state.preview.metadata.thumbnail
  } else if (thumbImage) {
    thumbImage.removeAttribute('src')
    thumbRatio.textContent = '--'
    thumbDownload.disabled = true
    if (thumbPreview) {
      thumbPreview.style.aspectRatio = '16 / 9' // Reset to default
    }
  }
  
  // Keywords
  const keywordsField = document.getElementById('summary-keywords')
  if (keywordsField) {
    const keywords = (state.preview.metadata.keywords || []).filter(Boolean)
    if (keywords.length) {
      keywordsField.textContent = keywords.join(', ')
      keywordsField.classList.add('ready')
    } else {
      keywordsField.textContent = 'Waiting for clip...'
      keywordsField.classList.remove('ready')
    }
  }
  
  // Title
  const titleField = document.getElementById('summary-title')
  if (titleField) {
    if (state.preview.metadata.title) {
      titleField.textContent = state.preview.metadata.title
      titleField.classList.add('ready')
    } else {
      titleField.textContent = 'Waiting for clip...'
      titleField.classList.remove('ready')
    }
  }
  
  // Description
  const descField = document.getElementById('summary-description')
  if (descField) {
    if (state.preview.metadata.description) {
      descField.textContent = state.preview.metadata.description
      descField.classList.add('ready')
    } else {
      descField.textContent = 'Waiting for clip...'
      descField.classList.remove('ready')
    }
  }
}

const applyPremiumToggleUI = () => {
  // Show/hide individual insight cards based on toggle state
  const overlay = document.querySelector('.insight-overlay')
  const thumbnailCard = document.querySelector('[data-insight-feature="thumbnail"]')
  const seoCards = document.querySelectorAll('[data-insight-feature="seo"]')
  const storyCards = document.querySelectorAll('[data-insight-feature="story"]')
  const previewVideo = document.getElementById('preview-video')
  
  const thumbnailEnabled = state.preview.premium.thumbnail
  const seoEnabled = state.preview.premium.seo
  const storyEnabled = state.preview.premium.story
  const anyEnabled = thumbnailEnabled || seoEnabled || storyEnabled
  
  if (thumbnailCard) {
    thumbnailCard.style.display = thumbnailEnabled ? 'block' : 'none'
  }
  seoCards.forEach(card => {
    card.style.display = seoEnabled ? 'block' : 'none'
  })
  storyCards.forEach(card => {
    card.style.display = storyEnabled ? 'block' : 'none'
  })
  
  // Control overlay visibility with active class
  if (overlay) {
    if (anyEnabled) {
      overlay.classList.add('active')
    } else {
      overlay.classList.remove('active')
    }
  }
  
  // Hide video when any insight is active, show when all are off
  if (previewVideo) {
    if (anyEnabled) {
      previewVideo.style.opacity = '0'
      previewVideo.style.pointerEvents = 'none'
      try {
        previewVideo.pause()
      } catch (e) {
        // ignore
      }
    } else {
      previewVideo.style.opacity = '1'
      previewVideo.style.pointerEvents = 'auto'
    }
  }
  
  // Update modal cards
  Object.entries(premiumCardGroups).forEach(([feature, cards]) => {
    cards.forEach((card) => card?.classList.toggle('disabled', !state.preview.premium[feature]))
  })
  
  const activeFeature = summaryFeatureLookup[state.preview.activePanel]
  if (activeFeature && !state.preview.premium[activeFeature]) {
    setActiveMetadataPanel(getFirstEnabledPanel())
  }
  
  updateInsightData()
  renderExportMetadata()
}

const renderExportMetadata = () => {
  if (exportMetaThumbnail) {
    if (!state.preview.premium.thumbnail) {
      exportMetaThumbnail.textContent = 'Disabled'
    } else if (state.preview.metadata.thumbnail) {
      exportMetaThumbnail.textContent = 'Attached'
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
    const hashtags = state.preview.metadata.extractedHashtags || []
    const commaTags = state.preview.metadata.commaSeparatedTags || []
    
    // DEBUG: Log what we extracted
    console.log('[Keywords Debug]', {
      keywords,
      hashtags,
      commaTags,
      fullMetadata: state.preview.metadata
    })
    
    // Combine all metadata sources
    const allTags = [
      ...keywords,
      ...commaTags,
      ...hashtags.map(h => h.replace('#', ''))  // Remove # for display
    ].filter(Boolean)
    
    // Display with section labels if we have multiple sources
    if (keywords.length || hashtags.length || commaTags.length) {
      let display = ''
      if (keywords.length) display += `📌 YT Tags: ${keywords.join(', ')}`
      if (hashtags.length) display += `${display ? '\n\n' : ''}🏷️ Hashtags: ${hashtags.join(' ')}`
      if (commaTags.length) display += `${display ? '\n\n' : ''}✨ Description Tags: ${commaTags.slice(0, 10).join(', ')}`
      premiumKeywordsField.textContent = display
    } else {
      premiumKeywordsField.textContent = 'Keywords will appear here'
    }
  }

  if (premiumTitleField) {
    premiumTitleField.textContent = state.preview.metadata.title || 'Title not ready'
  }
  if (premiumDescriptionField) {
    premiumDescriptionField.textContent = state.preview.metadata.description || 'Description will appear here when a clip is selected.'
  }
  updateSummaryChips()
  updateInsightData()
  renderExportMetadata()
}

const setPreviewMode = (mode = 'video') => {
  if (!previewPane) return
  const insightsAvailable = metadataUIEnabled && Boolean(metadataPopover)
  const nextMode = insightsAvailable && mode === 'insights' ? 'insights' : 'video'
  if (mode === 'insights' && !insightsAvailable) {
    console.info('[PreviewMode] Metadata UI disabled, staying in video mode')
  }
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

  // DEBUG: Log full backend response
  console.log('[Metadata] Full backend response:', response)
  console.log('[Metadata] Response keywords:', response?.keywords)
  console.log('[Metadata] Response tags:', response?.tags)

  const description = response?.description || fallback.description || ''
  
  console.log('[Metadata] Description:', description)
  
  // Extract hashtags from description (multiple patterns)
  const hashtagPattern1 = /#[\w\u0980-\u09FF]+/g  // Standard + Bengali
  const hashtagPattern2 = /#[a-zA-Z0-9_]+/g       // Alphanumeric only
  
  const hashtags1 = description.match(hashtagPattern1) || []
  const hashtags2 = description.match(hashtagPattern2) || []
  const hashtags = [...new Set([...hashtags1, ...hashtags2])]  // Remove duplicates
  
  console.log('[Metadata] Extracted hashtags:', hashtags)
  
  // Extract comma-separated tags from description (smart parsing)
  const commaTags = description
    .split(/[,،]/)  // Support English and Bengali commas
    .map(t => t.trim())
    .filter(t => t && !t.startsWith('#') && t.length > 2 && t.length < 50)
    .slice(0, 20)  // Limit to 20 tags max
  
  console.log('[Metadata] Extracted comma tags:', commaTags)
  
  // Extract keywords/tags - check multiple possible field names
  let extractedKeywords = []
  
  // Priority: tags > keywords > categories
  if (Array.isArray(response?.tags) && response.tags.length) {
    extractedKeywords = response.tags
    console.log('[Metadata] Using response.tags:', response.tags)
  } else if (Array.isArray(response?.keywords) && response.keywords.length) {
    extractedKeywords = response.keywords
    console.log('[Metadata] Using response.keywords:', response.keywords)
  } else if (Array.isArray(response?.categories) && response.categories.length) {
    extractedKeywords = response.categories
    console.log('[Metadata] Using response.categories:', response.categories)
  } else {
    extractedKeywords = fallback.keywords
    console.log('[Metadata] Using fallback keywords:', fallback.keywords)
  }
  
  // ENHANCE: If we only have 1-2 keywords (likely fallback), add hashtags as keywords
  if (extractedKeywords.length <= 2 && hashtags.length > 0) {
    const hashtagWords = hashtags.map(h => h.replace('#', '').toLowerCase())
    extractedKeywords = [...extractedKeywords, ...hashtagWords]
    console.log('[Metadata] Enhanced keywords with hashtags:', extractedKeywords)
  }
  
  // ENHANCE: Add title words if keywords are still weak
  if (extractedKeywords.length <= 3 && response?.title) {
    const titleWords = response.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'this', 'that', 'have', 'will'].includes(w))
      .slice(0, 5)
    extractedKeywords = [...extractedKeywords, ...titleWords]
    console.log('[Metadata] Enhanced keywords with title words:', extractedKeywords)
  }
  
  const normalized = {
    title: response?.title || fallback.title,
    description: description,
    keywords: extractedKeywords,
    thumbnail: response?.thumbnail || fallback.thumbnail,
    fetched: Boolean(response),
    // NEW: Store extracted metadata separately
    extractedHashtags: hashtags,
    commaSeparatedTags: commaTags
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

const handlePremiumSave = async (target) => {
  if (target === 'title') {
    const title = state.preview.metadata.title || ''
    if (!title) {
      setPremiumStatus('Title not ready yet.', 'error')
      return
    }
    
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)
    const savePath = await window.systemDialogs?.saveFile({
      defaultPath: `${sanitizedTitle}-title.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })
    
    if (!savePath) return  // User cancelled
    
    const encoder = new TextEncoder()
    const buffer = encoder.encode(title)
    await window.downloader.saveFile(savePath, buffer.buffer)
    setPremiumStatus('Title saved successfully.', 'success')
    return
  }
  
  if (target === 'description') {
    const description = state.preview.metadata.description || ''
    if (!description) {
      setPremiumStatus('Description not ready yet.', 'error')
      return
    }
    
    const title = state.preview.metadata.title || 'description'
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)
    const savePath = await window.systemDialogs?.saveFile({
      defaultPath: `${sanitizedTitle}-description.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })
    
    if (!savePath) return  // User cancelled
    
    const encoder = new TextEncoder()
    const buffer = encoder.encode(description)
    await window.downloader.saveFile(savePath, buffer.buffer)
    setPremiumStatus('Description saved successfully.', 'success')
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

const updateExportMessage = (text, { loading = false, variant, html = false } = {}) => {
  if (exportMessageText) {
    if (html) {
      exportMessageText.innerHTML = text
    } else {
      exportMessageText.textContent = text
    }
  } else {
    if (html) {
      exportMessage.innerHTML = text
    } else {
      exportMessage.textContent = text
    }
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
      // FIX: Use onclick directly to ensure it works
      revealBtn.onclick = (e) => {
        e.stopPropagation();
        const path = file;
        console.log('[Batch] Opening folder for:', path);
        if (window.downloader?.openFolderLocation) {
           window.downloader.openFolderLocation(path);
        } else if (window.systemDialogs?.openFolder) {
           window.systemDialogs.openFolder(path);
        }
      };
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

// OLD generateTimelineMarkers function DELETED - element doesn't exist

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

  // Try Bridge/Tauri conversion first (fixes Asset Protocol errors)
  if (window.downloader && window.downloader.convertPath) {
    const converted = window.downloader.convertPath(filePath)
    if (converted) return converted
  }

  if (filePath.startsWith('file://')) return filePath
  // Properly handle Windows paths and special characters
  const normalized = filePath.replace(/\\/g, '/')
  const withDrive = normalized.replace(/^([a-zA-Z]):/, '/$1:')
  // Encode each path segment to handle special chars, but not the slashes
  const encoded = withDrive.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `file://${encoded.startsWith('/') ? '' : '/'}${encoded}`
}

const splitPathComponents = (targetPath = '') => {
  if (!targetPath) {
    return { dir: '', base: '', sep: '' }
  }
  const normalized = targetPath.trim()
  const lastBackslash = normalized.lastIndexOf('\\')
  const lastSlash = normalized.lastIndexOf('/')
  const lastIndex = Math.max(lastBackslash, lastSlash)
  if (lastIndex === -1) {
    return { dir: '', base: normalized, sep: '' }
  }
  return {
    dir: normalized.slice(0, lastIndex),
    base: normalized.slice(lastIndex + 1),
    sep: normalized[lastIndex]
  }
}

const joinPathSegments = (dirPath, fileName, sepHint = '\\') => {
  if (!dirPath) return fileName
  const separator = sepHint || (dirPath.includes('/') ? '/' : '\\')
  const needsSeparator = !dirPath.endsWith(separator)
  return `${dirPath}${needsSeparator ? separator : ''}${fileName}`
}

// Helper to resolve actual file path using fuzzy search
const resolveItemFiles = async (item) => {
  console.log('[Resolve] Starting resolution for item:', item.url)
  if (!item.files || !item.files.length) {
    console.warn('[Resolve] No files in item to resolve')
    return
  }
  
  // Process each file in the item
  for (let i = 0; i < item.files.length; i++) {
    const source = item.files[i]
    console.log(`[Resolve] Checking file [${i}]: ${source}`)
    
    try {
      const { dir: sourceDir, base: sourceFile, sep: sourceSep } = splitPathComponents(source)
      
      // 1. Check if exact path exists
      let exists = false
      if (window.downloader && window.downloader.checkFileExists) {
        try {
          exists = await window.downloader.checkFileExists(source)
          console.log(`[Resolve] Existence check result: ${exists}`)
        } catch (err) {
          console.error('[Resolve] checkFileExists threw error:', err)
        }
      } else {
        console.warn('[Resolve] window.downloader.checkFileExists is missing!')
      }

      if (exists) {
        console.log('[Resolve] File exists, skipping search.')
        continue // File is good, move to next
      }
      
      console.warn(`[Resolve] File not found: ${source}. Searching directory...`)
      
      // 2. Search directory
      if (sourceDir && window.downloader && window.downloader.readDir) {
        try {
          console.log(`[Resolve] Reading directory: ${sourceDir}`)
          const rawEntries = await window.downloader.readDir(sourceDir)
          const entryToName = (entry) => {
            if (typeof entry === 'string') return entry
            if (entry && typeof entry === 'object') {
              if (entry.name) return entry.name
              if (entry.path) return splitPathComponents(entry.path).base
            }
            return ''
          }
          const files = (rawEntries || []).map(entryToName).filter(Boolean)
          console.log(`[Resolve] Found ${files.length} files in directory`)
          
          const normalizeForMatch = (str) => {
            // Remove .f123 (format code) if present
            let normalized = str.replace(/\.f\d{2,3}(?=\.\w+$)/gi, '')
            // Remove extension
            normalized = normalized.replace(/\.\w+$/gi, '')
            // Keep only alphanumeric
            return normalized.toLowerCase().replace(/[^a-z0-9]/g, '')
          }
          
          const expectedNormalized = normalizeForMatch(sourceFile)
          console.log(`[Resolve] Looking for normalized: ${expectedNormalized}`)
          
          // Try exact match first (normalized)
          let match = files.find((filename) => normalizeForMatch(filename) === expectedNormalized)
          
          // Try fuzzy match
          if (!match) {
            // Take first 20 chars of normalized title
            const searchKey = expectedNormalized.slice(0, 20)
            console.log(`[Resolve] Fuzzy search key: ${searchKey}`)
            
            match = files.find((filename) => {
              return normalizeForMatch(filename).includes(searchKey)
            })
          }
          
          if (match) {
            const newPath = joinPathSegments(sourceDir, match, sourceSep)
            console.log(`[Resolve] ✅ Found match: ${newPath}`)
            item.files[i] = newPath
          } else {
            console.error(`[Resolve] ❌ No match found for ${sourceFile}`)
            // Fallback: Try to find ANY file with similar extension if list is small? No, too risky.
          }
        } catch (e) {
          console.error('[Resolve] Directory scan failed:', e)
        }
      } else {
        console.warn('[Resolve] Cannot read directory (missing API)')
      }
    } catch (outerErr) {
      console.error('[Resolve] Critical error processing file:', outerErr)
    }
  }
  console.log('[Resolve] Finished resolution for item')
  return item.files
}

const loadPreviewFromItem = async (item) => {
  if (!item.files || !item.files.length) {
    setStatus('Preview not ready yet. Finish the download first.')
    return
  }
  
  // Ensure files are resolved before loading
  await resolveItemFiles(item)
  
  // Find the first video/audio file
  const source = item.files.find(f => 
    f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv') || f.endsWith('.mp3') || f.endsWith('.m4a')
  ) || item.files[0]
  
  state.preview.file = source
  state.preview.url = item.url
  
  // Clear any previous errors
  previewVideo.removeAttribute('poster')
  previewEmpty.classList.add('hidden')
  
  console.log('[Preview] Loading:', source)
  console.log('[Preview] CODE VERSION: BULLETPROOF_V2')
  
  // Skip Blob loading for now - causes memory issues with large files
  // Try asset protocol directly
  let fileUrl = toFileUrl(source);
  console.log('[Preview] Using Asset URL:', fileUrl);
  
  previewVideo.src = fileUrl
  previewVideo.load()
  previewInfo.textContent = item.url
  updateGuideProgress('preview')
  fetchPremiumMetadata(item)
}

syncPreviewWithSelection = (selectedItems = getSelectedQueueItems()) => {
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

const detectVideoFormat = () => {
  const width = previewVideo.videoWidth
  const height = previewVideo.videoHeight
  const aspectRatio = width / height
  
  // Remove all format classes
  previewCard.classList.remove('video-horizontal', 'video-vertical', 'video-shorts')
  if (premiumThumbnailFrame) premiumThumbnailFrame.classList.remove('vertical', 'shorts')
  
  let format = 'Unknown'
  
  if (height > width) {
    // Vertical video (likely Shorts, Reels, TikTok)
    if (premiumThumbnailFrame) premiumThumbnailFrame.classList.add('vertical')
    
    if (aspectRatio < 0.6) {
      format = '9:16 Shorts'
      previewCard.classList.add('video-shorts')
      if (premiumThumbnailFrame) premiumThumbnailFrame.classList.add('shorts')
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
  updateMediaStatusHeader()
  // OLD updateTrimFill() call deleted
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
  // OLD updateTrimFill() call deleted
  
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

// OLD updateTrimFill function DELETED - element doesn't exist

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

  // OLD updateTrimFill() call deleted

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
    // Get trim boundaries
    const trimStart = parseFloat(trimStartInput.value) || 0
    const trimEnd = parseFloat(trimEndInput.value) || previewVideo.duration
    const currentTime = previewVideo.currentTime
    
    // Smart playback: Continue from current OR start from trim if outside
    if (currentTime < trimStart || currentTime >= trimEnd) {
      // Outside trim range - jump to trim start
      console.log(`[Play] Outside trim range, starting from ${trimStart.toFixed(2)}s`)
      previewVideo.currentTime = trimStart
    } else {
      // Inside trim range - CONTINUE from current position
      console.log(`[Play] Continuing from ${currentTime.toFixed(2)}s`)
    }
    
    previewVideo.play()
    previewPlayBtn.textContent = '⏸' // Pause icon
  } else {
    previewVideo.pause()
    previewPlayBtn.textContent = '▶' // Play icon
  }
}

const stopPreview = () => {
  if (!state.preview.ready) return
  previewVideo.pause()
  // Read current trim start value from input
  const trimStart = parseFloat(trimStartInput.value) || 0
  previewVideo.currentTime = trimStart
  previewPlayBtn.textContent = '▶' // Play icon
}

const restartPreview = () => {
  if (!state.preview.ready) return
  // Read current trim start value from input
  const trimStart = parseFloat(trimStartInput.value) || 0
  previewVideo.currentTime = trimStart
  previewVideo.play()
  previewPlayBtn.textContent = '⏸' // Pause icon
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
              </div>
              <p class="slot-status">${item.exported ? 'Saved' : item.status === 'pending' ? 'Waiting' : item.status === 'downloading' ? 'Processing' : item.status === 'complete' ? 'Temporary' : item.status === 'cancelled' ? 'Cancelled' : 'Error'}</p>
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
  
  // ============================================
  // AD CHECK - DISABLED (Temporary Bypass)
  // ============================================
  /*
  console.log('[Ad] About to check if ad required...')
  try {
    console.log('[Ad] Calling check_ad_required...')
    const needsAd = await window.__TAURI__.invoke('check_ad_required')
    console.log('[Ad] check_ad_required returned:', needsAd)
    if (needsAd) {
      console.log('[Ad] User needs to watch ad - BLOCKING download')
      pushLog('⏳ Loading ad... Watch to unlock download')
      
      // BLOCK until ad completes - no download without ad
      await window.showAdForDownload(urls[0])
      
      console.log('[Ad] Ad complete, authorizing with server...')
      
      // Verify token with server before allowing download
      if (!window.currentDownloadToken) {
        pushLog('⚠ Ad verification failed. Please try again.')
        return // BLOCK - no token = no download
      }
      
      // Authorize download with server
      try {
        await window.__TAURI__.invoke('authorize_download', {
          token: window.currentDownloadToken,
          url: urls[0]
        })
        console.log('[Ad] Download authorized by server')
        window.currentDownloadToken = null // Clear token after use
      } catch (authErr) {
        console.error('[Ad] Authorization failed:', authErr)
        pushLog('⚠ Download not authorized. Token expired or invalid.')
        return // BLOCK - authorization failed
      }
    }
  } catch (err) {
    console.error('[Ad] Check failed:', err)
    pushLog('⚠ Ad system error. Please restart app.')
    return // STOP download if ad fails
  }
  */
  
  try {
    setBusy(true)
    updateEngineChip()
    pushLog(`🚀 Starting ${urls.length} job(s).`)
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
  delete exportConfirm.dataset.action
  delete exportConfirm.dataset.path
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
  
  // Map all audio formats with their details, using tbr as fallback for abr
  const formattedAudio = audioFormats.map(fmt => ({
    id: fmt.id,
    label: `${Math.floor(fmt.abr || fmt.tbr || 128)}kbps - ${(fmt.acodec || 'audio').toUpperCase()} (${(fmt.ext || 'unknown').toUpperCase()})`,
    container: fmt.container || fmt.ext || 'mp3',
    acodec: fmt.acodec,
    abr: fmt.abr || fmt.tbr || 128,
    ext: fmt.ext
  }))
  
  // Sort by bitrate descending (highest quality first)
  return formattedAudio.sort((a, b) => (b.abr || 0) - (a.abr || 0))
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
    // OLD generateTimelineMarkers() call deleted
    setStatus(`Preview ready: ${Math.round(previewVideo.duration)}s`)
    updateGuideProgress('preview')
    console.log('[Preview] Loaded successfully, duration:', previewVideo.duration)
    
    // Initialize premium timeline after video loads
    console.log('[Preview] Initializing premium timeline...')
    initPremiumTimeline()
  })
  
  // Update current time display and playhead during playback - THROTTLED
  let rafId = null
  let playheadUpdateFrame = null
  
  // Continuous playhead animation function
  const updatePlayheadContinuously = () => {
    if (!previewVideo || previewVideo.paused || !previewVideo.duration) {
      if (playheadUpdateFrame) {
        cancelAnimationFrame(playheadUpdateFrame)
        playheadUpdateFrame = null
      }
      return
    }
    
    // Update playhead position
    const playheadElement = document.getElementById('timeline-playhead')
    if (playheadElement && previewVideo.currentTime !== undefined) {
      const currentPercent = (previewVideo.currentTime / previewVideo.duration) * 100
      playheadElement.style.left = `${Math.max(0, Math.min(100, currentPercent))}%`
      playheadElement.classList.add('active')
    }
    
    // Continue animation loop
    playheadUpdateFrame = requestAnimationFrame(updatePlayheadContinuously)
  }
  
  // Start playhead animation on play
  previewVideo.addEventListener('play', () => {
    console.log('[Playhead] ▶️ Starting continuous animation')
    updatePlayheadContinuously()
  })
  
  // Stop playhead animation on pause
  previewVideo.addEventListener('pause', () => {
    console.log('[Playhead] ⏸️ Stopping animation')
    if (playheadUpdateFrame) {
      cancelAnimationFrame(playheadUpdateFrame)
      playheadUpdateFrame = null
    }
    // Final update to show correct position when paused
    const playheadElement = document.getElementById('timeline-playhead')
    if (playheadElement && previewVideo.duration) {
      const currentPercent = (previewVideo.currentTime / previewVideo.duration) * 100
      playheadElement.style.left = `${currentPercent}%`
    }
  })
  
  previewVideo.addEventListener('timeupdate', () => {
    if (!state.preview.ready || !previewVideo.duration) return
    
    // Cancel previous frame if still pending
    if (rafId) cancelAnimationFrame(rafId)
    
    // Throttle updates to animation frames only
    rafId = requestAnimationFrame(() => {
      const currentTime = previewVideo.currentTime
      
      // Safe update for timeline display
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = formatTime(currentTime)
      }
      
      // Auto-loop at trim end - use current input values
      const trimStart = parseFloat(trimStartInput.value) || 0
      const trimEnd = parseFloat(trimEndInput.value) || previewVideo.duration
      
      if (currentTime >= trimEnd) {
        previewVideo.currentTime = trimStart
        // Keep playing (loop)
      }
      
      // If somehow before trim start, jump to start
      if (currentTime < trimStart) {
        previewVideo.currentTime = trimStart
      }
      
      rafId = null
    })
  })
  
  previewVideo.addEventListener('play', () => {
    previewPlayBtn.textContent = '⏸' // Pause icon - matches video playing
  })
  
  previewVideo.addEventListener('pause', () => {
    previewPlayBtn.textContent = '▶' // Play icon - matches video paused
  })
  
  previewVideo.addEventListener('error', (e) => {
    console.error('[Preview] Error loading video:', e)
    console.error('[Preview] Error details:', previewVideo.error)
    const errorMsg = previewVideo.error ? 
      `Video error: ${previewVideo.error.message || 'Could not load file'}` : 
      'Failed to load video'
    setStatus(errorMsg)
    resetPreviewPlayer('Video reset. Load another link to keep going.')
  })
  
  previewVideo.addEventListener('canplay', () => {
    console.log('[Preview] Video can play')
  })
  
  // OLD timeline hover code DELETED - elements don't exist
  
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
  
  // Jump to position and play when clicking trim START slider
  trimStartInput.addEventListener('click', () => {
    if (!state.preview.ready) return
    const trimStart = parseFloat(trimStartInput.value) || 0
    console.log(`[Trim Start Click] Jumping to ${trimStart.toFixed(2)}s and playing`)
    previewVideo.currentTime = trimStart
    previewVideo.play()
    previewPlayBtn.textContent = '\u23f8' // Pause icon
  })
  
  // Jump to position and STOP when clicking trim END slider
  trimEndInput.addEventListener('click', () => {
    if (!state.preview.ready) return
    const trimEnd = parseFloat(trimEndInput.value) || previewVideo.duration
    console.log(`[Trim End Click] Jumping to ${trimEnd.toFixed(2)}s and stopping`)
    previewVideo.currentTime = trimEnd
    previewVideo.pause()
    previewPlayBtn.textContent = '\u25b6' // Play icon
  })
  
  // Professional Feature: Mouse wheel to scrub through timeline
  previewVideo.addEventListener('wheel', (event) => {
    if (!state.preview.ready) return
    event.preventDefault()
    
    // Scroll up = forward, scroll down = backward
    const delta = -event.deltaY * 0.01 // Smooth scroll amount
    const newTime = Math.max(0, Math.min(previewVideo.duration, previewVideo.currentTime + delta))
    previewVideo.currentTime = newTime
    console.log(`[Wheel] Scrub to ${newTime.toFixed(2)}s`)
  }, { passive: false })
  
  // Professional Feature: Live preview while dragging trim sliders
  let isDraggingSlider = false
  let isDraggingStart = false
  let wasPausedBeforeDrag = false
  
  const startSliderDrag = (isStartHandle) => {
    isDraggingSlider = true
    isDraggingStart = isStartHandle
    wasPausedBeforeDrag = previewVideo.paused
    // ALWAYS pause video while dragging for precise visual feedback
    previewVideo.pause()
    previewPlayBtn.textContent = '▶' // Show play icon
    console.log(`[Drag Start] ${isStartHandle ? 'START' : 'END'} slider grabbed - video paused for precision`)
  }
  
  const updateSliderDrag = (slider, isStartHandle) => {
    if (!isDraggingSlider || !state.preview.ready) return
    const value = parseFloat(slider.value) || 0
    
    // INSTANT video preview at slider position
    previewVideo.currentTime = value
    
    // Visual feedback in console
    const label = isStartHandle ? 'TRIM START' : 'TRIM END'
    console.log(`[${label} Drag] 🎬 Previewing frame at ${value.toFixed(2)}s`)
    
    // Update time display
    if (currentTimeDisplay) {
      currentTimeDisplay.textContent = formatTime(value)
    }
  }
  
  const endSliderDrag = () => {
    if (isDraggingSlider) {
      const wasStart = isDraggingStart
      isDraggingSlider = false
      isDraggingStart = false
      
      console.log(`[Drag End] Trim ${wasStart ? 'START' : 'END'} set - ready to continue`)
      
      // DON'T auto-resume - let user decide when to play
      // This gives them time to review the frame they selected
    }
  }
  
  trimStartInput.addEventListener('mousedown', () => startSliderDrag(true))
  trimStartInput.addEventListener('input', () => updateSliderDrag(trimStartInput, true))
  trimStartInput.addEventListener('mouseup', endSliderDrag)
  trimStartInput.addEventListener('mouseleave', endSliderDrag)
  
  trimEndInput.addEventListener('mousedown', () => startSliderDrag(false))
  trimEndInput.addEventListener('input', () => updateSliderDrag(trimEndInput, false))
  trimEndInput.addEventListener('mouseup', endSliderDrag)
  trimEndInput.addEventListener('mouseleave', endSliderDrag)
  
  // Professional Feature: Double-click video to toggle fullscreen
  previewVideo.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      previewVideo.requestFullscreen()
    }
  })
  
  // Professional Feature: Click on video to play/pause
  previewVideo.addEventListener('click', (event) => {
    // Don't interfere with double-click
    if (event.detail === 1) {
      setTimeout(() => {
        if (event.detail === 1 && state.preview.ready) {
          togglePreviewPlayback()
        }
      }, 200)
    }
  })
}

const chooseDestinationFolder = async () => {
  try {
    const selected = await window.systemDialogs.chooseFolder()
    if (selected) {
      setDestination(selected)
    }
  } catch (err) {
    console.error('Failed to choose folder:', err)
  }
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
    
    // Don't interfere with typing in input fields
    if (event.target.matches('input, textarea, select')) return
    
    // Professional Timeline Keyboard Shortcuts
    if (!state.preview.ready) return
    
    switch(event.code) {
      case 'Space':
        // Spacebar: Play/Pause
        event.preventDefault()
        togglePreviewPlayback()
        break
        
      case 'KeyK':
        // K: Play/Pause (industry standard)
        event.preventDefault()
        togglePreviewPlayback()
        break
        
      case 'KeyJ':
        // J: Rewind 1 second (frame back)
        event.preventDefault()
        previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 1)
        console.log(`[J] Rewind to ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'KeyL':
        // L: Forward 1 second (frame forward)
        event.preventDefault()
        previewVideo.currentTime = Math.min(previewVideo.duration, previewVideo.currentTime + 1)
        console.log(`[L] Forward to ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'ArrowLeft':
        // Arrow Left: Jump back 5 seconds
        event.preventDefault()
        previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 5)
        console.log(`[←] Jump back to ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'ArrowRight':
        // Arrow Right: Jump forward 5 seconds
        event.preventDefault()
        previewVideo.currentTime = Math.min(previewVideo.duration, previewVideo.currentTime + 5)
        console.log(`[→] Jump forward to ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'Home':
        // Home: Jump to trim START
        event.preventDefault()
        previewVideo.currentTime = parseFloat(trimStartInput.value) || 0
        console.log(`[Home] Jump to trim start`)
        break
        
      case 'End':
        // End: Jump to trim END
        event.preventDefault()
        previewVideo.currentTime = parseFloat(trimEndInput.value) || previewVideo.duration
        console.log(`[End] Jump to trim end`)
        break
        
      case 'KeyI':
        // I: Set IN point (trim start at current position)
        event.preventDefault()
        trimStartInput.value = previewVideo.currentTime
        clampPreviewRanges()
        console.log(`[I] Set IN point at ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'KeyO':
        // O: Set OUT point (trim end at current position)
        event.preventDefault()
        trimEndInput.value = previewVideo.currentTime
        clampPreviewRanges()
        console.log(`[O] Set OUT point at ${previewVideo.currentTime.toFixed(2)}s`)
        break
        
      case 'Comma':
        // , (comma): Previous frame (0.1s back)
        if (event.shiftKey) {
          event.preventDefault()
          previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 0.1)
          console.log(`[,] Frame back to ${previewVideo.currentTime.toFixed(2)}s`)
        }
        break
        
      case 'Period':
        // . (period): Next frame (0.1s forward)
        if (event.shiftKey) {
          event.preventDefault()
          previewVideo.currentTime = Math.min(previewVideo.duration, previewVideo.currentTime + 0.1)
          console.log(`[.] Frame forward to ${previewVideo.currentTime.toFixed(2)}s`)
        }
        break
    }
  })

  const storedDestination = window.localStorage?.getItem(STORAGE_KEYS.destination)
  if (storedDestination) {
    state.destination = storedDestination
  }
  updateDestinationLabel()
  
  // Keyboard Shortcuts Modal
  const shortcutsModal = document.getElementById('shortcuts-modal')
  const shortcutsBtn = document.getElementById('shortcuts-help')
  const shortcutsClose = document.getElementById('shortcuts-close')
  
  const openShortcutsModal = () => {
    if (shortcutsModal) {
      shortcutsModal.style.display = 'flex'
      console.log('[Shortcuts] Modal opened')
    }
  }
  
  const closeShortcutsModal = () => {
    if (shortcutsModal) {
      shortcutsModal.style.display = 'none'
      console.log('[Shortcuts] Modal closed')
    }
  }
  
  shortcutsBtn?.addEventListener('click', openShortcutsModal)
  shortcutsClose?.addEventListener('click', closeShortcutsModal)
  shortcutsModal?.addEventListener('click', (e) => {
    // Close if clicking outside the content
    if (e.target === shortcutsModal) {
      closeShortcutsModal()
    }
  })
  
  // Add ? key to open shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.target.matches('input, textarea, select')) {
      e.preventDefault()
      openShortcutsModal()
    }
  })

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

  // === 🔬 DIAGNOSTIC PANEL SYSTEM ===
  const diagnosticPanel = document.getElementById('diagnostic-panel')
  const diagnosticToggleBtn = document.getElementById('diagnostic-toggle')
  const diagnosticMenuToggle = document.getElementById('diagnostic-menu-toggle')
  const diagnosticOutput = document.getElementById('diagnostic-output')
  const diagnosticCopyBtn = document.getElementById('diagnostic-copy')
  
  let diagnosticActive = false
  let lastInspectedElement = null
  let lastInspectedCode = ''
  
  // Toggle diagnostic mode
  const toggleDiagnostic = () => {
    diagnosticActive = !diagnosticActive
    if (diagnosticPanel) {
      diagnosticPanel.style.display = diagnosticActive ? 'block' : 'none'
    }
    if (diagnosticToggleBtn) {
      diagnosticToggleBtn.textContent = diagnosticActive ? 'Turn Off' : 'Turn On'
    }
    console.log('[Diagnostic] Mode:', diagnosticActive ? 'ON' : 'OFF')
  }
  
  // Get element details
  const getElementDetails = (element) => {
    const rect = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)
    
    return {
      tag: element.tagName,
      id: element.id || 'none',
      classes: element.className || 'none',
      attributes: Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join('\\n'),
      position: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      zIndex: computedStyle.zIndex,
      pointerEvents: computedStyle.pointerEvents,
      cursor: computedStyle.cursor,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      innerHTML: element.innerHTML.substring(0, 200)
    }
  }
  
  // Format diagnostic output
  const formatDiagnosticOutput = (details) => {
    return `ELEMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━
Tag: <${details.tag}>
ID: #${details.id}
Classes: .${details.classes}

ATTRIBUTES:
${details.attributes}

POSITION:
Top: ${details.position.top}px
Left: ${details.position.left}px
Width: ${details.position.width}px
Height: ${details.position.height}px

CSS PROPERTIES:
z-index: ${details.zIndex}
pointer-events: ${details.pointerEvents}
cursor: ${details.cursor}
display: ${details.display}
visibility: ${details.visibility}
opacity: ${details.opacity}

INNER HTML (first 200 chars):
${details.innerHTML}
━━━━━━━━━━━━━━━━━━━━`
  }
  
  // Click handler for element inspection
  const handleDiagnosticClick = (e) => {
    if (!diagnosticActive) return
    if (e.target.closest('#diagnostic-panel')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Remove previous highlight
    if (lastInspectedElement) {
      lastInspectedElement.classList.remove('diagnostic-active')
    }
    
    // Highlight new element
    e.target.classList.add('diagnostic-active')
    lastInspectedElement = e.target
    
    // Get and display details
    const details = getElementDetails(e.target)
    lastInspectedCode = formatDiagnosticOutput(details)
    
    if (diagnosticOutput) {
      diagnosticOutput.textContent = lastInspectedCode
    }
    if (diagnosticCopyBtn) {
      diagnosticCopyBtn.style.display = 'block'
    }
    
    console.log('[Diagnostic] Inspected:', details.tag, details.id, details.classes)
  }
  
  // Copy diagnostic output
  const copyDiagnosticOutput = () => {
    if (lastInspectedCode) {
      navigator.clipboard.writeText(lastInspectedCode).then(() => {
        if (diagnosticCopyBtn) {
          const originalText = diagnosticCopyBtn.textContent
          diagnosticCopyBtn.textContent = '✓ Copied!'
          setTimeout(() => {
            diagnosticCopyBtn.textContent = originalText
          }, 2000)
        }
        console.log('[Diagnostic] Code copied to clipboard')
      })
    }
  }
  
  // Wire diagnostic events
  if (diagnosticToggleBtn) {
    diagnosticToggleBtn.addEventListener('click', toggleDiagnostic)
  }
  if (diagnosticMenuToggle) {
    diagnosticMenuToggle.addEventListener('click', () => {
      toggleDiagnostic()
      closeMenus()
    })
  }
  if (diagnosticCopyBtn) {
    diagnosticCopyBtn.addEventListener('click', copyDiagnosticOutput)
  }
  
  // Global click listener for diagnostic mode
  document.addEventListener('click', handleDiagnosticClick, true)
  
  console.log('[Init] Diagnostic panel initialized')

  if (metadataUIEnabled && summaryOpenTriggers.length) {
    const openSummaryPanel = (chip) => {
      if (!chip) return
      const panel = chip.dataset.openPanel
      if (!panel) {
        console.error('[Chip] Missing panel attribute')
        return
      }

      if (!state.preview.ready) {
        setPremiumStatus('Select a clip to load metadata.', 'error')
        return
      }

      const featureKey = summaryFeatureLookup[panel]
      if (featureKey && !state.preview.premium[featureKey]) {
        setPremiumStatus('Enable the Premium tester toggle to preview this insight.', 'error')
        return
      }

      const dataReadyCheck = summaryReadyChecks[panel]
      if (typeof dataReadyCheck === 'function' && !dataReadyCheck()) {
        setPremiumStatus('Generating that insight… tap Refresh Metadata if it takes long.', 'loading')
      }

      setActiveMetadataPanel(panel, chip)
      setPreviewMode('insights')
    }

    summaryOpenTriggers.forEach((chip) => {
      chip.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        openSummaryPanel(chip)
      })
      chip.style.pointerEvents = 'auto'
      chip.style.cursor = 'pointer'
    })

    console.log('[Init] Summary chips wired:', summaryOpenTriggers.length)
  } else {
    console.log('[Init] Metadata chips removed - skipping listeners')
  }

  if (metadataUIEnabled) {
    const metadataBackdrop = document.getElementById('metadata-backdrop')
    
    metadataBackdrop?.addEventListener('click', (e) => {
      if (state.previewMode === 'insights') {
        console.log('[Backdrop] Clicked, closing modal')
        setPreviewMode('video')
      }
    })

    if (metadataCloseBtn) {
      metadataCloseBtn.addEventListener('click', (e) => {
        console.log('[ModalClose] Button clicked')
        e.preventDefault()
        e.stopPropagation()
        setPreviewMode('video')
      })

      console.log('[Init] Modal close button configured')
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.previewMode === 'insights') {
        console.log('[Metadata] ESC pressed - closing')
        setPreviewMode('video')
      }
    })
  } else {
    console.log('[Init] Metadata modal removed - listeners skipped')
  }

  document.querySelectorAll('[data-premium-copy]').forEach((btn) => {
    btn.addEventListener('click', () => handlePremiumCopy(btn.dataset.premiumCopy))
  })

  // 🔐 YouTube OAuth Login Button
  const youtubeOAuthBtn = document.getElementById('youtube-oauth-btn')
  const oauthStatus = document.getElementById('oauth-status')
  
  if (youtubeOAuthBtn) {
    youtubeOAuthBtn.addEventListener('click', async () => {
      youtubeOAuthBtn.disabled = true
      youtubeOAuthBtn.textContent = '⏳ Logging in...'
      
      try {
        const result = await window.systemDialogs?.youtubeOAuthLogin?.()
        
        if (result?.success) {
          youtubeOAuthBtn.textContent = '✅ Logged In'
          youtubeOAuthBtn.classList.add('success-state')
          if (oauthStatus) {
            oauthStatus.textContent = '(Enhanced with YouTube login)'
            oauthStatus.style.color = '#0aff6a'
          }
          setPremiumStatus('YouTube login successful! Re-fetch metadata for full tags.', 'success')
          
          // Auto-refresh metadata if video loaded
          if (state.preview.ready && state.preview.currentItem) {
            setTimeout(() => fetchPremiumMetadata(state.preview.currentItem), 1000)
          }
        } else {
          youtubeOAuthBtn.textContent = '🔐 YT Login'
          youtubeOAuthBtn.disabled = false
          setPremiumStatus(`Login failed: ${result?.message || 'Unknown error'}`, 'error')
        }
      } catch (err) {
        console.error('[YouTube OAuth] Error:', err)
        youtubeOAuthBtn.textContent = '🔐 YT Login'
        youtubeOAuthBtn.disabled = false
        setPremiumStatus('OAuth login failed. Using standard extraction.', 'error')
      }
    })
  }

  document.querySelectorAll('[data-premium-download]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!state.preview.metadata.thumbnail) {
        setPremiumStatus('Thumbnail not ready yet.', 'error')
        return
      }
      
      // Disable button during download
      btn.disabled = true
      btn.textContent = 'Downloading...'
      
      try {
        const result = await window.downloader.downloadThumbnail(
          state.preview.metadata.thumbnail,
          'wh404-thumbnail.jpg'
        )
        
        if (result.cancelled) {
          setPremiumStatus('Download cancelled.', 'info')
          btn.textContent = 'Download'
          btn.disabled = false
          return
        }
        
        if (!result.success) {
          setPremiumStatus(`Download failed: ${result.error}`, 'error')
          btn.textContent = 'Download'
          btn.disabled = false
          return
        }
        
        // Success! Change button to "Open Location"
        btn.textContent = 'Open Location'
        btn.classList.add('success-state')
        btn.disabled = false
        
        // Replace click handler with open location
        btn.onclick = async () => {
          const openResult = await window.downloader.openFolderLocation(result.path)
          if (!openResult.success) {
            setPremiumStatus(`Could not open folder: ${openResult.error}`, 'error')
          }
        }
        
        setPremiumStatus('Thumbnail saved! Click "Open Location" to view.', 'success')
        
      } catch (err) {
        console.error('[Premium] Thumbnail download failed:', err)
        setPremiumStatus(`Unexpected error: ${err.message}`, 'error')
        btn.textContent = 'Download'
        btn.disabled = false
      }
    })
  })

  document.querySelectorAll('[data-export-copy]').forEach((btn) => {
    btn.addEventListener('click', () => handleExportCopy(btn.dataset.exportCopy))
  })

  document.querySelectorAll('[data-premium-save]').forEach((btn) => {
    btn.addEventListener('click', () => handlePremiumSave(btn.dataset.premiumSave))
  })

  document.querySelectorAll('[data-export-download]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!state.preview.metadata.thumbnail) {
        updateExportMessage('Thumbnail not ready yet.', { variant: 'error' })
        return
      }
      
      // Disable button during download
      btn.disabled = true
      btn.textContent = 'Downloading...'
      
      try {
        const result = await window.downloader.downloadThumbnail(
          state.preview.metadata.thumbnail,
          'wh404-thumbnail.jpg'
        )
        
        if (result.cancelled) {
          updateExportMessage('Download cancelled.', { variant: 'info' })
          btn.textContent = 'Download'
          btn.disabled = false
          return
        }
        
        if (!result.success) {
          updateExportMessage(`Download failed: ${result.error}`, { variant: 'error' })
          btn.textContent = 'Download'
          btn.disabled = false
          return
        }
        
        // Success! Change button to "Open Location"
        btn.textContent = 'Open Location'
        btn.classList.add('success-state')
        btn.disabled = false
        
        // Replace click handler with open location
        btn.onclick = async () => {
          const openResult = await window.downloader.openFolderLocation(result.path)
          if (!openResult.success) {
            updateExportMessage(`Could not open folder: ${openResult.error}`, { variant: 'error' })
          }
        }
        
        updateExportMessage(
          `Thumbnail saved! Click "Open Location" to view.`,
          { variant: 'success' }
        )
        
      } catch (err) {
        console.error('[Download] Thumbnail download failed:', err)
        updateExportMessage(`Unexpected error: ${err.message}`, { variant: 'error' })
        btn.textContent = 'Download'
        btn.disabled = false
      }
    })
  })

  premiumRefreshBtn?.addEventListener('click', () => {
    if (!state.preview.ready || !state.preview.url) {
      setPremiumStatus('Select a clip to load metadata.', 'error')
      return
    }
    const activeItem = state.queue.find((entry) => entry.url === state.preview.url)
    fetchPremiumMetadata(activeItem || { url: state.preview.url, thumbnail: state.preview.metadata.thumbnail })
  })

  premiumToggleControls.forEach((toggle) => {
    const checkbox = toggle.querySelector('input[type="checkbox"]')
    const feature = toggle.dataset.premiumControl
    if (!checkbox || !feature) return

    checkbox.addEventListener('change', () => {
      state.preview.premium[feature] = checkbox.checked
      applyPremiumToggleUI()
    })
  })

  // Thumbnail download button
  const thumbDownloadBtn = document.getElementById('thumb-download')
  thumbDownloadBtn?.addEventListener('click', async () => {
    if (!state.preview.metadata.thumbnail) return
    
    try {
      // Professional Save As dialog
      const title = state.preview.metadata.title || 'thumbnail'
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)
      const defaultName = `${sanitizedTitle}-thumbnail.jpg`
      
      const savePath = await window.systemDialogs?.saveFile({
        defaultPath: defaultName,
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
        ]
      })
      
      if (!savePath) return // User cancelled
      
      const response = await fetch(state.preview.metadata.thumbnail)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      
      await window.downloader.saveFile(savePath, buffer)
      console.log('[Thumbnail] Saved to:', savePath)
    } catch (error) {
      console.error('[Thumbnail] Download failed:', error)
    }
  })

  exportBrowse.addEventListener('click', async () => {
    const selected = await window.systemDialogs?.chooseFolder()
    if (selected) {
      exportPathInput.value = selected
    }
  })

  exportConfirm.addEventListener('click', async () => {
    // Check if we are in "Open Folder" mode
    if (exportConfirm.dataset.action === 'open-folder') {
      const outputPath = exportConfirm.dataset.path
      console.log('[Export] 📂 Opening folder:', outputPath)
      if (window.downloader?.openFolderLocation) {
        window.downloader.openFolderLocation(outputPath)
      } else if (window.systemDialogs?.openFolder) {
        window.systemDialogs.openFolder(outputPath)
      }
      return
    }

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
      
      // CRITICAL: Ensure files exist before exporting
      // This handles cases where user exports without previewing, or if files were moved
      updateExportMessage('Verifying files...', { loading: true })
      
      // Re-collect files after resolution
      const resolvedFiles = []
      
      console.log('[Export] Starting file resolution loop for', targets.length, 'items');
      for (const item of targets) {
        console.log('[Export] Resolving item:', item.url);
        // Force resolution and capture the result
        const files = await resolveItemFiles(item);
        if (files && files.length) {
           console.log('[Export] Resolved files for item:', files);
           resolvedFiles.push(...files);
        } else {
           console.warn('[Export] No files returned from resolution for item:', item.url);
           // Fallback to existing files if resolution returned nothing (shouldn't happen if modified correctly)
           if (item.files) resolvedFiles.push(...item.files);
        }
      }
      
      console.log('[Export] Final resolved files list:', resolvedFiles);
      
      if (!resolvedFiles.length) {
        updateExportMessage('No valid files found to export.', { variant: 'error' })
        exportConfirm.disabled = false
        exportConfirm.textContent = exportConfirmDefaultLabel
        exportConfirm.style.opacity = '1'
        return
      }

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
      
      console.log('[Export] 🚀 Starting export process:', {
        filesCount: resolvedFiles.length,
        outputFormat,
        destination,
        previewReady: state.preview.ready,
        trimStart: state.preview.start,
        trimEnd: state.preview.end,
        duration: state.preview.duration
      })
      
      // Use pre-processed trim file if available, otherwise pass trim data
      let trimData = null
      // CRITICAL: Use the explicitly resolved files list
      let exportFiles = resolvedFiles
      
      // Get actual trim values from inputs (state.preview may be outdated)
      const trimStartValue = parseFloat(trimStartInput?.value || 0)
      const trimEndValue = parseFloat(trimEndInput?.value || state.preview.duration)
      
      const isTrimmed = state.preview.ready && 
        state.preview.duration > 0 &&
        (trimStartValue > 0 || trimEndValue < state.preview.duration)
      
      console.log('[Export] ✂️ Trim detection:', {
        trimStart: trimStartValue,
        trimEnd: trimEndValue,
        duration: state.preview.duration,
        isTrimmed
      })
      
      if (isTrimmed) {
        if (state.preview.trimmedFile) {
          // Use pre-processed file for instant export
          console.log('[Export] ✂️ Using pre-processed trim file:', state.preview.trimmedFile)
          exportFiles = [state.preview.trimmedFile]
          trimData = null // No need to trim again
        } else {
          // Fall back to real-time trimming - USE INPUT VALUES
          console.log('[Export] ✂️ Processing trim in real-time:', trimStartValue, 's →', trimEndValue, 's')
          trimData = { 
            start: trimStartValue, 
            end: trimEndValue 
          }
          // FIX: Ensure we use the resolved files for trimming source
          exportFiles = resolvedFiles 
        }
      } else {
        console.log('[Export] 📹 No trim - full video/audio export')
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
      
      console.log('[Export] 📦 Sending to backend:', {
        files: exportPayload.files, // LOGGING ADDED: Show exact paths
        filesCount: exportPayload.files.length,
        format: exportPayload.outputFormat,
        type: state.exportContext.type,
        hasTrim: !!exportPayload.trim,
        trimData: exportPayload.trim
      })

      // 1. Ask user where to save (if not already set or if user wants to choose)
      // We'll use the save dialog to get a path
      let finalDestination = destination
      
      // If no destination set, or if we want to force "Save As" behavior
      // For batch exports, we might want to pick a folder. For single files, a file path.
      // Since exportFiles backend handles directory creation, let's ask for a DIRECTORY.
      
      try {
        const { dialog } = window.__TAURI__
        // If we have multiple files, we pick a folder. If single file, we could pick a file, 
        // but the backend logic seems designed to take a directory and output files there.
        // Let's stick to "Pick a Folder" for consistency.
        
        const selectedPath = await dialog.open({
          directory: true,
          multiple: false,
          defaultPath: destination || undefined,
          title: 'Select Export Folder'
        })
        
        if (selectedPath) {
          finalDestination = selectedPath
          exportPayload.destination = selectedPath
          // Update state for next time
          setDestination(selectedPath)
        } else {
          // User cancelled dialog
          console.log('[Export] User cancelled save dialog')
          updateExportMessage('Export cancelled', { variant: 'info' })
          exportConfirm.disabled = false
          exportConfirm.textContent = 'Export'
          exportConfirm.style.opacity = '1'
          if (activeHeartbeat) clearInterval(activeHeartbeat)
          return
        }
      } catch (dialogErr) {
        console.warn('[Export] Dialog failed, falling back to default:', dialogErr)
        // Continue with default destination if dialog fails
      }

      const result = await window.systemDialogs?.exportFiles(exportPayload)
      
      console.log('[Export] 📥 Backend result:', result)
      
      // CRITICAL: Check if audio was requested but video was returned
      if (state.exportContext.type === 'audio' && result?.exported) {
        const firstFile = result.exported[0]
        const isVideoFile = /\.(mp4|mkv|avi|webm|mov)$/i.test(firstFile)
        if (isVideoFile) {
          console.error('[Export] ⚠️ AUDIO REQUESTED BUT GOT VIDEO FILE:', firstFile)
          console.error('[Export] ⚠️ Backend did not convert to audio format!')
        }
      }
      
      if (activeHeartbeat) {
        clearInterval(activeHeartbeat)
        activeHeartbeat = null
      }
      
      if (result && result.exported && result.exported.length > 0) {
        // FIX: Prefer the specific file path so Explorer selects/highlights it
        const outputPath = result.exported[0] || result.outputDir
        pushLog(`✔ Exported ${result.exported.length} file${result.exported.length === 1 ? '' : 's'} to ${result.outputDir}`)
        
        // Show success state with folder reveal button
        // ENHANCEMENT: Allow opening folder AND exporting again
        const escapedPath = outputPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        
        // Create a cleaner success UI
        updateExportMessage(
          `<div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
             <span>✓ Saved!</span>
             <button class="ghost-btn" onclick="window.downloader.openFolderLocation('${escapedPath}'); return false;" style="background: rgba(10, 255, 106, 0.1); color: #0aff6a; border: 1px solid #0aff6a; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">📂 Open Folder</button>
           </div>`, 
          { variant: 'success', html: true }
        )
        
        // Reset button to allow another export immediately
        exportConfirm.textContent = 'Export Selection'
        exportConfirm.style.background = ''
        exportConfirm.style.opacity = '1'
        exportConfirm.disabled = false
        
        // Remove any previous action overrides
        delete exportConfirm.dataset.action
        delete exportConfirm.dataset.path
        
        // Update items to show exported status
        targets.forEach(item => {
          item.exported = true
          item.exportedFiles = result.exported
          item.exportPath = outputPath
          
          // Track export signature for duplicate detection
          const exportSig = `${item.url}_${trimData ? trimData.start : 0}_${trimData ? trimData.end : 0}_${outputFormat}`
          if (!item.exportHistory) item.exportHistory = []
          item.exportHistory.push({
            signature: exportSig,
            timestamp: Date.now(),
            files: result.exported
          })
          
          updateHistoryStatus(item.url, 'exported')
        })
        renderQueue()
        
        // Store last export path for folder open button
        state.lastExportPath = outputPath
        
        console.log('[Export] 📁 Saved to:', outputPath)
        
        // Keep drawer open so user can click "Open Folder"
        // setTimeout(() => { closeExportDrawer() }, 1800)
      } else if (result && (!result.exported || result.exported.length === 0)) {
        throw new Error('Export completed but no files were generated. Check if source files exist.')
      } else if (!result) {
        // Export failed - likely backend issue
        console.error('[Export] ⚠️ Backend returned no result')
        updateExportMessage('Export failed - check console for details', { variant: 'error' })
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
    const selectedType = exportTypeSelect.value
    state.exportContext.type = selectedType
    
    console.log('[Export] 🎛️ Type changed to:', selectedType)
    
    updateExportResolutionSelect()
    
    // FIXED: Correct logic - if type is 'audio', use audio formats
    const outputFormats = selectedType === 'audio'
      ? ['mp3', 'm4a', 'ogg', 'wav']  // Audio formats
      : ['mp4', 'mkv', 'avi', 'webm']  // Video formats
    
    console.log('[Export] 📋 Available formats:', outputFormats)
    
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
  
  // Check if window.downloader exists (Electron mode only)
  if (!window.downloader) {
    console.log('[IPC] Running in Tauri mode - using bridge event system')
    return
  }
  
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
      
      // Auto-load preview for the first completed item
      if (state.queue.filter(i => i.status === 'complete').length === 1) {
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
  
  // Sync toggle checkboxes with state on load
  premiumToggleControls.forEach((toggle) => {
    const checkbox = toggle.querySelector('input[type="checkbox"]')
    const feature = toggle.dataset.premiumControl
    if (checkbox && feature) {
      state.preview.premium[feature] = checkbox.checked
    }
  })
  
  // Apply initial UI state
  applyPremiumToggleUI()
  
  console.log('[Startup] UI should be visible now!')
}, 500)

console.log('[Startup] Renderer initialized')

// ========================================
// PREMIUM TIMELINE SYSTEM
// ========================================
function initPremiumTimeline() {
  console.log('[Timeline Init] 🎬 Checking elements...')
  
  const premiumTimeline = document.getElementById('premium-timeline')
  const handleLeft = document.getElementById('handle-left')
  const handleRight = document.getElementById('handle-right')
  
  const elements = {
    timeline: premiumTimeline,
    leftHandle: handleLeft,
    rightHandle: handleRight,
    video: previewVideo,
    trimStartInput: trimStartInput,
    trimEndInput: trimEndInput
  }
  
  console.log('[Timeline Init] Element check:', {
    timeline: !!premiumTimeline,
    leftHandle: !!handleLeft,
    rightHandle: !!handleRight,
    video: !!previewVideo,
    trimStart: !!trimStartInput,
    trimEnd: !!trimEndInput
  })
  
  if (!premiumTimeline || !handleLeft || !handleRight || !previewVideo) {
    console.warn('[Timeline Init] ❌ Missing required elements!')
    return
  }
  
  console.log('[Timeline] ✅ All elements found! Initializing...')
  
  let isDragging = false
  let currentHandle = null
  let startX = 0
  let startPercent = 0
  let isDraggingActive = false
  let lastSeekTime = 0
  
  // Get hover time element
  const hoverTimeElement = document.getElementById('timeline-hover-time')
  
  // Get playhead element
  const playheadElement = document.getElementById('timeline-playhead')
  
  // Update visual positions
  function updateVisualPositions() {
    if (!previewVideo.duration || isNaN(previewVideo.duration)) return
    
    const duration = previewVideo.duration
    const startTime = parseFloat(trimStartInput.value) || 0
    const endTime = parseFloat(trimEndInput.value) || duration
    
    const startPercent = (startTime / duration) * 100
    const endPercent = (endTime / duration) * 100
    
    handleLeft.style.left = `${startPercent}%`
    handleRight.style.left = `${endPercent}%`
    
    // Update playhead position - RELATIVE TO FULL TIMELINE WIDTH
    if (playheadElement && previewVideo.currentTime) {
      const currentTime = previewVideo.currentTime
      
      // Calculate position on the full timeline (between 0% and 100% of timeline width)
      // But playhead should be positioned relative to the HANDLE positions
      // If at startTime, playhead at startPercent. If at endTime, playhead at endPercent.
      const playheadPercent = (currentTime / duration) * 100
      
      // Only show playhead if within trim range
      if (currentTime >= startTime && currentTime <= endTime) {
        playheadElement.style.left = `${playheadPercent}%`
        playheadElement.classList.add('active')
      } else {
        playheadElement.classList.remove('active')
      }
    }
  }
  
  // Handle mouse down on handles
  handleLeft.addEventListener('mousedown', (e) => {
    console.log('[Timeline] 👈 LEFT handle grabbed!')
    e.preventDefault()
    e.stopPropagation()
    isDragging = true
    isDraggingActive = true
    currentHandle = 'left'
    startX = e.clientX
    const rect = premiumTimeline.getBoundingClientRect()
    startPercent = (e.clientX - rect.left) / rect.width * 100
    handleLeft.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    if (hoverTimeElement) hoverTimeElement.style.display = 'none'
  })
  
  handleRight.addEventListener('mousedown', (e) => {
    console.log('[Timeline] 👉 RIGHT handle grabbed!')
    e.preventDefault()
    e.stopPropagation()
    isDragging = true
    isDraggingActive = true
    currentHandle = 'right'
    startX = e.clientX
    const rect = premiumTimeline.getBoundingClientRect()
    startPercent = (e.clientX - rect.left) / rect.width * 100
    handleRight.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    if (hoverTimeElement) hoverTimeElement.style.display = 'none'
  })
  
  // Create drag tooltip for showing time while dragging
  let dragTooltip = document.getElementById('drag-tooltip')
  if (!dragTooltip) {
    dragTooltip = document.createElement('div')
    dragTooltip.id = 'drag-tooltip'
    dragTooltip.style.cssText = `
      position: fixed;
      background: rgba(10, 255, 106, 0.95);
      color: #000;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      pointer-events: none;
      z-index: 99999;
      display: none;
      transform: translate(-50%, -180%);
      white-space: nowrap;
      font-family: 'JetBrains Mono', monospace;
      box-shadow: 0 4px 12px rgba(10, 255, 106, 0.4);
    `
    document.body.appendChild(dragTooltip)
  }
  
  // Handle mouse move - OPTIMIZED FOR SPEED
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !currentHandle || !previewVideo.duration) return
    
    const rect = premiumTimeline.getBoundingClientRect()
    const percent = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100))
    const timeValue = (percent / 100) * previewVideo.duration
    
    let newTime = 0
    
    if (currentHandle === 'left') {
      const maxTime = parseFloat(trimEndInput.value) || previewVideo.duration
      newTime = Math.max(0, Math.min(maxTime - 0.1, timeValue))
      trimStartInput.value = newTime.toFixed(2)
      
      // Direct visual update - NO function calls for speed
      const startPercent = (newTime / previewVideo.duration) * 100
      handleLeft.style.left = `${startPercent}%`
    } else if (currentHandle === 'right') {
      const minTime = parseFloat(trimStartInput.value) || 0
      newTime = Math.max(minTime + 0.1, Math.min(previewVideo.duration, timeValue))
      trimEndInput.value = newTime.toFixed(2)
      
      // Direct visual update - NO function calls for speed
      const endPercent = (newTime / previewVideo.duration) * 100
      handleRight.style.left = `${endPercent}%`
    }
    
    // Show drag tooltip with exact time
    if (dragTooltip && newTime !== undefined) {
      const minutes = Math.floor(newTime / 60)
      const seconds = Math.floor(newTime % 60)
      const ms = Math.floor((newTime % 1) * 10)
      dragTooltip.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${ms}`
      dragTooltip.style.left = e.clientX + 'px'
      dragTooltip.style.top = e.clientY + 'px'
      dragTooltip.style.display = 'block'
    }
  })
  
  // Handle mouse up
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      console.log(`[Timeline] ✋ Released ${currentHandle?.toUpperCase()} handle`)
      isDragging = false
      if (currentHandle === 'left') {
        handleLeft.style.cursor = 'grab'
      } else if (currentHandle === 'right') {
        handleRight.style.cursor = 'grab'
      }
      currentHandle = null
      document.body.style.userSelect = ''
      
      // Hide drag tooltip
      if (dragTooltip) {
        dragTooltip.style.display = 'none'
      }
      
      // Small delay to prevent click-to-seek after drag
      setTimeout(() => {
        isDraggingActive = false
      }, 100)
    }
  })
  
  // Click-to-seek and play on timeline
  premiumTimeline.addEventListener('click', (e) => {
    // Don't seek if we just finished dragging
    if (isDraggingActive) return
    if (e.target === handleLeft || e.target === handleRight) return
    if (e.target.closest('.timeline-handle')) return
    
    // Prevent rapid seeking (debounce 300ms)
    const now = Date.now()
    if (now - lastSeekTime < 300) {
      console.log(`[Timeline] ⏳ Too fast, ignoring click`)
      return
    }
    lastSeekTime = now
    
    const rect = premiumTimeline.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const seekTime = percent * previewVideo.duration
    
    // Get trim range
    const trimStart = parseFloat(trimStartInput.value) || 0
    const trimEnd = parseFloat(trimEndInput.value) || previewVideo.duration
    
    // Only allow clicking INSIDE trim area
    if (seekTime >= trimStart && seekTime <= trimEnd) {
      const wasPlaying = !previewVideo.paused
      
      console.log(`[Timeline] 🎯 Seek to: ${seekTime.toFixed(2)}s`)
      previewVideo.currentTime = seekTime
      
      // Only auto-play if was paused
      if (!wasPlaying && previewVideo.paused) {
        previewVideo.play()
        previewPlayBtn.textContent = '❚❚'
        console.log(`[Timeline] ▶ Starting playback`)
      } else if (wasPlaying) {
        console.log(`[Timeline] ⏯ Seeking during playback`)
      }
      
      // Show playhead immediately at click position
      if (playheadElement) {
        playheadElement.style.left = `${percent * 100}%`
        playheadElement.classList.add('active')
      }
    } else {
      console.log(`[Timeline] ❌ Click outside trim area ignored`)
    }
  })
  
  // Hover time preview
  premiumTimeline.addEventListener('mousemove', (e) => {
    if (isDragging || !previewVideo.duration || !hoverTimeElement) return
    
    const rect = premiumTimeline.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const hoverTime = percent * previewVideo.duration
    
    // Update hover time display
    const minutes = Math.floor(hoverTime / 60)
    const seconds = Math.floor(hoverTime % 60)
    hoverTimeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    
    // Position hover time above cursor
    hoverTimeElement.style.left = `${percent * 100}%`
    hoverTimeElement.style.display = 'block'
  })
  
  // Hide hover time when mouse leaves timeline
  premiumTimeline.addEventListener('mouseleave', () => {
    if (hoverTimeElement) {
      hoverTimeElement.style.display = 'none'
    }
  })
  
  // NOTE: timeupdate listener already exists above - no need for duplicate
  // Update handles when trim inputs change
  trimStartInput.addEventListener('input', updateVisualPositions)
  trimEndInput.addEventListener('input', updateVisualPositions)
  
  // Initial position update
  updateVisualPositions()
  
  console.log('[Timeline] 🎉 Premium timeline initialized successfully!')
}

// Initialize timeline on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Timeline] DOM ready, initializing...')
    initPremiumTimeline()
  })
} else {
  console.log('[Timeline] DOM already loaded, initializing now...')
  initPremiumTimeline()
}

