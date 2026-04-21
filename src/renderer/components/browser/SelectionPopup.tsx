// ─── SelectionPopup ───────────────────────────────────────────────────────────
// Floating AI quick-action FAB.  When clicked it reads the current text
// selection from the active webview and routes it to the AI sidebar.
import { motion } from 'framer-motion';
import { Sparkles, FileText, HelpCircle, Languages } from 'lucide-react';
import { useState } from 'react';
import { usePageContext } from '../../store/context';
import { useAi }          from '../../store/ai';
import { usePanels }      from '../../store/panels';
import { webviewRefs }    from '../../lib/webviewRefs';
import { useTabs }        from '../../store/tabs';

export function SelectionPopup() {
  const [expanded, setExpanded] = useState(false);
  const refresh    = usePageContext((s) => s.refresh);
  const askPage    = useAi((s) => s.askPage);
  const openRight  = usePanels((s) => s.openRight);
  const activeId   = useTabs((s) => s.activeId);

  const grabSelectionAndAsk = async (prompt: (sel: string) => string) => {
    setExpanded(false);
    // Read live selection from the webview via executeJavaScript.
    let selection = '';
    if (activeId) {
      const wv = webviewRefs.get(activeId);
      if (wv) {
        try {
          selection = (await wv.executeJavaScript(
            `(window.getSelection()?.toString() || '').trim()`,
          )) as string;
        } catch { /* sandboxed webview may reject */ }
      }
    }
    // Refresh full context too.
    await refresh();
    openRight('ai');
    askPage(selection ? prompt(selection) : 'Tell me about what is on this page.');
  };

  const actions = [
    {
      icon: <FileText size={13} />,
      label: 'Summarize',
      fn: (sel: string) =>
        sel ? `Summarize this: "${sel.slice(0, 400)}"` : 'Summarize this page.',
    },
    {
      icon: <HelpCircle size={13} />,
      label: 'Explain',
      fn: (sel: string) =>
        sel ? `Explain this clearly: "${sel.slice(0, 400)}"` : 'Explain what this page is about.',
    },
    {
      icon: <Languages size={13} />,
      label: 'Translate',
      fn: (sel: string) =>
        sel
          ? `Translate this to English: "${sel.slice(0, 400)}"`
          : 'Translate the key content of this page to English.',
    },
  ];

  return (
    <div className="no-drag absolute bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {/* Action pills — visible when expanded */}
      <motion.div
        initial={false}
        animate={expanded ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: 8, pointerEvents: 'none' }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-end gap-1.5"
      >
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => grabSelectionAndAsk(a.fn)}
            className="flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs text-fg-1 hover:text-fg-0 transition-colors shadow-glass"
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </motion.div>

      {/* FAB trigger */}
      <motion.button
        onClick={() => setExpanded((v) => !v)}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.94 }}
        className={[
          'w-9 h-9 rounded-full flex items-center justify-center shadow-glow',
          'transition-colors duration-150',
          expanded
            ? 'bg-accent text-white'
            : 'bg-bg-3 text-fg-2 hover:text-fg-0 hover:bg-bg-4',
        ].join(' ')}
        aria-label="AI quick actions"
        title="AI quick actions"
      >
        <Sparkles size={15} />
      </motion.button>
    </div>
  );
}
