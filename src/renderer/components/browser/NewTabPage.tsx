// ─── NewTabPage ───────────────────────────────────────────────────────────────
// Shown in place of a webview when the active tab has no URL (about:blank).
// Provides a clock, a Google search bar, and a clean minimal surface.
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useTabs } from '../../store/tabs';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function NewTabPage() {
  const now      = useClock();
  const navigate = useTabs((s) => s.navigate);
  const activeId = useTabs((s) => s.activeId);
  const [query, setQuery]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search bar when the new tab page appears.
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !query.trim()) return;
    const url = /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(query.trim())
      ? `https://${query.trim()}`
      : `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
    navigate(activeId, url);
  };

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-0 select-none">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(109,140,255,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Clock */}
      <div
        className="relative text-fg-0 font-light tracking-tight mb-8"
        style={{ fontSize: 'clamp(56px, 8vw, 88px)', lineHeight: 1 }}
      >
        {hh}
        <span
          className="mx-1"
          style={{ animation: 'blink 1s step-start infinite', opacity: 0.5 }}
        >
          :
        </span>
        {mm}
      </div>

      {/* Search bar */}
      <form onSubmit={submit} className="relative w-full max-w-[480px] px-6">
        <div className="omnibox-wrap flex items-center gap-3 px-5 py-3">
          <Search size={16} className="text-fg-3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Google or type a URL"
            className="flex-1 bg-transparent outline-none text-fg-0 placeholder-fg-3 text-base"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </form>

      <p className="relative mt-6 text-fg-3 text-xs tracking-wide">
        Press <kbd className="bg-bg-3 rounded px-1.5 py-0.5 font-mono text-fg-2">Ctrl L</kbd> to focus the address bar
      </p>
    </div>
  );
}
