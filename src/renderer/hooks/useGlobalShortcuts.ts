// ─── Global keyboard shortcuts ─────────────────────────────────────────────
// Wire this once from App.tsx. It owns document-level keydown so palette
// toggling works regardless of focus location.
import { useEffect } from 'react';
import { usePalette } from '../store/palette';
import { useTabs }    from '../store/tabs';
import { webviewRefs } from '../lib/webviewRefs';

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

      // Ctrl+Shift+I → toggle DevTools for the active webview
      if (mod && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const { activeId } = useTabs.getState();
        if (activeId) {
          const wv = webviewRefs.get(activeId);
          if (wv) {
            if (wv.isDevToolsOpened()) wv.closeDevTools();
            else wv.openDevTools();
          }
        }
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
