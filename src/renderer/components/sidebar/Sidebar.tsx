// ─── Sidebar (right panel) ────────────────────────────────────────────────────
// Collapsible right panel hosting the AI chat and bookmark panel.
// Animates in/out with a slide+fade so it feels native.
import { useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanels }       from '../../store/panels';
import { AiChat }          from './AiChat';
import { BookmarkPanel }   from './BookmarkPanel';

export function Sidebar() {
  const panel = usePanels((s) => s.activeRightPanel);
  const width = usePanels((s) => s.sidebarWidth);
  const ref   = useRef<HTMLElement>(null);

  // Apply dynamic width imperatively to avoid inline style Edge Tools warning.
  useLayoutEffect(() => {
    if (ref.current) ref.current.style.width = `${width}px`;
  }, [width]);

  return (
    <AnimatePresence initial={false}>
      {panel !== 'none' && (
        <motion.aside
          ref={ref}
          key="right-panel"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{    opacity: 0, x: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="shrink-0 h-full border-l border-white/[0.05] bg-bg-1 flex flex-col overflow-hidden"
        >
          {panel === 'ai'        && <AiChat />}
          {panel === 'bookmarks' && <BookmarkPanel />}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
