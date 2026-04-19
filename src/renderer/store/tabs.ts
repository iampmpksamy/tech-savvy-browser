// ─── Tabs Store ──────────────────────────────────────────────────────────────
// Sources of truth:
//   • Tab list / activeId — kept in sync with the main process via TAB_UPDATED push events
//   • Navigation state (canGoBack/canGoForward/loading/url/title/favicon) — updated
//     directly from <webview> DOM events in WebView.tsx via patchTab()
//   • Navigation commands (back/forward/reload/navigate) — issued directly on
//     the webview element via webviewRefs; no IPC round-trip needed
import { create } from 'zustand';
import type { Tab } from '@shared/types';
import { ts } from '../lib/bridge';
import { webviewRefs, normalizeUrl } from '../lib/webviewRefs';

interface TabsState {
  tabs:     Tab[];
  activeId: string | null;
  /** True after the first refresh() resolves — prevents premature auto-create. */
  loaded:   boolean;

  // ── Lifecycle (IPC — main process owns persistence) ──────────────────────
  refresh:  () => Promise<void>;
  bindPush: () => () => void;
  create:   (url?: string)  => Promise<void>;
  close:    (id: string)    => Promise<void>;
  activate: (id: string)    => Promise<void>;

  // ── Navigation (webview direct — no IPC) ─────────────────────────────────
  navigate: (id: string, url: string) => void;
  reload:   (id: string)              => void;
  back:     (id: string)              => void;
  forward:  (id: string)              => void;

  // ── State patches from <webview> events (renderer-only) ──────────────────
  patchTab: (id: string, patch: Partial<Tab>) => void;
}

export const useTabs = create<TabsState>((set) => ({
  tabs:     [],
  activeId: null,
  loaded:   false,

  // ── IPC-backed operations ────────────────────────────────────────────────

  refresh: async () => {
    const tabs = await ts().tabs.list();
    set({ tabs, loaded: true });
  },

  bindPush: () =>
    ts().tabs.onUpdated((data) => {
      set({ tabs: data.tabs, activeId: data.activeId });
    }),

  create: async (url) => {
    await ts().tabs.create(url);
    // TAB_UPDATED push will set the new tab in state.
  },

  close: async (id) => {
    await ts().tabs.close(id);
  },

  activate: async (id) => {
    await ts().tabs.activate(id);
  },

  // ── Direct webview navigation ────────────────────────────────────────────

  navigate: (id, url) => {
    const wv = webviewRefs.get(id);
    if (wv) wv.loadURL(normalizeUrl(url));
  },

  reload: (id) => {
    webviewRefs.get(id)?.reload();
  },

  back: (id) => {
    const wv = webviewRefs.get(id);
    if (wv?.canGoBack()) wv.goBack();
  },

  forward: (id) => {
    const wv = webviewRefs.get(id);
    if (wv?.canGoForward()) wv.goForward();
  },

  // ── Renderer-local patch (from webview events) ───────────────────────────

  patchTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
}));
