// ─── TabBar ───────────────────────────────────────────────────────────────────
// Chrome-style horizontal tab strip sitting between TitleBar and UrlBar.
// The drag-region class lets the user move the window by dragging on empty
// tab-strip space.  Individual tab items are no-drag so clicks register.
import { X, Plus, Loader2 } from 'lucide-react';
import { useTabs } from '../../store/tabs';

export function TabBar() {
  const tabs     = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const activate = useTabs((s) => s.activate);
  const close    = useTabs((s) => s.close);
  const create   = useTabs((s) => s.create);

  return (
    <div
      className="drag-region h-9 shrink-0 bg-bg-1 border-b border-bg-3 flex items-end px-1 gap-0.5 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={[
              'no-drag group relative flex items-center gap-1.5 h-8 max-w-[220px] min-w-[100px] px-3',
              'rounded-t cursor-pointer select-none shrink-0',
              'text-xs transition-colors',
              isActive
                ? 'bg-bg-0 text-fg-0 shadow-sm'
                : 'bg-bg-2 text-fg-2 hover:bg-bg-3 hover:text-fg-1',
            ].join(' ')}
            onClick={() => activate(tab.id)}
          >
            {/* Favicon / spinner */}
            <span className="shrink-0 w-4 h-4 flex items-center justify-center">
              {tab.loading ? (
                <Loader2 size={12} className="animate-spin text-accent" />
              ) : tab.favicon ? (
                <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm object-contain" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-bg-3" />
              )}
            </span>

            {/* Title */}
            <span className="flex-1 min-w-0 truncate">
              {tab.title || tab.url || 'New Tab'}
            </span>

            {/* Close button */}
            <button
              className={[
                'shrink-0 w-4 h-4 rounded flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                isActive ? 'opacity-60' : '',
                'hover:bg-bg-3 hover:!opacity-100',
              ].join(' ')}
              onClick={(e) => { e.stopPropagation(); close(tab.id); }}
              aria-label="Close tab"
              title="Close tab"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        className="no-drag w-8 h-8 shrink-0 flex items-center justify-center rounded-t text-fg-3 hover:text-fg-1 hover:bg-bg-3 transition-colors"
        onClick={() => create('https://duckduckgo.com')}
        aria-label="New tab"
        title="New tab (⌘T)"
      >
        <Plus size={14} />
      </button>

      {/* Remaining space is drag region */}
      <div className="drag-region flex-1 min-w-4 h-8" />
    </div>
  );
}
