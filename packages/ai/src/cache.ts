import { createHash } from 'node:crypto';

export function hashPrompt(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 64);
}

export function buildCacheKey(parts: {
  feature: string;
  model: string;
  promptHash: string;
  variant?: string;
}): string {
  const v = parts.variant ? `:${parts.variant}` : '';
  return `${parts.feature}:${parts.model}:${parts.promptHash}${v}`.slice(0, 128);
}
