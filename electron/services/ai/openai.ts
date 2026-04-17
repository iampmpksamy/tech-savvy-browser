import OpenAI from 'openai';
import type { AiProviderClient } from './index';
import type { AiMessage } from '@shared/types';

export class OpenAiProvider implements AiProviderClient {
  name = 'openai' as const;

  constructor(private getKey: () => string) {}

  async stream(
    messages: Pick<AiMessage, 'role' | 'content'>[],
    model: string,
    onDelta: (delta: string, done: boolean, error?: string) => void,
  ): Promise<void> {
    const apiKey = this.getKey();
    if (!apiKey) {
      onDelta('', true, 'OpenAI API key is not set.');
      return;
    }
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) onDelta(delta, false);
    }
    onDelta('', true);
  }
}
