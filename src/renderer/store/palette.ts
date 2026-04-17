// ─── Command Palette store ─────────────────────────────────────────────────
// Global open/close + query + selection. Kept intentionally dumb — commands
// themselves are derived lazily in CommandPalette from other stores.
import { create } from 'zustand';

interface PaletteState {
  open: boolean;
  query: string;
  highlighted: number;
  /** IDs of recently executed commands, newest first. Max 5. Session-only. */
  recentIds: string[];
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setQuery: (q: string) => void;
  setHighlighted: (i: number) => void;
  addRecent: (id: string) => void;
  reset: () => void;
}

export const usePalette = create<PaletteState>((set) => ({
  open: false,
  query: '',
  highlighted: 0,
  recentIds: [],

  setOpen: (open) => set({ open, query: '', highlighted: 0 }),
  toggle: () => set((s) => ({ open: !s.open, query: '', highlighted: 0 })),
  setQuery: (query) => set({ query, highlighted: 0 }),
  setHighlighted: (highlighted) => set({ highlighted }),
  addRecent: (id) =>
    set((s) => ({ recentIds: [id, ...s.recentIds.filter((x) => x !== id)].slice(0, 5) })),
  reset: () => set({ query: '', highlighted: 0 }),
}));
