// ─── TabManager ────────────────────────────────────────────────────────────
// Owns one WebContentsView per tab, positioned inside the main window under
// the renderer's tab strip + URL bar. Hibernates idle tabs to save RAM.
import { BrowserWindow, WebContentsView } from 'electron';
import { nanoid } from 'nanoid';
import type { Tab, TabId, PageContext, PageType } from '@shared/types';
import { IPC } from '@shared/ipc/channels';
import type { ProfileManager } from './profile-manager';
import type { PersistedSession, PersistedTab } from './tab-persistence';

interface TabEntry {
  id: TabId;
  view: WebContentsView | null; // null = hibernated
  meta: Tab;
}

export interface TabBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TabManager {
  private tabs = new Map<TabId, TabEntry>();
  private activeId: TabId | null = null;
  private bounds: TabBounds = { x: 240, y: 72, width: 800, height: 600 };
  private hibernateTimer: NodeJS.Timeout;
  // Cache classified page context per tab; invalidated on navigation.
  private contextCache = new Map<TabId, PageContext>();

  constructor(
    private win: BrowserWindow,
    private profiles: ProfileManager,
  ) {
    // Resize active view when window resizes.
    this.win.on('resize', () => this.applyBoundsToActive());
    // Periodic hibernation sweep.
    this.hibernateTimer = setInterval(() => this.hibernateIdleTabs(), 60_000);
  }

  list(): Tab[] {
    return [...this.tabs.values()].map((t) => t.meta);
  }

  create(url = 'about:blank'): Tab {
    const id = nanoid(10);
    const view = this.makeView(id, url);
    const meta: Tab = {
      id,
      groupId: null,
      url,
      title: 'New Tab',
      favicon: null,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      muted: false,
      pinned: false,
      hibernated: false,
      lastActiveAt: Date.now(),
    };
    this.tabs.set(id, { id, view, meta });
    this.activate(id);
    return meta;
  }

  close(id: TabId) {
    const t = this.tabs.get(id);
    if (!t) return;
    if (t.view) {
      this.win.contentView.removeChildView(t.view);
      (t.view.webContents as unknown as { destroy?: () => void }).destroy?.();
    }
    this.tabs.delete(id);
    if (this.activeId === id) {
      const next = [...this.tabs.keys()].pop() ?? null;
      this.activeId = next;
      if (next) this.activate(next);
    }
    this.broadcast();
  }

  activate(id: TabId) {
    const t = this.tabs.get(id);
    if (!t) return;
    // Wake hibernated tabs.
    if (!t.view) {
      t.view = this.makeView(id, t.meta.url);
      t.meta.hibernated = false;
    }
    // Hide previous.
    if (this.activeId && this.activeId !== id) {
      const prev = this.tabs.get(this.activeId);
      if (prev?.view) this.win.contentView.removeChildView(prev.view);
    }
    this.win.contentView.addChildView(t.view);
    t.meta.lastActiveAt = Date.now();
    this.activeId = id;
    this.applyBoundsToActive();
    this.broadcast();
  }

  navigate(id: TabId, url: string) {
    const t = this.tabs.get(id);
    if (!t?.view) return;
    t.view.webContents.loadURL(normalizeUrl(url));
  }

  reload(id: TabId) {
    this.tabs.get(id)?.view?.webContents.reload();
  }

  goBack(id: TabId) {
    const t = this.tabs.get(id)?.view;
    if (t && t.webContents.canGoBack()) t.webContents.goBack();
  }

  goForward(id: TabId) {
    const t = this.tabs.get(id)?.view;
    if (t && t.webContents.canGoForward()) t.webContents.goForward();
  }

  setBounds(b: TabBounds) {
    this.bounds = b;
    this.applyBoundsToActive();
  }

