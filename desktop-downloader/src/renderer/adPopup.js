// ============================================
// AD POPUP INTEGRATION
// Shows ad before download for FREE users
// ============================================

async function showAdForDownload(url) {
  return new Promise((resolve, reject) => {
    // Get video metadata for preview
    window.__TAURI__.invoke('get_video_metadata', { url })
      .then(metadata => {
        const videoPreview = {
          thumbnail: metadata.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="90"%3E%3Crect fill="%23333" width="160" height="90"/%3E%3C/svg%3E',
          title: metadata.title || 'Video',
          duration: formatDuration(metadata.duration) || '0:00',
          platform: detectPlatform(url)
        }
        
        // Create ad popup
        const popup = document.createElement('div')
        popup.id = 'ad-popup-container'
        popup.innerHTML = createAdPopupHTML(videoPreview)
        document.body.appendChild(popup)
        
        // Initialize ad flow
        initializeAdFlow(popup, resolve, reject)
      })
      .catch(err => {
        console.error('[Ad] Failed to get metadata:', err)
        // Show ad anyway with basic info
        const videoPreview = {
          thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="90"%3E%3Crect fill="%23333" width="160" height="90"/%3E%3C/svg%3E',
          title: 'Video Download',
          duration: '0:00',
          platform: detectPlatform(url)
        }
        
        const popup = document.createElement('div')
        popup.id = 'ad-popup-container'
        popup.innerHTML = createAdPopupHTML(videoPreview)
        document.body.appendChild(popup)
        
        initializeAdFlow(popup, resolve, reject)
      })
  })
}

function createAdPopupHTML(preview) {
  return `
    <div class="ad-popup-overlay">
      <div class="ad-popup-container">
        
        <div class="ad-video-preview">
          <div class="preview-thumbnail">
            <img src="${preview.thumbnail}" alt="${preview.title}">
            <div class="preview-platform-badge">${preview.platform}</div>
          </div>
          <div class="preview-info">
            <h3 class="preview-title">${preview.title}</h3>
            <p class="preview-duration">Duration: ${preview.duration}</p>
          </div>
        </div>

        <div class="ad-status-section">
          <div class="ad-status loading">
            <div class="spinner"></div>
            <h2>Loading your ad...</h2>
            <p>Preparing your download experience</p>
          </div>
        </div>

        <div class="ad-popup-footer">
          <p class="ad-info-text">
            💰 Free downloads supported by ads • 
            <span class="upgrade-link">Upgrade to PRO</span> for ad-free experience
          </p>
        </div>

      </div>
    </div>
  `
}

async function initializeAdFlow(popup, resolve, reject) {
  const statusSection = popup.querySelector('.ad-status-section')
  
  try {
    console.log('[Ad] Starting ad flow...')
    
    // Simulate ad loading (2 seconds in dev mode)
    await new Promise(r => setTimeout(r, 2000))
    
    // Show countdown
    statusSection.innerHTML = `
      <div class="ad-status playing">
        <div class="countdown-circle">
          <svg class="countdown-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="countdown-bg" />
            <circle cx="50" cy="50" r="45" class="countdown-progress" id="countdown-progress" />
          </svg>
          <div class="countdown-text">
            <span class="countdown-number" id="countdown-number">30</span>
            <span class="countdown-label">seconds</span>
          </div>
        </div>
        
        <h2>Watch this short ad</h2>
        <p>Your download starts automatically after the ad</p>
        
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-text" id="progress-text">0% complete</div>
      </div>
    `
    
    // Start countdown (30 seconds in production, 3 in dev)
    const countdownTime = 3 // Dev mode: 3 seconds
    let timeLeft = countdownTime
    
    const countdownNumber = popup.querySelector('#countdown-number')
    const progressFill = popup.querySelector('#progress-fill')
    const progressText = popup.querySelector('#progress-text')
    const progressCircle = popup.querySelector('#countdown-progress')
    
    const timer = setInterval(() => {
      timeLeft--
      const progress = ((countdownTime - timeLeft) / countdownTime) * 100
      
      countdownNumber.textContent = timeLeft
      progressFill.style.width = progress + '%'
      progressText.textContent = Math.round(progress) + '% complete'
      progressCircle.style.strokeDasharray = `${progress * 2.827} 282.7`
      
      if (timeLeft <= 0) {
        clearInterval(timer)
        completeAd(popup, resolve, reject)
      }
    }, 1000)
    
  } catch (err) {
    console.error('[Ad] Flow failed:', err)
    showAdError(statusSection, err.message)
    setTimeout(() => {
      popup.remove()
      reject(err)
    }, 3000)
  }
}

