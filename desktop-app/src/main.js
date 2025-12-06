const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0b0b0d',
    frame: false, // Frameless for custom header
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For easier IPC in this prototype
      webSecurity: false // Allow loading local resources easily
    }
  });

  // In dev, load localhost. In prod, load the live site.
  // This ensures the desktop app always has the latest features without updating the .exe
  const isDev = !app.isPackaged;
  const prodUrl = 'https://wordhacker404.me/';
  const devUrl = 'http://localhost:3001';

  win.loadURL(isDev ? devUrl : prodUrl);

  // Hardware Detection
  ipcMain.handle('get-system-specs', () => {
    return {
      ram: os.totalmem() / (1024 * 1024 * 1024),
      cpu: os.cpus()[0].model,
      cores: os.cpus().length,
      platform: os.platform()
    };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});