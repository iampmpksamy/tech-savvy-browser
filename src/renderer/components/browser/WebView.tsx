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
// ERR_ABORTED fix:
//   The `src` attribute is frozen via useRef — React never updates the DOM attr
//   after mount.  All subsequent navigations go through webview.loadURL().
//   did-fail-load silently drops error code -3 (ERR_ABORTED) which is a normal
//   navigation cancellation (e.g., redirect sequence or loadURL called twice).
//
// Security:
//   webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
//   Guest pages are fully sandboxed; they have no Node.js access.
import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import type { Tab } from '@shared/types';
import { ts } from '../../lib/bridge';
import { webviewRefs, type WebViewElement } from '../../lib/webviewRefs';
import { useTabs } from '../../store/tabs';

interface Props {
  tab:    Tab;
  active: boolean;
}

// Electron-specific webview attributes unknown to React's JSX types.
function electronAttrs(partition: string | undefined): React.HTMLAttributes<HTMLElement> {
  return {
    partition,
    webpreferences: 'contextIsolation=yes,nodeIntegration=no,sandbox=yes',
  } as React.HTMLAttributes<HTMLElement>;
}

export const WebView = memo(
  function WebView({ tab, active }: Props) {
    const ref        = useRef<WebViewElement>(null);
    // Freeze initial URL — prevents React from re-setting the src DOM attribute
    // on re-renders, which would trigger duplicate navigations (ERR_ABORTED).
    const initialUrl = useRef(tab.url);
    const patch      = useTabs((s) => s.patchTab);
    const create     = useTabs((s) => s.create);

    // Toggle visibility imperatively — keeps webview process alive when hidden.
    useLayoutEffect(() => {
      if (ref.current) ref.current.style.visibility = active ? 'visible' : 'hidden';
    }, [active]);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      webviewRefs.set(tab.id, el);

      // ── dom-ready ──────────────────────────────────────────────────────────
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
      const onTitle   = (e: { title: string })      => patch(tab.id, { title: e.title });
      const onFavicon = (e: { favicons: string[] }) =>
        patch(tab.id, { favicon: e.favicons[0] ?? null });

      // ── Navigation ─────────────────────────────────────────────────────────
      const onNavigate = (e: { url: string }) => {
        patch(tab.id, { url: e.url, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() });
        ts().tabs.updateMeta(tab.id, { url: e.url });
      };

      const onNavigateInPage = (e: { url: string; isMainFrame: boolean }) => {
        if (!e.isMainFrame) return;
        patch(tab.id, { url: e.url, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() });
        ts().tabs.updateMeta(tab.id, { url: e.url });
      };

      // ── Load failure ───────────────────────────────────────────────────────
      const onFailLoad = (e: { errorCode: number; errorDescription: string; validatedURL: string }) => {
        if (e.errorCode === -3) return; // ERR_ABORTED — normal cancellation, not an error
        patch(tab.id, { loading: false });
      };

      // ── New window ─────────────────────────────────────────────────────────
      const onNewWindow = (e: { url: string }) => { create(e.url); };

      el.addEventListener('dom-ready',            onDomReady);
      el.addEventListener('did-start-loading',    onStartLoading);
      el.addEventListener('did-stop-loading',     onStopLoading);
      el.addEventListener('page-title-updated',   onTitle);
      el.addEventListener('page-favicon-updated', onFavicon);
      el.addEventListener('did-navigate',         onNavigate);
      el.addEventListener('did-navigate-in-page', onNavigateInPage);
      el.addEventListener('did-fail-load',        onFailLoad);
      el.addEventListener('new-window',           onNewWindow);

      return () => {
        el.removeEventListener('dom-ready',            onDomReady);
        el.removeEventListener('did-start-loading',    onStartLoading);
        el.removeEventListener('did-stop-loading',     onStopLoading);
        el.removeEventListener('page-title-updated',   onTitle);
        el.removeEventListener('page-favicon-updated', onFavicon);
        el.removeEventListener('did-navigate',         onNavigate);
        el.removeEventListener('did-navigate-in-page', onNavigateInPage);
        el.removeEventListener('did-fail-load',        onFailLoad);
        el.removeEventListener('new-window',           onNewWindow);
        webviewRefs.delete(tab.id);
      };
    // tab.id is stable for the lifetime of this component instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab.id]);

    return (
      <webview
        ref={ref}
        src={initialUrl.current || undefined}
        {...electronAttrs(tab.partition)}
        className="wv-fill"
      />
    );
  },
  // Only re-render when the tab identity or visibility changes.
  // URL/title/favicon updates go through patchTab() and never need a re-render.
  (prev, next) => prev.tab.id === next.tab.id && prev.active === next.active,
);
