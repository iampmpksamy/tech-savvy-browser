// ─── Settings Store ───────────────────────────────────────────────────────────
// Thin wrapper around the electron-store–backed Settings record from main.
// Defaults match the shared Settings type.
import { create } from 'zustand';
import type { Settings } from '@shared/types';
import { ts } from '../lib/bridge';

interface SettingsState extends Partial<Settings> {
  loaded: boolean;
  load:  () => Promise<void>;
  save:  (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,

  // ── Defaults ────────────────────────────────────────────────────────────
  theme:               'dark',
  defaultSearchEngine: 'google',
  adBlockerEnabled:    true,
  trackerBlockerEnabled: true,
  secureDns:           'cloudflare',
  tabHibernationMinutes: 30,

  load: async () => {
    try {
      const stored = await ts().settings.get();
      set({ ...stored, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  save: async (patch) => {
    set(patch as Partial<SettingsState>);
    try {
      const current = get();
      await ts().settings.set({ ...current, ...patch } as Partial<Settings>);
    } catch { /* non-fatal */ }
  },
}));
