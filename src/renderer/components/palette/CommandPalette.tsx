// ─── Command Palette ───────────────────────────────────────────────────────
// Arc-quality command palette with Framer Motion animations, group headers,
// recent commands, and a sliding highlight pill.
//
//   ⌘/Ctrl+K  toggle        ↑ / ↓  navigate
//   Enter      run           Tab    cycle
//   Esc        close
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import clsx from 'clsx';
import { Globe, Sparkles, Code2, Monitor, Layers, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePalette } from '../../store/palette';
import { useTabs } from '../../store/tabs';
import { usePanels } from '../../store/panels';
import { usePageContext } from '../../store/context';
import { buildCommands, scoreCommand, type Command, type CommandGroup } from './commands';

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayGroup = CommandGroup | 'Recent';
type DisplayItem  = Command & { _group: DisplayGroup };

// ── Constants ──────────────────────────────────────────────────────────────

const GROUP_META: Record<DisplayGroup, { Icon: LucideIcon; label: string }> = {
  Recent:      { Icon: Clock,    label: 'Recent'     },
  Navigation:  { Icon: Globe,    label: 'Navigation' },
  Tabs:        { Icon: Layers,   label: 'Tabs'       },
  AI:          { Icon: Sparkles, label: 'AI'         },
  'Dev Tools': { Icon: Code2,    label: 'Dev Tools'  },
  Window:      { Icon: Monitor,  label: 'Window'     },
};

// Ease-out-expo — matches Arc / Linear / Raycast modal feel.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Spring shared by the sliding highlight pill.
const HL_SPRING = { type: 'spring', bounce: 0.1, duration: 0.2 } as const;

// ── Hook: subscribe to live state so palette updates on tab/panel changes ──

function useLiveSubscription() {
  useTabs((s) => s.tabs);
  useTabs((s) => s.activeId);
  usePanels((s) => s.activeBottomPanel);
  usePanels((s) => s.activeRightPanel);
}

// ── Component ──────────────────────────────────────────────────────────────

