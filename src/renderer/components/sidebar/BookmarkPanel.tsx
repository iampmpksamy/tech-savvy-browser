import { useState } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { useTabs } from '../../store/tabs';

// Minimal in-memory bookmarks for v0.1 — backed by electron-store in a
// follow-up (see roadmap).
interface Mark {
  id: string;
  title: string;
  url: string;
}

export function BookmarkPanel() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const active = tabs.find((t) => t.id === activeId);

  const addCurrent = () => {
    if (!active) return;
    setMarks((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), title: active.title, url: active.url },
    ]);
  };

  const open = (url: string) => {
    if (!active) return;
    useTabs.getState().navigate(active.id, url);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-10 px-3 flex items-center justify-between border-b border-bg-3">
        <div className="flex items-center gap-2">
          <Bookmark size={14} className="text-accent" />
          <span className="font-medium">Bookmarks</span>
        </div>
        <button onClick={addCurrent} className="btn-ghost text-xs inline-flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        {marks.length === 0 && (
          <div className="text-fg-3 text-xs text-center py-6">No bookmarks yet.</div>
        )}
        {marks.map((m) => (
          <button
            key={m.id}
            onClick={() => open(m.url)}
            className="w-full text-left rounded-md px-2 py-1.5 hover:bg-bg-2"
          >
            <div className="text-fg-0 text-sm truncate">{m.title || m.url}</div>
            <div className="text-fg-3 text-xs truncate">{m.url}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
