// ─── Main BrowserWindow Factory ────────────────────────────────────────────
import { BrowserWindow, shell } from 'electron';
import path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: process.platform === 'darwin', // custom title bar on Win/Linux
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay:
      process.platform !== 'darwin'
        ? { color: '#0a0b0d', symbolColor: '#e8ebf0', height: 36 }
        : undefined,
    backgroundColor: '#0a0b0d',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  // External links open in the OS browser, not a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());
  return win;
}
