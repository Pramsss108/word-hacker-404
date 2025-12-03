const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('downloader', {
  startDownload: (payload) => ipcRenderer.invoke('downloader:start', payload)
})
