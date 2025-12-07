// Tutorial System for Word Hacker 404 Downloader
// Guides new users through the interface step-by-step
// Only shows on first launch (persisted via localStorage)

const STORAGE_KEY_TUTORIAL_COMPLETED = 'wh404:tutorial:completed'

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to WH404 Social Media Downloader!',
    content: 'Download from 1000+ platforms including YouTube, Instagram, TikTok, Facebook, Twitter, and more. Let me show you how in 60 seconds.',
    target: null,
    position: 'center',
    validation: null // No validation for welcome screen
  },
  {
    id: 'paste-url',
    title: 'Paste Media Links',
    content: 'Copy any link from YouTube, Instagram, TikTok, Facebook, Twitter, Reddit, Vimeo, SoundCloud, or 1000+ other platforms. Paste here and click "Add to Queue" button below (or press Enter).',
    target: '#url-input',
    position: 'bottom',
    highlight: true,
    validation: () => {
      const textarea = document.getElementById('url-input')
      return textarea && textarea.value.trim().length > 0
    }
  },
  {
    id: 'add-to-queue',
    title: 'Add to Queue',
    content: 'Click this green button to add your links to the download queue. You can also press Enter in the text box as a shortcut.',
    target: '#add-to-queue-btn',
    position: 'bottom',
    highlight: true,
    validation: () => {
      // Check if queue has items
      const queueList = document.getElementById('queue-list')
      const hasItems = queueList && !queueList.querySelector('.empty')
      return hasItems
    }
  },
  {
    id: 'queue',
    title: 'Queue Management',
    content: 'Your downloads appear here. Select items to export, preview, or manage. Progress shows in real-time.',
    target: '.queue-pane',
    position: 'left',
    highlight: true,
    validation: null
  },
  {
    id: 'preview',
    title: 'Preview & Trim',
    content: 'After download, preview your media here. Use the trim sliders to cut specific portions before exporting.',
    target: '.preview-pane',
    position: 'right',
    highlight: true,
    validation: null
  },
  {
    id: 'export',
    title: 'Export Your Files',
    content: 'After download completes, click the green glowing Export button (⬇) on each item to convert and save. Choose format, quality, and destination.',
    target: '.queue-pane',
    position: 'left',
    highlight: true,
    validation: null
  },
  {
    id: 'destination',
    title: 'Set Destination',
    content: 'Change where files are saved by clicking File → Set destination. Default is your Downloads folder.',
    target: '[data-menu-trigger="file"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'complete',
    title: '🎉 You\'re All Set!',
    content: 'You\'re ready to download! Pro tip: Press Ctrl+V to quick-paste links anytime. Check the Help menu for keyboard shortcuts and support. Happy downloading!',
    target: null,
    position: 'center'
  }
]

class TutorialManager {
  constructor() {
    this.storageKey = STORAGE_KEY_TUTORIAL_COMPLETED
    this.currentStep = 0
    this.isActive = false
    this.overlay = null
    this.tooltip = null
    this.validationListeners = []
    this.isStepValid = false
    this.hasPromptedAfterDownload = false
    this.firstTimePopupVisible = false
  }

  init() {
    const completed = localStorage.getItem(this.storageKey)
    this.hasPromptedAfterDownload = Boolean(completed)
    // Add menu item to restart tutorial
    this.addMenuOption()
  }

