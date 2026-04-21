// ─── TerminalService ─────────────────────────────────────────────────────────
// Manages real PTY sessions via node-pty.  Falls back to a no-op stub when
// node-pty is not installed (e.g., first-run before `install-app-deps`).
//
// After adding node-pty to package.json, run:
//   npm run postinstall   (or: electron-builder install-app-deps)
// to rebuild the native module against the correct Electron headers.
import type { BrowserWindow } from 'electron';
import { randomBytes } from 'crypto';

// Dynamic require — uses prebuilt binaries, no compilation needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodePty: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodePty = require('node-pty');
} catch {
  console.warn('[terminal] node-pty-prebuilt-multiarch not available — terminal disabled');
}

interface Session {
  id:      string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process: any | null; // IPty from node-pty, or null when stub
}

export class TerminalService {
  private sessions = new Map<string, Session>();
  private win:      BrowserWindow;

  constructor(win: BrowserWindow) {
    this.win = win;
  }

  spawn(cols = 80, rows = 24): string {
    const id = randomBytes(8).toString('base64url').slice(0, 8);

    if (!nodePty) {
      this.sessions.set(id, { id, process: null });
      return id;
    }

    const shell =
      process.platform === 'win32'
        ? (process.env.COMSPEC ?? 'cmd.exe')
        : (process.env.SHELL ?? '/bin/bash');

    const proc = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME ?? process.cwd(),
      env: process.env as Record<string, string>,
    });

    proc.onData((data: string) => {
      if (!this.win.isDestroyed()) {
        this.win.webContents.send('terminal:data', { id, data });
      }
    });

    proc.onExit(() => {
      this.sessions.delete(id);
      if (!this.win.isDestroyed()) {
        this.win.webContents.send('terminal:exit', { id });
      }
    });

    this.sessions.set(id, { id, process: proc });
    return id;
  }

  write(id: string, data: string) {
    this.sessions.get(id)?.process?.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    this.sessions.get(id)?.process?.resize(cols, rows);
  }

  kill(id: string) {
    const session = this.sessions.get(id);
    if (session?.process) {
      try { session.process.kill(); } catch { /* already exited */ }
    }
    this.sessions.delete(id);
  }

  disposeAll() {
    for (const id of [...this.sessions.keys()]) this.kill(id);
  }
}
