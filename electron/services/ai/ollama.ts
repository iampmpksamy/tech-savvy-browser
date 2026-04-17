import { Ollama } from 'ollama';
import type { AiProviderClient } from './index';
import type { AiMessage } from '@shared/types';

export class OllamaProvider implements AiProviderClient {
  name = 'ollama' as const;

  constructor(private getHost: () => string) {}

  async stream(
    messages: Pick<AiMessage, 'role' | 'content'>[],
    model: string,
    onDelta: (delta: string, done: boolean, error?: string) => void,
  ): Promise<void> {
    const client = new Ollama({ host: this.getHost() });
    try {
      const stream = await client.chat({
        model,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      for await (const chunk of stream) {
        const delta = chunk.message?.content ?? '';
        if (delta) onDelta(delta, false);
      }
      onDelta('', true);
    } catch (e) {
      const err = e as Error;
      onDelta(
        '',
        true,
        `Ollama unavailable at ${this.getHost()} — is \`ollama serve\` running? (${err.message})`,
      );
    }
  }
}
