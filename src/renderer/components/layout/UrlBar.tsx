import { ArrowLeft, ArrowRight, RotateCw, Shield, Search, Command } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTabs } from '../../store/tabs';
import { usePalette } from '../../store/palette';

export function UrlBar() {
  const activeId = useTabs((s) => s.activeId);
  const tabs = useTabs((s) => s.tabs);
  const active = tabs.find((t) => t.id === activeId);

  const navigate = useTabs((s) => s.navigate);
  const reload = useTabs((s) => s.reload);
  const back = useTabs((s) => s.back);
  const forward = useTabs((s) => s.forward);
  const openPalette = usePalette((s) => s.setOpen);

  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(active?.url ?? '');
  }, [active?.url, active?.id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    navigate(active.id, value.trim());
  };

  return (
    <div className="h-12 shrink-0 bg-bg-1 border-b border-bg-3 flex items-center gap-1 px-3">
      <button
        onClick={() => active && back(active.id)}
        disabled={!active?.canGoBack}
        className="btn-ghost disabled:opacity-40"
        aria-label="back"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        onClick={() => active && forward(active.id)}
        disabled={!active?.canGoForward}
        className="btn-ghost disabled:opacity-40"
        aria-label="forward"
      >
        <ArrowRight size={16} />
      </button>
      <button
        onClick={() => active && reload(active.id)}
        disabled={!active}
        className="btn-ghost"
        aria-label="reload"
      >
        <RotateCw size={14} />
      </button>
      <form onSubmit={submit} className="flex-1">
        <label className="flex items-center gap-2 bg-bg-2 border border-bg-3 rounded-md px-3 py-1.5 focus-within:border-accent">
          <Shield size={14} className="text-ok" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search or type URL"
            className="flex-1 bg-transparent outline-none text-fg-0 placeholder-fg-3"
            spellCheck={false}
          />
          <Search size={14} className="text-fg-3" />
        </label>
      </form>
      <button
        onClick={() => openPalette(true)}
        className="btn-ghost flex items-center gap-1 text-xs"
        aria-label="Open command palette"
        title="Command Palette (⌘/Ctrl+K)"
      >
        <Command size={12} />
        <span>K</span>
      </button>
    </div>
  );
}
