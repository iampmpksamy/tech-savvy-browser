import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderClient } from './index';
import type { AiMessage } from '../../../src/shared/types';

export class AnthropicProvider implements AiProviderClient {
  name = 'anthropic' as const;

  constructor(private getKey: () => string) {}

  async stream(
    messages: Pick<AiMessage, 'role' | 'content'>[],
    model: string,
    onDelta: (delta: string, done: boolean, error?: string) => void,
  ): Promise<void> {
    const apiKey = this.getKey();
    if (!apiKey) {
      onDelta('', true, 'Anthropic API key is not set.');
      return;
    }
    const client = new Anthropic({ apiKey });

    // Anthropic wants system as a top-level param, not a message.
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const convo = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: system || undefined,
      messages: convo.length ? convo : [{ role: 'user', content: '...' }],
    });

    stream.on('text', (text) => onDelta(text, false));
    await stream.finalMessage();
    onDelta('', true);
  }
}