async function completeAd(popup, resolve, reject) {
  const statusSection = popup.querySelector('.ad-status-section')
  
  try {
    console.log('[Ad] Requesting download token...')
    
    // Show success state
    statusSection.innerHTML = `
      <div class="ad-status completed">
        <div class="success-icon">✓</div>
        <h2>Ad complete!</h2>
        <p>Authorizing download...</p>
        <div class="shimmer-bar"></div>
      </div>
    `
    
    // Request token from server - this validates ad was watched
    const token = await window.__TAURI__.invoke('request_download_token')
    console.log('[Ad] Token received:', token)
    
    // Store token globally for download authorization
    window.currentDownloadToken = token
    
    // Wait a moment for visual feedback
    await new Promise(r => setTimeout(r, 1500))
    
    // Remove popup
    popup.remove()
    
    // Resolve promise to continue download
    resolve()
    
  } catch (err) {
    console.error('[Ad] Token request failed:', err)
    showAdError(statusSection, 'Failed to authorize download. Ad verification failed.')
    setTimeout(() => {
      popup.remove()
      reject(new Error('Ad verification failed')) // BLOCK download
    }, 3000)
  }
}

function showAdError(statusSection, message) {
  statusSection.innerHTML = `
    <div class="ad-status failed">
      <div class="error-icon">✕</div>
      <h2>Ad couldn't load</h2>
      <p class="error-message">${message}</p>
      <button class="retry-button" onclick="location.reload()">Retry</button>
    </div>
  `
}

function detectPlatform(url) {
  if (url.includes('instagram')) return 'Instagram'
  if (url.includes('facebook')) return 'Facebook'
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter'
  if (url.includes('tiktok')) return 'TikTok'
  if (url.includes('youtube')) return 'YouTube'
  return 'Video'
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Expose to global window for access from index.js
window.showAdForDownload = showAdForDownload

// Add CSS for ad popup
const adPopupStyles = `
<style id="ad-popup-styles">
.ad-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ad-popup-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  max-width: 600px;
  width: 90%;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.ad-video-preview {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-thumbnail {
  position: relative;
  flex-shrink: 0;
  width: 160px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-platform-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #0aff6a;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.preview-duration {
  color: #9aa3b2;
  font-size: 14px;
  margin: 0;
}

.ad-status-section {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-status {
  text-align: center;
  width: 100%;
}

.ad-status h2 {
  color: #fff;
  font-size: 24px;
  margin: 20px 0 10px;
  font-weight: 600;
}

.ad-status p {
  color: #9aa3b2;
  font-size: 16px;
  margin: 0 0 20px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(10, 255, 106, 0.1);
  border-top-color: #0aff6a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.countdown-circle {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 0 auto 30px;
}

.countdown-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.countdown-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.countdown-progress {
  fill: none;
  stroke: #0aff6a;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 0 282.7;
  transition: stroke-dasharray 0.3s ease;
  filter: drop-shadow(0 0 10px rgba(10, 255, 106, 0.5));
}

.countdown-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.countdown-number {
  display: block;
  font-size: 48px;
  font-weight: 700;
  color: #0aff6a;
  line-height: 1;
  text-shadow: 0 0 20px rgba(10, 255, 106, 0.5);
}

.countdown-label {
  display: block;
  font-size: 14px;
  color: #9aa3b2;
  margin-top: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 20px 0 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0aff6a 0%, #07c06b 100%);
  border-radius: 10px;
  width: 0%;
  transition: width 0.5s ease;
  box-shadow: 0 0 15px rgba(10, 255, 106, 0.5);
}

.progress-text {
  color: #9aa3b2;
  font-size: 14px;
  margin-top: 10px;
  font-weight: 500;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0aff6a 0%, #07c06b 100%);
  color: #0b0b0d;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: successPop 0.5s ease;
  box-shadow: 0 0 30px rgba(10, 255, 106, 0.6);
}

@keyframes successPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.shimmer-bar {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, transparent, #0aff6a, transparent);
  animation: shimmer 1.5s infinite;
  margin-top: 20px;
  border-radius: 2px;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.error-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d92e2e 0%, #a02020 100%);
  color: #fff;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.error-message {
  color: #d92e2e !important;
}

.retry-button {
  background: linear-gradient(135deg, #0aff6a 0%, #07c06b 100%);
  color: #0b0b0d;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(10, 255, 106, 0.4);
}

.ad-popup-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.ad-info-text {
  color: #9aa3b2;
  font-size: 14px;
  text-align: center;
  margin: 0;
}

.upgrade-link {
  color: #0aff6a;
  cursor: pointer;
  transition: color 0.3s ease;
}

.upgrade-link:hover {
  color: #07c06b;
  text-decoration: underline;
}
</style>
`

// Inject CSS
if (!document.getElementById('ad-popup-styles')) {
  document.head.insertAdjacentHTML('beforeend', adPopupStyles)
}
