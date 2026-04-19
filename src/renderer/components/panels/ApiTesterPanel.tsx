import { useState } from 'react';
import { Play } from 'lucide-react';
import type { HttpRequestSpec, HttpResponseSpec } from '@shared/types';
import { ts } from '../../lib/bridge';

const METHODS: HttpRequestSpec['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function ApiTesterPanel() {
  const [method, setMethod] = useState<HttpRequestSpec['method']>('GET');
  const [url, setUrl] = useState('https://api.github.com/repos/electron/electron');
  const [headers, setHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [body, setBody] = useState('');
  const [resp, setResp] = useState<HttpResponseSpec | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const parsedHeaders: Record<string, string> = headers.trim()
        ? JSON.parse(headers)
        : {};
      const r = await ts().api.execute({
        method,
        url,
        headers: parsedHeaders,
        body: body || undefined,
      });
      setResp(r);
    } catch (e) {
      setResp({
        status: 0,
        statusText: (e as Error).message,
        headers: {},
        body: '',
        durationMs: 0,
        sizeBytes: 0,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full grid grid-cols-2 gap-0 divide-x divide-bg-3">
      <div className="flex flex-col">
        <div className="p-2 flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpRequestSpec['method'])}
            className="input-flat w-24"
          >
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-flat flex-1 font-mono"
            placeholder="https://…"
          />
          <button
            onClick={run}
            disabled={busy}
            className="bg-accent hover:bg-accent-glow text-white rounded-md px-3 flex items-center gap-1 disabled:opacity-50"
          >
            <Play size={14} /> Send
          </button>
        </div>
        <div className="px-2 text-xs uppercase text-fg-3 mt-1">Headers (JSON)</div>
        <textarea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          className="input-flat m-2 font-mono text-xs h-24"
          spellCheck={false}
        />
        <div className="px-2 text-xs uppercase text-fg-3">Body</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='{"hello":"world"}'
          className="input-flat m-2 font-mono text-xs flex-1"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col">
        <div className="p-2 flex items-center gap-3 text-xs text-fg-2">
          <span>
            Status:{' '}
            <span
              className={
                resp && resp.status >= 200 && resp.status < 300
                  ? 'text-ok'
                  : resp && resp.status
                    ? 'text-warn'
                    : 'text-fg-3'
              }
            >
              {resp ? `${resp.status} ${resp.statusText}` : '—'}
            </span>
          </span>
          <span>Time: {resp ? `${resp.durationMs} ms` : '—'}</span>
          <span>Size: {resp ? `${resp.sizeBytes} B` : '—'}</span>
        </div>
        <pre className="flex-1 overflow-auto font-mono text-xs p-2 text-fg-1 whitespace-pre-wrap">
          {resp ? tryPretty(resp.body) : '// Response body will appear here.'}
        </pre>
      </div>
    </div>
  );
}

function tryPretty(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
