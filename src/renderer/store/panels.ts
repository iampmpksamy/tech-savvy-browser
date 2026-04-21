import { create } from 'zustand';

export type PanelKey = 'none' | 'ai' | 'terminal' | 'api' | 'json' | 'network' | 'bookmarks';

interface PanelsState {
  sidebarWidth:   number;
  activeRightPanel: PanelKey;
  activeBottomPanel: PanelKey;
  settingsOpen:   boolean;

  setSidebarWidth:  (w: number)    => void;
  openRight:        (p: PanelKey)  => void;
  toggleRight:      (p: PanelKey)  => void;
  openBottom:       (p: PanelKey)  => void;
  setSettingsOpen:  (v: boolean)   => void;
}

export const usePanels = create<PanelsState>((set, get) => ({
  sidebarWidth:     360,
  activeRightPanel: 'none',
  activeBottomPanel:'none',
  settingsOpen:     false,

  setSidebarWidth: (w) =>
    set({ sidebarWidth: Math.max(280, Math.min(720, w)) }),

  openRight: (p) => set({ activeRightPanel: p }),

  toggleRight: (p) =>
    set({ activeRightPanel: get().activeRightPanel === p ? 'none' : p }),

  openBottom: (p) => set({ activeBottomPanel: p }),

  setSettingsOpen: (v) => set({ settingsOpen: v }),
}));
