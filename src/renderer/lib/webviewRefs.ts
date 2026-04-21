// ─── WebView Ref Registry ────────────────────────────────────────────────────
// Module-level Map so any store or component can reach a webview by tab ID
// without threading refs through props or React context.
//
// Usage:
//   import { webviewRefs, normalizeUrl } from '../lib/webviewRefs';
//
//   // In WebView.tsx — on mount:
//   webviewRefs.set(tab.id, el);
//   // On unmount:
//   webviewRefs.delete(tab.id);
//
//   // In tabs store — for navigation:
//   webviewRefs.get(id)?.loadURL(normalizeUrl(url));

/** DOM element interface for Electron's <webview> tag. */
export interface WebViewElement extends HTMLElement {
  src:        string;
  partition?: string;

  loadURL(url: string): Promise<void>;
  reload():       void;
  stop():         void;
  goBack():       void;
  goForward():    void;
  canGoBack():    boolean;
  canGoForward(): boolean;
  getURL():       string;
  getTitle():     string;
  getWebContentsId(): number;

  openDevTools():      void;
  closeDevTools():     void;
  isDevToolsOpened(): boolean;

  executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>;
  insertCSS(css: string): Promise<string>;

  // Typed event overloads used inside WebView.tsx
  addEventListener(event: 'did-start-loading',      handler: () => void): void;
  addEventListener(event: 'did-stop-loading',       handler: () => void): void;
  addEventListener(event: 'dom-ready',              handler: () => void): void;
  addEventListener(event: 'page-title-updated',     handler: (e: { title: string }) => void): void;
  addEventListener(event: 'page-favicon-updated',   handler: (e: { favicons: string[] }) => void): void;
  addEventListener(event: 'did-navigate',           handler: (e: { url: string }) => void): void;
  addEventListener(event: 'did-navigate-in-page',   handler: (e: { url: string; isMainFrame: boolean }) => void): void;
  addEventListener(event: 'did-fail-load',          handler: (e: { errorCode: number; errorDescription: string; validatedURL: string }) => void): void;
  addEventListener(event: 'new-window',             handler: (e: { url: string }) => void): void;
  addEventListener(event: string,                   handler: EventListenerOrEventListenerObject): void;

  // Mirror the typed addEventListener overloads so removeEventListener accepts the same
  // callback signatures (avoids TS2345 "not assignable to EventListenerOrEventListenerObject").
  removeEventListener(event: 'did-start-loading',    handler: () => void): void;
  removeEventListener(event: 'did-stop-loading',     handler: () => void): void;
  removeEventListener(event: 'dom-ready',            handler: () => void): void;
  removeEventListener(event: 'page-title-updated',   handler: (e: { title: string }) => void): void;
  removeEventListener(event: 'page-favicon-updated', handler: (e: { favicons: string[] }) => void): void;
  removeEventListener(event: 'did-navigate',         handler: (e: { url: string }) => void): void;
  removeEventListener(event: 'did-navigate-in-page', handler: (e: { url: string; isMainFrame: boolean }) => void): void;
  removeEventListener(event: 'did-fail-load',        handler: (e: { errorCode: number; errorDescription: string; validatedURL: string }) => void): void;
  removeEventListener(event: 'new-window',           handler: (e: { url: string }) => void): void;
  removeEventListener(event: string,                 handler: EventListenerOrEventListenerObject): void;
}

const _refs = new Map<string, WebViewElement>();

export const webviewRefs = {
  set:    (id: string, el: WebViewElement): void  => { _refs.set(id, el); },
  delete: (id: string): void                      => { _refs.delete(id); },
  get:    (id: string): WebViewElement | undefined => _refs.get(id),
};

/**
 * Normalise user input into a fully qualified URL.
 * Bare hostnames get https://, everything else becomes a DuckDuckGo search.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;                              // already has scheme
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`; // bare hostname
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;          // search query
}
