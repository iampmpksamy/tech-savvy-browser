// ─── Page Context Store ──────────────────────────────────────────────────────
// Extracts and classifies the active tab's page content for AI features.
// Uses webview.executeJavaScript() directly — no IPC round-trip needed.
import { create } from 'zustand';
import type { PageContext, PageType } from '@shared/types';
import { webviewRefs } from '../lib/webviewRefs';
import { useTabs }     from './tabs';

interface ContextState {
  context:  PageContext | null;
  loading:  boolean;
  _lastUrl: string | null;
  refresh:     () => Promise<void>;
  onUrlChange: (url: string | null) => void;
}

const EXTRACT_JS = `(function(){
  return {
    title:        document.title || '',
    description:  document.querySelector('meta[name="description"]')?.content || '',
    selectedText: (window.getSelection()?.toString() || '').trim(),
    text:         (document.body ? document.body.innerText : '').slice(0, 8000),
  };
})()`;

export const usePageContext = create<ContextState>((set, get) => ({
  context:  null,
  loading:  false,
  _lastUrl: null,

  refresh: async () => {
    const { activeId } = useTabs.getState();
    if (!activeId) return;
    const wv = webviewRefs.get(activeId);
    if (!wv) return;

    set({ loading: true });
    try {
      const raw = await wv.executeJavaScript(EXTRACT_JS) as {
        title: string; description: string; selectedText: string; text: string;
      };
      const url  = wv.getURL();
      const type = detectPageType(url, raw.text, raw.description);
      const ctx: PageContext = {
        url,
        title:        raw.title || wv.getTitle(),
        description:  raw.description,
        selectedText: raw.selectedText,
        text:         raw.text,
        type,
      };
      set({ context: ctx, loading: false, _lastUrl: url });
    } catch {
      set({ loading: false });
    }
  },

  onUrlChange: (url) => {
    if (!url || url === 'about:blank') {
      set({ context: null, _lastUrl: null });
      return;
    }
    if (url === get()._lastUrl) return;
    get().refresh();
  },
}));

// ── Page type classifier ──────────────────────────────────────────────────────

function detectPageType(url: string, text: string, description: string): PageType {
  if (!url || url === 'about:blank' || url.startsWith('chrome-')) return 'generic';
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');

    if (host === 'github.com') {
      const [,, , section] = pathname.split('/');
      if (section === 'pull')   return 'github-pr';
      if (section === 'issues') return 'github-issue';
      if (pathname.split('/').filter(Boolean).length >= 2) return 'github-repo';
      return 'generic';
    }
    if (host === 'npmjs.com')             return 'npm';
    if (host === 'developer.mozilla.org') return 'mdn';
    if (pathname.endsWith('.json'))       return 'json';
    const t = text.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) return 'json';
    if (
      host.startsWith('docs.') ||
      pathname.startsWith('/docs') ||
      pathname.startsWith('/api/') ||
      description.toLowerCase().includes('api reference')
    ) return 'api-docs';
    if (text.length > 500) return 'article';
  } catch { /* malformed URL */ }
  return 'generic';
}
