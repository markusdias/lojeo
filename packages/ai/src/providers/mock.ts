import type { Provider, AiCallParams, AiCallResult } from '../types';
import { modelFor } from '../pricing';

export const mockProvider: Provider = {
  name: 'mock',
  async call(p: AiCallParams): Promise<AiCallResult> {
    const model = modelFor(p.tier);
    const lastUserMsg = [...p.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const text = `[mock:${p.feature}] eco: ${lastUserMsg.slice(0, 120)}`;
    return {
      text,
      cached: false,
      model,
      inputTokens: Math.ceil(lastUserMsg.length / 4),
      outputTokens: Math.ceil(text.length / 4),
      costUsdMicro: 0,
      durationMs: 1,
    };
  },
};
