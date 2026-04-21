// ─── WebViewLayer ─────────────────────────────────────────────────────────────
// All <webview> elements are mounted simultaneously so their processes stay
// alive across tab switches.  Inactive tabs are hidden via CSS visibility.
// When the active tab has no URL, the NewTabPage overlay is shown instead.
import { useTabs }    from '../../store/tabs';
import { WebView }    from './WebView';
import { NewTabPage } from './NewTabPage';

function isBlank(url: string | undefined) {
  return !url || url === 'about:blank' || url === '';
}

export function WebViewLayer() {
  const tabs      = useTabs((s) => s.tabs);
  const activeId  = useTabs((s) => s.activeId);
  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-bg-0">
      {tabs.map((tab) => (
        <WebView key={tab.id} tab={tab} active={tab.id === activeId} />
      ))}

      {isBlank(activeTab?.url) && <NewTabPage />}
    </div>
  );
}
