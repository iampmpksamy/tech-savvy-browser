import { Plus, Terminal, Code2, Braces, Activity, Bookmark, Sparkles } from 'lucide-react';
import { useTabs } from '../../store/tabs';
import { usePanels, type PanelKey } from '../../store/panels';
import clsx from 'clsx';
import type { Tab } from '@shared/types';

export function VerticalTabStrip() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const create = useTabs((s) => s.create);
  const close = useTabs((s) => s.close);
  const activate = useTabs((s) => s.activate);
  const openRight = usePanels((s) => s.openRight);
  const openBottom = usePanels((s) => s.openBottom);

  return (
    <aside className="w-[240px] shrink-0 h-full bg-bg-1 border-r border-bg-3 flex flex-col">
      <button
        onClick={() => create()}
        className="mx-3 mt-3 mb-2 flex items-center gap-2 bg-bg-2 hover:bg-bg-3 text-fg-0 rounded-md px-3 py-2 text-sm transition-colors"
      >
        <Plus size={14} /> New Tab <span className="ml-auto text-fg-3 text-xs">⌘T</span>
      </button>

      <div className="px-3 text-xs uppercase tracking-wider text-fg-3 mt-2 mb-1">Tabs</div>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {tabs.map((t) => (
          <TabRow
            key={t.id}
            tab={t}
            active={t.id === activeId}
            onClick={() => activate(t.id)}
            onClose={() => close(t.id)}
          />
        ))}
        {tabs.length === 0 && (
          <div className="text-fg-3 text-xs px-2 py-4 text-center">No tabs open.</div>
        )}
      </div>

      <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-fg-3">Tools</div>
      <div className="px-2 pb-3 space-y-0.5">
        <ToolRow icon={<Sparkles size={14} />} label="AI Assistant" onClick={() => openRight('ai')} />
        <ToolRow icon={<Bookmark size={14} />} label="Bookmarks" onClick={() => openRight('bookmarks')} />
        <ToolRow icon={<Terminal size={14} />} label="Terminal" onClick={() => openBottom('terminal')} />
        <ToolRow icon={<Code2 size={14} />} label="API Tester" onClick={() => openBottom('api')} />
        <ToolRow icon={<Braces size={14} />} label="JSON Viewer" onClick={() => openBottom('json')} />
        <ToolRow icon={<Activity size={14} />} label="Network" onClick={() => openBottom('network')} />
      </div>
    </aside>
  );
}

function TabRow({
  tab,
  active,
  onClick,
  onClose,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
        active ? 'bg-bg-3 text-fg-0' : 'text-fg-1 hover:bg-bg-2',
      )}
    >
      {tab.favicon ? (
        <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm" />
      ) : (
        <div className="w-4 h-4 rounded-sm bg-bg-4" />
      )}
      <span className="flex-1 truncate text-sm">
        {tab.loading ? '…' : ''} {tab.title || tab.url}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="opacity-0 group-hover:opacity-100 text-fg-3 hover:text-fg-0 text-xs px-1"
        aria-label="close tab"
      >
        ✕
      </button>
    </div>
  );
}

function ToolRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-fg-1 hover:bg-bg-2 hover:text-fg-0 rounded-md"
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

// Satisfy unused-import analysis
export type { PanelKey };
