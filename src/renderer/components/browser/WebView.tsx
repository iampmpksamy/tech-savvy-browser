// ─── WebView ──────────────────────────────────────────────────────────────────
// One <webview> element per tab.  Invisible when not active.
//
// Responsibilities:
//   • Register / unregister the element in webviewRefs on mount / unmount
//   • Forward dom-ready webContentsId to the main process (for AI extraction)
//   • Translate all webview events into patchTab() calls on the Zustand store
//   • Sync url+title to main process after navigation (for session persistence)
//   • Open new-window requests in a new tab rather than a new BrowserWindow
//
// Security:
//   webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
//   Guest pages are fully sandboxed; they have no Node.js access.
import { useEffect, useRef } from 'react';
import type { Tab } from '@shared/types';
import { ts } from '../../lib/bridge';
import { webviewRefs, type WebViewElement } from '../../lib/webviewRefs';
import { useTabs } from '../../store/tabs';

interface Props {
  tab:    Tab;
  active: boolean;
}

export function WebView({ tab, active }: Props) {
  const ref    = useRef<WebViewElement>(null);
  const patch  = useTabs((s) => s.patchTab);
  const create = useTabs((s) => s.create);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Register in the module-level map so stores can reach this element.
    webviewRefs.set(tab.id, el);

    // ── dom-ready ──────────────────────────────────────────────────────────
    // Register webContentsId so main process can call executeJavaScript for AI.
    const onDomReady = () => {
      ts().tabs.registerWcId(tab.id, el.getWebContentsId());
    };

    // ── Loading state ──────────────────────────────────────────────────────
    const onStartLoading = () => patch(tab.id, { loading: true });
    const onStopLoading  = () =>
      patch(tab.id, {
        loading:      false,
        canGoBack:    el.canGoBack(),
        canGoForward: el.canGoForward(),
        url:          el.getURL(),
      });

    // ── Title & favicon ────────────────────────────────────────────────────
    const onTitle   = (e: { title: string })         => patch(tab.id, { title: e.title });
    const onFavicon = (e: { favicons: string[] })    =>
      patch(tab.id, { favicon: e.favicons[0] ?? null });

    // ── Navigation ─────────────────────────────────────────────────────────
    const onNavigate = (e: { url: string }) => {
      patch(tab.id, {
        url:          e.url,
        canGoBack:    el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      // Keep the main-process metadata in sync for session persistence.
      ts().tabs.updateMeta(tab.id, { url: e.url });
    };

    const onNavigateInPage = (e: { url: string; isMainFrame: boolean }) => {
      if (!e.isMainFrame) return;
      patch(tab.id, { url: e.url, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() });
      ts().tabs.updateMeta(tab.id, { url: e.url });
    };

    // ── New window ─────────────────────────────────────────────────────────
    // Open target="_blank" links in a new tab rather than a new BrowserWindow.
    const onNewWindow = (e: { url: string }) => {
      create(e.url);
    };

    el.addEventListener('dom-ready',            onDomReady);
    el.addEventListener('did-start-loading',    onStartLoading);
    el.addEventListener('did-stop-loading',     onStopLoading);
    el.addEventListener('page-title-updated',   onTitle);
    el.addEventListener('page-favicon-updated', onFavicon);
    el.addEventListener('did-navigate',         onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigateInPage);
    el.addEventListener('new-window',           onNewWindow);

    return () => {
      el.removeEventListener('dom-ready',            onDomReady);
      el.removeEventListener('did-start-loading',    onStartLoading);
      el.removeEventListener('did-stop-loading',     onStopLoading);
      el.removeEventListener('page-title-updated',   onTitle);
      el.removeEventListener('page-favicon-updated', onFavicon);
      el.removeEventListener('did-navigate',         onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigateInPage);
      el.removeEventListener('new-window',           onNewWindow);
      webviewRefs.delete(tab.id);
    };
  // tab.id is stable for the lifetime of this component instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  return (
    // @ts-expect-error — Electron's <webview> is not in React's JSX types
    <webview
      ref={ref}
      src={tab.url}
      partition={tab.partition}
      webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
      allowpopups="false"
      style={{
        width:    '100%',
        height:   '100%',
        // Use CSS visibility so the webview keeps its process alive when hidden —
        // killing the element would destroy the webContents and lose page state.
        visibility: active ? 'visible' : 'hidden',
        position: 'absolute',
        top: 0, left: 0,
      }}
    />
  );
}
