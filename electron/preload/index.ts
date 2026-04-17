// ─── Preload: contextBridge surface ────────────────────────────────────────
// The ONLY way the renderer talks to the main process. Keep this surface tight
// and well-typed; any new capability must be added here explicitly.
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../../src/shared/ipc/channels';
import type {
  Tab,
  Profile,
  AiProviderConfig,
  HttpRequestSpec,
  HttpResponseSpec,
  Settings,
  NetworkEvent,
  PageContext,
} from '../../src/shared/types';

type Unsub = () => void;

const bridge = {
  // ── Tabs ────────────────────────────────────────────────────────────────
  tabs: {
    list: (): Promise<Tab[]> => ipcRenderer.invoke(IPC.TAB_LIST),
    create: (url?: string): Promise<Tab> => ipcRenderer.invoke(IPC.TAB_CREATE, url),
    close: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE, id),
    activate: (id: string) => ipcRenderer.invoke(IPC.TAB_ACTIVATE, id),
    navigate: (id: string, url: string) => ipcRenderer.invoke(IPC.TAB_NAVIGATE, id, url),
    reload: (id: string) => ipcRenderer.invoke(IPC.TAB_RELOAD, id),
    back: (id: string) => ipcRenderer.invoke(IPC.TAB_BACK, id),
    forward: (id: string) => ipcRenderer.invoke(IPC.TAB_FORWARD, id),
    setBounds: (b: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.invoke(IPC.TAB_SET_BOUNDS, b),
    onUpdated: (cb: (data: { tabs: Tab[]; activeId: string | null }) => void): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, data: { tabs: Tab[]; activeId: string | null }) =>
        cb(data);
      ipcRenderer.on(IPC.TAB_UPDATED, listener);
      return () => ipcRenderer.removeListener(IPC.TAB_UPDATED, listener);
    },
    extractPageText: (): Promise<PageContext | null> =>
      ipcRenderer.invoke(IPC.PAGE_EXTRACT_TEXT),
  },

  // ── Profiles ────────────────────────────────────────────────────────────
  profiles: {
    list: (): Promise<Profile[]> => ipcRenderer.invoke(IPC.PROFILE_LIST),
    create: (name: string, color?: string): Promise<Profile> =>
      ipcRenderer.invoke(IPC.PROFILE_CREATE, name, color),
    activate: (id: string) => ipcRenderer.invoke(IPC.PROFILE_ACTIVATE, id),
    remove: (id: string) => ipcRenderer.invoke(IPC.PROFILE_DELETE, id),
  },

  // ── AI ──────────────────────────────────────────────────────────────────
  ai: {
    listProviders: (): Promise<AiProviderConfig[]> => ipcRenderer.invoke(IPC.AI_LIST_PROVIDERS),
    setKey: (provider: 'openai' | 'anthropic' | 'ollama', key: string) =>
      ipcRenderer.invoke(IPC.AI_SET_KEY, provider, key),
    send: (payload: {
      requestId: string;
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
    }) => ipcRenderer.invoke(IPC.AI_SEND, payload),
    summarizePage: (requestId: string) => ipcRenderer.invoke(IPC.AI_SUMMARIZE_PAGE, requestId),
    explainCode: (requestId: string, code: string, language?: string) =>
      ipcRenderer.invoke(IPC.AI_EXPLAIN_CODE, requestId, code, language),
    askPage: (requestId: string, question: string) =>
      ipcRenderer.invoke(IPC.AI_ASK_PAGE, requestId, question),
    onStream: (
      cb: (chunk: { requestId: string; delta: string; done: boolean; error?: string }) => void,
    ): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, chunk: { requestId: string; delta: string; done: boolean; error?: string }) =>
        cb(chunk);
      ipcRenderer.on(IPC.AI_STREAM, listener);
      return () => ipcRenderer.removeListener(IPC.AI_STREAM, listener);
    },
  },

  // ── Settings ────────────────────────────────────────────────────────────
  settings: {
    get: (): Promise<Partial<Settings>> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (patch: Partial<Settings>) => ipcRenderer.invoke(IPC.SETTINGS_SET, patch),
  },

  // ── Terminal ────────────────────────────────────────────────────────────
  terminal: {
    spawn: (cols?: number, rows?: number): Promise<string> =>
      ipcRenderer.invoke(IPC.TERM_SPAWN, cols, rows),
    write: (id: string, data: string) => ipcRenderer.invoke(IPC.TERM_WRITE, id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke(IPC.TERM_RESIZE, id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke(IPC.TERM_KILL, id),
    onData: (cb: (ev: { id: string; data: string }) => void): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, ev: { id: string; data: string }) => cb(ev);
      ipcRenderer.on(IPC.TERM_DATA, listener);
      return () => ipcRenderer.removeListener(IPC.TERM_DATA, listener);
    },
    onExit: (cb: (ev: { id: string; exitCode: number }) => void): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, ev: { id: string; exitCode: number }) =>
        cb(ev);
      ipcRenderer.on(IPC.TERM_EXIT, listener);
      return () => ipcRenderer.removeListener(IPC.TERM_EXIT, listener);
    },
  },

  // ── API tester ──────────────────────────────────────────────────────────
  api: {
    execute: (spec: HttpRequestSpec): Promise<HttpResponseSpec> =>
      ipcRenderer.invoke(IPC.API_EXECUTE, spec),
  },

  // ── Network inspector ───────────────────────────────────────────────────
  net: {
    attach: (tabId: string) => ipcRenderer.invoke(IPC.NET_ATTACH, tabId),
    detach: (tabId: string) => ipcRenderer.invoke(IPC.NET_DETACH, tabId),
    onEvent: (cb: (ev: NetworkEvent) => void): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, ev: NetworkEvent) => cb(ev);
      ipcRenderer.on(IPC.NET_EVENT, listener);
      return () => ipcRenderer.removeListener(IPC.NET_EVENT, listener);
    },
  },

  // ── Window controls ─────────────────────────────────────────────────────
  win: {
    minimize: () => ipcRenderer.invoke(IPC.WIN_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC.WIN_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC.WIN_CLOSE),
    fullscreen: () => ipcRenderer.invoke(IPC.WIN_FULLSCREEN),
  },

  // ── Updater ─────────────────────────────────────────────────────────────
  updater: {
    check: () => ipcRenderer.invoke(IPC.UPDATER_CHECK),
    install: () => ipcRenderer.invoke(IPC.UPDATER_INSTALL),
    onStatus: (cb: (ev: { status: string; info?: unknown }) => void): Unsub => {
      const listener = (_: Electron.IpcRendererEvent, ev: { status: string; info?: unknown }) =>
        cb(ev);
      ipcRenderer.on(IPC.UPDATER_STATUS, listener);
      return () => ipcRenderer.removeListener(IPC.UPDATER_STATUS, listener);
    },
  },
};

contextBridge.exposeInMainWorld('ts', bridge);

export type TsBridge = typeof bridge;