  showFirstTimePopup() {
    if (this.firstTimePopupVisible) return
    this.firstTimePopupVisible = true
    // Create elegant hacker-style popup
    const popup = document.createElement('div')
    popup.className = 'first-time-popup'
    popup.innerHTML = `
      <div class="popup-backdrop"></div>
      <div class="popup-card">
        <div class="popup-header">
          <div class="popup-icon">⚡</div>
          <h2>Welcome to WH404</h2>
          <p class="popup-subtitle">Social Media Downloader</p>
        </div>
        <div class="popup-body">
          <p class="popup-question">Is this your first time using the downloader?</p>
          <p class="popup-hint">We'll guide you through the basics</p>
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-no" data-choice="no">
            <span class="btn-icon">→</span>
            <span class="btn-text">No, I'm ready</span>
          </button>
          <button class="popup-btn popup-btn-yes" data-choice="yes">
            <span class="btn-icon">📚</span>
            <span class="btn-text">Yes, show tutorial</span>
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(popup)
    
    // Animate in
    requestAnimationFrame(() => {
      popup.classList.add('visible')
    })
    
    // Handle button clicks
    popup.querySelectorAll('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice
        
        // Animate out
        popup.classList.remove('visible')
        
        setTimeout(() => {
          popup.remove()
          this.firstTimePopupVisible = false
          
          if (choice === 'yes') {
            // Start tutorial
            setTimeout(() => this.start(), 300)
          } else {
            // Mark as completed so popup doesn't show again
            localStorage.setItem(this.storageKey, 'true')
          }
        }, 300)
      })
    })
  }

  addMenuOption() {
    const helpMenu = document.getElementById('help-menu')
    if (!helpMenu) return
    const container = helpMenu.querySelector('.help-content') || helpMenu

    const tutorialBtn = document.createElement('button')
    tutorialBtn.className = 'menu-item'
    tutorialBtn.textContent = '📚 Tutorial (Getting Started)'
    tutorialBtn.addEventListener('click', () => {
      this.start()
      document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('open'))
    })

    const resetBtn = document.createElement('button')
    resetBtn.className = 'menu-item'
    resetBtn.textContent = '♻️ Reset First-Time Popup'
    resetBtn.addEventListener('click', () => {
      this.resetFirstTimePopup()
      document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('open'))
    })

    const checkUpdatesBtn = container.querySelector('[data-menu-action="check-updates"]')
    if (checkUpdatesBtn) {
      container.insertBefore(resetBtn, checkUpdatesBtn)
      container.insertBefore(tutorialBtn, resetBtn)
    } else {
      container.appendChild(tutorialBtn)
      container.appendChild(resetBtn)
    }
  }

  resetFirstTimePopup() {
    localStorage.removeItem(this.storageKey)
    this.hasPromptedAfterDownload = false
    this.firstTimePopupVisible = false
    this.showFirstTimePopup()
  }

  triggerAfterFirstDownload() {
    const completed = localStorage.getItem(this.storageKey)
    if (completed || this.hasPromptedAfterDownload || this.firstTimePopupVisible || this.isActive) {
      return
    }
    this.hasPromptedAfterDownload = true
    this.showFirstTimePopup()
  }

  start() {
    if (this.isActive) return
    this.hasPromptedAfterDownload = true
    this.isActive = true
    this.currentStep = 0
    this.createOverlay()
    this.showStep(this.currentStep)
  }

  createOverlay() {
    // Dark overlay
    this.overlay = document.createElement('div')
    this.overlay.className = 'tutorial-overlay'
    this.overlay.innerHTML = `
      <div class="tutorial-highlight"></div>
    `
    document.body.appendChild(this.overlay)
    
    // Tooltip container
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'tutorial-tooltip'
    this.tooltip.innerHTML = `
      <div class="tutorial-header">
        <h3 class="tutorial-title"></h3>
        <button class="tutorial-close" title="Exit tutorial">✕</button>
      </div>
      <div class="tutorial-content"></div>
      <div class="tutorial-footer">
        <div class="tutorial-progress" role="status" aria-live="polite">
          <div class="tutorial-progress-meta">
            <span class="tutorial-step-label">Step</span>
            <div class="tutorial-step-counter">
              <span class="tutorial-step-current">01</span>
              <span class="tutorial-step-divider">/</span>
              <span class="tutorial-step-total">08</span>
            </div>
          </div>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill" style="width: 12.5%"></div>
          </div>
        </div>
        <div class="tutorial-actions">
          <button class="tutorial-prev" type="button">← Back</button>
          <button class="tutorial-next" type="button" disabled>Next →</button>
          <button class="tutorial-skip" type="button">Skip Tutorial</button>
        </div>
      </div>
      <label class="tutorial-checkbox">
        <input type="checkbox" id="tutorial-dont-show" />
        <span>Don't show this again</span>
      </label>
    `
    document.body.appendChild(this.tooltip)
    
    // Make tooltip draggable
    this.makeDraggable()
    
    // Event listeners
    const skipBtn = this.tooltip.querySelector('.tutorial-skip')
    const prevBtn = this.tooltip.querySelector('.tutorial-prev')
    const nextBtn = this.tooltip.querySelector('.tutorial-next')

    skipBtn.addEventListener('click', () => this.end())
    this.tooltip.querySelector('.tutorial-close').addEventListener('click', () => this.end())
    prevBtn.addEventListener('click', () => this.prev())
    nextBtn.addEventListener('click', () => {
      if (!nextBtn.disabled) {
        this.next()
      }
    })
    
    // Keyboard navigation
    this.keyHandler = (e) => {
      if (!this.isActive) return
      if (e.key === 'Escape') this.end()
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && this.isStepValid) {
        e.preventDefault()
        this.next()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.prev()
      }
    }
    document.addEventListener('keydown', this.keyHandler)
  }

  makeDraggable() {
    const header = this.tooltip.querySelector('.tutorial-header')
    let isDragging = false
    let offsetX = 0
    let offsetY = 0

    header.addEventListener('mousedown', (e) => {
      // Don't drag if clicking close button or buttons
      if (e.target.closest('.tutorial-close') || e.target.closest('button')) return
      
      isDragging = true
      
      // Get current position from computed style
      const rect = this.tooltip.getBoundingClientRect()
      offsetX = e.clientX - rect.left
      offsetY = e.clientY - rect.top
      
      // Disable transitions for smooth dragging
      this.tooltip.style.transition = 'none'
      
      // Add press animation and dragging state
      this.tooltip.classList.add('dragging')
      this.tooltip.style.transform = 'scale(0.98)'
      header.style.cursor = 'grabbing'
      
      e.preventDefault()
    })

    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      e.preventDefault()
      
      // Calculate new position
      let newX = e.clientX - offsetX
      let newY = e.clientY - offsetY
      
      // Keep tooltip within screen bounds with padding
      const rect = this.tooltip.getBoundingClientRect()
      const padding = 10
      const maxX = window.innerWidth - rect.width - padding
      const maxY = window.innerHeight - rect.height - padding
      
      newX = Math.max(padding, Math.min(newX, maxX))
      newY = Math.max(padding, Math.min(newY, maxY))
      
      // Apply position with transform for smoothness
      this.tooltip.style.left = newX + 'px'
      this.tooltip.style.top = newY + 'px'
      this.tooltip.style.transform = 'scale(0.98)' // Keep pressed state
    }

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false
        
        // Remove dragging state
        this.tooltip.classList.remove('dragging')
        
        // Restore transitions with spring animation
        this.tooltip.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease'
        this.tooltip.style.transform = 'scale(1)'
        header.style.cursor = 'move'
        
        // Reset transition after animation
        setTimeout(() => {
          this.tooltip.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }, 300)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    // Store handlers for cleanup
    this.dragHandlers = { handleMouseMove, handleMouseUp }
  }

  showStep(index) {
    const step = TUTORIAL_STEPS[index]
    if (!step) return
    
    // Clean up previous step's validation listeners
    this.removeValidationListeners()
    this.isStepValid = !step.validation
    this.updateNavigationButtons()
    
    // Update content
    const currentStepNumber = index + 1
    const totalSteps = TUTORIAL_STEPS.length
    this.tooltip.querySelector('.tutorial-title').textContent = step.title
    this.tooltip.querySelector('.tutorial-content').textContent = step.content

    const currentEl = this.tooltip.querySelector('.tutorial-step-current')
    const totalEl = this.tooltip.querySelector('.tutorial-step-total')
    const progressFill = this.tooltip.querySelector('.tutorial-progress-fill')
    if (currentEl) currentEl.textContent = currentStepNumber.toString().padStart(2, '0')
    if (totalEl) totalEl.textContent = totalSteps.toString().padStart(2, '0')
    if (progressFill) {
      const percent = (currentStepNumber / totalSteps) * 100
      progressFill.style.width = `${percent}%`
    }
    
    // Run initial validation and set up listeners
    this.validateStep({ skipAutoAdvance: true })
    this.setupValidationListeners(step)
    
    // Position tooltip and highlight
    if (step.target) {
      const targetEl = document.querySelector(step.target)
      if (targetEl) {
        this.highlightElement(targetEl)
        this.positionTooltip(targetEl, step.position)
      }
    } else {
      // Center overlay (welcome/complete screens)
      this.clearHighlight()
      this.centerTooltip()
    }
    
    // Smooth fade in
    requestAnimationFrame(() => {
      this.tooltip.classList.add('active')
    })
  }

  updateNavigationButtons() {
    if (!this.tooltip) return
    const prevBtn = this.tooltip.querySelector('.tutorial-prev')
    const nextBtn = this.tooltip.querySelector('.tutorial-next')
    const isFirstStep = this.currentStep === 0
    const isLastStep = this.currentStep === TUTORIAL_STEPS.length - 1

    if (prevBtn) {
      prevBtn.style.visibility = isFirstStep ? 'hidden' : 'visible'
    }

    if (nextBtn) {
      nextBtn.textContent = isLastStep ? 'Finish ✓' : 'Next →'
      nextBtn.disabled = !this.isStepValid
      nextBtn.classList.toggle('disabled', !this.isStepValid)
    }
  }

  highlightElement(element) {
    const highlight = this.overlay.querySelector('.tutorial-highlight')
    const rect = element.getBoundingClientRect()
    
    const padding = 16
    const top = rect.top - padding
    const left = rect.left - padding
    const width = rect.width + (padding * 2)
    const height = rect.height + (padding * 2)
    
    highlight.style.display = 'block'
    highlight.style.top = `${top}px`
    highlight.style.left = `${left}px`
    highlight.style.width = `${width}px`
    highlight.style.height = `${height}px`
    
    // No clip-path - let the green border be fully visible
    this.overlay.style.clipPath = 'none'
    this.overlay.style.webkitClipPath = 'none'
    
    // Make highlighted element interactive
    element.style.position = 'relative'
    element.style.zIndex = '10000'
  }

  clearHighlight() {
    const highlight = this.overlay.querySelector('.tutorial-highlight')
    highlight.style.display = 'none'
    this.overlay.style.clipPath = 'none'
    this.overlay.style.webkitClipPath = 'none'
  }

  positionTooltip(element, position) {
    const rect = element.getBoundingClientRect()
    const tooltipRect = this.tooltip.getBoundingClientRect()
    const padding = 20
    
    let top, left
    
    switch (position) {
      case 'bottom':
        top = rect.bottom + padding
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
        break
      case 'top':
        top = rect.top - tooltipRect.height - padding
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
        break
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2)
        left = rect.left - tooltipRect.width - padding
        break
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2)
        left = rect.right + padding
        break
      default:
        this.centerTooltip()
        return
    }
    
    // Ensure tooltip stays on screen with better margins
    top = Math.max(50, Math.min(top, window.innerHeight - tooltipRect.height - 50))
    left = Math.max(30, Math.min(left, window.innerWidth - tooltipRect.width - 30))
    
    // Set position directly without transform conflicts
    this.tooltip.style.top = `${top}px`
    this.tooltip.style.left = `${left}px`
    this.tooltip.style.transform = 'scale(1)' // Only use scale, no translate
  }

  centerTooltip() {
    // Center using fixed positioning, not transform
    const tooltipRect = this.tooltip.getBoundingClientRect()
    const centerTop = (window.innerHeight - tooltipRect.height) / 2
    const centerLeft = (window.innerWidth - tooltipRect.width) / 2
    
    this.tooltip.style.top = `${centerTop}px`
    this.tooltip.style.left = `${centerLeft}px`
    this.tooltip.style.transform = 'scale(1)' // Only use scale, no translate
  }

  validateStep(options = {}) {
    const { skipAutoAdvance = false } = options
    const step = TUTORIAL_STEPS[this.currentStep]
    if (!step) return
    
    // If step has no validation, always valid (can proceed)
    if (!step.validation) {
      this.isStepValid = true
      this.updateNavigationButtons()
      return
    }
    
    // Run validation function
    try {
      const isValid = step.validation()
      const wasInvalid = !this.isStepValid
      this.isStepValid = isValid
      this.updateNavigationButtons()
      
      // Auto-advance when validation passes for the first time
      if (!skipAutoAdvance && isValid && wasInvalid && step.autoAdvance !== false) {
        console.log('[Tutorial] Task completed, auto-advancing...')
        setTimeout(() => this.next(), 800) // Smooth delay before advancing
      }
    } catch (err) {
      console.warn('Tutorial validation error:', err)
      this.isStepValid = true
      this.updateNavigationButtons()
    }
  }

  setupValidationListeners(step) {
    if (!step.validation) return
    
    // For paste-url step: listen to input changes
    if (step.id === 'paste-url') {
      const textarea = document.getElementById('url-input')
      if (textarea) {
        const inputHandler = () => this.validateStep()
        textarea.addEventListener('input', inputHandler)
        textarea.addEventListener('paste', inputHandler)
        this.validationListeners.push(() => {
          textarea.removeEventListener('input', inputHandler)
          textarea.removeEventListener('paste', inputHandler)
        })
      }
    }
    
    // For add-to-queue step: listen to queue changes via button click and Enter key
    if (step.id === 'add-to-queue') {
      const addBtn = document.getElementById('add-to-queue-btn')
      const textarea = document.getElementById('url-input')
      
      const checkQueue = () => {
        // Delay validation to allow DOM update
        setTimeout(() => this.validateStep(), 100)
      }
      
      if (addBtn) {
        addBtn.addEventListener('click', checkQueue)
        this.validationListeners.push(() => {
          addBtn.removeEventListener('click', checkQueue)
        })
      }
      
      if (textarea) {
        textarea.addEventListener('keydown', checkQueue)
        this.validationListeners.push(() => {
          textarea.removeEventListener('keydown', checkQueue)
        })
      }
      
      // Also monitor queue list mutations
      const queueList = document.getElementById('queue-list')
      if (queueList) {
        const observer = new MutationObserver(() => this.validateStep())
        observer.observe(queueList, { childList: true, subtree: true })
        this.validationListeners.push(() => observer.disconnect())
      }
    }
    
    // Add more listeners for other steps as needed
    // e.g., for 'queue' step, listen to queue changes
  }

  removeValidationListeners() {
    this.validationListeners.forEach(cleanup => cleanup())
    this.validationListeners = []
  }

  next() {
    if (this.currentStep < TUTORIAL_STEPS.length - 1) {
      this.currentStep++
      this.showStep(this.currentStep)
    } else {
      this.end()
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--
      this.showStep(this.currentStep)
    }
  }

  end() {
    if (!this.isActive) return
    
    console.log('[Tutorial] Ending tutorial')
    
    // Mark as completed so tutorial won't auto-launch again
    localStorage.setItem(this.storageKey, 'true')

    // Check if user wants to hide tutorial permanently
    const dontShow = document.getElementById('tutorial-dont-show')?.checked
    if (dontShow) {
      localStorage.setItem(this.storageKey, 'true')
    }
    
    // Clean up validation listeners
    this.removeValidationListeners()
    
    // Remove keyboard handler
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }
    
    // Fade out
    this.isActive = false
    if (this.tooltip) {
      this.tooltip.classList.remove('active', 'dragging')
    }
    if (this.overlay) {
      this.overlay.style.opacity = '0'
    }
    
    // Remove elements after animation
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.remove()
        this.overlay = null
      }
      if (this.tooltip) {
        this.tooltip.remove()
        this.tooltip = null
      }
      
      // Reset any highlighted elements
      document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => {
        el.style.position = ''
        el.style.zIndex = ''
      })
      
      console.log('[Tutorial] Cleanup complete')
    }, 400)
  }
}

// Initialize on page load
const tutorial = new TutorialManager()
window.addEventListener('DOMContentLoaded', () => tutorial.init())

// Export for manual control
window.tutorial = tutorial
