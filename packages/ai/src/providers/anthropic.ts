import Anthropic from '@anthropic-ai/sdk';
import type { Provider, AiCallParams, AiCallResult } from '../types';
import { modelFor, costUsdMicro } from '../pricing';

export function anthropicProvider(apiKey: string): Provider {
  const client = new Anthropic({ apiKey });
  return {
    name: 'anthropic',
    async call(p: AiCallParams): Promise<AiCallResult> {
      const model = modelFor(p.tier);
      const t0 = Date.now();
      const res = await client.messages.create({
        model,
        max_tokens: p.maxTokens ?? 1024,
        temperature: p.temperature ?? 0.7,
        system: p.system,
        messages: p.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const text = res.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      const inputTokens = res.usage.input_tokens;
      const outputTokens = res.usage.output_tokens;
      return {
        text,
        cached: false,
        model,
        inputTokens,
        outputTokens,
        costUsdMicro: costUsdMicro(model, inputTokens, outputTokens),
        durationMs: Date.now() - t0,
      };
    },
  };
}
