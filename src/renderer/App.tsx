// ─── App ──────────────────────────────────────────────────────────────────────
// Arc-style layout:
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │ LeftSidebar (220px)  │  TopBar  (nav buttons + centred omnibox)        │
//  │  ┌─────────────────┐ │  ─────────────────────────────────────────────  │
//  │  │ Logo + win ctrl │ │                                                  │
//  │  │ Tab 1           │ │  WebViewLayer              │  AI Sidebar        │
//  │  │ Tab 2 ●         │ │  (full area)               │  (collapsible)     │
//  │  │ Tab 3           │ │                                                  │
//  │  │ + New Tab       │ │  SelectionPopup FAB (bottom-right)               │
//  │  │ ✨  🖥  ⚙        │ │  BottomPanel (Terminal / API / Network / …)     │
//  └──└─────────────────┘─└──────────────────────────────────────────────────┘
import { useEffect, useMemo } from 'react';
import { LeftSidebar }     from './components/sidebar/LeftSidebar';
import { TopBar }          from './components/layout/TopBar';
import { WebViewLayer }    from './components/browser/WebViewLayer';
import { SelectionPopup }  from './components/browser/SelectionPopup';
import { Sidebar }         from './components/sidebar/Sidebar';
import { BottomPanel }     from './components/layout/BottomPanel';
import { CommandPalette }  from './components/palette/CommandPalette';
import { SettingsPanel }   from './components/settings/SettingsPanel';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useTabs }         from './store/tabs';
import { useAi }           from './store/ai';
import { usePageContext }   from './store/context';

export default function App() {
  useGlobalShortcuts();

  const bindTabs         = useTabs((s) => s.bindPush);
  const refreshTabs      = useTabs((s) => s.refresh);
  const createTab        = useTabs((s) => s.create);
  const tabs             = useTabs((s) => s.tabs);
  const activeId         = useTabs((s) => s.activeId);
  const tabsLoaded       = useTabs((s) => s.loaded);

  const bindAi           = useAi((s) => s.bindStream);
  const refreshProviders = useAi((s) => s.refreshProviders);

  const onUrlChange      = usePageContext((s) => s.onUrlChange);

  // Initialise IPC listeners and fetch initial state.
  useEffect(() => {
    refreshTabs();
    refreshProviders();
    const off1 = bindTabs();
    const off2 = bindAi();
    return () => { off1(); off2(); };
  }, [bindTabs, bindAi, refreshTabs, refreshProviders]);

  // Open a blank tab when nothing is restored from the previous session.
  useEffect(() => {
    if (tabsLoaded && tabs.length === 0) {
      createTab('about:blank');
    }
  }, [tabsLoaded, tabs.length, createTab]);

  // Refresh AI page-context whenever the active tab navigates.
  const activeUrl = useMemo(
    () => tabs.find((t) => t.id === activeId)?.url ?? null,
    [tabs, activeId],
  );
  useEffect(() => { onUrlChange(activeUrl); }, [activeUrl, onUrlChange]);

  return (
    <div className="h-screen w-screen flex bg-bg-0 text-fg-0 text-sm overflow-hidden">
      {/* Left — Arc-style vertical tab strip + window controls */}
      <LeftSidebar />

      {/* Right — main browser area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Minimal top bar: back/fwd/reload + centred omnibox + AI toggle */}
        <TopBar />

        {/* Content row: webview fills space, AI sidebar slides in from right */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          <WebViewLayer />
          <Sidebar />
          <SelectionPopup />
        </div>

        {/* Collapsible bottom dev tools (terminal, API tester, network, JSON) */}
        <BottomPanel />
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <SettingsPanel />
    </div>
  );
}
