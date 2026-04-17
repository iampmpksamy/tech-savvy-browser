// ─── Shared Types ──────────────────────────────────────────────────────────
// Used by both main (Electron) and renderer (React). Keep free of runtime deps.

export type TabId = string;
export type ProfileId = string;
export type GroupId = string;

export interface Tab {
  id: TabId;
  groupId: GroupId | null;
  url: string;
  title: string;
  favicon: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  muted: boolean;
  pinned: boolean;
  /** True when the WebContents has been destroyed to save memory. */
  hibernated: boolean;
  lastActiveAt: number;
}

export interface TabGroup {
  id: GroupId;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface Profile {
  id: ProfileId;
  name: string;
  avatarColor: string;
  /** Electron session partition string, e.g. 'persist:profile-xyz'. */
  partition: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folderId: string | null;
  createdAt: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  parentId: string | null;
}

// ─── AI ────────────────────────────────────────────────────────────────────

export type AiProvider = 'openai' | 'anthropic' | 'ollama';

export interface AiProviderConfig {
  provider: AiProvider;
  model: string;
  baseURL?: string;
  /** API key is stored in OS keychain; never shipped to renderer. */
  hasKey?: boolean;
}

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  id: string;
  role: AiRole;
  content: string;
  createdAt: number;
}

export interface AiStreamChunk {
  requestId: string;
  delta: string;
  done: boolean;
  error?: string;
}

// ─── Dev panels ────────────────────────────────────────────────────────────

export interface HttpRequestSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponseSpec {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  sizeBytes: number;
}

export interface NetworkEvent {
  requestId: string;
  tabId: TabId | null;
  type: 'request' | 'response' | 'finished' | 'failed';
  method?: string;
  url?: string;
  status?: number;
  mimeType?: string;
  bytes?: number;
  durationMs?: number;
  timestamp: number;
  error?: string;
}

export type PageType =
  | 'github-repo'
  | 'github-pr'
  | 'github-issue'
  | 'npm'
  | 'mdn'
  | 'api-docs'
  | 'json'
  | 'article'
  | 'generic';

export interface PageContext {
  url: string;
  title: string;
  /** meta[name="description"] content, empty string if absent */
  description: string;
  /** window.getSelection() text, empty string if nothing selected */
  selectedText: string;
  /** Trimmed page body text, capped to avoid bloating AI context */
  text: string;
  /** Classified page type — used by the command palette for context injection */
  type: PageType;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  defaultSearchEngine: 'google' | 'duckduckgo' | 'kagi' | 'brave';
  adBlockerEnabled: boolean;
  trackerBlockerEnabled: boolean;
  secureDns: 'off' | 'cloudflare' | 'quad9' | 'google';
  tabHibernationMinutes: number;
  ai: AiProviderConfig;
}
