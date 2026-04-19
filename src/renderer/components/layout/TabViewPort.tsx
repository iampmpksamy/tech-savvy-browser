// ─── TabViewPort ───────────────────────────────────────────────────────────
// This div is the "hole" where the WebContentsView is positioned by the main
// process. The actual web page is NOT a child of this React tree — we just
// measure our bounds on resize and tell main where to render the view.
import { useEffect, useRef } from 'react';
import { ts } from '../../lib/bridge';
import { useTabs } from '../../store/tabs';

export function TabViewPort() {
  const ref = useRef<HTMLDivElement>(null);
  const activeId = useTabs((s) => s.activeId);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      ts().tabs.setBounds({
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [activeId]);

  return (
    <div
      ref={ref}
      className="flex-1 min-w-0 bg-bg-0 relative"
      aria-label="web-page-viewport"
    >
      {/* placeholder while no active tab / hibernated */}
    </div>
  );
}
