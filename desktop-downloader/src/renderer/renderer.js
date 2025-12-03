const textarea = document.getElementById('url-input')
const formatButtons = Array.from(document.querySelectorAll('.format-btn'))
const downloadBtn = document.getElementById('download-btn')
const statusPanel = document.getElementById('status-panel')
const statusOutput = document.getElementById('status-output')

let selectedFormat = 'mp4-1080'

formatButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    formatButtons.forEach((item) => item.classList.remove('active'))
    btn.classList.add('active')
    selectedFormat = btn.dataset.format
  })
})

const appendStatus = (text) => {
  statusPanel.hidden = false
  statusOutput.textContent = `${text}\n${statusOutput.textContent}`.trim()
}

const parseUrls = () => {
  return textarea.value
    .replace(/\n/g, ' ')
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
}

const setBusy = (state) => {
  downloadBtn.disabled = state
  downloadBtn.textContent = state ? 'Working…' : 'Download'
}

const onDownload = async () => {
  const urls = parseUrls()
  if (urls.length === 0) {
    appendStatus('Paste at least one YouTube link.')
    return
  }
  try {
    setBusy(true)
    appendStatus(`Starting ${urls.length} job(s) in ${selectedFormat}…`)
    const result = await window.downloader.startDownload({ urls, format: selectedFormat })
    result.jobs.forEach((job) => {
      appendStatus(`✔ ${job.url}\n→ ${job.files.join('\n→ ')}`)
    })
    appendStatus(`Saved files to ${result.outputDir}`)
  } catch (error) {
    console.error(error)
    appendStatus(`⚠️ ${error.message || 'Download failed'}`)
  } finally {
    setBusy(false)
  }
}

downloadBtn.addEventListener('click', onDownload)
