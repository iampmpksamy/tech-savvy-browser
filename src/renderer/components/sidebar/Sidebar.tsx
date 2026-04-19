import { useLayoutEffect, useRef } from 'react';
import { usePanels } from '../../store/panels';
import { AiChat } from './AiChat';
import { BookmarkPanel } from './BookmarkPanel';

export function Sidebar() {
  const panel = usePanels((s) => s.activeRightPanel);
  const width = usePanels((s) => s.sidebarWidth);
  const ref   = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.style.width = `${width}px`;
  }, [width]);

  if (panel === 'none') return null;

  return (
    <aside
      ref={ref}
      className="shrink-0 h-full border-l border-bg-3 bg-bg-1 flex flex-col"
    >
      {panel === 'ai' && <AiChat />}
      {panel === 'bookmarks' && <BookmarkPanel />}
    </aside>
  );
}
