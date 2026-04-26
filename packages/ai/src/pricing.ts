import type { ModelTier } from './types';

export const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
} as const satisfies Record<ModelTier, string>;

const PRICE_PER_MTOK_USD: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
};

export function modelFor(tier: ModelTier = 'haiku'): string {
  return MODELS[tier];
}

export function costUsdMicro(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK_USD[model] ?? PRICE_PER_MTOK_USD['claude-haiku-4-5-20251001']!;
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return Math.round(usd * 1_000_000);
}
