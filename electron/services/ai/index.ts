// ─── AI Router ─────────────────────────────────────────────────────────────
// Provider-agnostic layer. Keys live in OS keychain via safeStorage; they
// NEVER touch the renderer.
import { safeStorage } from 'electron';
import Store from 'electron-store';
import type { AiMessage, AiProvider, AiProviderConfig } from '../../../src/shared/types';
import { OpenAiProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';

export interface AiProviderClient {
  name: AiProvider;
  /** Streams deltas. Resolves when done. */
  stream(
    messages: Pick<AiMessage, 'role' | 'content'>[],
    model: string,
    onDelta: (delta: string, done: boolean, error?: string) => void,
  ): Promise<void>;
}

interface AiStore {
  activeProvider: AiProvider;
  models: Record<AiProvider, string>;
  encryptedKeys: Partial<Record<AiProvider, string>>; // safeStorage-encrypted, base64-encoded
  baseURLs: Partial<Record<AiProvider, string>>;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  ollama: 'llama3.1',
};

export class AiRouter {
  private store = new Store<AiStore>({
    name: 'ai',
    defaults: {
      activeProvider: 'anthropic',
      models: DEFAULT_MODELS,
      encryptedKeys: {},
      baseURLs: { ollama: 'http://127.0.0.1:11434' },
    },
  });

  private clients: Record<AiProvider, AiProviderClient> | null = null;

  async init() {
    this.clients = {
      openai: new OpenAiProvider(() => this.getKey('openai')),
      anthropic: new AnthropicProvider(() => this.getKey('anthropic')),
      ollama: new OllamaProvider(() => this.store.get('baseURLs').ollama ?? 'http://127.0.0.1:11434'),
    };
  }

  listProviders(): AiProviderConfig[] {
    const active = this.store.get('activeProvider');
    const models = this.store.get('models');
    const baseURLs = this.store.get('baseURLs');
    const encrypted = this.store.get('encryptedKeys');
    return (['openai', 'anthropic', 'ollama'] as AiProvider[]).map((p) => ({
      provider: p,
      model: models[p] ?? DEFAULT_MODELS[p],
      baseURL: baseURLs[p],
      hasKey: p === 'ollama' ? true : Boolean(encrypted[p]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      active: p === active,
    })) as (AiProviderConfig & { active: boolean })[];
  }

  setActive(provider: AiProvider) {
    this.store.set('activeProvider', provider);
  }

  setKey(provider: AiProvider, key: string) {
    if (provider === 'ollama') return; // no key required
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        `OS keychain is unavailable — cannot store the ${provider} API key securely. ` +
        `Set the ANTHROPIC_API_KEY (or OPENAI_API_KEY) environment variable instead, ` +
        `or configure a keychain (e.g. install gnome-keyring / kwallet on Linux).`,
      );
    }
    const enc = safeStorage.encryptString(key).toString('base64');
    this.store.set(`encryptedKeys.${provider}`, enc);
  }

  private getKey(provider: AiProvider): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        `OS keychain is unavailable — cannot decrypt the ${provider} API key. ` +
        `Set the ANTHROPIC_API_KEY (or OPENAI_API_KEY) environment variable instead, ` +
        `or configure a keychain (e.g. install gnome-keyring / kwallet on Linux).`,
      );
    }
    const raw = this.store.get('encryptedKeys')[provider];
    if (!raw) return '';
    try {
      return safeStorage.decryptString(Buffer.from(raw, 'base64'));
    } catch {
      return '';
    }
  }

  async stream(
    messages: Pick<AiMessage, 'role' | 'content'>[],
    onDelta: (delta: string, done: boolean, error?: string) => void,
  ): Promise<void> {
    if (!this.clients) throw new Error('AiRouter not initialized');
    const active = this.store.get('activeProvider');
    const client = this.clients[active];
    const model = this.store.get('models')[active] ?? DEFAULT_MODELS[active];
    try {
      await client.stream(messages, model, onDelta);
    } catch (e) {
      const err = e as Error;
      onDelta('', true, err.message);
    }
  }
}
