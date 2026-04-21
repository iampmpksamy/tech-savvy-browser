// ─── Tabs Store ──────────────────────────────────────────────────────────────
// Sources of truth:
//   • Tab list / activeId — kept in sync with main via TAB_UPDATED push events.
//     Local drag-reorder is preserved: incoming pushes update metadata without
//     resetting the user's tab order.
//   • Navigation state (canGoBack/Forward/loading/url/title/favicon) — updated
//     directly from <webview> DOM events in WebView.tsx via patchTab().
//   • Navigation commands — issued on the webview element directly (no IPC).
import { create } from 'zustand';
import type { Tab } from '@shared/types';
import { ts } from '../lib/bridge';
import { webviewRefs, normalizeUrl } from '../lib/webviewRefs';

interface TabsState {
  tabs:     Tab[];
  activeId: string | null;
  loaded:   boolean;

  // ── Lifecycle (IPC) ──────────────────────────────────────────────────────
  refresh:  () => Promise<void>;
  bindPush: () => () => void;
  create:   (url?: string) => Promise<void>;
  close:    (id: string)   => Promise<void>;
  activate: (id: string)   => Promise<void>;

  // ── Navigation (webview direct) ──────────────────────────────────────────
  navigate: (id: string, url: string) => void;
  reload:   (id: string)              => void;
  back:     (id: string)              => void;
  forward:  (id: string)              => void;

  // ── Renderer-local ───────────────────────────────────────────────────────
  patchTab:    (id: string, patch: Partial<Tab>)  => void;
  reorderByIds:(ids: string[])                    => void;
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs:     [],
  activeId: null,
  loaded:   false,

  // ── IPC-backed ───────────────────────────────────────────────────────────

  refresh: async () => {
    const tabs = await ts().tabs.list();
    set({ tabs, loaded: true });
  },

  bindPush: () =>
    ts().tabs.onUpdated((data) => {
      set((prev) => {
        const incoming = new Map(data.tabs.map((t) => [t.id, t]));
        // Preserve user's local tab order; just update metadata on existing tabs.
        const preserved = prev.tabs
          .filter((t) => incoming.has(t.id))
          .map((t) => ({ ...t, ...incoming.get(t.id)! }));
        // Append tabs that are new (not yet in local list).
        const existingIds = new Set(preserved.map((t) => t.id));
        const added = data.tabs.filter((t) => !existingIds.has(t.id));
        return { tabs: [...preserved, ...added], activeId: data.activeId };
      });
    }),

  create: async (url) => {
    await ts().tabs.create(url);
  },

  close: async (id) => {
    await ts().tabs.close(id);
  },

  activate: async (id) => {
    await ts().tabs.activate(id);
  },

  // ── Direct webview navigation ─────────────────────────────────────────────

  navigate: (id, url) => {
    const normalized = normalizeUrl(url);
    const wv = webviewRefs.get(id);
    if (!wv) return;
    // Skip if the webview is already at this URL — prevents duplicate loads
    // that would abort the ongoing navigation and produce ERR_ABORTED.
    try { if (wv.getURL() === normalized) return; } catch { /* not yet ready */ }
    wv.loadURL(normalized);
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

  // ── Renderer-local patches ────────────────────────────────────────────────

  patchTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  reorderByIds: (ids) =>
    set((s) => ({
      tabs: ids.map((id) => s.tabs.find((t) => t.id === id)!).filter(Boolean),
    })),
}));
