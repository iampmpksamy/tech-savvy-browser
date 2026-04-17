// ─── Page Context Store ────────────────────────────────────────────────────
// Holds the classified context of the active tab. Refreshed automatically
// when the active tab navigates, and on-demand when the command palette opens.
import { create } from 'zustand';
import type { PageContext } from '@shared/types';
import { ts } from '../lib/bridge';

interface ContextState {
  context: PageContext | null;
  loading: boolean;
  /** Last URL we fetched context for — used to skip redundant fetches. */
  _lastUrl: string | null;
  refresh: () => Promise<void>;
  /** Called by App.tsx whenever the active tab URL changes. */
  onUrlChange: (url: string | null) => void;
}

export const usePageContext = create<ContextState>((set, get) => ({
  context: null,
  loading: false,
  _lastUrl: null,

  refresh: async () => {
    set({ loading: true });
    try {
      const ctx = await ts().tabs.extractPageText();
      set({ context: ctx, loading: false, _lastUrl: ctx?.url ?? null });
    } catch {
      set({ loading: false });
    }
  },

  onUrlChange: (url) => {
    if (!url || url === 'about:blank') {
      set({ context: null, _lastUrl: null });
      return;
    }
    // Skip fetch if URL hasn't changed since last successful fetch.
    if (url === get()._lastUrl) return;
    get().refresh();
  },
}));
