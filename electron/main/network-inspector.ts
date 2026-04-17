// ─── NetworkInspector ──────────────────────────────────────────────────────
// Attaches chrome.debugger to the active tab's WebContents and streams
// Network.* CDP events to the renderer — powering the DevTools-style Network
// panel.
import type { BrowserWindow } from 'electron';
import type { NetworkEvent, TabId } from '@shared/types';
import { IPC } from '@shared/ipc/channels';
import type { TabManager } from './tab-manager';

export class NetworkInspector {
  private attached = new Set<TabId>();

  constructor(
    private win: BrowserWindow,
    private tabs: TabManager,
  ) {}

  attach(tabId: TabId) {
    if (this.attached.has(tabId)) return;
    const tab = this.tabs
      .list()
      .find((t) => t.id === tabId);
    if (!tab) return;
    const wc = this.lookupWebContents(tabId);
    if (!wc) return;
    try {
      wc.debugger.attach('1.3');
    } catch (e) {
      console.error('[net] attach failed', e);
      return;
    }
    wc.debugger.sendCommand('Network.enable').catch(() => void 0);

    wc.debugger.on('message', (_e, method, params) => {
      const ev = toNetworkEvent(tabId, method, params as Record<string, unknown>);
      if (ev) this.win.webContents.send(IPC.NET_EVENT, ev);
    });

    wc.debugger.on('detach', () => this.attached.delete(tabId));
    this.attached.add(tabId);
  }

  detach(tabId: TabId) {
    const wc = this.lookupWebContents(tabId);
    if (!wc) return;
    try {
      if (wc.debugger.isAttached()) wc.debugger.detach();
    } catch {
      /* noop */
    }
    this.attached.delete(tabId);
  }

  disposeAll() {
    for (const id of [...this.attached]) this.detach(id);
  }

  private lookupWebContents(tabId: TabId) {
    return this.tabs.webContentsFor(tabId);
  }
}

function toNetworkEvent(
  tabId: TabId,
  method: string,
  params: Record<string, unknown>,
): NetworkEvent | null {
  const now = Date.now();
  const request = (params as { request?: { method?: string; url?: string } }).request;
  const response = (params as { response?: { status?: number; mimeType?: string } }).response;
  switch (method) {
    case 'Network.requestWillBeSent':
      return {
        requestId: String(params.requestId ?? ''),
        tabId,
        type: 'request',
        method: request?.method,
        url: request?.url,
        timestamp: now,
      };
    case 'Network.responseReceived':
      return {
        requestId: String(params.requestId ?? ''),
        tabId,
        type: 'response',
        status: response?.status,
        mimeType: response?.mimeType,
        timestamp: now,
      };
    case 'Network.loadingFinished':
      return {
        requestId: String(params.requestId ?? ''),
        tabId,
        type: 'finished',
        bytes: Number(params.encodedDataLength ?? 0),
        timestamp: now,
      };
    case 'Network.loadingFailed':
      return {
        requestId: String(params.requestId ?? ''),
        tabId,
        type: 'failed',
        error: String(params.errorText ?? 'unknown'),
        timestamp: now,
      };
    default:
      return null;
  }
}
