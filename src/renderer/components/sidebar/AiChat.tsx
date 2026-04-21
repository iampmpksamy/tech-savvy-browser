// ─── AiChat ───────────────────────────────────────────────────────────────────
// Premium ChatGPT-style chat interface with context-awareness.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, FileText, Zap, List, RotateCcw, User } from 'lucide-react';
import { useAi }         from '../../store/ai';
import { usePageContext } from '../../store/context';
import type { AiMessage } from '@shared/types';

// ── Quick action chip ─────────────────────────────────────────────────────────
function ActionChip({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-bg-3 bg-bg-2/60 text-fg-2 hover:text-fg-0 hover:border-accent/30 hover:bg-accent/[0.07] transition-all duration-150"
    >
      {icon}
      {label}
    </button>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, isLast, streaming }: { msg: AiMessage; isLast: boolean; streaming: boolean }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={10} className="text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-bg-3 flex items-center justify-center shrink-0 mt-0.5">
          <User size={10} className="text-fg-2" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
          {msg.content}
          {streaming && isLast && !isUser && (
            <span className="streaming-cursor" />
          )}
        </p>
      </div>
    </motion.div>
  );
}

// ── Empty / welcome state ─────────────────────────────────────────────────────
function WelcomeState({ onPrompt }: { onPrompt: (q: string) => void }) {
  const context  = usePageContext((s) => s.context);
  const prompts  = context?.type === 'github-pr'
    ? ['Summarize this PR', 'What are the key changes?', 'Any potential issues?']
    : context?.type === 'article'
      ? ['Summarize this article', 'What are the key takeaways?', 'Explain this simply']
      : [
          'What are the top trending dev tools this year?',
          'Draft a 3-line summary of REST vs gRPC trade-offs',
          'Give me a regex to validate ISO-8601 datetimes',
        ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center mb-3">
        <Sparkles size={18} className="text-white" />
      </div>
      <p className="text-fg-0 font-medium text-sm mb-1">How can I help?</p>
      <p className="text-fg-3 text-xs mb-5">
        {context ? `Reading: ${context.title.slice(0, 40) || 'current page'}` : 'Ask me anything'}
      </p>
      <div className="flex flex-col gap-1.5 w-full">
        {prompts.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPrompt(p)}
            className="text-left text-xs text-fg-2 hover:text-fg-0 bg-bg-2/40 hover:bg-bg-2 rounded-xl px-3.5 py-2.5 border border-bg-3 hover:border-accent/20 transition-all duration-150"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AiChat() {
  const messages  = useAi((s) => s.messages);
  const streaming = useAi((s) => s.streaming);
  const send      = useAi((s) => s.send);
  const clear     = useAi((s) => s.clear);
  const summarize = useAi((s) => s.summarizeActivePage);
  const askPage   = useAi((s) => s.askPage);
  const context   = usePageContext((s) => s.context);

  const [draft, setDraft]   = useState('');
  const scrollerRef         = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    askPage(text);
  };

  return (
    <div className="h-full flex flex-col bg-bg-1">
      {/* ── Header ── */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-accent" />
          <span className="text-fg-0 text-xs font-semibold">AI Assistant</span>
          {context && (
            <span className="text-[10px] text-fg-3 bg-bg-3 rounded-full px-2 py-0.5 capitalize">
              {context.type.replace('-', ' ')}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="btn-icon"
            aria-label="Clear chat"
            title="Clear conversation"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* ── Quick actions ── */}
      {messages.length === 0 && (
        <div className="px-3 pt-3 flex flex-wrap gap-1.5 shrink-0">
          <ActionChip
            icon={<FileText size={11} />}
            label="Summarize"
            onClick={() => !streaming && summarize()}
          />
          <ActionChip
            icon={<Zap size={11} />}
            label="Explain page"
            onClick={() => !streaming && askPage('Explain what this page is about in 2–3 sentences.')}
          />
          <ActionChip
            icon={<List size={11} />}
            label="Key points"
            onClick={() => !streaming && askPage('List the 5 most important points from this page.')}
          />
        </div>
      )}

      {/* ── Messages / Welcome ── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <WelcomeState onPrompt={(q) => send(q)} />
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isLast={i === messages.length - 1}
                  streaming={streaming}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.05]">
        <form
          onSubmit={submit}
          className="flex items-end gap-2 bg-bg-2 border border-bg-3 rounded-xl px-3 py-2 focus-within:border-accent/40 transition-colors"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about this page…"
            rows={1}
            className="flex-1 bg-transparent outline-none text-fg-0 placeholder-fg-3 text-[13px] resize-none leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="submit"
            disabled={streaming || !draft.trim()}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-accent disabled:opacity-30 hover:bg-accent-glow transition-colors"
            aria-label="Send message"
            title="Send (Enter)"
          >
            <Send size={12} className="text-white" />
          </button>
        </form>
        <p className="text-fg-3 text-[10px] mt-1.5 text-center">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
