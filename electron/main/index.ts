// ─── Electron Main Entry ───────────────────────────────────────────────────
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createMainWindow } from './window';
import { TabManager } from './tab-manager';
import { TabPersistence } from './tab-persistence';
import { ProfileManager } from './profile-manager';
import { BlockerService } from './blocker';
import { SecureDnsService } from './secure-dns';
import { TerminalService } from './terminal-service';
import { NetworkInspector } from './network-inspector';
import { registerIpc } from './ipc';
import { initAutoUpdater } from './updater';
import { AiRouter } from '../services/ai';

// Hardening: a single instance + basic flags.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.commandLine.appendSwitch('enable-features', 'WebAssemblyCSP,PartitionedCookies');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors'); // dev niceness

class Application {
  private mainWindow: BrowserWindow | null = null;
  private tabManager!: TabManager;
  private tabPersistence!: TabPersistence;
  private profileManager!: ProfileManager;
  private blocker!: BlockerService;
  private secureDns!: SecureDnsService;
  private terminal!: TerminalService;
  private netInspector!: NetworkInspector;
  private ai!: AiRouter;

  async boot() {
    await app.whenReady();

    this.profileManager = new ProfileManager();
    await this.profileManager.init();

    this.blocker = new BlockerService();
    await this.blocker.init();

    this.secureDns = new SecureDnsService();
    this.ai = new AiRouter();
    await this.ai.init();

    this.mainWindow = createMainWindow();

    this.tabPersistence = new TabPersistence();
    this.tabManager = new TabManager(this.mainWindow, this.profileManager);
    this.blocker.applyTo(this.profileManager.activeSession());
    this.secureDns.applyTo(this.profileManager.activeSession());

    // Restore previous session, or open a fresh tab when nothing is saved.
    const savedSession = this.tabPersistence.load();
    const restored = savedSession ? this.tabManager.restore(savedSession) : false;
    if (!restored) {
      this.tabManager.create('https://duckduckgo.com');
    }

    this.terminal = new TerminalService(this.mainWindow);
    this.netInspector = new NetworkInspector(this.mainWindow, this.tabManager);

    registerIpc({
      window: this.mainWindow,
      tabs: this.tabManager,
      profiles: this.profileManager,
      blocker: this.blocker,
      secureDns: this.secureDns,
      terminal: this.terminal,
      net: this.netInspector,
      ai: this.ai,
    });

    initAutoUpdater(this.mainWindow);

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.mainWindow = createMainWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });

    // Graceful shutdown — snapshot must happen before dispose clears the map.
    app.on('before-quit', () => {
      this.tabPersistence.save(this.tabManager.snapshot());
      this.tabManager.dispose();
      this.terminal.disposeAll();
      this.netInspector.disposeAll();
    });
  }
}

const appInstance = new Application();
appInstance.boot().catch((err) => {
  console.error('[main] fatal boot error', err);
  app.exit(1);
});

// Ensure unhandled rejections surface early during dev.
process.on('unhandledRejection', (r) => console.error('[main] unhandled rejection', r));

// Absolute path helpers for other modules.
export const PATHS = {
  preload: path.join(__dirname, '../preload/index.js'),
  rendererDist: path.join(__dirname, '../../dist/index.html'),
};
