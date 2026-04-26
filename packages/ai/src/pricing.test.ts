import { describe, expect, it } from 'vitest';
import { modelFor, costUsdMicro, MODELS } from './pricing';
import { hashPrompt, buildCacheKey } from './cache';
import { mockProvider } from './providers/mock';

describe('modelFor', () => {
  it('haiku é default', () => {
    expect(modelFor()).toBe(MODELS.haiku);
  });

  it('sonnet quando explícito', () => {
    expect(modelFor('sonnet')).toBe(MODELS.sonnet);
  });
});

describe('costUsdMicro', () => {
  it('calcula custo em micro-USD', () => {
    const c = costUsdMicro(MODELS.haiku, 1_000_000, 0);
    expect(c).toBe(1_000_000);
  });

  it('combina input + output', () => {
    const c = costUsdMicro(MODELS.sonnet, 1_000_000, 1_000_000);
    expect(c).toBe(18_000_000);
  });
});

describe('cache helpers', () => {
  it('hashPrompt determinístico', () => {
    expect(hashPrompt('a')).toBe(hashPrompt('a'));
    expect(hashPrompt('a')).not.toBe(hashPrompt('b'));
  });

  it('buildCacheKey limita 128 chars', () => {
    const k = buildCacheKey({
      feature: 'desc'.repeat(50),
      model: 'm',
      promptHash: 'h',
    });
    expect(k.length).toBeLessThanOrEqual(128);
  });
});

describe('mockProvider', () => {
  it('responde sem chave Anthropic', async () => {
    const r = await mockProvider.call({
      feature: 'test',
      messages: [{ role: 'user', content: 'oi' }],
    });
    expect(r.text).toContain('mock:test');
    expect(r.cached).toBe(false);
  });
});
