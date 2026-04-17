import { useEffect, useMemo } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { VerticalTabStrip } from './components/tabs/VerticalTabStrip';
import { UrlBar } from './components/layout/UrlBar';
import { Sidebar } from './components/sidebar/Sidebar';
import { BottomPanel } from './components/layout/BottomPanel';
import { TabViewPort } from './components/layout/TabViewPort';
import { CommandPalette } from './components/palette/CommandPalette';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useTabs } from './store/tabs';
import { useAi } from './store/ai';
import { usePageContext } from './store/context';

export default function App() {
  useGlobalShortcuts();

  const bindTabs = useTabs((s) => s.bindPush);
  const refreshTabs = useTabs((s) => s.refresh);
  const createTab = useTabs((s) => s.create);
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const tabsLoaded = useTabs((s) => s.loaded);

  const bindAi = useAi((s) => s.bindStream);
  const refreshProviders = useAi((s) => s.refreshProviders);

  const onUrlChange = usePageContext((s) => s.onUrlChange);

  useEffect(() => {
    refreshTabs();
    refreshProviders();
    const off1 = bindTabs();
    const off2 = bindAi();
    return () => {
      off1();
      off2();
    };
  }, [bindTabs, bindAi, refreshTabs, refreshProviders]);

  useEffect(() => {
    if (tabsLoaded && tabs.length === 0) {
      createTab('https://duckduckgo.com');
    }
  }, [tabsLoaded, tabs.length, createTab]);

  // Refresh page context whenever the active tab navigates to a new URL.
  const activeUrl = useMemo(
    () => tabs.find((t) => t.id === activeId)?.url ?? null,
    [tabs, activeId],
  );
  useEffect(() => {
    onUrlChange(activeUrl);
  }, [activeUrl, onUrlChange]);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-0 text-fg-0 text-sm">
      <TitleBar />
      <div className="flex-1 min-h-0 flex">
        <VerticalTabStrip />
        <div className="flex-1 min-w-0 flex flex-col">
          <UrlBar />
          <div className="flex-1 min-h-0 flex">
            <TabViewPort />
            <Sidebar />
          </div>
          <BottomPanel />
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