export function CommandPalette() {
  const open        = usePalette((s) => s.open);
  const query       = usePalette((s) => s.query);
  const highlighted = usePalette((s) => s.highlighted);
  const recentIds   = usePalette((s) => s.recentIds);
  const setOpen        = usePalette((s) => s.setOpen);
  const setQuery       = usePalette((s) => s.setQuery);
  const setHighlighted = usePalette((s) => s.setHighlighted);
  const addRecent      = usePalette((s) => s.addRecent);

  const context        = usePageContext((s) => s.context);
  const refreshContext = usePageContext((s) => s.refresh);

  useLiveSubscription();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // ── Commands ────────────────────────────────────────────────────────────

  const allCommands = useMemo(
    () => (open ? buildCommands(query, context) : ([] as Command[])),
    [open, query, context],
  );

  // Fuzzy-filtered and sorted results (or all commands when query is blank).
  const filtered = useMemo<Command[]>(() => {
    if (!query.trim()) return allCommands;
    return allCommands
      .map((c) => ({ c, s: scoreCommand(c, query) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c);
  }, [allCommands, query]);

  // Most-recently-used commands, shown before other groups when query is empty.
  const recentCommands = useMemo<Command[]>(() => {
    if (query.trim() || !recentIds.length) return [];
    return recentIds
      .map((id) => allCommands.find((c) => c.id === id))
      .filter(Boolean) as Command[];
  }, [recentIds, query, allCommands]);

  // Flat ordered list used for keyboard navigation indices.
  const display = useMemo<DisplayItem[]>(() => {
    if (!query.trim() && recentCommands.length) {
      const recentSet = new Set(recentCommands.map((c) => c.id));
      return [
        ...recentCommands.map((c) => ({ ...c, _group: 'Recent' as DisplayGroup })),
        ...filtered
          .filter((c) => !recentSet.has(c.id))
          .map((c) => ({ ...c, _group: c.group as DisplayGroup })),
      ];
    }
    return filtered.map((c) => ({ ...c, _group: c.group as DisplayGroup }));
  }, [filtered, recentCommands, query]);

  // Grouped for rendering, preserving flat-list order.
  const groups = useMemo(() => {
    const acc: Array<{ group: DisplayGroup; items: Array<{ cmd: DisplayItem; idx: number }> }> = [];
    display.forEach((cmd, idx) => {
      const last = acc[acc.length - 1];
      if (last && last.group === cmd._group) last.items.push({ cmd, idx });
      else acc.push({ group: cmd._group, items: [{ cmd, idx }] });
    });
    return acc;
  }, [display]);

  // ── Side-effects ─────────────────────────────────────────────────────────

  // Clamp highlighted index when the result set shrinks.
  useEffect(() => {
    if (highlighted >= display.length) setHighlighted(Math.max(0, display.length - 1));
  }, [display.length, highlighted, setHighlighted]);

  // Focus input and refresh context whenever palette opens.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      refreshContext(); // ensures selectedText is always up-to-date
    }
  }, [open, refreshContext]);

  // Scroll active row into view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const runAt = useCallback(
    async (i: number) => {
      const cmd = display[i];
      if (!cmd) return;
      // Persist static commands to the recent list; skip dynamic entries.
      if (!cmd.id.startsWith('tab.switch.') && !cmd.id.startsWith('nav.open-input')) {
        addRecent(cmd.id);
      }
      setOpen(false);
      try {
        await cmd.run();
      } catch (e) {
        console.error('[palette] command failed', cmd.id, e);
      }
    },
    [display, setOpen, addRecent],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted(Math.min(display.length - 1, highlighted + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(Math.max(0, highlighted - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runAt(highlighted);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const n = display.length || 1;
        setHighlighted(e.shiftKey ? (highlighted - 1 + n) % n : (highlighted + 1) % n);
      }
    },
    [display.length, highlighted, setOpen, setHighlighted, runAt],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        // Overlay — fades in/out, closes on backdrop click.
        <motion.div
          key="palette-overlay"
          className="fixed inset-0 z-[1000] flex items-start justify-center pt-[12vh] bg-black/55"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* Modal panel — scales in from slightly above. */}
          <motion.div
            className="w-[640px] max-w-[90vw] rounded-xl border border-bg-3 bg-bg-1 overflow-hidden"
            style={{ boxShadow: '0 32px 72px -12px rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: EASE }}
            onKeyDown={onKeyDown}
          >

            {/* ── Search input ─────────────────────────────────────────── */}
            <div className="relative border-b border-bg-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, URL, or question…"
                className="w-full bg-transparent px-4 py-3.5 pr-12 text-fg-0 placeholder-fg-3 outline-none text-sm"
                spellCheck={false}
              />
              {query && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-1 p-1 rounded"
                  tabIndex={-1}
                  aria-label="Clear"
                >
                  ×
                </button>
              )}
            </div>

            {/* ── Results list ─────────────────────────────────────────── */}
            <LayoutGroup id="palette">
              <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">

                {display.length === 0 && (
                  <div className="px-4 py-8 text-center text-fg-3 text-sm">
                    No matching commands.
                  </div>
                )}

                {groups.map(({ group, items }) => {
                  const meta = GROUP_META[group] ?? GROUP_META['Navigation'];
                  return (
                    <div key={group} className="mb-0.5 last:mb-0">

                      {/* Group header */}
                      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1 select-none">
                        <meta.Icon size={10} className="text-fg-3 shrink-0" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-3">
                          {meta.label}
                        </span>
                      </div>

                      {/* Commands */}
                      {items.map(({ cmd, idx }) => {
                        const active = idx === highlighted;
                        return (
                          <button
                            key={cmd.id}
                            data-idx={idx}
                            onMouseEnter={() => setHighlighted(idx)}
                            onClick={() => runAt(idx)}
                            className="relative w-full text-left flex items-center gap-3 px-4 py-2.5 focus:outline-none"
                          >
                            {/* ── Sliding highlight pill (layoutId magic) ── */}
                            {active && (
                              <motion.span
                                layoutId="palette-hl"
                                className="absolute inset-0 bg-bg-3"
                                transition={HL_SPRING}
                              />
                            )}
                            {/* Left accent bar */}
                            {active && (
                              <motion.span
                                layoutId="palette-accent"
                                className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-accent"
                                transition={HL_SPRING}
                              />
                            )}

                            {/* Icon */}
                            <span
                              className={clsx(
                                'relative z-10 shrink-0 w-4 h-4 flex items-center justify-center transition-colors duration-100',
                                active ? 'text-accent' : 'text-fg-2',
                              )}
                            >
                              {cmd.icon}
                            </span>

                            {/* Label + subtitle */}
                            <span className="relative z-10 flex-1 min-w-0">
                              <span
                                className={clsx(
                                  'block truncate text-sm leading-5 transition-colors duration-100',
                                  active ? 'text-fg-0 font-medium' : 'text-fg-1',
                                )}
                              >
                                {cmd.title}
                              </span>
                              {cmd.subtitle && (
                                <span className="block truncate text-xs text-fg-3 leading-4 mt-px">
                                  {cmd.subtitle}
                                </span>
                              )}
                            </span>

                            {/* Keyboard shortcut badge */}
                            {cmd.shortcut && (
                              <kbd
                                className={clsx(
                                  'relative z-10 text-[10px] px-1.5 py-0.5 rounded border shrink-0 transition-colors duration-100',
                                  active
                                    ? 'bg-bg-4 border-bg-4 text-fg-1'
                                    : 'bg-bg-2 border-bg-3 text-fg-2',
                                )}
                              >
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </LayoutGroup>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-bg-3 text-[10px] text-fg-3 select-none">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-px rounded bg-bg-2 border border-bg-3">↑</kbd>
                <kbd className="px-1.5 py-px rounded bg-bg-2 border border-bg-3">↓</kbd>
                <span className="mr-0.5">navigate</span>
                <span className="text-bg-4 mx-0.5">·</span>
                <kbd className="px-1.5 py-px rounded bg-bg-2 border border-bg-3">⏎</kbd>
                <span className="mr-0.5">run</span>
                <span className="text-bg-4 mx-0.5">·</span>
                <kbd className="px-1.5 py-px rounded bg-bg-2 border border-bg-3">esc</kbd>
                <span>close</span>
              </span>
              <span>
                {display.length} result{display.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
