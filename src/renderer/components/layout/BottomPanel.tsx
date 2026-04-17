import { usePanels } from '../../store/panels';
import { TerminalPanel } from '../panels/TerminalPanel';
import { ApiTesterPanel } from '../panels/ApiTesterPanel';
import { JsonViewerPanel } from '../panels/JsonViewerPanel';
import { NetworkInspectorPanel } from '../panels/NetworkInspectorPanel';
import { X } from 'lucide-react';

export function BottomPanel() {
  const panel = usePanels((s) => s.activeBottomPanel);
  const close = usePanels((s) => s.openBottom);
  if (panel === 'none') return null;
  const titleMap = {
    terminal: 'Terminal',
    api: 'API Tester',
    json: 'JSON Viewer',
    network: 'Network',
    none: '',
    ai: '',
    bookmarks: '',
  } as const;
  return (
    <section className="h-[320px] shrink-0 border-t border-bg-3 bg-bg-1 flex flex-col">
      <header className="h-8 px-3 flex items-center justify-between border-b border-bg-3">
        <span className="text-fg-1 text-xs uppercase tracking-wider">{titleMap[panel]}</span>
        <button className="btn-ghost" onClick={() => close('none')} aria-label="close panel">
          <X size={12} />
        </button>
      </header>
      <div className="flex-1 min-h-0">
        {panel === 'terminal' && <TerminalPanel />}
        {panel === 'api' && <ApiTesterPanel />}
        {panel === 'json' && <JsonViewerPanel />}
        {panel === 'network' && <NetworkInspectorPanel />}
      </div>
    </section>
  );
}
