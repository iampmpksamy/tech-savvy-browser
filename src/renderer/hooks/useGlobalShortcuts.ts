// ─── Global keyboard shortcuts ─────────────────────────────────────────────
// Wire this once from App.tsx. It owns document-level keydown so palette
// toggling works regardless of focus location.
import { useEffect } from 'react';
import { usePalette } from '../store/palette';

export function useGlobalShortcuts() {
  const toggle = usePalette((s) => s.toggle);
  const setOpen = usePalette((s) => s.setOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘/Ctrl + K → toggle palette
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      // Esc closes the palette (handled inside the component too, but this
      // catches Esc when the palette isn't focused yet).
      if (e.key === 'Escape' && usePalette.getState().open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [toggle, setOpen]);
}
