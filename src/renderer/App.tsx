import { useEffect, useMemo } from 'react';
import { TitleBar }          from './components/layout/TitleBar';
import { TabBar }            from './components/layout/TabBar';
import { UrlBar }            from './components/layout/UrlBar';
import { BottomPanel }       from './components/layout/BottomPanel';
import { WebViewLayer }      from './components/browser/WebViewLayer';
import { Sidebar }           from './components/sidebar/Sidebar';
import { CommandPalette }    from './components/palette/CommandPalette';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useTabs }           from './store/tabs';
import { useAi }             from './store/ai';
import { usePageContext }     from './store/context';

export default function App() {
  useGlobalShortcuts();

  const bindTabs        = useTabs((s) => s.bindPush);
  const refreshTabs     = useTabs((s) => s.refresh);
  const createTab       = useTabs((s) => s.create);
  const tabs            = useTabs((s) => s.tabs);
  const activeId        = useTabs((s) => s.activeId);
  const tabsLoaded      = useTabs((s) => s.loaded);

  const bindAi          = useAi((s) => s.bindStream);
  const refreshProviders = useAi((s) => s.refreshProviders);

  const onUrlChange     = usePageContext((s) => s.onUrlChange);

  // Initialise push listeners and fetch initial state.
  useEffect(() => {
    refreshTabs();
    refreshProviders();
    const off1 = bindTabs();
    const off2 = bindAi();
    return () => { off1(); off2(); };
  }, [bindTabs, bindAi, refreshTabs, refreshProviders]);

  // Create the first tab when there is nothing to restore.
  useEffect(() => {
    if (tabsLoaded && tabs.length === 0) {
      createTab('https://duckduckgo.com');
    }
  }, [tabsLoaded, tabs.length, createTab]);

  // Refresh AI page-context whenever the active tab navigates.
  const activeUrl = useMemo(
    () => tabs.find((t) => t.id === activeId)?.url ?? null,
    [tabs, activeId],
  );
  useEffect(() => { onUrlChange(activeUrl); }, [activeUrl, onUrlChange]);

  return (
    // Chrome-like layout:
    //  ┌────────────────────────────────────────────────────────┐
    //  │ TitleBar  (custom title bar + window controls)         │
    //  ├────────────────────────────────────────────────────────┤
    //  │ TabBar    (horizontal tabs + new-tab button)           │
    //  ├────────────────────────────────────────────────────────┤
    //  │ UrlBar    (back · fwd · reload · address · ⌘K)        │
    //  ├──────────────────────────────────────┬─────────────────┤
    //  │                                      │                 │
    //  │  WebViewLayer (one <webview> / tab)  │   AI Sidebar   │
    //  │                                      │                 │
    //  ├──────────────────────────────────────┴─────────────────┤
    //  │ BottomPanel (Terminal / API Tester / Network / …)      │
    //  └────────────────────────────────────────────────────────┘
    <div className="h-screen w-screen flex flex-col bg-bg-0 text-fg-0 text-sm overflow-hidden">
      <TitleBar />
      <TabBar />
      <UrlBar />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <WebViewLayer />
        <Sidebar />
      </div>
      <BottomPanel />
      <CommandPalette />
    </div>
  );
}
