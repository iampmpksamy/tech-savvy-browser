import { useEffect, useMemo, useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { NetworkEvent } from '@shared/types';
import { useTabs } from '../../store/tabs';
import { ts } from '../../lib/bridge';

interface Row {
  requestId: string;
  method?: string;
  url?: string;
  status?: number;
  mimeType?: string;
  bytes?: number;
  durationMs?: number;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export function NetworkInspectorPanel() {
  const activeId = useTabs((s) => s.activeId);
  const [capturing, setCapturing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const off = ts().net.onEvent((ev: NetworkEvent) => {
      setRows((prev) => {
        const byId = new Map(prev.map((r) => [r.requestId, r]));
        const r: Row = byId.get(ev.requestId) ?? {
          requestId: ev.requestId,
          startedAt: ev.timestamp,
        };
        if (ev.type === 'request') Object.assign(r, { method: ev.method, url: ev.url });
        if (ev.type === 'response') Object.assign(r, { status: ev.status, mimeType: ev.mimeType });
        if (ev.type === 'finished')
          Object.assign(r, {
            bytes: ev.bytes,
            finishedAt: ev.timestamp,
            durationMs: ev.timestamp - r.startedAt,
          });
        if (ev.type === 'failed') Object.assign(r, { error: ev.error });
        byId.set(ev.requestId, r);
        return [...byId.values()].sort((a, b) => a.startedAt - b.startedAt);
      });
    });
    return off;
  }, []);

  const toggle = async () => {
    if (!activeId) return;
    if (capturing) {
      await ts().net.detach(activeId);
      setCapturing(false);
    } else {
      setRows([]);
      await ts().net.attach(activeId);
      setCapturing(true);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const bytes = rows.reduce((a, r) => a + (r.bytes ?? 0), 0);
    return { total, bytes };
  }, [rows]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 flex items-center gap-3">
        <button
          onClick={toggle}
          className={
            'rounded px-3 py-1 text-xs flex items-center gap-1 ' +
            (capturing ? 'bg-danger/80 text-white' : 'bg-accent text-white')
          }
        >
          {capturing ? <Square size={12} /> : <Play size={12} />}
          {capturing ? 'Stop' : 'Start'}
        </button>
        <span className="text-xs text-fg-3">
          {stats.total} requests · {stats.bytes} B
        </span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs">
        <table className="w-full">
          <thead className="text-fg-3">
            <tr className="text-left">
              <th className="px-2 py-1">Method</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Bytes</th>
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">URL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.requestId} className="hover:bg-bg-2">
                <td className="px-2 py-0.5">{r.method ?? '—'}</td>
                <td
                  className={
                    'px-2 py-0.5 ' +
                    (r.status && r.status >= 400
                      ? 'text-danger'
                      : r.status
                        ? 'text-ok'
                        : 'text-fg-3')
                  }
                >
                  {r.status ?? (r.error ? 'fail' : '…')}
                </td>
                <td className="px-2 py-0.5 text-fg-2">{r.mimeType ?? '—'}</td>
                <td className="px-2 py-0.5">{r.bytes ?? '—'}</td>
                <td className="px-2 py-0.5">{r.durationMs ? `${r.durationMs} ms` : '—'}</td>
                <td className="px-2 py-0.5 text-fg-1 truncate max-w-[40ch]">{r.url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