  webContentsFor(id: TabId): Electron.WebContents | null {
    return this.tabs.get(id)?.view?.webContents ?? null;
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  snapshot(): PersistedSession {
    const tabs: PersistedTab[] = [...this.tabs.values()].map((t) => ({
      id: t.id,
      // For live tabs get the current URL (may differ from meta after navigation)
      url: t.view ? t.view.webContents.getURL() || t.meta.url : t.meta.url,
      title: t.meta.title,
      pinned: t.meta.pinned,
      groupId: t.meta.groupId,
    }));
    return { tabs, activeId: this.activeId };
  }

  // Returns false when there is nothing to restore (caller should open a default tab).
  restore(session: PersistedSession): boolean {
    const saveable = session.tabs.filter((t) => isSaveableUrl(t.url));
    if (!saveable.length) return false;

    const now = Date.now();
    for (const saved of saveable) {
      const meta: Tab = {
        id: saved.id,
        groupId: saved.groupId,
        url: saved.url,
        title: saved.title || 'Loading…',
        favicon: null,
        loading: false,
        canGoBack: false,
        canGoForward: false,
        muted: false,
        pinned: saved.pinned,
        hibernated: true, // all start hibernated; only the active tab wakes
        lastActiveAt: now,
      };
      this.tabs.set(saved.id, { id: saved.id, view: null, meta });
    }

    // Prefer the previously active tab; fall back to first in list.
    const targetId =
      (session.activeId && this.tabs.has(session.activeId) ? session.activeId : null) ??
      saveable[0].id;
    this.activate(targetId);
    return true;
  }

  async getPageContext(): Promise<PageContext | null> {
    if (!this.activeId) return null;
    const t = this.tabs.get(this.activeId);
    if (!t?.view) return null;
    const wc = t.view.webContents;
    const url = wc.getURL();

    // Selected text is volatile — always re-extract it, but serve the rest from cache.
    const cached = this.contextCache.get(this.activeId);

    try {
      const live = await wc.executeJavaScript(`(function(){
        return {
          title: document.title || '',
          description: document.querySelector('meta[name="description"]')?.content || '',
          selectedText: (window.getSelection()?.toString() || '').trim(),
          text: (document.body ? document.body.innerText : '').slice(0, 8000),
        };
      })()`);

      // If we have a cache hit and the URL hasn't changed, reuse heavy fields.
      const text: string = cached ? cached.text : (live.text as string);
      const description: string = cached ? cached.description : (live.description as string);
      const type: PageType = cached ? cached.type : detectPageType(url, text, live.description as string);

      const ctx: PageContext = {
        url,
        title: live.title as string || wc.getTitle(),
        description,
        selectedText: live.selectedText as string,
        text,
        type,
      };

      if (!cached) this.contextCache.set(this.activeId, ctx);
      // Return a copy with the fresh selectedText (not cached).
      return ctx;
    } catch {
      const fallback: PageContext = {
        url,
        title: wc.getTitle(),
        description: '',
        selectedText: '',
        text: '',
        type: 'generic',
      };
      return fallback;
    }
  }

  // ── internals ────────────────────────────────────────────────────────────

  private makeView(id: TabId, url: string): WebContentsView {
    const session = this.profiles.activeSession();
    const view = new WebContentsView({
      webPreferences: {
        session,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
        webSecurity: true,
      },
    });
    this.wireEvents(id, view);
    view.webContents.loadURL(normalizeUrl(url));
    return view;
  }

  private wireEvents(id: TabId, view: WebContentsView) {
    const wc = view.webContents;
    const update = (patch: Partial<Tab>) => {
      const t = this.tabs.get(id);
      if (!t) return;
      t.meta = { ...t.meta, ...patch };
      this.broadcast();
    };
    wc.on('page-title-updated', (_e, title) => update({ title }));
    wc.on('page-favicon-updated', (_e, favicons) =>
      update({ favicon: favicons[0] ?? null }),
    );
    wc.on('did-start-loading', () => update({ loading: true }));
    wc.on('did-stop-loading', () =>
      update({
        loading: false,
        url: wc.getURL(),
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
      }),
    );
    wc.on('did-navigate', (_e, url) => { this.contextCache.delete(id); update({ url }); });
    wc.on('did-navigate-in-page', (_e, url) => { this.contextCache.delete(id); update({ url }); });
  }

  private applyBoundsToActive() {
    if (!this.activeId) return;
    const t = this.tabs.get(this.activeId);
    if (!t?.view) return;
    const [w, h] = this.win.getContentSize();
    const b = this.bounds;
    // Clamp to content size so views never exceed window.
    const width = Math.max(0, Math.min(b.width, w - b.x));
    const height = Math.max(0, Math.min(b.height, h - b.y));
    t.view.setBounds({ x: b.x, y: b.y, width, height });
  }

  private hibernateIdleTabs() {
    const idleMs = 10 * 60 * 1000;
    const now = Date.now();
    for (const t of this.tabs.values()) {
      if (
        t.id !== this.activeId &&
        t.view &&
        !t.meta.pinned &&
        now - t.meta.lastActiveAt > idleMs
      ) {
        t.meta.url = t.view.webContents.getURL() || t.meta.url;
        this.win.contentView.removeChildView(t.view);
        (t.view.webContents as unknown as { destroy?: () => void }).destroy?.();
        t.view = null;
        t.meta.hibernated = true;
      }
    }
    this.broadcast();
  }

  private broadcast() {
    this.win.webContents.send(IPC.TAB_UPDATED, {
      tabs: this.list(),
      activeId: this.activeId,
    });
  }

  dispose() {
    clearInterval(this.hibernateTimer);
    for (const t of this.tabs.values()) {
      if (t.view) (t.view.webContents as unknown as { destroy?: () => void }).destroy?.();
    }
    this.tabs.clear();
  }
}

// Classifies the current page into a structured type for AI context injection.
function detectPageType(url: string, text: string, description: string): PageType {
  if (!url || url === 'about:blank' || url.startsWith('chrome-')) return 'generic';
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');

    if (host === 'github.com') {
      const [, , , section] = pathname.split('/'); // ['', owner, repo, section]
      if (section === 'pull') return 'github-pr';
      if (section === 'issues') return 'github-issue';
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return 'github-repo';
      return 'generic';
    }

    if (host === 'npmjs.com') return 'npm';
    if (host === 'developer.mozilla.org') return 'mdn';

    // JSON: file extension OR response body looks like JSON.
    if (pathname.endsWith('.json')) return 'json';
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';

    // API / dev docs: common subdomain or path prefixes.
    if (
      host.startsWith('docs.') ||
      pathname.startsWith('/docs') ||
      pathname.startsWith('/api/') ||
      description.toLowerCase().includes('api reference')
    ) {
      return 'api-docs';
    }

    // Article: page has substantial readable text.
    if (text.length > 500) return 'article';
  } catch { /* malformed URL — fall through */ }

  return 'generic';
}

// Rejects chrome-error:// pages so they are never saved to disk.
function isSaveableUrl(url: string): boolean {
  return !!url && !url.startsWith('chrome-error://');
}

// Accepts URLs, bare hostnames, and search queries.
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}
