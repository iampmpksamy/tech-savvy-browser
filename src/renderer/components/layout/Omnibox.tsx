// ─── Omnibox ──────────────────────────────────────────────────────────────────
// Smart address / search bar.
//   • Not focused  → shows current tab URL (dimmed, non-editable appearance)
//   • Focused      → selects all text, shows live editable value
//   • Submit       → URL with scheme → navigate directly
//               → bare hostname (has dot, no spaces) → prepend https://
//               → anything else → Google search
//   • Ctrl+L       → focus via custom DOM event emitted by useGlobalShortcuts
import { useState, useEffect, useRef } from 'react';
import { Shield, Search, Lock } from 'lucide-react';
import { useTabs } from '../../store/tabs';

function classify(raw: string): 'url' | 'search' {
  const t = raw.trim();
  if (!t) return 'search';
  if (/^[a-z]+:\/\//i.test(t)) return 'url';
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t) && !t.includes(' ')) return 'url';
  return 'search';
}

function buildNavigateUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return 'about:blank';
  if (/^[a-z]+:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t) && !t.includes(' ')) return `https://${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '') + u.search;
  } catch {
    return url;
  }
}

export function Omnibox() {
  const activeId  = useTabs((s) => s.activeId);
  const tabs      = useTabs((s) => s.tabs);
  const navigate  = useTabs((s) => s.navigate);
  const active    = tabs.find((t) => t.id === activeId);

  const [focused, setFocused] = useState(false);
  const [value,   setValue]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value from active tab's URL when not focused.
  useEffect(() => {
    if (!focused) setValue(active?.url ?? '');
  }, [active?.url, active?.id, focused]);

  // Listen for the Ctrl+L custom event from useGlobalShortcuts.
  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    document.addEventListener('omnibox:focus', handler);
    return () => document.removeEventListener('omnibox:focus', handler);
  }, []);

  const onFocus = () => {
    setFocused(true);
    // Select all so the user can immediately start typing.
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const onBlur = () => {
    setFocused(false);
    setValue(active?.url ?? '');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
    if (!activeId) return;
    navigate(activeId, buildNavigateUrl(value));
  };

  const isHttps  = active?.url?.startsWith('https://');
  const isSearch = focused && classify(value) === 'search';

  return (
    <form onSubmit={submit} className="flex-1 max-w-[560px] mx-auto w-full">
      <div className="omnibox-wrap flex items-center gap-2.5 px-4 py-2">
        {/* Security icon */}
        <span className="shrink-0 text-fg-3">
          {isSearch
            ? <Search size={13} />
            : isHttps
              ? <Lock size={13} className="text-ok" />
              : <Shield size={13} />}
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          value={focused ? value : displayUrl(active?.url ?? '')}
          onChange={(e) => setValue(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search Google or type a URL"
          className="flex-1 min-w-0 bg-transparent outline-none text-fg-0 placeholder-fg-3 text-[13px]"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Loading indicator dot */}
        {active?.loading && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        )}
      </div>
    </form>
  );
}
