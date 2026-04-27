import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('hreflang · getHreflangAlternates', () => {
  it('home retorna pt-BR + x-default apontando para BASE_URL puro', async () => {
    vi.stubEnv('STOREFRONT_URL', 'https://joias.lojeo.com.br');
    const { getHreflangAlternates } = await import('./hreflang');
    const map = getHreflangAlternates('/');
    expect(map['pt-BR']).toBe('https://joias.lojeo.com.br');
    expect(map['x-default']).toBe('https://joias.lojeo.com.br');
  });

  it('path com prefixo / é preservado', async () => {
    vi.stubEnv('STOREFRONT_URL', 'https://joias.lojeo.com.br');
    const { getHreflangAlternates } = await import('./hreflang');
    const map = getHreflangAlternates('/sobre');
    expect(map['pt-BR']).toBe('https://joias.lojeo.com.br/sobre');
    expect(map['x-default']).toBe('https://joias.lojeo.com.br/sobre');
  });

  it('path sem prefixo / é normalizado', async () => {
    vi.stubEnv('STOREFRONT_URL', 'https://joias.lojeo.com.br');
    const { getHreflangAlternates } = await import('./hreflang');
    const map = getHreflangAlternates('produtos/anel-solitario');
    expect(map['pt-BR']).toBe('https://joias.lojeo.com.br/produtos/anel-solitario');
  });

  it('produz mesma URL para pt-BR e x-default na Fase 1.1 (single locale)', async () => {
    vi.stubEnv('STOREFRONT_URL', 'https://joias.lojeo.com.br');
    const { getHreflangAlternates } = await import('./hreflang');
    const map = getHreflangAlternates('/produtos');
    expect(map['pt-BR']).toBe(map['x-default']);
  });
});

describe('hreflang · getPrimaryLocale', () => {
  it('retorna pt-BR como locale primário (Fase 1.1)', async () => {
    const { getPrimaryLocale } = await import('./hreflang');
    expect(getPrimaryLocale()).toBe('pt-BR');
  });
});
