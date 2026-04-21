// ─── SettingsPanel ────────────────────────────────────────────────────────────
// Modal overlay for app configuration: AI provider keys, search engine, etc.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Search, Shield, Cpu } from 'lucide-react';
import { usePanels }   from '../../store/panels';
import { useSettings } from '../../store/settings';
import { useAi }       from '../../store/ai';
import { ts }          from '../../lib/bridge';

type Tab = 'ai' | 'search' | 'privacy';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-fg-3 text-[10px] uppercase tracking-widest mb-2">{children}</p>
  );
}

function ProviderRow({
  label, provider, hasKey,
}: { label: string; provider: 'openai' | 'anthropic' | 'ollama'; hasKey?: boolean }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!value.trim()) return;
    await ts().ai.setKey(provider, value.trim());
    setValue('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-fg-1 text-xs">{label}</span>
        {hasKey && (
          <span className="text-[10px] text-ok bg-ok/10 rounded-full px-2 py-0.5">key set</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasKey ? 'Replace existing key…' : 'Paste API key…'}
          className="input-flat flex-1 text-xs"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={save}
          className="px-3 py-1.5 rounded-lg bg-accent/80 hover:bg-accent text-white text-xs transition-colors disabled:opacity-40"
          disabled={!value.trim()}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const open        = usePanels((s) => s.settingsOpen);
  const setOpen     = usePanels((s) => s.setSettingsOpen);
  const providers   = useAi((s) => s.providers);
  const settings    = useSettings();
  const [tab, setTab] = useState<Tab>('ai');

  useEffect(() => {
    if (open) useSettings.getState().load();
  }, [open]);

  const providerMap = Object.fromEntries(providers.map((p) => [p.provider, p]));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed z-50 top-[12%] left-1/2 -translate-x-1/2 w-[480px] max-h-[72vh] flex flex-col rounded-2xl shadow-glass overflow-hidden"
            style={{ background: '#0f1217', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-fg-0 font-semibold text-sm">Settings</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-icon"
                aria-label="Close settings"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-5 pt-3 pb-1 shrink-0">
              {([
                ['ai',      <Cpu     size={12} />, 'AI & Keys'],
                ['search',  <Search  size={12} />, 'Search'],
                ['privacy', <Shield  size={12} />, 'Privacy'],
              ] as [Tab, React.ReactNode, string][]).map(([key, icon, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setTab(key)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
                    tab === key
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'text-fg-2 hover:text-fg-1 hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === 'ai' && (
                <>
                  <SectionLabel>API Keys</SectionLabel>
                  <ProviderRow label="OpenAI (GPT-4)" provider="openai"    hasKey={providerMap['openai']?.hasKey}    />
                  <ProviderRow label="Anthropic (Claude)" provider="anthropic" hasKey={providerMap['anthropic']?.hasKey} />
                  <ProviderRow label="Ollama (local)" provider="ollama"   hasKey={providerMap['ollama']?.hasKey}   />

                  <div className="mt-4">
                    <SectionLabel>Active Provider</SectionLabel>
                    <div className="flex gap-2">
                      {(['openai', 'anthropic', 'ollama'] as const).map((p) => (
                        <button
                          type="button"
                          key={p}
                          className={[
                            'px-3 py-1.5 rounded-lg text-xs border transition-colors capitalize',
                            settings.ai?.provider === p
                              ? 'bg-accent/10 border-accent/30 text-accent'
                              : 'border-bg-3 text-fg-2 hover:text-fg-1 hover:bg-white/[0.04]',
                          ].join(' ')}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === 'search' && (
                <>
                  <SectionLabel>Default Search Engine</SectionLabel>
                  <div className="flex gap-2">
                    {(['google', 'duckduckgo', 'kagi', 'brave'] as const).map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => settings.save({ defaultSearchEngine: e })}
                        className={[
                          'px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors',
                          settings.defaultSearchEngine === e
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'border-bg-3 text-fg-2 hover:text-fg-1 hover:bg-white/[0.04]',
                        ].join(' ')}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <p className="text-fg-3 text-xs mt-3">
                    The omnibox always uses Google. Other engines apply only to the command palette.
                  </p>
                </>
              )}

              {tab === 'privacy' && (
                <>
                  <SectionLabel>Blocking</SectionLabel>
                  {([
                    ['adBlockerEnabled',      'Ad blocker'],
                    ['trackerBlockerEnabled',  'Tracker blocker'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
                      <span className="text-fg-1 text-xs">{label}</span>
                      <input
                        type="checkbox"
                        checked={!!settings[key]}
                        onChange={(e) => settings.save({ [key]: e.target.checked })}
                        className="accent-accent w-4 h-4"
                      />
                    </label>
                  ))}

                  <div className="mt-4">
                    <SectionLabel>Secure DNS</SectionLabel>
                    <div className="flex gap-2 flex-wrap">
                      {(['off', 'cloudflare', 'quad9', 'google'] as const).map((d) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => settings.save({ secureDns: d })}
                          className={[
                            'px-3 py-1.5 rounded-lg text-xs border capitalize transition-colors',
                            settings.secureDns === d
                              ? 'bg-accent/10 border-accent/30 text-accent'
                              : 'border-bg-3 text-fg-2 hover:text-fg-1 hover:bg-white/[0.04]',
                          ].join(' ')}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-fg-3 text-[10px]">Tech Savvy Browser</span>
              <div className="flex items-center gap-1">
                <Key size={10} className="text-fg-3" />
                <span className="text-fg-3 text-[10px]">Keys stored in OS keychain</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
