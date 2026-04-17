import { create } from 'zustand';
import type { Tab } from '@shared/types';
import { ts } from '../lib/bridge';

interface TabsState {
  tabs: Tab[];
  activeId: string | null;
  /** True after the first refresh() resolves — guards against premature auto-create. */
  loaded: boolean;
  refresh: () => Promise<void>;
  bindPush: () => () => void;
  create: (url?: string) => Promise<void>;
  close: (id: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
  navigate: (id: string, url: string) => Promise<void>;
  reload: (id: string) => Promise<void>;
  back: (id: string) => Promise<void>;
  forward: (id: string) => Promise<void>;
}

export const useTabs = create<TabsState>((set) => ({
  tabs: [],
  activeId: null,
  loaded: false,

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
  },
  close: (id) => ts().tabs.close(id),
  activate: (id) => ts().tabs.activate(id),
  navigate: (id, url) => ts().tabs.navigate(id, url),
  reload: (id) => ts().tabs.reload(id),
  back: (id) => ts().tabs.back(id),
  forward: (id) => ts().tabs.forward(id),
}));
