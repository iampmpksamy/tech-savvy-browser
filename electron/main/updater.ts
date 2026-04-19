// ─── Auto-updater ──────────────────────────────────────────────────────────
import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC } from '../../src/shared/ipc/channels';

export function initAutoUpdater(win: BrowserWindow) {
  if (process.env.NODE_ENV === 'development') return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const forward = (status: string, info?: unknown) =>
    win.webContents.send(IPC.UPDATER_STATUS, { status, info });

  autoUpdater.on('checking-for-update', () => forward('checking'));
  autoUpdater.on('update-available', (info) => forward('available', info));
  autoUpdater.on('update-not-available', () => forward('none'));
  autoUpdater.on('download-progress', (p) => forward('progress', p));
  autoUpdater.on('update-downloaded', (info) => forward('downloaded', info));
  autoUpdater.on('error', (err) => forward('error', { message: err.message }));

  autoUpdater.checkForUpdatesAndNotify().catch(() => void 0);
}

export function triggerInstall() {
  autoUpdater.quitAndInstall(false, true);
}

export function triggerCheck() {
  autoUpdater.checkForUpdates().catch(() => void 0);
}
