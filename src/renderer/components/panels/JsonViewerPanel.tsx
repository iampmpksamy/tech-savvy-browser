import { useMemo, useState } from 'react';

export function JsonViewerPanel() {
  const [raw, setRaw] = useState<string>('{\n  "hello": "world",\n  "items": [1,2,3]\n}');

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(raw) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [raw]);

  const format = () => {
    if (parsed.ok) setRaw(JSON.stringify(parsed.value, null, 2));
  };
  const minify = () => {
    if (parsed.ok) setRaw(JSON.stringify(parsed.value));
  };

  return (
    <div className="h-full grid grid-cols-2 gap-0 divide-x divide-bg-3">
      <div className="flex flex-col">
        <div className="p-2 flex gap-2 items-center">
          <button
            onClick={format}
            className="bg-bg-2 hover:bg-bg-3 text-fg-0 rounded px-2 py-1 text-xs"
          >
            Format
          </button>
          <button
            onClick={minify}
            className="bg-bg-2 hover:bg-bg-3 text-fg-0 rounded px-2 py-1 text-xs"
          >
            Minify
          </button>
          <span
            className={
              'ml-auto text-xs ' + (parsed.ok ? 'text-ok' : 'text-danger')
            }
          >
            {parsed.ok ? 'valid JSON' : parsed.error}
          </span>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="input-flat m-2 font-mono text-xs flex-1"
          spellCheck={false}
        />
      </div>
      <div className="overflow-auto p-3 font-mono text-xs text-fg-1">
        {parsed.ok ? <JsonTree value={parsed.value} /> : <span className="text-danger">—</span>}
      </div>
    </div>
  );
}

function JsonTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const pad = { marginLeft: depth * 12 };
  if (value === null) return <span style={pad} className="text-fg-3">null</span>;
  if (typeof value === 'string') return <span style={pad} className="text-ok">"{value}"</span>;
  if (typeof value === 'number') return <span style={pad} className="text-accent">{value}</span>;
  if (typeof value === 'boolean')
    return <span style={pad} className="text-warn">{String(value)}</span>;
  if (Array.isArray(value)) {
    return (
      <div style={pad}>
        <span className="text-fg-3">[</span>
        {value.map((v, i) => (
          <div key={i} className="ml-3">
            <JsonTree value={v} depth={depth + 1} />
            {i < value.length - 1 ? <span className="text-fg-3">,</span> : null}
          </div>
        ))}
        <span className="text-fg-3">]</span>
      </div>
    );
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);
  return (
    <div style={pad}>
      <span className="text-fg-3">{'{'}</span>
      {entries.map(([k, v], i) => (
        <div key={k} className="ml-3">
          <span className="text-accent-glow">"{k}"</span>
          <span className="text-fg-3">: </span>
          <JsonTree value={v} depth={depth + 1} />
          {i < entries.length - 1 ? <span className="text-fg-3">,</span> : null}
        </div>
      ))}
      <span className="text-fg-3">{'}'}</span>
    </div>
  );
}
