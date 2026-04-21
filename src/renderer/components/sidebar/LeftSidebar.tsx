// ─── LeftSidebar ─────────────────────────────────────────────────────────────
// Arc-style vertical tab strip with drag-to-reorder (Framer Motion Reorder),
// window controls, and bottom action buttons (AI, Settings, DevTools).
import { useState, useEffect } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Sparkles, Settings, Loader2, Terminal, Minus, Square, Maximize2,
} from 'lucide-react';
import { useTabs }   from '../../store/tabs';
import { usePanels } from '../../store/panels';
import { ts }        from '../../lib/bridge';
import type { Tab }  from '@shared/types';

// ── Ordered-ID state — keeps drag order independent of Zustand pushes ─────────
function useOrderedIds(tabs: Tab[]) {
  const [ids, setIds] = useState<string[]>(() => tabs.map((t) => t.id));

  useEffect(() => {
    setIds((prev) => {
      const tabIds = new Set(tabs.map((t) => t.id));
      const kept   = prev.filter((id) => tabIds.has(id));
      const added  = tabs.filter((t) => !prev.includes(t.id)).map((t) => t.id);
      return [...kept, ...added];
    });
  }, [tabs]);

  return [ids, setIds] as const;
}

// ── Individual tab card ───────────────────────────────────────────────────────
interface TabCardProps {
  tab:      Tab;
  active:   boolean;
  onActivate: () => void;
  onClose:    (e: React.MouseEvent) => void;
}

function TabCard({ tab, active, onActivate, onClose }: TabCardProps) {
  return (
    <motion.div
      layout
      layoutId={`tab-${tab.id}`}
      onClick={onActivate}
      className={`tab-card group ${active ? 'tab-card-active' : ''}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1,  x: 0 }}
      exit={{    opacity: 0,  x: -8, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Accent left bar for active tab */}
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />
      )}

      {/* Favicon / spinner */}
      <span className="shrink-0 w-4 h-4 flex items-center justify-center">
        {tab.loading ? (
          <Loader2 size={12} className="animate-spin text-accent" />
        ) : tab.favicon ? (
          <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm object-contain" />
        ) : (
          <span className="w-3 h-3 rounded-full bg-bg-4" />
        )}
      </span>

      {/* Title */}
      <span className="flex-1 min-w-0 truncate text-xs leading-none">
        {tab.title || tab.url || 'New Tab'}
      </span>

      {/* Close button — visible on hover */}
      <button
        onClick={onClose}
        className={[
          'shrink-0 w-4 h-4 rounded flex items-center justify-center',
          'opacity-0 group-hover:opacity-60 hover:!opacity-100',
          'hover:bg-white/[0.1] transition-opacity',
        ].join(' ')}
        aria-label="Close tab"
        title="Close tab"
      >
        <X size={9} />
      </button>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LeftSidebar() {
  const tabs     = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const activate = useTabs((s) => s.activate);
  const close    = useTabs((s) => s.close);
  const create   = useTabs((s) => s.create);
  const reorder  = useTabs((s) => s.reorderByIds);

  const toggleAi      = usePanels((s) => s.toggleRight);
  const toggleBottom  = usePanels((s) => s.openBottom);
  const aiPanel       = usePanels((s) => s.activeRightPanel);
  const bottomPanel   = usePanels((s) => s.activeBottomPanel);
  const openSettings  = usePanels((s) => s.setSettingsOpen);

  const [orderedIds, setOrderedIds] = useOrderedIds(tabs);
  const orderedTabs = orderedIds
    .map((id) => tabs.find((t) => t.id === id))
    .filter((t): t is Tab => t != null);

  const isMac = navigator.platform.toUpperCase().includes('MAC');

  const handleReorder = (newIds: string[]) => {
    setOrderedIds(newIds);
    reorder(newIds);
  };

  return (
    <aside className="w-[220px] shrink-0 h-full flex flex-col overflow-hidden"
      style={{ background: '#0d0f13', borderRight: '1px solid rgba(255,255,255,0.045)' }}
    >
      {/* ── Title bar / drag region ── */}
      <div className="drag-region h-11 flex items-center px-3 shrink-0">
        {isMac && <div className="w-16" />}

        {/* App logo + name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shrink-0">
            <Sparkles size={10} className="text-white" />
          </div>
          <span className="text-fg-2 text-xs font-semibold tracking-wide truncate">
            Tech Savvy
          </span>
        </div>

        {/* Windows controls (no-drag) */}
        {!isMac && (
          <div className="no-drag flex items-center ml-auto gap-px">
            <button
              onClick={() => ts().win.minimize()}
              className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-white/[0.06] rounded transition-colors"
              aria-label="Minimize"
            >
              <Minus size={11} />
            </button>
            <button
              onClick={() => ts().win.maximize()}
              className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-white/[0.06] rounded transition-colors"
              aria-label="Maximize"
            >
              <Square size={10} />
            </button>
            <button
              onClick={() => ts().win.fullscreen()}
              className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-white/[0.06] rounded transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize2 size={11} />
            </button>
            <button
              onClick={() => ts().win.close()}
              className="w-7 h-7 flex items-center justify-center text-fg-3 hover:text-white hover:bg-danger rounded transition-colors"
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Tab list (drag-to-reorder) ── */}
      <div className="no-drag flex-1 overflow-y-auto overflow-x-hidden py-1 px-2">
        <Reorder.Group
          axis="y"
          values={orderedIds}
          onReorder={handleReorder}
          className="flex flex-col gap-0.5"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
          as="div"
        >
          <AnimatePresence initial={false}>
            {orderedTabs.map((tab) => (
              <Reorder.Item
                key={tab.id}
                value={tab.id}
                style={{ position: 'relative', listStyle: 'none' }}
                className="relative"
                dragListener={true}
                whileDrag={{ scale: 1.02, zIndex: 50, opacity: 0.92 }}
              >
                <TabCard
                  tab={tab}
                  active={tab.id === activeId}
                  onActivate={() => activate(tab.id)}
                  onClose={(e) => { e.stopPropagation(); close(tab.id); }}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* ── New tab button ── */}
      <div className="no-drag px-2 pb-1">
        <button
          onClick={() => create('about:blank')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-fg-3 hover:text-fg-1 hover:bg-white/[0.04] transition-colors text-xs"
        >
          <Plus size={13} />
          <span>New Tab</span>
        </button>
      </div>

      {/* ── Bottom actions ── */}
      <div className="no-drag px-2 py-2 border-t flex items-center gap-1"
        style={{ borderColor: 'rgba(255,255,255,0.045)' }}
      >
        <button
          onClick={() => toggleAi('ai')}
          className={aiPanel === 'ai' ? 'btn-icon-active' : 'btn-icon'}
          aria-label="AI sidebar"
          title="AI Sidebar"
        >
          <Sparkles size={15} />
        </button>
        <button
          onClick={() => toggleBottom(bottomPanel === 'terminal' ? 'none' : 'terminal')}
          className={bottomPanel === 'terminal' ? 'btn-icon-active' : 'btn-icon'}
          aria-label="Terminal"
          title="Terminal"
        >
          <Terminal size={15} />
        </button>
        <button
          onClick={() => openSettings(true)}
          className="btn-icon ml-auto"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </aside>
  );
}
