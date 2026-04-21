// ─── Global keyboard shortcuts ───────────────────────────────────────────────
// Wired once from App.tsx; owns document-level keydown so shortcuts work
// regardless of focus location.
import { useEffect } from 'react';
import { usePalette }  from '../store/palette';
import { useTabs }     from '../store/tabs';
import { webviewRefs } from '../lib/webviewRefs';

export function useGlobalShortcuts() {
  const toggle   = usePalette((s) => s.toggle);
  const setOpen  = usePalette((s) => s.setOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/⌘+L → focus omnibox
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('omnibox:focus'));
        return;
      }

      // Ctrl/⌘+K → toggle command palette
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      // Ctrl+Shift+I → toggle DevTools for active webview
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

      // Esc → close palette (also handled inside the component; this catches
      // the case where the palette isn't yet focused).
      if (e.key === 'Escape' && usePalette.getState().open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [toggle, setOpen]);
}
