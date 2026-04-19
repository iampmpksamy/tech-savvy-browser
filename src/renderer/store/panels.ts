import { create } from 'zustand';

export type PanelKey = 'none' | 'ai' | 'terminal' | 'api' | 'json' | 'network' | 'bookmarks';

interface PanelsState {
  sidebarWidth: number;
  activeRightPanel: PanelKey;
  activeBottomPanel: PanelKey;
  setSidebarWidth: (w: number) => void;
  openRight: (p: PanelKey) => void;
  openBottom: (p: PanelKey) => void;
}

export const usePanels = create<PanelsState>((set) => ({
  sidebarWidth: 360,
  activeRightPanel: 'ai',
  activeBottomPanel: 'none',
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(240, Math.min(720, w)) }),
  openRight: (p) => set({ activeRightPanel: p }),
  openBottom: (p) => set({ activeBottomPanel: p }),
}));
