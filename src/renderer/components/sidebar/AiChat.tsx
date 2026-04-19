import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, FileText, RotateCcw } from 'lucide-react';
import { useAi } from '../../store/ai';

export function AiChat() {
  const messages = useAi((s) => s.messages);
  const streaming = useAi((s) => s.streaming);
  const send = useAi((s) => s.send);
  const clear = useAi((s) => s.clear);
  const summarize = useAi((s) => s.summarizeActivePage);
  const askPage = useAi((s) => s.askPage);

  const [draft, setDraft] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 1e9 });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    // If a tab page is loaded, prefer page-aware ask.
    askPage(text);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-10 px-3 flex items-center justify-between border-b border-bg-3">
        <div className="flex items-center gap-2 text-fg-0">
          <Sparkles size={14} className="text-accent" />
          <span className="font-medium">AI Assistant</span>
        </div>
        <button onClick={clear} className="btn-ghost text-xs" aria-label="clear chat">
          <RotateCcw size={12} />
        </button>
      </header>

      <div className="px-3 py-2 border-b border-bg-3 flex flex-wrap gap-2">
        <QuickAction
          icon={<FileText size={12} />}
          label="Summarize page"
          onClick={() => !streaming && summarize()}
        />
        <QuickAction
          label="Explain page"
          onClick={() => !streaming && askPage('Explain what this page is about.')}
        />
        <QuickAction
          label="Key points"
          onClick={() => !streaming && askPage('Give me 5 key takeaways.')}
        />
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <EmptyState onPrompt={(q) => send(q)} />
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'text-fg-0 bg-accent-muted/40 rounded-lg px-3 py-2'
                : 'text-fg-1 whitespace-pre-wrap'
            }
          >
            {m.content}
            {streaming &&
              m === messages[messages.length - 1] &&
              m.role === 'assistant' && <span className="opacity-50">▍</span>}
          </div>
        ))}
      </div>

      <form
        onSubmit={submit}
        className="p-3 border-t border-bg-3 flex items-end gap-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this page, or anything else…"
          rows={2}
          className="input-flat flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="bg-accent hover:bg-accent-glow disabled:opacity-40 text-white rounded-md px-3 py-2"
          aria-label="Send message"
          title="Send message"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs bg-bg-2 hover:bg-bg-3 text-fg-1 hover:text-fg-0 rounded-full px-3 py-1 border border-bg-3"
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (q: string) => void }) {
  const prompts = [
    'What are the top trending dev tools this year?',
    'Draft a 3-line summary of the REST vs gRPC trade-offs.',
    'Give me a regex to validate ISO-8601 datetimes.',
  ];
  return (
    <div className="text-center text-fg-2 text-sm py-8">
      <div className="text-fg-1 font-medium mb-1">How can I help?</div>
      <div className="text-fg-3 text-xs mb-4">Tip: the assistant can read the current page.</div>
      <div className="space-y-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="block w-full text-left text-fg-1 hover:text-fg-0 bg-bg-2 hover:bg-bg-3 rounded-md px-3 py-2 text-sm border border-bg-3"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
