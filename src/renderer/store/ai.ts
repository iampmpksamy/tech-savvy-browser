import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AiMessage, AiProviderConfig } from '@shared/types';
import { ts } from '../lib/bridge';

interface AiState {
  messages: AiMessage[];
  streaming: boolean;
  currentRequestId: string | null;
  providers: AiProviderConfig[];
  refreshProviders: () => Promise<void>;
  bindStream: () => () => void;
  send: (content: string) => Promise<void>;
  summarizeActivePage: () => Promise<void>;
  askPage: (question: string) => Promise<void>;
  explainCode: (code: string, language?: string) => Promise<void>;
  clear: () => void;
}

export const useAi = create<AiState>((set, get) => ({
  messages: [],
  streaming: false,
  currentRequestId: null,
  providers: [],

  refreshProviders: async () => {
    const providers = await ts().ai.listProviders();
    set({ providers });
  },

  bindStream: () =>
    ts().ai.onStream((chunk) => {
      const { currentRequestId, messages } = get();
      if (chunk.requestId !== currentRequestId) return;

      if (chunk.error) {
        const updated = messages.map((m, i) =>
          i === messages.length - 1 && m.role === 'assistant'
            ? { ...m, content: `⚠️ ${chunk.error}` }
            : m,
        );
        set({ streaming: false, currentRequestId: null, messages: updated });
        return;
      }

      const last = messages[messages.length - 1];
      const isAccumulating = last?.role === 'assistant' && last.id === currentRequestId;
      const updated: AiMessage[] = isAccumulating
        ? [...messages.slice(0, -1), { ...last, content: last.content + chunk.delta }]
        : [
            ...messages,
            { id: currentRequestId!, role: 'assistant', content: chunk.delta, createdAt: Date.now() },
          ];

      if (chunk.done) {
        set({ streaming: false, currentRequestId: null, messages: updated });
      } else {
        set({ messages: updated });
      }
    }),

  send: async (content) => {
    const { messages } = get();
    const user: AiMessage = {
      id: nanoid(10),
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    const requestId = nanoid(10);
    const convo = [...messages, user];
    set({ messages: convo, streaming: true, currentRequestId: requestId });
    await ts().ai.send({
      requestId,
      messages: convo.map((m) => ({ role: m.role, content: m.content })),
    });
  },

  summarizeActivePage: async () => {
    const requestId = nanoid(10);
    const { messages } = get();
    const updated = [...messages, { id: nanoid(10), role: 'user' as const, content: 'Summarize this page.', createdAt: Date.now() }];
    set({ messages: updated, streaming: true, currentRequestId: requestId });
    await ts().ai.summarizePage(requestId);
  },

  askPage: async (question) => {
    const requestId = nanoid(10);
    const { messages } = get();
    const updated = [...messages, { id: nanoid(10), role: 'user' as const, content: question, createdAt: Date.now() }];
    set({ messages: updated, streaming: true, currentRequestId: requestId });
    await ts().ai.askPage(requestId, question);
  },

  explainCode: async (code, language) => {
    const requestId = nanoid(10);
    const { messages } = get();
    const updated = [...messages, { id: nanoid(10), role: 'user' as const, content: `Explain this ${language ?? ''} code:\n\n${code}`, createdAt: Date.now() }];
    set({ messages: updated, streaming: true, currentRequestId: requestId });
    await ts().ai.explainCode(requestId, code, language);
  },

  clear: () => set({ messages: [] }),
}));
