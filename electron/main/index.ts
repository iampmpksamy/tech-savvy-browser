// ─── Electron Main Entry ─────────────────────────────────────────────────────
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createMainWindow }  from './window';
import { TabManager }        from './tab-manager';
import { TabPersistence }    from './tab-persistence';
import { ProfileManager }    from './profile-manager';
import { BlockerService }    from './blocker';
import { SecureDnsService }  from './secure-dns';
import { TerminalService }   from './terminal-service';
import { NetworkInspector }  from './network-inspector';
import { ExtensionService }  from './extensions';
import { registerIpc }       from './ipc';
import { initAutoUpdater }   from './updater';
import { AiRouter }          from '../services/ai';

// Ensure only one instance runs at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.commandLine.appendSwitch('enable-features', 'WebAssemblyCSP,PartitionedCookies');
if (process.env.NODE_ENV !== 'production') {
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
}

class Application {
  private mainWindow: BrowserWindow | null = null;
  private tabManager!: TabManager;
  private tabPersistence!: TabPersistence;
  private profileManager!: ProfileManager;
  private blocker!: BlockerService;
  private secureDns!: SecureDnsService;
  private terminal!: TerminalService;
  private netInspector!: NetworkInspector;
  private extensions!: ExtensionService;
  private ai!: AiRouter;

  async boot() {
    await app.whenReady();

    this.profileManager = new ProfileManager();
    await this.profileManager.init();

    // Extensions must be loaded before any WebContents are created.
    this.extensions = new ExtensionService();
    // (persisted extension paths would be loaded here from electron-store)

    this.blocker = new BlockerService();
    try {
      await this.blocker.init();
    } catch (err) {
      console.error('[main] ad blocker init failed, continuing without blocking:', err);
    }

    this.secureDns = new SecureDnsService();
    this.ai = new AiRouter();
    await this.ai.init();

    this.mainWindow = createMainWindow();

    this.tabPersistence = new TabPersistence();
    this.tabManager     = new TabManager(this.mainWindow);

    this.blocker.applyTo(this.profileManager.activeSession());
    this.secureDns.applyTo(this.profileManager.activeSession());

    // Restore previous session if one exists.
    // When there is nothing to restore the renderer's App.tsx creates the
    // initial tab — keeping tab creation in one place and avoiding a race
    // condition where both sides duplicate the default tab.
    const savedSession = this.tabPersistence.load();
    if (savedSession) {
      this.tabManager.restore(savedSession);
    }

    this.terminal    = new TerminalService(this.mainWindow);
    this.netInspector = new NetworkInspector(this.mainWindow, this.tabManager);

    registerIpc({
      window:     this.mainWindow,
      tabs:       this.tabManager,
      profiles:   this.profileManager,
      blocker:    this.blocker,
      secureDns:  this.secureDns,
      terminal:   this.terminal,
      net:        this.netInspector,
      ai:         this.ai,
      extensions: this.extensions,
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

process.on('unhandledRejection', (r) => console.error('[main] unhandled rejection', r));

// __dirname at runtime = dist-electron/electron/main
export const PATHS = {
  preload:      path.join(__dirname, '../preload/index.js'),
  rendererDist: path.join(__dirname, '../../../dist/index.html'),
};
