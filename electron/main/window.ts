// ─── Main BrowserWindow Factory ─────────────────────────────────────────────
// Security notes:
//   • webviewTag: true  — required so the renderer can use <webview> elements.
//   • sandbox: false    — webviewTag does not work with sandbox: true on the
//                         parent BrowserWindow.  The renderer is still protected
//                         by contextIsolation + nodeIntegration: false + preload.
//   • Each <webview> sets its own webpreferences="sandbox=yes,nodeIntegration=no"
//     so guest pages are sandboxed independently.
import { BrowserWindow, shell } from 'electron';
import path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth:  960,
    minHeight: 600,
    show:      false,
    frame:          process.platform === 'darwin',
    titleBarStyle:  process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform !== 'darwin'
      ? { color: '#0a0b0d', symbolColor: '#e8ebf0', height: 36 }
      : undefined,
    backgroundColor: '#0a0b0d',
    webPreferences: {
      preload:          path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webviewTag:       true,   // Phase 4: <webview> support
      sandbox:          false,  // Required for webviewTag; renderer is still isolated via preload
      spellcheck:       true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // __dirname at runtime = dist-electron/electron/main  →  ../../../ = project root
    win.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());
  return win;
}
