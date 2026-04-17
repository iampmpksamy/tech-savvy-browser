import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { ts } from '../../lib/bridge';

export function TerminalPanel() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      theme: {
        background: '#0a0b0d',
        foreground: '#e8ebf0',
        cursor: '#6d8cff',
        black: '#1a1e25',
        brightBlack: '#4e5563',
      },
      fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(host);
    requestAnimationFrame(() => fit.fit());

    let sessionId: string | null = null;
    let disposeData: (() => void) | null = null;
    let disposeExit: (() => void) | null = null;

    (async () => {
      sessionId = await ts().terminal.spawn(term.cols, term.rows);
      disposeData = ts().terminal.onData(({ id, data }) => {
        if (id === sessionId) term.write(data);
      });
      disposeExit = ts().terminal.onExit(({ id }) => {
        if (id === sessionId) term.writeln('\r\n\x1b[2m[process exited]\x1b[0m');
      });
      term.onData((data) => sessionId && ts().terminal.write(sessionId, data));
      term.onResize(({ cols, rows }) => sessionId && ts().terminal.resize(sessionId, cols, rows));
    })();

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(host);

    return () => {
      ro.disconnect();
      disposeData?.();
      disposeExit?.();
      if (sessionId) ts().terminal.kill(sessionId);
      term.dispose();
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full bg-bg-0" />;
}
