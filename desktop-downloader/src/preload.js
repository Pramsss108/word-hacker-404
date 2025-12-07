const { contextBridge, ipcRenderer } = require('electron')

const makeListener = (channel) => (callback) => {
  if (typeof callback !== 'function') return () => {}
  const wrapped = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('downloader', {
  startDownload: (payload) => ipcRenderer.invoke('downloader:start', payload),
  cancelDownload: (url) => ipcRenderer.invoke('downloader:cancel', url),
  fetchMetadata: (url) => ipcRenderer.invoke('metadata:fetch', url),
  onStatus: makeListener('status:update'),
  onProgress: makeListener('download:progress'),
  onJobStart: makeListener('download:job-start'),
  onJobComplete: makeListener('download:job-complete'),
  onJobError: makeListener('download:job-error'),
  onJobCancelled: makeListener('download:job-cancelled'),
  onExportProgress: makeListener('export:progress'),
  probeFormats: (url) => ipcRenderer.invoke('downloader:probe', url)
})

contextBridge.exposeInMainWorld('windowControls', {
  control: (action) => ipcRenderer.invoke('window:control', action),
  togglePin: () => ipcRenderer.invoke('window:toggle-pin')
})

contextBridge.exposeInMainWorld('systemDialogs', {
  chooseFolder: () => ipcRenderer.invoke('dialog:choose-folder'),
  revealFile: (targetPath) => ipcRenderer.invoke('file:reveal', targetPath),
  openFolder: (folderPath) => ipcRenderer.invoke('folder:open', folderPath),
  exportFiles: (payload) => ipcRenderer.invoke('export:files', payload),
  backgroundTrim: (payload) => ipcRenderer.invoke('export:background-trim', payload)
})
