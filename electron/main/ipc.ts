// ─── IPC Router ────────────────────────────────────────────────────────────
// Wires all services to the renderer through a single, typed surface.
import { BrowserWindow, ipcMain } from 'electron';
import axios from 'axios';
import { IPC } from '../../src/shared/ipc/channels';
import type { HttpRequestSpec, HttpResponseSpec, PageContext } from '../../src/shared/types';
import type { TabManager } from './tab-manager';
import type { ProfileManager } from './profile-manager';
import type { BlockerService } from './blocker';
import type { SecureDnsService } from './secure-dns';
import type { TerminalService } from './terminal-service';
import type { NetworkInspector } from './network-inspector';
import type { AiRouter } from '../services/ai';
import { triggerCheck, triggerInstall } from './updater';

// Batches streaming deltas into ~50 ms windows to reduce IPC round-trips.
// On done/error the buffer is always flushed synchronously so no tokens are lost.
function createStreamBuffer(
  send: (delta: string, done: boolean, error?: string) => void,
  intervalMs = 50,
): (delta: string, done: boolean, error?: string) => void {
  let buf = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (delta, done, error) => {
    if (error) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (buf) { send(buf, false); buf = ''; }
      send('', true, error);
      return;
    }
    if (done) {
      if (timer) { clearTimeout(timer); timer = null; }
      send(buf, true); // flush remaining buffer together with done flag
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

// Formats a PageContext into a compact block for injection into AI messages.
function buildPageContext(page: PageContext): string {
  const parts = [`URL: ${page.url}`, `Title: ${page.title}`];
  if (page.description) parts.push(`Description: ${page.description}`);
  if (page.selectedText) parts.push(`Selected text:\n${page.selectedText}`);
  if (page.text) parts.push(`Page content:\n${page.text}`);
  return parts.join('\n\n');
}

interface Deps {
  window: BrowserWindow;
  tabs: TabManager;
  profiles: ProfileManager;
  blocker: BlockerService;
  secureDns: SecureDnsService;
  terminal: TerminalService;
  net: NetworkInspector;
  ai: AiRouter;
}

export function registerIpc(deps: Deps) {
  const { window, tabs, profiles, blocker, secureDns, terminal, net, ai } = deps;

  // ── Tabs ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TAB_CREATE, (_e, url?: string) => tabs.create(url));
  ipcMain.handle(IPC.TAB_CLOSE, (_e, id: string) => tabs.close(id));
  ipcMain.handle(IPC.TAB_ACTIVATE, (_e, id: string) => tabs.activate(id));
  ipcMain.handle(IPC.TAB_NAVIGATE, (_e, id: string, url: string) => tabs.navigate(id, url));
  ipcMain.handle(IPC.TAB_RELOAD, (_e, id: string) => tabs.reload(id));
  ipcMain.handle(IPC.TAB_BACK, (_e, id: string) => tabs.goBack(id));
  ipcMain.handle(IPC.TAB_FORWARD, (_e, id: string) => tabs.goForward(id));
  ipcMain.handle(IPC.TAB_SET_BOUNDS, (_e, b) => tabs.setBounds(b));
  ipcMain.handle(IPC.TAB_LIST, () => tabs.list());
  ipcMain.handle(IPC.PAGE_EXTRACT_TEXT, () => tabs.getPageContext());

  // ── Profiles ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PROFILE_LIST, () => profiles.list());
  ipcMain.handle(IPC.PROFILE_CREATE, (_e, name: string, color?: string) =>
    profiles.create(name, color),
  );
  ipcMain.handle(IPC.PROFILE_ACTIVATE, (_e, id: string) => profiles.activate(id));
  ipcMain.handle(IPC.PROFILE_DELETE, (_e, id: string) => profiles.remove(id));

  // ── AI ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.AI_LIST_PROVIDERS, () => ai.listProviders());
  ipcMain.handle(IPC.AI_SET_KEY, (_e, provider: string, key: string) =>
    ai.setKey(provider as 'openai' | 'anthropic' | 'ollama', key),
  );

  ipcMain.handle(
    IPC.AI_SEND,
    async (
      _e,
      payload: {
        requestId: string;
        messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      },
    ) => {
      const send = createStreamBuffer((delta, done, error) =>
        window.webContents.send(IPC.AI_STREAM, { requestId: payload.requestId, delta, done, error }),
      );
      await ai.stream(payload.messages, send);
    },
  );

  ipcMain.handle(IPC.AI_SUMMARIZE_PAGE, async (_e, requestId: string) => {
    const page = await tabs.getPageContext();
    if (!page) return;
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
    );
    await ai.stream(
      [
        {
          role: 'system',
          content:
            'You are a concise, accurate web page summarizer. Return 3–6 bullets covering the key points.',
        },
        { role: 'user', content: buildPageContext(page) },
      ],
      send,
    );
  });

  ipcMain.handle(
    IPC.AI_EXPLAIN_CODE,
    async (_e, requestId: string, code: string, language?: string) => {
      const page = await tabs.getPageContext();
      const send = createStreamBuffer((delta, done, error) =>
        window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
      );
      // Prefer explicitly passed code; fall back to selected text on the page.
      const snippet = code || page?.selectedText || '';
      const lang = language ?? 'unknown';
      await ai.stream(
        [
          {
            role: 'system',
            content:
              'You are a senior engineer. Explain the code clearly: what it does, notable patterns, and any subtle bugs or risks.',
          },
          {
            role: 'user',
            content: `Language: ${lang}\n\n\`\`\`\n${snippet}\n\`\`\``,
          },
        ],
        send,
      );
    },
  );

  ipcMain.handle(IPC.AI_ASK_PAGE, async (_e, requestId: string, question: string) => {
    const page = await tabs.getPageContext();
    const send = createStreamBuffer((delta, done, error) =>
      window.webContents.send(IPC.AI_STREAM, { requestId, delta, done, error }),
    );
    await ai.stream(
      [
        {
          role: 'system',
          content:
            'Answer using ONLY the provided page context when possible. If the answer is not in the page, say so, then answer from general knowledge and label it clearly.',
        },
        {
          role: 'user',
          content: page
            ? `Context:\n${buildPageContext(page)}\n\nQuestion: ${question}`
            : question,
        },
      ],
      send,
    );
  });

  // ── Settings (minimal passthrough; real impl would use electron-store) ──
  ipcMain.handle(IPC.SETTINGS_GET, () => ({
    adBlockerEnabled: blocker.isEnabled(),
    secureDns: secureDns.getProvider(),
  }));
  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Record<string, unknown>) => {
    if ('adBlockerEnabled' in patch) blocker.setEnabled(Boolean(patch.adBlockerEnabled));
    if ('secureDns' in patch)
      secureDns.setProvider(patch.secureDns as 'off' | 'cloudflare' | 'quad9' | 'google');
  });

  // ── Terminal ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TERM_SPAWN, (_e, cols?: number, rows?: number) => terminal.spawn(cols, rows));
  ipcMain.handle(IPC.TERM_WRITE, (_e, id: string, data: string) => terminal.write(id, data));
  ipcMain.handle(IPC.TERM_RESIZE, (_e, id: string, cols: number, rows: number) =>
    terminal.resize(id, cols, rows),
  );
  ipcMain.handle(IPC.TERM_KILL, (_e, id: string) => terminal.kill(id));

  // ── API tester ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC.API_EXECUTE, async (_e, spec: HttpRequestSpec): Promise<HttpResponseSpec> => {
    const started = Date.now();
    try {
      const res = await axios.request({
        method: spec.method,
        url: spec.url,
        headers: spec.headers,
        data: spec.body,
        timeout: spec.timeoutMs ?? 30_000,
        transformResponse: [(d) => d], // keep body raw
        validateStatus: () => true,
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      return {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(
          Object.entries(res.headers).map(([k, v]) => [k, String(v)]),
        ),
        body,
        durationMs: Date.now() - started,
        sizeBytes: Buffer.byteLength(body, 'utf8'),
      };
    } catch (err) {
      const e = err as Error;
      return {
        status: 0,
        statusText: e.message || 'Network error',
        headers: {},
        body: '',
        durationMs: Date.now() - started,
        sizeBytes: 0,
      };
    }
  });

  // ── Network inspector ───────────────────────────────────────────────────
  ipcMain.handle(IPC.NET_ATTACH, (_e, tabId: string) => net.attach(tabId));
  ipcMain.handle(IPC.NET_DETACH, (_e, tabId: string) => net.detach(tabId));

  // ── Window controls ─────────────────────────────────────────────────────
  ipcMain.handle(IPC.WIN_MINIMIZE, () => window.minimize());
  ipcMain.handle(IPC.WIN_MAXIMIZE, () => {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.handle(IPC.WIN_CLOSE, () => window.close());
  ipcMain.handle(IPC.WIN_FULLSCREEN, () => window.setFullScreen(!window.isFullScreen()));

  // ── Updater ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.UPDATER_CHECK, () => triggerCheck());
  ipcMain.handle(IPC.UPDATER_INSTALL, () => triggerInstall());
}
