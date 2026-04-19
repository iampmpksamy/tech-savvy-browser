// ─── WebViewLayer ─────────────────────────────────────────────────────────────
// Renders one <WebView> per tab.  All webviews are mounted at the same time so
// their processes stay alive (and page state is preserved) across tab switches.
// Inactive tabs are hidden via CSS visibility rather than being removed from
// the DOM.
import { useTabs } from '../../store/tabs';
import { WebView }  from './WebView';

export function WebViewLayer() {
  const tabs     = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-bg-0">
      {tabs.map((tab) => (
        <WebView
          key={tab.id}
          tab={tab}
          active={tab.id === activeId}
        />
      ))}
    </div>
  );
}
