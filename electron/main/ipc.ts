// ─── IPC Router ─────────────────────────────────────────────────────────────
// Wires all services to the renderer through a single, typed surface.
// Navigation (back / forward / reload / loadURL) is handled by the <webview>
// element directly in the renderer — no round-trip needed.
import { BrowserWindow, ipcMain } from 'electron';
import axios from 'axios';
import { IPC } from '../../src/shared/ipc/channels';
import type { HttpRequestSpec, HttpResponseSpec, PageContext } from '../../src/shared/types';
import type { TabManager }      from './tab-manager';
import type { ProfileManager }  from './profile-manager';
import type { BlockerService }  from './blocker';
import type { SecureDnsService } from './secure-dns';
import type { TerminalService } from './terminal-service';
import type { NetworkInspector } from './network-inspector';
import type { AiRouter }        from '../services/ai';
import type { ExtensionService } from './extensions';
import { triggerCheck, triggerInstall } from './updater';

// ── Stream buffer ─────────────────────────────────────────────────────────────
// Batches AI token deltas into ~50 ms windows to reduce IPC round-trips.
function createStreamBuffer(
  send: (delta: string, done: boolean, error?: string) => void,
  intervalMs = 50,
): (delta: string, done: boolean, error?: string) => void {
  let buf   = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (delta, done, error) => {
    if (error) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (buf)   { send(buf, false); buf = ''; }
      send('', true, error);
      return;
    }
    if (done) {
      if (timer) { clearTimeout(timer); timer = null; }
      send(buf, true);
      buf = '';
      return;
    }
    buf += delta;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (buf) { send(buf, false); buf = ''; }
      }, intervalMs);
    }
  };
}

function buildPageContext(page: PageContext): string {
  const parts = [`URL: ${page.url}`, `Title: ${page.title}`];
  if (page.description)  parts.push(`Description: ${page.description}`);
  if (page.selectedText) parts.push(`Selected text:\n${page.selectedText}`);
  if (page.text)         parts.push(`Page content:\n${page.text}`);
  return parts.join('\n\n');
}

interface Deps {
  window:    BrowserWindow;
  tabs:      TabManager;
  profiles:  ProfileManager;
  blocker:   BlockerService;
  secureDns: SecureDnsService;
  terminal:  TerminalService;
  net:       NetworkInspector;
  ai:        AiRouter;
  extensions: ExtensionService;
}

