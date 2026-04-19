// ─── TerminalService (stub) ──────────────────────────────────────────────────
// node-pty has been removed. Terminal sessions are disabled.
// The interface is preserved so index.ts and ipc.ts compile unchanged.
import type { BrowserWindow } from 'electron';
import { randomBytes } from 'crypto';

interface Session {
  id: string;
}

export class TerminalService {
  private sessions = new Map<string, Session>();

  // win is kept so the constructor signature matches.
  constructor(_win: BrowserWindow) {}

  spawn(_cols = 80, _rows = 24): string {
    const id = randomBytes(8).toString('base64url').slice(0, 8);
    this.sessions.set(id, { id });
    return id;
  }

  write(_id: string, _data: string) {}

  resize(_id: string, _cols: number, _rows: number) {}

  kill(id: string) {
    this.sessions.delete(id);
  }

  disposeAll() {
    this.sessions.clear();
  }
}
