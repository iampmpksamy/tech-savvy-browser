// ─── TabManager ─────────────────────────────────────────────────────────────
// Lightweight tab metadata store for the main process.
//
// With the <webview> architecture, the Electron renderer owns the actual
// web-content lifecycle.  This class only needs to:
//   1. Track tab metadata for session persistence (url, title, partition, …)
//   2. Register the webContentsId each webview reports on dom-ready so that
//      AI page-extraction (executeJavaScript) and the network inspector can
//      reach the right WebContents without any WebContentsView machinery.
//   3. Broadcast TAB_UPDATED push events to keep the renderer in sync on
//      operations initiated from the main process (restore, create).
import { BrowserWindow, webContents } from 'electron';
import { randomBytes } from 'crypto';
import type { Tab, TabId, GroupId, PageContext, PageType } from '../../src/shared/types';
import { IPC } from '../../src/shared/ipc/channels';
import type { PersistedSession } from './tab-persistence';

// Internal representation — only what the main process needs to persist.
interface StoredTab {
  id: TabId;
  groupId: GroupId | null;
  url: string;
  title: string;
  partition: string;
  pinned: boolean;
}

export class TabManager {
  private tabs    = new Map<TabId, StoredTab>();
  private activeId: TabId | null = null;
  /** tabId → webContents ID, populated when webview fires dom-ready via IPC. */
  private wcIds   = new Map<TabId, number>();

  constructor(private readonly win: BrowserWindow) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  list(): Tab[] {
    return [...this.tabs.values()].map((s) => this.toTab(s));
  }

  create(url = 'about:blank', partition = 'persist:default'): Tab {
    const id = randomBytes(10).toString('base64url').slice(0, 10);
    const stored: StoredTab = { id, groupId: null, url, title: 'New Tab', partition, pinned: false };
    this.tabs.set(id, stored);
    if (!this.activeId) this.activeId = id;
    this.broadcast();
    return this.toTab(stored);
  }

  close(id: TabId): void {
    if (!this.tabs.has(id)) return;
    this.tabs.delete(id);
    this.wcIds.delete(id);
    if (this.activeId === id) {
      this.activeId = [...this.tabs.keys()].pop() ?? null;
    }
    this.broadcast();
  }

  activate(id: TabId): void {
    if (!this.tabs.has(id)) return;
    this.activeId = id;
    this.broadcast();
  }

  // ── Metadata sync (called from renderer via TAB_UPDATE_META) ──────────────

  updateMeta(id: TabId, patch: Partial<Pick<StoredTab, 'url' | 'title'>>): void {
    const t = this.tabs.get(id);
    if (!t) return;
    if (patch.url   !== undefined) t.url   = patch.url;
    if (patch.title !== undefined) t.title = patch.title;
    // No broadcast — renderer already has this data from its own webview events.
  }

  // ── WebContents registry ──────────────────────────────────────────────────

  registerWcId(id: TabId, wcId: number): void {
    this.wcIds.set(id, wcId);
  }

  /** Returns the WebContents of a webview by tab ID (for AI extraction / network inspector). */
  webContentsFor(id: TabId): Electron.WebContents | null {
    const wcId = this.wcIds.get(id);
    if (!wcId) return null;
    const wc = webContents.fromId(wcId);
    return wc && !wc.isDestroyed() ? wc : null;
  }

  // ── Page context (for AI summarise / ask / explain) ───────────────────────

  async getPageContext(): Promise<PageContext | null> {
    if (!this.activeId) return null;
    const wc = this.webContentsFor(this.activeId);
    if (!wc) return null;

    const url = wc.getURL();
    try {
      const live = await wc.executeJavaScript(`(function(){
        return {
          title:        document.title || '',
          description:  document.querySelector('meta[name="description"]')?.content || '',
          selectedText: (window.getSelection()?.toString() || '').trim(),
          text:         (document.body ? document.body.innerText : '').slice(0, 8000),
        };
      })()`);

      const l = live as { title: string; description: string; selectedText: string; text: string };
      const type = detectPageType(url, l.text, l.description);

      return {
        url,
        title:        l.title || wc.getTitle(),
        description:  l.description,
        selectedText: l.selectedText,
        text:         l.text,
        type,
      };
    } catch {
      return { url, title: wc.getTitle(), description: '', selectedText: '', text: '', type: 'generic' };
    }
  }

  // ── Session persistence ───────────────────────────────────────────────────

  snapshot(): PersistedSession {
    return {
      tabs:     [...this.tabs.values()].map((t) => ({
        id:        t.id,
        url:       t.url,
        title:     t.title,
        pinned:    t.pinned,
        groupId:   t.groupId,
        partition: t.partition,
      })),
      activeId: this.activeId,
    };
  }

  restore(persisted: PersistedSession): boolean {
    const saveable = persisted.tabs.filter((t) => isSaveableUrl(t.url));
    if (!saveable.length) return false;

    for (const saved of saveable) {
      this.tabs.set(saved.id, {
        id:        saved.id,
        groupId:   saved.groupId,
        url:       saved.url,
        title:     saved.title || 'Loading…',
        partition: (saved as StoredTab).partition ?? 'persist:default',
        pinned:    saved.pinned,
      });
    }

    this.activeId =
      (persisted.activeId && this.tabs.has(persisted.activeId) ? persisted.activeId : null) ??
      saveable[0].id;

    return true;
  }

  dispose(): void {
    this.tabs.clear();
    this.wcIds.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private toTab(s: StoredTab): Tab {
    return {
      id:           s.id,
      groupId:      s.groupId,
      url:          s.url,
      title:        s.title,
      favicon:      null,
      loading:      false,
      canGoBack:    false,
      canGoForward: false,
      muted:        false,
      pinned:       s.pinned,
      hibernated:   false,
      lastActiveAt: Date.now(),
      partition:    s.partition,
    };
  }

  private broadcast(): void {
    this.win.webContents.send(IPC.TAB_UPDATED, {
      tabs:     this.list(),
      activeId: this.activeId,
    });
  }
}

// ── Helpers (mirrored in renderer/lib/webviewRefs.ts) ────────────────────────

function isSaveableUrl(url: string): boolean {
  return !!url && !url.startsWith('chrome-error://') && url !== 'about:blank';
}

function detectPageType(url: string, text: string, description: string): PageType {
  if (!url || url === 'about:blank' || url.startsWith('chrome-')) return 'generic';
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');

    if (host === 'github.com') {
      const [,, , section] = pathname.split('/');
      if (section === 'pull')   return 'github-pr';
      if (section === 'issues') return 'github-issue';
      if (pathname.split('/').filter(Boolean).length >= 2) return 'github-repo';
      return 'generic';
    }
    if (host === 'npmjs.com')              return 'npm';
    if (host === 'developer.mozilla.org')  return 'mdn';
    if (pathname.endsWith('.json'))        return 'json';
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (
      host.startsWith('docs.') ||
      pathname.startsWith('/docs') ||
      pathname.startsWith('/api/') ||
      description.toLowerCase().includes('api reference')
    ) return 'api-docs';
    if (text.length > 500) return 'article';
  } catch { /* malformed URL */ }
  return 'generic';
}
