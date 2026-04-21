// ─── TopBar ───────────────────────────────────────────────────────────────────
// Minimal navigation bar: back / forward / reload on the left,
// centred Omnibox, AI-panel toggle and command-palette button on the right.
import { ArrowLeft, ArrowRight, RotateCw, X, Sparkles, Command } from 'lucide-react';
import { useTabs }    from '../../store/tabs';
import { usePanels }  from '../../store/panels';
import { usePalette } from '../../store/palette';
import { Omnibox }    from './Omnibox';

export function TopBar() {
  const activeId = useTabs((s) => s.activeId);
  const tabs     = useTabs((s) => s.tabs);
  const active   = tabs.find((t) => t.id === activeId);
  const reload   = useTabs((s) => s.reload);
  const back     = useTabs((s) => s.back);
  const forward  = useTabs((s) => s.forward);

  const toggleAi     = usePanels((s) => s.toggleRight);
  const aiPanel      = usePanels((s) => s.activeRightPanel);
  const openPalette  = usePalette((s) => s.setOpen);

  const isAiOpen = aiPanel === 'ai';

  return (
    <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-white/[0.05] bg-bg-1/60">
      {/* ── Navigation buttons ── */}
      <div className="no-drag flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => active && back(active.id)}
          disabled={!active?.canGoBack}
          className="btn-icon disabled:opacity-30"
          aria-label="Back"
          title="Back (Alt+←)"
        >
          <ArrowLeft size={15} />
        </button>
        <button
          onClick={() => active && forward(active.id)}
          disabled={!active?.canGoForward}
          className="btn-icon disabled:opacity-30"
          aria-label="Forward"
          title="Forward (Alt+→)"
        >
          <ArrowRight size={15} />
        </button>
        <button
          onClick={() => active && (active.loading ? null : reload(active.id))}
          disabled={!active}
          className="btn-icon disabled:opacity-30"
          aria-label={active?.loading ? 'Stop' : 'Reload'}
          title="Reload (Ctrl+R)"
        >
          {active?.loading
            ? <X size={14} />
            : <RotateCw size={14} />}
        </button>
      </div>

      {/* ── Centred smart omnibox ── */}
      <div className="no-drag flex-1 flex">
        <Omnibox />
      </div>

      {/* ── Right actions ── */}
      <div className="no-drag flex items-center gap-1 shrink-0">
        <button
          onClick={() => toggleAi('ai')}
          className={isAiOpen ? 'btn-icon-active' : 'btn-icon'}
          aria-label="Toggle AI sidebar"
          title="AI Sidebar"
        >
          <Sparkles size={15} />
        </button>
        <button
          onClick={() => openPalette(true)}
          className="btn-icon text-xs gap-1"
          aria-label="Command palette"
          title="Command Palette (Ctrl+K)"
        >
          <Command size={13} />
        </button>
      </div>
    </div>
  );
}
