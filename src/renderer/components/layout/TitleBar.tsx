import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { ts } from '../../lib/bridge';

export function TitleBar() {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return (
    <div
      className="drag-region h-9 flex items-center justify-between px-3 border-b border-bg-3 bg-bg-1 select-none"
    >
      <div className="flex items-center gap-2">
        {isMac ? <div className="w-16" /> : null}
        <span className="text-fg-2 text-xs font-medium tracking-wide">Tech Savvy</span>
      </div>
      {!isMac && (
        <div className="no-drag flex items-center">
          <button
            onClick={() => ts().win.minimize()}
            className="px-3 py-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3"
            aria-label="minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => ts().win.maximize()}
            className="px-3 py-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3"
            aria-label="maximize"
          >
            <Square size={12} />
          </button>
          <button
            onClick={() => ts().win.fullscreen()}
            className="px-3 py-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3"
            aria-label="fullscreen"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => ts().win.close()}
            className="px-3 py-1.5 text-fg-2 hover:text-fg-0 hover:bg-danger"
            aria-label="close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