export function registerIpc(deps: Deps) {
  const { window, tabs, profiles, blocker, secureDns, terminal, net, ai, extensions } = deps;

  // ── Tabs ────────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TAB_CREATE, (_e, url?: string) => {
    const partition = profiles.active().partition;
    return tabs.create(url ?? 'about:blank', partition);
  });
  ipcMain.handle(IPC.TAB_CLOSE,    (_e, id: string)            => tabs.close(id));
  ipcMain.handle(IPC.TAB_ACTIVATE, (_e, id: string)            => tabs.activate(id));
  ipcMain.handle(IPC.TAB_LIST,     ()                          => tabs.list());

  // Renderer notifies main when a webview navigates — keeps the session snapshot current.
  ipcMain.handle(IPC.TAB_UPDATE_META, (_e, id: string, patch: { url?: string; title?: string }) => {
    tabs.updateMeta(id, patch);
  });

  // Renderer registers webview's webContentsId so main can run executeJavaScript for AI.
  ipcMain.handle(IPC.TAB_REGISTER_WC, (_e, tabId: string, wcId: number) => {
    tabs.registerWcId(tabId, wcId);
  });

  // ── Profiles ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PROFILE_LIST,    ()                            => profiles.list());
  ipcMain.handle(IPC.PROFILE_CREATE,  (_e, name: string, color?: string) => profiles.create(name, color));
  ipcMain.handle(IPC.PROFILE_ACTIVATE,(_e, id: string)             => profiles.activate(id));
  ipcMain.handle(IPC.PROFILE_DELETE,  (_e, id: string)             => profiles.remove(id));

  // ── AI ──────────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.AI_LIST_PROVIDERS, () => ai.listProviders());
  ipcMain.handle(IPC.AI_SET_KEY, (_e, provider: string, key: string) =>
    ai.setKey(provider as 'openai' | 'anthropic' | 'ollama', key),
  );

  ipcMain.handle(IPC.AI_SEND, async (
    _e,
    payload: { requestId: string; messages: { role: 'system' | 'user' | 'assistant'; content: string }[] },
  ) => {
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId: payload.requestId, delta, done, error }),
    );
    await ai.stream(payload.messages, send);
  });

  ipcMain.handle(IPC.AI_SUMMARIZE_PAGE, async (_e, requestId: string) => {
    const page = await tabs.getPageContext();
    if (!page) return;
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
    );
    await ai.stream([
      { role: 'system', content: 'You are a concise web page summarizer. Return 3–6 bullets.' },
      { role: 'user',   content: buildPageContext(page) },
    ], send);
  });

  ipcMain.handle(IPC.AI_EXPLAIN_CODE, async (_e, requestId: string, code: string, language?: string) => {
    const page = await tabs.getPageContext();
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
    );
    const snippet = code || page?.selectedText || '';
    await ai.stream([
      {
        role: 'system',
        content: 'You are a senior engineer. Explain the code: what it does, patterns, and any bugs.',
      },
      { role: 'user', content: `Language: ${language ?? 'unknown'}\n\n\`\`\`\n${snippet}\n\`\`\`` },
    ], send);
  });

  ipcMain.handle(IPC.AI_ASK_PAGE, async (_e, requestId: string, question: string) => {
    const page = await tabs.getPageContext();
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
    );
    await ai.stream([
      {
        role: 'system',
        content: 'Answer using ONLY the page context when possible. If the answer is absent, say so then answer from general knowledge.',
      },
      {
        role: 'user',
        content: page ? `Context:\n${buildPageContext(page)}\n\nQuestion: ${question}` : question,
      },
    ], send);
  });

  ipcMain.handle(IPC.PAGE_EXTRACT_TEXT, () => tabs.getPageContext());

  // ── Settings ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_GET, () => ({
    adBlockerEnabled: blocker.isEnabled(),
    secureDns:        secureDns.getProvider(),
  }));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Record<string, unknown>) => {
    if ('adBlockerEnabled' in patch) blocker.setEnabled(Boolean(patch.adBlockerEnabled));
    if ('secureDns' in patch)
      secureDns.setProvider(patch.secureDns as 'off' | 'cloudflare' | 'quad9' | 'google');
  });

  // ── Terminal ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TERM_SPAWN,  (_e, cols?: number, rows?: number) => terminal.spawn(cols, rows));
  ipcMain.handle(IPC.TERM_WRITE,  (_e, id: string, data: string)     => terminal.write(id, data));
  ipcMain.handle(IPC.TERM_RESIZE, (_e, id: string, cols: number, rows: number) =>
    terminal.resize(id, cols, rows),
  );
  ipcMain.handle(IPC.TERM_KILL, (_e, id: string) => terminal.kill(id));

  // ── API tester ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.API_EXECUTE, async (_e, spec: HttpRequestSpec): Promise<HttpResponseSpec> => {
    const started = Date.now();
    try {
      const res = await axios.request({
        method:          spec.method,
        url:             spec.url,
        headers:         spec.headers,
        data:            spec.body,
        timeout:         spec.timeoutMs ?? 30_000,
        transformResponse: [(d) => d],
        validateStatus:  () => true,
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      return {
        status:     res.status,
        statusText: res.statusText,
        headers:    Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, String(v)])),
        body,
        durationMs: Date.now() - started,
        sizeBytes:  Buffer.byteLength(body, 'utf8'),
      };
    } catch (err) {
      const e = err as Error;
      return { status: 0, statusText: e.message || 'Network error', headers: {}, body: '', durationMs: Date.now() - started, sizeBytes: 0 };
    }
  });

  // ── Network inspector ───────────────────────────────────────────────────────
  ipcMain.handle(IPC.NET_ATTACH, (_e, tabId: string) => net.attach(tabId));
  ipcMain.handle(IPC.NET_DETACH, (_e, tabId: string) => net.detach(tabId));

  // ── Extensions (Phase 7) ────────────────────────────────────────────────────
  ipcMain.handle(IPC.EXT_LIST,   ()                      => extensions.list());
  ipcMain.handle(IPC.EXT_LOAD,   (_e, path: string)     => extensions.load(path));
  ipcMain.handle(IPC.EXT_UNLOAD, (_e, id: string)       => extensions.unload(id));

  // ── Window controls ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC.WIN_MINIMIZE,   () => window.minimize());
  ipcMain.handle(IPC.WIN_MAXIMIZE,   () => {
    if (window.isMaximized()) window.unmaximize(); else window.maximize();
  });
  ipcMain.handle(IPC.WIN_CLOSE,      () => window.close());
  ipcMain.handle(IPC.WIN_FULLSCREEN, () => window.setFullScreen(!window.isFullScreen()));

  // ── Updater ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.UPDATER_CHECK,   () => triggerCheck());
  ipcMain.handle(IPC.UPDATER_INSTALL, () => triggerInstall());
}
