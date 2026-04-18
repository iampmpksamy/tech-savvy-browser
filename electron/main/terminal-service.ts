// ─── TerminalService ───────────────────────────────────────────────────────
// PTY-backed terminal sessions for the built-in Terminal panel.
// Uses node-pty → real shell, real TTY semantics (colors, resize, etc.).
import type { BrowserWindow } from 'electron';
import * as pty from 'node-pty';
import os from 'node:os';
import { randomBytes } from 'crypto';
import { IPC } from '@shared/ipc/channels';

interface Session {
  id: string;
  proc: pty.IPty;
}

export class TerminalService {
  private sessions = new Map<string, Session>();

  constructor(private win: BrowserWindow) {}

  spawn(cols = 80, rows = 24): string {
    const id = randomBytes(8).toString('base64url').slice(0, 8);
    const shell = defaultShell();
    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: os.homedir(),
      env: process.env as { [k: string]: string },
    });
    proc.onData((data) => this.win.webContents.send(IPC.TERM_DATA, { id, data }));
    proc.onExit(({ exitCode }) => {
      this.win.webContents.send(IPC.TERM_EXIT, { id, exitCode });
      this.sessions.delete(id);
    });
    this.sessions.set(id, { id, proc });
    return id;
  }

  write(id: string, data: string) {
    this.sessions.get(id)?.proc.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    try {
      this.sessions.get(id)?.proc.resize(cols, rows);
    } catch {
      /* pty may have exited */
    }
  }

  kill(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    try {
      s.proc.kill();
    } catch {
      /* already dead */
    }
    this.sessions.delete(id);
  }

  disposeAll() {
    for (const s of this.sessions.values()) {
      try {
        s.proc.kill();
      } catch {
        /* noop */
      }
    }
    this.sessions.clear();
  }
}

function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC ?? 'powershell.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
}
